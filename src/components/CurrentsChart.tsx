// industrial-iot-lab/dashboard-industrial/src/components/CurrentsChart.tsx
"use client";

import React, {
  useMemo,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import type { Layout, Data, Shape, PlotlyHTMLElement } from "plotly.js";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// Internal Plotly runtime shape used to access private _fullLayout safely
type InternalPlotlyHTMLElement = PlotlyHTMLElement & {
  _fullLayout?: {
    xaxis?: { range?: [number | string | Date, number | string | Date] };
  };
};

type Row = { idx: number; ts: number } & Record<string, number>;

type Props = {
  data: Row[];
  height?: number;
  yRange?: [number, number];
  thresholds?: {
    min?: number;
    max?: number;
    showBand?: boolean;
  };
};

export const DEFAULT_CURRENT_MIN = 100;
export const DEFAULT_CURRENT_MAX = 1500;

type Label = "30s" | "1m" | "5m" | "Todo";

type Palette = {
  range: string;
  rangeActive: string;
  rangeStroke: string;
  text: string;
};

type ToolbarProps = {
  onToggleBand: () => void;
  bandActive: boolean;
  hostRef: React.RefObject<HTMLDivElement | null>;
  palette: Palette;
};

function Toolbar({ onToggleBand, bandActive, hostRef, palette }: ToolbarProps) {
  const { range, rangeActive, rangeStroke, text } = palette;

  return (
    <div ref={hostRef}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleBand}
    title={bandActive ? "Hide band" : "Show band"}
    aria-label={bandActive ? "Hide band" : "Show band"}
          aria-pressed={bandActive}
          className="inline-flex items-center justify-center select-none rounded-[4px] h-[26px] px-2 text-[12px] font-medium transition-colors border outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
          style={{
            backgroundColor: bandActive ? rangeActive : range,
            borderColor: rangeStroke,
            color: text,
            boxShadow: bandActive ? "inset 0 0 0 1px rgba(0,0,0,0.06)" : "none",
          }}
        >
          <span className="leading-none">Band</span>
        </button>
      </div>
    </div>
  );
}

function ExpandButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
  type="button"
  onClick={onOpen}
  title="Expand"
  aria-label="Expand"
      className="flex items-center justify-center rounded-md border border-gray-300 bg-white/70 w-[34px] h-[34px] text-gray-700 hover:bg-white hover:shadow-sm transition"
      style={{ pointerEvents: "auto" }}
    >
      {/* Ícono 4 flechas desde el centro */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M15 3h6v6" />
        <path d="M9 21H3v-6" />
        <path d="M21 3l-7 7" />
        <path d="M3 21l7-7" />
      </svg>
    </button>
  );
}

