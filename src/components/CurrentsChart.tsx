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

type ToolbarProps = {
  onToggleBand: () => void;
  bandActive: boolean;
  hostRef: React.RefObject<HTMLDivElement | null>;
};

function Toolbar({ onToggleBand, bandActive, hostRef }: ToolbarProps) {
  return (
    <div ref={hostRef}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleBand}
          title={bandActive ? "Ocultar banda" : "Mostrar banda"}
          aria-label={bandActive ? "Ocultar banda" : "Mostrar banda"}
          aria-checked={bandActive}
          role="switch"
          className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-colors ${
            bandActive
              ? "bg-yellow-100 border-yellow-300 text-yellow-700"
              : "bg-white/70 border-gray-300 text-gray-700 hover:bg-white"
          }`}
          style={{ pointerEvents: "auto" }}
        >
          <span
            aria-hidden
            className="inline-block h-2.5 w-4 rounded-sm border border-yellow-400"
            style={{
              background: bandActive ? "rgba(234,179,8,0.28)" : "transparent",
            }}
          />
          <span className="font-medium">Banda</span>
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
      title="Ampliar"
      aria-label="Ampliar"
      className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-white transition-colors"
      style={{ pointerEvents: "auto" }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M15 3h6v6" />
        <path d="M9 21H3v-6" />
        <path d="M21 3l-7 7" />
        <path d="M3 21l7-7" />
      </svg>
      <span className="font-medium">Ampliar</span>
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
      plot:"#F5F5F5",
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
    if (showBand) {
      shapes.push({
        type: "rect",
        xref: "paper",
        yref: "paper",
        x0: 0, x1: 1,
        y0: 0, y1: 1,
        fillcolor: "rgba(0,0,0,0)",
        line: { color: "#cbd5e1", width: 1.5 }, // borde visible
        layer: "above"
      });
    }
    // líneas de umbral encima de todo
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
      margin: { l: 92, r: rightMargin, t: 86, b: 56 },
      title: {
        text: "Corrientes (Tiempo Real)",
        font: { size: 16, color: colors.text },
      },
      autosize: false,
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
        orientation: "v",
        x: 1,
        xanchor: "left",
        y: 0.5,
        yanchor: "middle",
        font: { size: 11, color: colors.text },
        bgcolor: "rgba(255,255,255,0.72)",
        bordercolor: "#d1d5db",
        borderwidth: 1,
        itemsizing: "constant",
        tracegroupgap: 6,
        itemwidth: 48,
      },
    };
  }, [
    yMin,
    yMax,
    followSec,
    colors,
    rightMargin,
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

    const getLegendRect = (): DOMRect | null => {
      const legend = root.querySelector<SVGGElement>(".legend");
      return legend ? legend.getBoundingClientRect() : null;
    };

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
      const legendRect = getLegendRect();

      const legendWidth = Math.max(140, Math.floor(legendRect?.width ?? 160));
      const extraForModebar = 44;
      const computedRight = Math.min(320, legendWidth + extraForModebar + 12);
      if (computedRight !== rightMargin) setRightMargin(computedRight);

      if (modebar) {
        modebar.style.display = "flex";
        modebar.style.flexDirection = "column";
        modebar.style.alignItems = "center";
        modebar.style.gap = "6px";
        modebar.style.position = "absolute";
        modebar.style.background = "transparent";
        modebar.style.padding = "0";
        modebar.style.willChange = "transform";

        const topPx = rootRect.height / 2;
        const plotRightX = rootRect.width - 8;
        const leftPx = legendRect
          ? Math.min(plotRightX - 36, legendRect.right - rootRect.left + 8)
          : Math.min(plotRightX - 36, rootRect.width - (legendWidth + 8));

        modebar.style.top = `${topPx}px`;
        modebar.style.left = `${leftPx}px`;
        modebar.style.transform = "translateY(-50%)";

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

        if (legendRect) {
          const btnRect = bandaHost.getBoundingClientRect();
          const desiredLeft = legendRect.left - rootRect.left;
          const desiredTop = Math.max(
            8,
            legendRect.top - rootRect.top - (btnRect.height || 36) - 8
          );
          bandaHost.style.left = `${desiredLeft}px`;
          bandaHost.style.top = `${desiredTop}px`;
        } else {
          bandaHost.style.right = "16px";
          bandaHost.style.top = "12px";
          bandaHost.style.left = "auto";
        }
      }

      // asegurar el hook del Reset axes cada vez que reubicamos la modebar
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

    const getLegendRect = (): DOMRect | null => {
      const legend = root.querySelector<SVGGElement>(".legend");
      return legend ? legend.getBoundingClientRect() : null;
    };

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
      const legendRect = getLegendRect();

      const legendWidth = Math.max(160, Math.floor(legendRect?.width ?? 180));
      const extraForModebar = 44;
      const computedRight = Math.min(360, legendWidth + extraForModebar + 12);
      if (computedRight !== fsRightMargin) setFsRightMargin(computedRight);

      if (modebar) {
        modebar.style.display = "flex";
        modebar.style.flexDirection = "column";
        modebar.style.alignItems = "center";
        modebar.style.gap = "6px";
        modebar.style.position = "absolute";
        modebar.style.background = "transparent";
        modebar.style.padding = "0";
        modebar.style.willChange = "transform";

        const topPx = rootRect.height / 2;
        const plotRightX = rootRect.width - 8;
        const leftPx = legendRect
          ? Math.min(plotRightX - 36, legendRect.right - rootRect.left + 8)
          : Math.min(plotRightX - 36, rootRect.width - (legendWidth + 8));

  modebar.style.top = `${topPx}px`;
  modebar.style.left = `${leftPx}px`;
  modebar.style.transform = "translateY(-50%)";

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

        if (legendRect) {
          const btnRect = bandaHost.getBoundingClientRect();
          const desiredLeft = legendRect.left - rootRect.left;
          const desiredTop = Math.max(
            8,
            legendRect.top - rootRect.top - (btnRect.height || 36) - 8
          );
          bandaHost.style.left = `${desiredLeft}px`;
          bandaHost.style.top = `${desiredTop}px`;
        } else {
          bandaHost.style.right = "16px";
          bandaHost.style.top = "12px";
          bandaHost.style.left = "auto";
        }
      }

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
        aria-label="Gráfica de Corrientes - Ampliada"
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
                Cerrar (Esc)
              </button>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 top-12">
            <div className="relative h-full w-full" ref={fsContainerRef}>
              <style>{`
                g.rangeselector g.button.grt-active rect { outline: 1px solid rgba(255,255,255,0.25); }
                g.rangeselector g.button text { pointer-events: none; }
              `}</style>

              <div className="absolute left-3 top-3" ref={fsBandaBtnRef}>
                <Toolbar
                  onToggleBand={() => setShowBand((v) => !v)}
                  bandActive={showBand}
                  hostRef={fsBandaBtnRef}
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
                    // Mantén la lógica de autoscale (solo cuando autorange = true)
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
      <div
        className="relative w-full"
        ref={containerRef}
      >
        <style>{`
          g.rangeselector g.button.grt-active rect { outline: 1px solid rgba(255,255,255,0.25); }
          g.rangeselector g.button text { pointer-events: none; }
        `}</style>

        <div className="absolute right-8 top-2 z-30">
          <ExpandButton onOpen={() => setIsFullscreen(true)} />
        </div>

        <div className="absolute left-0 top-0 z-10" ref={bandaBtnRef}>
          <Toolbar
            onToggleBand={() => setShowBand((v) => !v)}
            bandActive={showBand}
            hostRef={bandaBtnRef}
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
              // Mantén la lógica de autoscale (solo cuando autorange = true)
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
