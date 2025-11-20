"use client";

import React, { useMemo } from "react";
import type { BusbarData } from "@/types/iot.types";
import { getNumericValue } from "@/types/iot.types";

type StatusLevel = "normal" | "warning" | "danger" | "unknown";

type Props = {
  busbar?: BusbarData;
  nominal?: number; // Hz nominal (ej: 60)
  warningTolerancePercent?: number; // ej: 0.5 => ±0.5 %
  dangerTolerancePercent?: number; // ej: 1 => ±1 %
};

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function getStatus(
  valueHz: number | null,
  nominal: number,
  warningTolerancePercent: number,
  dangerTolerancePercent: number
): StatusLevel {
  if (valueHz === null) return "unknown";
  const diff = Math.abs(valueHz - nominal);
  const diffPercent = (diff / nominal) * 100;

  if (diffPercent <= warningTolerancePercent) return "normal";
  if (diffPercent <= dangerTolerancePercent) return "warning";
  return "danger";
}

export default function BusbarFrequencyGauge({
  busbar,
  nominal = 60,
  warningTolerancePercent = 0.5,
  dangerTolerancePercent = 1,
}: Props) {
  const freqHz = getNumericValue(busbar?.frecuencia);

  const status: StatusLevel = useMemo(
    () => getStatus(freqHz, nominal, warningTolerancePercent, dangerTolerancePercent),
    [freqHz, nominal, warningTolerancePercent, dangerTolerancePercent]
  );

  const displayHz = freqHz !== null ? freqHz.toFixed(2) : "—";

  const statusText = useMemo((): string => {
    switch (status) {
      case "normal":
        return "Dentro de rango";
      case "warning":
        return "Desviación moderada";
      case "danger":
        return "Fuera de rango";
      case "unknown":
      default:
        return "Sin datos";
    }
  }, [status]);

  const palette = useMemo(() => {
    switch (status) {
      case "normal":
        return {
          main: "#059669", // verde
          soft: "rgba(16,185,129,0.15)",
        };
      case "warning":
        return {
          main: "#f59e0b", // amber
          soft: "rgba(245,158,11,0.18)",
        };
      case "danger":
        return {
          main: "#ef4444", // rojo
          soft: "rgba(239,68,68,0.18)",
        };
      case "unknown":
      default:
        return {
          main: "#9ca3af", // gris
          soft: "rgba(156,163,175,0.18)",
        };
    }
  }, [status]);

  // Geometría del gauge (semicírculo 240°)
  const angleDegrees = useMemo(() => {
    const minHz = nominal - nominal * 0.2; // -20%
    const maxHz = nominal + nominal * 0.2; // +20%
    const value = freqHz ?? nominal;
    const ratio = clamp((value - minHz) / (maxHz - minHz), 0, 1);
    // -120° a +120°
    return -120 + ratio * 240;
  }, [freqHz, nominal]);

  const gaugeCoords = useMemo(() => {
    const cx = 80;
    const cy = 80;
    const radius = 60;

    const aStart = (-120 * Math.PI) / 180;
    const aEnd = (120 * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(aStart);
    const y1 = cy + radius * Math.sin(aStart);
    const x2 = cx + radius * Math.cos(aEnd);
    const y2 = cy + radius * Math.sin(aEnd);

    const largeArcFlag = 1;
    const sweepFlag = 1;

    const pointerAngleRad = (angleDegrees * Math.PI) / 180;
    const pointerLength = radius * 0.9;
    const px = cx + pointerLength * Math.cos(pointerAngleRad);
    const py = cy + pointerLength * Math.sin(pointerAngleRad);

    return { cx, cy, radius, x1, y1, x2, y2, largeArcFlag, sweepFlag, px, py };
  }, [angleDegrees]);

  return (
    <div className="w-full flex flex-col gap-1">
      {/* Valor numérico + estado (sin título global) */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1">
          <span
            className="text-3xl font-semibold tabular-nums"
            style={{ color: palette.main }}
          >
            {displayHz}
          </span>
          <span className="text-xs text-gray-500">Hz</span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">
            Busbar
          </span>
          <span className="text-[11px] text-gray-700">{statusText}</span>
        </div>
      </div>

      {/* Gauge */}
      <div className="mt-1 flex justify-center">
        <svg width={160} height={90} viewBox="0 0 160 90">
          {/* Fondo suave */}
          <defs>
            <radialGradient id="bb-freq-bg" cx="50%" cy="90%" r="80%">
              <stop offset="0%" stopColor="rgba(15,23,42,0.05)" />
              <stop offset="100%" stopColor="rgba(15,23,42,0.0)" />
            </radialGradient>
          </defs>
          <rect
            x={0}
            y={20}
            width={160}
            height={70}
            fill="url(#bb-freq-bg)"
            rx={12}
          />

          {/* Arco base */}
          <path
            d={`M ${gaugeCoords.x1} ${gaugeCoords.y1}
                A ${gaugeCoords.radius} ${gaugeCoords.radius} 0 ${gaugeCoords.largeArcFlag} ${gaugeCoords.sweepFlag} ${gaugeCoords.x2} ${gaugeCoords.y2}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={10}
            strokeLinecap="round"
          />

          {/* Arco de rango nominal (verde/amber/rojo según estado) */}
          <path
            d={`M ${gaugeCoords.x1} ${gaugeCoords.y1}
                A ${gaugeCoords.radius} ${gaugeCoords.radius} 0 ${gaugeCoords.largeArcFlag} ${gaugeCoords.sweepFlag} ${gaugeCoords.x2} ${gaugeCoords.y2}`}
            fill="none"
            stroke={palette.soft}
            strokeWidth={8}
            strokeLinecap="round"
          />

          {/* Marcadores de nominal ± tolerancias */}
          {freqHz !== null && (
            <>
              {/* Nominal */}
              <circle
                cx={gaugeCoords.cx}
                cy={gaugeCoords.cy}
                r={2}
                fill="#9ca3af"
              />
            </>
          )}

          {/* Aguja */}
          <line
            x1={gaugeCoords.cx}
            y1={gaugeCoords.cy}
            x2={gaugeCoords.px}
            y2={gaugeCoords.py}
            stroke={palette.main}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle
            cx={gaugeCoords.cx}
            cy={gaugeCoords.cy}
            r={5}
            fill="#ffffff"
            stroke={palette.main}
            strokeWidth={2}
          />

          {/* Labels inferiores: rangos de colores (no texto largo) */}
          <g transform={`translate(${gaugeCoords.cx}, 82)`}>
            <g transform="translate(-26, 0)">
              <circle r={3} fill="#059669" />
              <text
                x={6}
                y={3}
                fontSize={9}
                fill="#4b5563"
              >
                OK
              </text>
            </g>
            <g transform="translate(5, 0)">
              <circle r={3} fill="#f59e0b" />
              <text
                x={6}
                y={3}
                fontSize={9}
                fill="#4b5563"
              >
                Warn
              </text>
            </g>
            <g transform="translate(36, 0)">
              <circle r={3} fill="#ef4444" />
              <text
                x={6}
                y={3}
                fontSize={9}
                fill="#4b5563"
              >
                Alarm
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* Banda numérica de referencia */}
      <div className="mt-1 flex items-center justify-between text-[10px] text-gray-600">
        <span>Nominal: {nominal.toFixed(1)} Hz</span>
        <span>
          ±{warningTolerancePercent}% normal · ±{dangerTolerancePercent}% alerta
        </span>
      </div>
    </div>
  );
}