export default function CurrentsChart({
  data,
  height = 380,
  yRange,
  thresholds,
}: Props) {
  // --- Refs principales (gráfica normal) ---
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bandaBtnRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const boundButtons = useRef<WeakSet<Element>>(new WeakSet());
  const [rightMargin, setRightMargin] = useState<number>(200);
  const graphRef = useRef<PlotlyHTMLElement | null>(null);

  // --- Refs fullscreen (modal) ---
  const fsContainerRef = useRef<HTMLDivElement | null>(null);
  const fsBandaBtnRef = useRef<HTMLDivElement | null>(null);
  const fsObserverRef = useRef<MutationObserver | null>(null);
  const fsBoundButtons = useRef<WeakSet<Element>>(new WeakSet());
  const [fsRightMargin, setFsRightMargin] = useState<number>(240);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fsHeight, setFsHeight] = useState<number>(720);
  const fsGraphRef = useRef<PlotlyHTMLElement | null>(null);

  // --- Colores (SOLO estilos) ---
  const colors = useMemo(() => {
    const css =
      typeof window !== "undefined"
        ? getComputedStyle(document.documentElement)
        : null;
    return {
      paper: css?.getPropertyValue("--color-panel-bg").trim() || "#f8f9fa",
      plot: "#F5F5F5",
      text: "#374151",
      grid: "#e2e8f0",
      range: "#e5e7eb",
      rangeActive: "#d1d5db",
      rangeStroke: "rgba(0,0,0,0.15)",
    };
  }, []);

  // --- Fechas X (date) ---
  const xDates = useMemo(() => {
    return data.length ? data.map((d) => new Date(d.ts)) : [new Date()];
  }, [data]);

  // --- Umbrales ---
  const defaultMin = thresholds?.min ?? DEFAULT_CURRENT_MIN;
  const defaultMax = thresholds?.max ?? DEFAULT_CURRENT_MAX;

  // Banda APAGADA por defecto
  const [showBand, setShowBand] = useState<boolean>(
    thresholds?.showBand ?? false
  );

  const [yMin, yMax] = useMemo<[number, number]>(() => {
    const a = defaultMin;
    const b = defaultMax;
    return a <= b ? [a, b] : [b, a];
  }, [defaultMin, defaultMax]);

  // Padding alrededor de umbrales para fallback
  const defaultYInit: [number, number] = useMemo(() => {
    const span = Math.max(1, yMax - yMin);
    const pad = Math.max(1, 0.05 * span);
    return [yMin - pad, yMax + pad];
  }, [yMin, yMax]);

  // --- Ventanas (por defecto 1m) ---
  const [followSec, setFollowSec] = useState<number | null>(60); // 1m inicial
  const xRangeFollow: [Date, Date] | undefined = useMemo(() => {
    if (followSec == null || xDates.length === 0) return undefined;
    const maxDate = xDates[xDates.length - 1];
    const minDate = new Date(maxDate.getTime() - followSec * 1000);
    return [minDate, maxDate];
  }, [xDates, followSec]);

  const labelFromFollow = useCallback((fs: number | null): Label => {
    if (fs === null) return "Todo";
    if (fs === 30) return "30s";
    if (fs === 60) return "1m";
    return "5m";
  }, []);

  // === AUTOSCALE (solo datos visibles, ignora umbrales) ===
  const computeYRangeForVisibleX = useCallback(
    (startMs: number, endMs: number): [number, number] | null => {
      let minVal = Number.POSITIVE_INFINITY;
      let maxVal = Number.NEGATIVE_INFINITY;

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const t = row.ts;
        if (t < startMs || t > endMs) continue;

        const v1 = Number.isFinite(row.L1) ? (row.L1 as number) : undefined;
        const v2 = Number.isFinite(row.L2) ? (row.L2 as number) : undefined;
        const v3 = Number.isFinite(row.L3) ? (row.L3 as number) : undefined;
        const vp = Number.isFinite(row.Promedio)
          ? (row.Promedio as number)
          : undefined;

        if (typeof v1 === "number") {
          if (v1 < minVal) minVal = v1;
          if (v1 > maxVal) maxVal = v1;
        }
        if (typeof v2 === "number") {
          if (v2 < minVal) minVal = v2;
          if (v2 > maxVal) maxVal = v2;
        }
        if (typeof v3 === "number") {
          if (v3 < minVal) minVal = v3;
          if (v3 > maxVal) maxVal = v3;
        }
        if (typeof vp === "number") {
          if (vp < minVal) minVal = vp;
          if (vp > maxVal) maxVal = vp;
        }
      }

      if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) return null;
      if (minVal === maxVal) {
        const delta = Math.max(1, Math.abs(minVal) * 0.01);
        return [minVal - delta, maxVal + delta];
      }
      const span = maxVal - minVal;
      const pad = Math.max(0.02 * span, 1);
      return [minVal - pad, maxVal + pad];
    },
    [data]
  );

  // Autoscale manual (botón de la modebar)
  const [forcedY, setForcedY] = useState<[number, number] | null>(null);
  const [forceNonce, setForceNonce] = useState(0);

  // Rango Y de datos visibles (30s/1m/5m)
  const visibleYRange: [number, number] | null = useMemo(() => {
    if (!xRangeFollow) return null;
    const [x0, x1] = xRangeFollow;
    return computeYRangeForVisibleX(x0.getTime(), x1.getTime());
  }, [computeYRangeForVisibleX, xRangeFollow]);

  // ✅ SOLO EN EL PRIMER RENDER: incluir umbrales en el rango Y
  const [initialClamp, setInitialClamp] = useState<boolean>(true);
  const initialYRangeWithThresholds: [number, number] = useMemo(() => {
    const base = visibleYRange ?? defaultYInit;
    return [Math.min(base[0], yMin), Math.max(base[1], yMax)];
  }, [visibleYRange, defaultYInit, yMin, yMax]);

  // === Helper: obtener rango X actual en ms ===
  const getCurrentXRangeMs = useCallback(
    (gd: PlotlyHTMLElement | null): [number, number] | null => {
      if (!gd) return null;
      const xr = (gd as InternalPlotlyHTMLElement)?._fullLayout?.xaxis?.range as
        | [number | string | Date, number | string | Date]
        | undefined;
      if (!xr) return null;
      const toMs = (v: number | string | Date) =>
        typeof v === "number" ? v : new Date(v).getTime();
      return [toMs(xr[0]), toMs(xr[1])];
    },
    []
  );

  // === NUEVO: Reset a vista por defecto (1m + umbrales SIEMPRE visibles) ===
  const resetToDefaultView = useCallback(
    (gd: PlotlyHTMLElement | null) => {
      // 1) fijar ventana de 1m
      setFollowSec(60);

      // 2) calcular última ventana de 1m basada en el último dato disponible
      const nowMs =
        xDates.length > 0 ? xDates[xDates.length - 1].getTime() : Date.now();
      const startMs = nowMs - 60_000;

      // 3) Y por defecto = datos visibles EN 1m combinados con umbrales
      const vis = computeYRangeForVisibleX(startMs, nowMs);
      const yDef: [number, number] = vis
        ? [Math.min(vis[0], yMin), Math.max(vis[1], yMax)]
        : defaultYInit;

      // 4) Forzar Y por estado para que el render NO lo reemplace
      setForcedY(yDef);
      setInitialClamp(false);
      setForceNonce((n) => n + 1);

      // 5) Relayout directo (sin autorange) para no disparar autoscale
      if (gd) {
        const x0 = new Date(startMs);
        const x1 = new Date(nowMs);
        window.Plotly?.relayout(gd, {
          "xaxis.autorange": false,
          "xaxis.range": [x0, x1],
          "yaxis.autorange": false,
          "yaxis.range": yDef,
        });
      }
    },
    [xDates, computeYRangeForVisibleX, yMin, yMax, defaultYInit]
  );

  // --- Rangeselector UI ---
  const paintButtons = useCallback(
    (root: HTMLElement | null, active: Label | null) => {
      if (!root) return;
      const btnGroups = root.querySelectorAll<SVGGElement>(
        "g.rangeselector g.button"
      );
      btnGroups.forEach((g) => {
        const textEl = g.querySelector("text");
        const rectEl = g.querySelector("rect");
        const label = (textEl?.textContent || "").trim();
        const isActive = label === active;

        if (rectEl) {
          rectEl.setAttribute(
            "fill",
            isActive ? colors.rangeActive : colors.range
          );
          rectEl.setAttribute("stroke", colors.rangeStroke);
          rectEl.setAttribute("opacity", "1");
        }
        if (textEl) textEl.setAttribute("fill", colors.text);

        g.classList.toggle("grt-active", isActive);
        g.setAttribute("role", "button");
        g.setAttribute("tabindex", "0");
        g.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    },
    [colors.range, colors.rangeActive, colors.rangeStroke, colors.text]
  );

  const hookRangeSelectorClicks = useCallback(
    (root: HTMLElement | null, bound: WeakSet<Element>) => {
      if (!root) return;
      const btnGroups = root.querySelectorAll<SVGGElement>(
        "g.rangeselector g.button"
      );
      btnGroups.forEach((g) => {
        if (bound.has(g)) return;

        const textEl = g.querySelector("text");
        const raw = (textEl?.textContent || "").trim();
        const label: Label | null =
          raw === "30s" || raw === "1m" || raw === "5m" || raw === "Todo"
            ? (raw as Label)
            : null;
        if (!label) return;

        const handler = () => {
          setInitialClamp(false); // al interactuar, desactivamos el clamp inicial
          setForcedY(null);
          setForceNonce((n) => n + 1);
          if (label === "30s") setFollowSec(30);
          else if (label === "1m") setFollowSec(60);
          else if (label === "5m") setFollowSec(300);
          else setFollowSec(null);
          paintButtons(root, label);
        };

        const keyHandler = (ev: KeyboardEvent) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            handler();
          }
        };

        g.addEventListener("click", handler);
        g.addEventListener("keydown", keyHandler);
        bound.add(g);
      });
    },
    [paintButtons]
  );

  // --- Series ---
  const traces: Data[] = useMemo((): Data[] => {
    const hasData = data.length > 0;
    const safeX = xDates;
    const yOrNaN = (arr: number[] | undefined) => (hasData ? arr ?? [] : [NaN]);

    return [
      {
        x: safeX,
        y: yOrNaN(data.map((d) => d.L1 ?? NaN)),
        type: "scatter",
        mode: "lines",
        name: "L1",
        showlegend: true,
        line: { color: "#1d4ed8", width: 1.8, shape: "spline", simplify: true },
        hovertemplate: "L1: %{y:.2f} A<extra></extra>",
      },
      {
        x: safeX,
        y: yOrNaN(data.map((d) => d.L2 ?? NaN)),
        type: "scatter",
        mode: "lines",
        name: "L2",
        showlegend: true,
        line: { color: "#f59e0b", width: 1.8, shape: "spline", simplify: true },
        hovertemplate: "L2: %{y:.2f} A<extra></extra>",
      },
      {
        x: safeX,
        y: yOrNaN(data.map((d) => d.L3 ?? NaN)),
        type: "scatter",
        mode: "lines",
        name: "L3",
        showlegend: true,
        line: { color: "#10b981", width: 1.8, shape: "spline", simplify: true },
        hovertemplate: "L3: %{y:.2f} A<extra></extra>",
      },
      {
        x: safeX,
        y: yOrNaN(data.map((d) => d.Promedio ?? NaN)),
        type: "scatter",
        mode: "lines",
        name: "Promedio",
        showlegend: true,
        line: {
          color: "#6b7280",
          width: 1.8,
          dash: "dash",
          shape: "spline",
          simplify: true,
        },
        hovertemplate: "Promedio: %{y:.2f} A<extra></extra>",
      },
    ];
  }, [xDates, data]);

  // --- Banda + líneas de umbral ---
  const thrShapes: Partial<Shape>[] = useMemo(() => {
    const shapes: Partial<Shape>[] = [];

    // Banda entre umbrales
    if (showBand) {
      shapes.push({
        type: "rect",
        xref: "paper",
        x0: 0,
        x1: 1,
        yref: "y",
        y0: yMin,
        y1: yMax,
        fillcolor: "rgba(234,179,8,0.10)",
        line: { width: 0 },
        layer: "below",
      });
    }

    // Líneas de umbral
    shapes.push(
      {
        type: "line",
        xref: "paper",
        x0: 0,
        x1: 1,
        yref: "y",
        y0: yMin,
        y1: yMin,
        line: { color: "#ef4444", width: 2, dash: "dot" },
        layer: "above",
      },
      {
        type: "line",
        xref: "paper",
        x0: 0,
        x1: 1,
        yref: "y",
        y0: yMax,
        y1: yMax,
        line: { color: "#ef4444", width: 2, dash: "dot" },
        layer: "above",
      }
    );

    return shapes;
  }, [yMin, yMax, showBand]);

  const thrAnnotations = useMemo<Array<Record<string, unknown>>>(() => {
    const base = {
      xref: "paper" as const,
      x: 0,
      xanchor: "left" as const,
      xshift: 6,
      showarrow: false,
      font: { size: 11, color: "#374151" },
      bgcolor: "rgba(0,0,0,0.35)",
      bordercolor: "#e5e7eb",
      borderwidth: 1,
      borderpad: 3,
    };
    return [
      { ...base, yref: "y", y: yMin, text: `${yMin}` },
      { ...base, yref: "y", y: yMax, text: `${yMax}` },
    ];
  }, [yMin, yMax]);

  // --- Layout base (normal) ---
  const baseLayout: Partial<Layout> = useMemo(() => {
    return {
      uirevision: `currents_v7_${yMin}_${yMax}_fs${followSec ?? "auto"}_${
        forcedY ? "forced" : initialClamp ? "init" : "dyn"
      }_${forceNonce}`,
      margin: { l: 60, r: 70, t: 40, b: 10 },
      autosize: true,
      paper_bgcolor: colors.paper,
      plot_bgcolor: colors.plot,
      font: { color: colors.text },
      hovermode: "closest",
      dragmode: "pan",
      xaxis: {
        type: "date",
        autorange: followSec == null,
        range:
          (xRangeFollow as unknown as
            | [string | number | Date, string | number | Date]
            | undefined) ?? undefined,
        gridcolor: colors.grid,
        zeroline: false,
        linewidth: 1,
        linecolor: colors.range,
        tickfont: { size: 12, color: colors.text },
        ticklen: 4,
        showticklabels: true,
        ticks: "outside",
        tickformat: "%H:%M:%S",
        showspikes: true,
        spikemode: "across",
        spikethickness: 1,
        spikedash: "dot",
        spikesnap: "cursor",
        rangeslider: { visible: true, thickness: 0.14, bgcolor: colors.plot },
        rangeselector: {
          buttons: [
            { count: 30, label: "30s", step: "second", stepmode: "backward" },
            { count: 1, label: "1m", step: "minute", stepmode: "backward" },
            { count: 5, label: "5m", step: "minute", stepmode: "backward" },
            { step: "all", label: "Todo" },
          ],
          x: 1,
          xanchor: "right",
          y: 1.02,
          yanchor: "bottom",
          bgcolor: colors.range,
          activecolor: colors.rangeActive,
          font: { size: 12, color: colors.text },
        },
      },
      yaxis: {
        title: {
          text: "Corriente [A]",
          font: { size: 12, color: colors.text },
          standoff: 16,
        },
        range:
          yRange ??
          forcedY ??
          (initialClamp ? initialYRangeWithThresholds : visibleYRange ?? defaultYInit),
        autorange:
          yRange || forcedY ? false : initialClamp ? false : visibleYRange ? false : true,
        gridcolor: colors.grid,
        zeroline: false,
        tickfont: { size: 12, color: colors.text },
        ticklabelposition: "outside",
        ticklen: 4,
        linewidth: 1,
        linecolor: colors.range,
        fixedrange: false,
        showspikes: true,
        spikemode: "toaxis+across",
        spikesnap: "cursor",
        spikethickness: 1,
        spikeddash: "dot",
      },
      shapes: thrShapes,
      annotations: thrAnnotations,
      legend: {
        orientation: "h",
        x: 0.5,
        xanchor: "center",
        y: -0.86,
        yanchor: "top",
        traceorder: "normal",
        font: { size: 11, color: colors.text },
        bgcolor: "rgba(255,255,255,0.85)",
        bordercolor: "#d1d5db",
        borderwidth: 1,
        itemsizing: "constant",
        itemwidth: 68,
        tracegroupgap: 10,
      },
    };
  }, [
    yMin,
    yMax,
    followSec,
    colors,
    yRange,
    xRangeFollow,
    thrShapes,
    thrAnnotations,
    visibleYRange,
    forcedY,
    forceNonce,
    defaultYInit,
    initialClamp,
    initialYRangeWithThresholds,
  ]);

  const layout: Partial<Layout> = { ...baseLayout, height };

  // --- Enganche de Reset axes + posicionamiento estable (normal) ---
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    let resizeTimer: number | null = null;

    // 👉 engancha el botón Reset axes para forzar nuestra vista por defecto
    const bindResetAxes = () => {
      const modebar = root.querySelector<HTMLElement>(".modebar");
      const resetBtn = modebar?.querySelector<HTMLElement>(
        '.modebar-btn[data-title="Reset axes"]'
      );
      if (resetBtn && !boundButtons.current.has(resetBtn)) {
        const handler = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
          resetToDefaultView(graphRef.current);
        };
        resetBtn.addEventListener("click", handler);
        boundButtons.current.add(resetBtn);
      }
    };

    const placeUIStable = () => {
      const modebar = root.querySelector<HTMLElement>(".modebar");
      const bandaHost = bandaBtnRef.current;
      const rootRect = root.getBoundingClientRect();

      // Margen derecho fijo
      const desiredRight = 96;
      if (rightMargin !== desiredRight) setRightMargin(desiredRight);

      // ⬇️ Columna del modebar ANCLADA arriba-derecha (dejamos espacio para el botón Ampliar)
      if (modebar) {
        modebar.style.display = "flex";
        modebar.style.flexDirection = "column";
        modebar.style.alignItems = "center";
        modebar.style.gap = "6px";
        modebar.style.position = "absolute";
        modebar.style.background = "transparent";
        modebar.style.padding = "0";
        modebar.style.willChange = "transform";

        const leftPx = Math.max(0, rootRect.width - 36 - 8); // 36=btn, 8=padding
        modebar.style.top = `${8 + 40}px`; // 40px de holgura para nuestro botón "Ampliar" encima
        modebar.style.left = `${leftPx}px`;
        modebar.style.transform = "none";

        const btns = modebar.querySelectorAll<HTMLElement>(".modebar-btn");
        btns.forEach((b) => {
          b.style.display = "block";
          b.style.margin = "2px 0";
          b.style.width = "34px";
          b.style.height = "34px";
          b.style.boxSizing = "border-box";
        });
      }

      // Botón Banda: arriba-izquierda (diseño igual al rangeselector)
      if (bandaHost) {
        bandaHost.style.position = "absolute";
        bandaHost.style.zIndex = "10";
        bandaHost.style.pointerEvents = "auto";
        bandaHost.style.left = "8px";
        bandaHost.style.top = "4px";
      }

      // Reenganchar Reset axes
      bindResetAxes();
    };

    const onResize = () => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(placeUIStable, 120);
    };

    const initTimer = window.setTimeout(placeUIStable, 80);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(initTimer);
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    };
  }, [rightMargin, resetToDefaultView]);

  // --- Enganche de Reset axes + posicionamiento estable (fullscreen) ---
  useEffect(() => {
    if (!isFullscreen) return;
    const root = fsContainerRef.current;
    if (!root) return;

    let resizeTimer: number | null = null;

    const bindResetAxesFS = () => {
      const modebar = root.querySelector<HTMLElement>(".modebar");
      const resetBtn = modebar?.querySelector<HTMLElement>(
        '.modebar-btn[data-title="Reset axes"]'
      );
      if (resetBtn && !fsBoundButtons.current.has(resetBtn)) {
        const handler = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
          resetToDefaultView(fsGraphRef.current);
        };
        resetBtn.addEventListener("click", handler);
        fsBoundButtons.current.add(resetBtn);
      }
    };

    const placeUIStable = () => {
      const modebar = root.querySelector<HTMLElement>(".modebar");
      const bandaHost = fsBandaBtnRef.current;
      const rootRect = root.getBoundingClientRect();

      // Margen derecho fijo en fullscreen
      const desiredRight = 112;
      if (fsRightMargin !== desiredRight) setFsRightMargin(desiredRight);

      // ⬇️ Columna del modebar anclada arriba-derecha (con espacio para Ampliar)
      if (modebar) {
        modebar.style.display = "flex";
        modebar.style.flexDirection = "column";
        modebar.style.alignItems = "center";
        modebar.style.gap = "6px";
        modebar.style.position = "absolute";
        modebar.style.background = "transparent";
        modebar.style.padding = "0";
        modebar.style.willChange = "transform";

        const leftPx = Math.max(0, rootRect.width - 36 - 8);
        modebar.style.top = `${8 + 40}px`;
        modebar.style.left = `${leftPx}px`;
        modebar.style.transform = "none";

        const btns = modebar.querySelectorAll<HTMLElement>(".modebar-btn");
        btns.forEach((b) => {
          b.style.display = "block";
          b.style.margin = "2px 0";
          b.style.width = "34px";
          b.style.height = "34px";
          b.style.boxSizing = "border-box";
        });
      }

      if (bandaHost) {
        bandaHost.style.position = "absolute";
        bandaHost.style.zIndex = "10";
        bandaHost.style.pointerEvents = "auto";
        bandaHost.style.left = "8px";
        bandaHost.style.top = "8px";
      }

      // Reset axes (fullscreen)
      bindResetAxesFS();
    };

    const onResize = () => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(placeUIStable, 120);
    };

    const initTimer = window.setTimeout(placeUIStable, 80);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(initTimer);
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    };
  }, [isFullscreen, fsRightMargin, resetToDefaultView]);

  // --- Altura fullscreen y cierre por ESC ---
  useEffect(() => {
    if (!isFullscreen) return;
    const setH = () => {
      const h = Math.max(400, Math.floor(window.innerHeight - 120));
      setFsHeight(h);
    };
    setH();
    const onResize = () => setH();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [isFullscreen]);

  const onAfterPlotCommon = (root: HTMLElement | null) => {
    hookRangeSelectorClicks(
      root,
      root === containerRef.current
        ? boundButtons.current
        : fsBoundButtons.current
    );
    paintButtons(root, labelFromFollow(followSec));
  };

  const fsLayout: Partial<Layout> = useMemo(() => {
    const m = (baseLayout.margin ?? { l: 92, r: 200, t: 92, b: 56 }) as {
      l?: number;
      r?: number;
      t?: number;
      b?: number;
    };
    return {
      ...baseLayout,
      height: fsHeight,
      margin: { ...m, r: fsRightMargin },
    };
  }, [baseLayout, fsHeight, fsRightMargin]);

  const modal =
    isFullscreen &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.65)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Gráfica de Corrientes - Vista ampliada"
      >
        <div className="relative w-[min(1400px,95vw)] h-[min(90vh,900px)] rounded-xl border border-white/10 bg-[--third-paper] shadow-2xl">
          <div className="absolute left-0 right-0 top-0 h-12 flex items-center justify-between px-4 border-b border-white/10 bg-black/10 backdrop-blur">
            <div className="text-sm text-gray-100 font-medium">
              Corrientes (Tiempo Real) — Vista ampliada
            </div>
            <div className="flex items-center gap-2">
                <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] leading-none border border-white/10 bg-transparent hover:border-white/25 hover:bg-white/5 transition-colors text-gray-100"
              >
                Close (Esc)
              </button>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 top-12">
            <div className="relative h-full w-full" ref={fsContainerRef}>
              <style>{`
                g.rangeselector g.button.grt-active rect { outline: 1px solid rgba(255,255,255,0.25); }
              `}</style>

              <div className="absolute left-3 top-3" ref={fsBandaBtnRef}>
                <Toolbar
                  onToggleBand={() => setShowBand((v) => !v)}
                  bandActive={showBand}
                  hostRef={fsBandaBtnRef}
                  palette={{
                    range: colors.range,
                    rangeActive: colors.rangeActive,
                    rangeStroke: colors.rangeStroke,
                    text: colors.text,
                  }}
                />
              </div>

              <div className="h-full w-full">
                <Plot
                  data={traces}
                  layout={fsLayout}
                  config={{
                    responsive: true,
                    scrollZoom: true,
                    displaylogo: false,
                    displayModeBar: true,
                  }}
                  onInitialized={(_fig, graphDiv) => {
                    fsGraphRef.current = graphDiv as PlotlyHTMLElement;
                    setTimeout(
                      () => window.dispatchEvent(new Event("resize")),
                      60
                    );

                    graphDiv.addEventListener("plotly_doubleclick", () => {
                      const root = fsContainerRef.current;
                      if (!root) return;
                      const allTexts =
                        root.querySelectorAll<SVGTextElement>(
                          "g.rangeselector g.button text"
                        ) ?? [];
                      const btn = Array.from(allTexts).find(
                        (t) => t.textContent?.trim() === "1m"
                      );
                      btn?.parentElement?.dispatchEvent(
                        new MouseEvent("click", { bubbles: true })
                      );
                    });

                    onAfterPlotCommon(fsContainerRef.current);
                  }}
                  onAfterPlot={() => onAfterPlotCommon(fsContainerRef.current)}
                  onRelayout={(ev) => {
                    // Autoscale (solo cuando autorange = true)
                    if (
                      ev &&
                      (("yaxis.autorange" in ev &&
                        (ev as Record<string, unknown>)["yaxis.autorange"] ===
                          true) ||
                        ("autorange" in ev &&
                          (ev as Record<string, unknown>)["autorange"] ===
                            true))
                    ) {
                      const xr = getCurrentXRangeMs(fsGraphRef.current);
                      if (xr) {
                        const r = computeYRangeForVisibleX(xr[0], xr[1]);
                        if (r) {
                          setForcedY(r);
                          setForceNonce((n) => n + 1);
                        }
                      }
                    }
                    onAfterPlotCommon(fsContainerRef.current);
                  }}
                  onUpdate={() => onAfterPlotCommon(fsContainerRef.current)}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );

  // --- Observer + pintado (normal) ---
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const obs = new MutationObserver(() => {
      hookRangeSelectorClicks(root, boundButtons.current);
      paintButtons(root, labelFromFollow(followSec));
    });
    obs.observe(root, { childList: true, subtree: true });
    observerRef.current = obs;

    hookRangeSelectorClicks(root, boundButtons.current);
    paintButtons(root, labelFromFollow(followSec));

    return () => {
      obs.disconnect();
      observerRef.current = null;
    };
  }, [followSec, hookRangeSelectorClicks, paintButtons, labelFromFollow]);

  // --- Observer + pintado (fullscreen) ---
  useEffect(() => {
    if (!isFullscreen) return;
    const root = fsContainerRef.current;
    if (!root) return;

    if (fsObserverRef.current) {
      fsObserverRef.current.disconnect();
      fsObserverRef.current = null;
    }

    const obs = new MutationObserver(() => {
      hookRangeSelectorClicks(root, fsBoundButtons.current);
      paintButtons(root, labelFromFollow(followSec));
    });
    obs.observe(root, { childList: true, subtree: true });
    fsObserverRef.current = obs;

    hookRangeSelectorClicks(root, fsBoundButtons.current);
    paintButtons(root, labelFromFollow(followSec));

    return () => {
      obs.disconnect();
      fsObserverRef.current = null;
    };
  }, [
    isFullscreen,
    followSec,
    hookRangeSelectorClicks,
    paintButtons,
    labelFromFollow,
  ]);

  useEffect(() => {
    paintButtons(containerRef.current, labelFromFollow(followSec));
    if (isFullscreen)
      paintButtons(fsContainerRef.current, labelFromFollow(followSec));
  }, [followSec, labelFromFollow, paintButtons, isFullscreen]);

  return (
    <>
      <div className="relative w-full" ref={containerRef}>
        <style>{`
          g.rangeselector g.button.grt-active rect { outline: 1px solid rgba(255,255,255,0.25); }
          /* Importante: no bloquear clicks en los textos de los botones */
          /* g.rangeselector g.button text { pointer-events: none; }  <-- Removido */
        `}</style>

        {/* Botón Ampliar "como si fuera el primero" del modebar */}
        <div
          className="absolute right-2 top-2 z-30"
          style={{ pointerEvents: "none" }}
        >
          <div style={{ pointerEvents: "auto" }}>
            <ExpandButton onOpen={() => setIsFullscreen(true)} />
          </div>
        </div>

        {/* Botón Banda arriba-izquierda, con look del rangeselector */}
        <div className="absolute left-0 top-0 z-10" ref={bandaBtnRef}>
          <Toolbar
            onToggleBand={() => setShowBand((v) => !v)}
            bandActive={showBand}
            hostRef={bandaBtnRef}
            palette={{
              range: colors.range,
              rangeActive: colors.rangeActive,
              rangeStroke: colors.rangeStroke,
              text: colors.text,
            }}
          />
        </div>

        <div className="w-full" style={{ height }}>
          <Plot
            data={traces}
            layout={layout}
            config={{
              responsive: true,
              scrollZoom: true,
              displaylogo: false,
              displayModeBar: true,
            }}
            onInitialized={(_figure, graphDiv) => {
              graphRef.current = graphDiv as PlotlyHTMLElement;
              setTimeout(() => window.dispatchEvent(new Event("resize")), 60);

              graphDiv.addEventListener("plotly_doubleclick", () => {
                const root = containerRef.current;
                if (!root) return;
                const allTexts =
                  root.querySelectorAll<SVGTextElement>(
                    "g.rangeselector g.button text"
                  ) ?? [];
                const btn = Array.from(allTexts).find(
                  (t) => t.textContent?.trim() === "1m"
                );
                btn?.parentElement?.dispatchEvent(
                  new MouseEvent("click", { bubbles: true })
                );
              });

              // asegura pintar estados de botones al iniciar
              onAfterPlotCommon(containerRef.current);
            }}
            onAfterPlot={() => onAfterPlotCommon(containerRef.current)}
            onRelayout={(ev) => {
              // Autoscale (solo cuando autorange = true)
              if (
                ev &&
                (("yaxis.autorange" in ev &&
                  (ev as Record<string, unknown>)["yaxis.autorange"] ===
                    true) ||
                  ("autorange" in ev &&
                    (ev as Record<string, unknown>)["autorange"] === true))
              ) {
                const xr = getCurrentXRangeMs(graphRef.current);
                if (xr) {
                  const r = computeYRangeForVisibleX(xr[0], xr[1]);
                  if (r) {
                    setForcedY(r);
                    setForceNonce((n) => n + 1);
                  }
                }
              }
              onAfterPlotCommon(containerRef.current);
            }}
            onUpdate={() => onAfterPlotCommon(containerRef.current)}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>

      {modal}
    </>
  );
}