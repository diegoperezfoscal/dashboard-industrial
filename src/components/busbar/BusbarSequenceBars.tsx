// industrial-iot-lab/dashboard-industrial/src/components/BusbarSequenceBars.tsx
"use client";

import React, { useMemo } from "react";
import type { BusbarData } from "@/types/iot.types";
import { getNumericValue } from "@/types/iot.types";

type Props = {
  busbar?: BusbarData;
};

type Severity = "ok" | "warning" | "alarm" | "nodata";

interface SequenceRow {
  label: string;
  short: "P" | "N" | "Z";
  magnitude: string;
  ratioText: string;
  severity: Severity;
}

const NEG_WARN = 1;
const NEG_ALARM = 3;
const ZERO_WARN = 1;
const ZERO_ALARM = 2;

function classifyNegative(ratio: number | null): Severity {
  if (ratio === null || Number.isNaN(ratio)) return "nodata";
  if (ratio > NEG_ALARM) return "alarm";
  if (ratio > NEG_WARN) return "warning";
  return "ok";
}

function classifyZero(ratio: number | null): Severity {
  if (ratio === null || Number.isNaN(ratio)) return "nodata";
  if (ratio > ZERO_ALARM) return "alarm";
  if (ratio > ZERO_WARN) return "warning";
  return "ok";
}

function severityRank(sev: Severity): number {
  switch (sev) {
    case "nodata":
      return 0;
    case "ok":
      return 1;
    case "warning":
      return 2;
    case "alarm":
      return 3;
    default:
      return 0;
  }
}

function severityToColor(sev: Severity): string {
  switch (sev) {
    case "ok":
      return "#22c55e"; // verde
    case "warning":
      return "#fbbf24"; // amarillo
    case "alarm":
      return "#ef4444"; // rojo
    case "nodata":
    default:
      return "#9ca3af"; // gris
  }
}

function severityToLabel(sev: Severity): string {
  switch (sev) {
    case "ok":
      return "OK";
    case "warning":
      return "Warning";
    case "alarm":
      return "Alarm";
    case "nodata":
    default:
      return "Sin datos";
  }
}

export default function BusbarSequenceBars({ busbar }: Props) {
  // Magnitudes crudas
  const rawPos = useMemo(
    () => getNumericValue(busbar?.secuencia_positiva),
    [busbar]
  );
  const rawNeg = useMemo(
    () => getNumericValue(busbar?.secuencia_negativa),
    [busbar]
  );
  const rawZero = useMemo(
    () => getNumericValue(busbar?.secuencia_zero),
    [busbar]
  );

  const absPos = typeof rawPos === "number" ? Math.abs(rawPos) : 0;
  const absNeg = typeof rawNeg === "number" ? Math.abs(rawNeg) : 0;
  const absZero = typeof rawZero === "number" ? Math.abs(rawZero) : 0;

  // Ratios N/P y Z/P en %
  const negRatio = useMemo(() => {
    if (typeof rawNeg !== "number") return null;
    if (!absPos || absPos <= 0) return null;
    return (absNeg / absPos) * 100;
  }, [rawNeg, absNeg, absPos]);

  const zeroRatio = useMemo(() => {
    if (typeof rawZero !== "number") return null;
    if (!absPos || absPos <= 0) return null;
    return (absZero / absPos) * 100;
  }, [rawZero, absZero, absPos]);

  // Filas KPI
  const rows: SequenceRow[] = useMemo(() => {
    const positive: SequenceRow = {
      label: "Secuencia positiva",
      short: "P",
      magnitude:
        typeof rawPos === "number" ? `${rawPos.toFixed(1)} V` : "—",
      ratioText: "—",
      severity:
        rawPos === null || Number.isNaN(rawPos) ? "nodata" : "ok",
    };

    const negative: SequenceRow = {
      label: "Secuencia negativa",
      short: "N",
      magnitude:
        typeof rawNeg === "number" ? `${rawNeg.toFixed(2)} V` : "—",
      ratioText:
        negRatio !== null
          ? `${negRatio.toFixed(2)} % de P`
          : "—",
      severity: classifyNegative(negRatio),
    };

    const zero: SequenceRow = {
      label: "Secuencia zero",
      short: "Z",
      magnitude:
        typeof rawZero === "number" ? `${rawZero.toFixed(2)} V` : "—",
      ratioText:
        zeroRatio !== null
          ? `${zeroRatio.toFixed(2)} % de P`
          : "—",
      severity: classifyZero(zeroRatio),
    };

    return [positive, negative, zero];
  }, [rawPos, rawNeg, rawZero, negRatio, zeroRatio]);

  // Severidad global de equilibrio (solo N y Z)
  const worstSeverity: Severity = useMemo(() => {
    const nz = rows.filter((r) => r.short !== "P");
    if (nz.length === 0) return "nodata";

    let worst: Severity = "nodata";
    for (const r of nz) {
      if (severityRank(r.severity) > severityRank(worst)) {
        worst = r.severity;
      }
    }
    return worst;
  }, [rows]);

  const globalColor = severityToColor(worstSeverity);
  const globalLabel =
    worstSeverity === "ok"
      ? "Equilibrio: OK"
      : worstSeverity === "warning"
      ? "Equilibrio: Warning"
      : worstSeverity === "alarm"
      ? "Equilibrio: Alarm"
      : "Equilibrio: Sin datos";

  return (
    <div className="w-full space-y-3">
      {/* Estado global */}
      <div className="flex items-center justify-start text-[11px] text-gray-600">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium"
          style={{
            borderColor: `${globalColor}33`,
            backgroundColor: `${globalColor}1a`,
            color: globalColor,
          }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: globalColor }}
          />
          {globalLabel}
        </span>
      </div>

      {/* Tabla de KPIs */}
      <div className="border border-slate-200 rounded-md overflow-hidden bg-slate-50/60">
        <div className="grid grid-cols-4 text-[10px] font-medium text-slate-600 bg-slate-100/80 border-b border-slate-200">
          <div className="px-2 py-1.5">Secuencia</div>
          <div className="px-2 py-1.5 text-right">Magnitud</div>
          <div className="px-2 py-1.5 text-right">% de P</div>
          <div className="px-2 py-1.5 text-center">Estado</div>
        </div>

        {rows.map((row, index) => {
          const sevColor = severityToColor(row.severity);
          const sevLabel = severityToLabel(row.severity);
          const isEven = index % 2 === 0;

          return (
            <div
              key={row.short}
              className={`grid grid-cols-4 text-[11px] ${
                isEven ? "bg-white" : "bg-slate-50/80"
              }`}
            >
              <div className="px-2 py-1.5 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold bg-slate-800 text-white">
                  {row.short}
                </span>
                <span className="text-slate-700">{row.label}</span>
              </div>
              <div className="px-2 py-1.5 text-right tabular-nums text-slate-800">
                {row.magnitude}
              </div>
              <div className="px-2 py-1.5 text-right tabular-nums text-slate-700">
                {row.ratioText}
              </div>
              <div className="px-2 py-1.5 flex items-center justify-center">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    backgroundColor: `${sevColor}12`,
                    color: sevColor,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: sevColor }}
                  />
                  {sevLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leyenda de colores */}
      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: severityToColor("ok") }}
          />
          <span>OK</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: severityToColor("warning") }}
          />
          <span>Warning</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: severityToColor("alarm") }}
          />
          <span>Alarm</span>
        </div>
      </div>
    </div>
  );
}
