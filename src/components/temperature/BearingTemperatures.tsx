"use client";

import React from "react";
import { VariableData, getNumericValue } from "@/types/iot.types";

type Props = {
  rodamientoDelantero?: VariableData;
  rodamientoTrasero?: VariableData;
};

const MAX_TEMP = 120; // °C
const WARNING_TEMP = 70;
const DANGER_TEMP = 90;

function clampTemp(value: number | null): number {
  if (value === null || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(value, MAX_TEMP));
}

// Mapea temperatura [0, MAX_TEMP] → ángulo [-90, 90]
function mapTempToAngle(temp: number): number {
  const clamped = clampTemp(temp);
  return -90 + (clamped / MAX_TEMP) * 180;
}

interface Point {
  x: number;
  y: number;
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number
): Point {
  const radians = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function createArcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

function tempToStatusLabel(temp: number): "OK" | "Warning" | "Alarm" {
  if (temp >= DANGER_TEMP) return "Alarm";
  if (temp >= WARNING_TEMP) return "Warning";
  return "OK";
}

function tempToStatusClass(temp: number): string {
  if (temp >= DANGER_TEMP) return "bg-[#ef4444]"; // rojo
  if (temp >= WARNING_TEMP) return "bg-[#facc15]"; // amarillo
  return "bg-[#22c55e]"; // verde
}

interface GaugeProps {
  label: string;
  value: number | null;
}

const BearingGauge: React.FC<GaugeProps> = ({ label, value }) => {
  const cx = 100;
  const cy = 110;
  const radius = 90;

  const temp = clampTemp(value);

  const angleGreenStart = -90;
  const angleGreenEnd = mapTempToAngle(WARNING_TEMP);

  const angleYellowStart = angleGreenEnd;
  const angleYellowEnd = mapTempToAngle(DANGER_TEMP);

  const angleRedStart = angleYellowEnd;
  const angleRedEnd = 90;

  const needleAngle = mapTempToAngle(temp);
  const needleLength = 76;
  const needleEnd = polarToCartesian(cx, cy, needleLength, needleAngle);

  return (
    <div className="flex-1 flex flex-col items-center">
      {/* Título del gauge */}
      <div className="mb-2 text-[11px] md:text-xs font-semibold tracking-[0.18em] uppercase text-slate-800">
        {label}
      </div>

      {/* Gauge (más alto en vertical) */}
      <div className="relative w-52 h-44 md:w-64 md:h-56">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {/* Fondo gris del arco */}
          <path
            d={createArcPath(cx, cy, radius, -90, 90)}
            stroke="#e5e7eb"
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
          />

          {/* Segmento verde */}
          <path
            d={createArcPath(cx, cy, radius, angleGreenStart, angleGreenEnd)}
            stroke="#22c55e"
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
          />

          {/* Segmento amarillo */}
          <path
            d={createArcPath(cx, cy, radius, angleYellowStart, angleYellowEnd)}
            stroke="#facc15"
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
          />

          {/* Segmento rojo */}
          <path
            d={createArcPath(cx, cy, radius, angleRedStart, angleRedEnd)}
            stroke="#ef4444"
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
          />

          {/* Aguja */}
          <line
            x1={cx}
            y1={cy}
            x2={needleEnd.x}
            y2={needleEnd.y}
            stroke="#111827"
            strokeWidth={4}
            strokeLinecap="round"
          />

          {/* Centro de la aguja */}
          <circle cx={cx} cy={cy} r={6} fill="#111827" />

          {/* Marcas 0 y 90 */}
          <text
            x="32"
            y="112"
            fontSize="10"
            fill="#374151"
            textAnchor="middle"
          >
            0
          </text>
          <text
            x="168"
            y="112"
            fontSize="10"
            fill="#374151"
            textAnchor="middle"
          >
            90
          </text>
        </svg>
      </div>

      {/* Valor numérico */}
      <div className="mt-2 text-center">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-600">
          {label}
        </div>
        <div className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums">
          {value !== null && value !== undefined
            ? clampTemp(value).toFixed(1)
            : "--"}{" "}
          <span className="text-base md:text-lg font-semibold text-slate-700">
            °C
          </span>
        </div>
      </div>
    </div>
  );
};

const BearingTemperatures: React.FC<Props> = ({
  rodamientoDelantero,
  rodamientoTrasero,
}) => {
  const frontValue = getNumericValue(rodamientoDelantero);
  const rearValue = getNumericValue(rodamientoTrasero);

  const frontTemp = clampTemp(frontValue);
  const rearTemp = clampTemp(rearValue);

  const hasBothValues =
    frontValue !== null &&
    frontValue !== undefined &&
    rearValue !== null &&
    rearValue !== undefined;

  const deltaT = hasBothValues ? Math.abs(frontTemp - rearTemp) : null;

  const globalTemp = Math.max(frontTemp, rearTemp);
  const globalStatusLabel = tempToStatusLabel(globalTemp);
  const globalStatusClass = tempToStatusClass(globalTemp);

  return (
    <div className="flex flex-col gap-4 items-stretch">
      {/* Dos medidores: izquierda front, derecha rear */}
      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        <BearingGauge label="Front Bearing" value={frontValue} />
        <BearingGauge label="Rear Bearing" value={rearValue} />
      </div>

      {/* Zona inferior: leyenda + ΔT + estado global */}
      <div className="mt-1 flex flex-col items-center gap-3">
        {/* Leyenda de rangos */}
        <div className="flex flex-wrap justify-center gap-4 text-[11px] md:text-xs text-slate-700">
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-full bg-[#22c55e]" />
            <span>0–{WARNING_TEMP} °C · Normal</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-full bg-[#facc15]" />
            <span>
              {WARNING_TEMP}–{DANGER_TEMP} °C · Atención
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-full bg-[#ef4444]" />
            <span>
              {DANGER_TEMP}–{MAX_TEMP} °C · Alarma
            </span>
          </div>
        </div>

        {/* Banda de diagnóstico compacta */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] md:text-xs">
          <div className="flex items-baseline gap-2 text-slate-700">
            <span className="uppercase tracking-[0.16em]">
              ΔT Front–Rear
            </span>
            <span className="text-sm md:text-base font-semibold text-slate-900 tabular-nums">
              {deltaT !== null ? deltaT.toFixed(1) : "--"} °C
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <span className="uppercase tracking-[0.16em]">Status</span>
            <span
              className={[
                "px-3 py-[3px] rounded-full text-[10px] md:text-xs font-semibold uppercase tracking-[0.16em] text-white",
                globalStatusClass,
              ].join(" ")}
            >
              {globalStatusLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BearingTemperatures;
