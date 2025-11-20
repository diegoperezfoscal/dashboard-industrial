"use client";

import React from "react";
import { VariableData, getNumericValue } from "@/types/iot.types";

type Props = {
  secuenciaPositiva?: VariableData;
  secuenciaNegativa?: VariableData;
  secuenciaZero?: VariableData;
};

/** Rangos industriales base */
const POS_MAX = 100; // positiva: escala completa
const NEG_MAX = 10;  // negativa: nos importa 0–10%
const ZERO_MAX = 5;  // zero: nos importa 0–5%

const NEG_WARNING = 1;
const NEG_DANGER = 3;

const ZERO_WARNING = 1;
const ZERO_DANGER = 2;

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

/** Normaliza un valor al rango [0, max] solo para el dibujo */
function normalizeForGauge(value: number | null, max: number): number {
  if (value === null || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > max) return max;
  return value;
}

// Mapea [0, max] → ángulo [-90, 90]
function mapToAngle(value: number | null, max: number): number {
  const clamped = normalizeForGauge(value, max);
  const ratio = max === 0 ? 0 : clamped / max;
  return -90 + ratio * 180;
}

/** Colores industriales para estado */
function getPositiveColor(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "#6b7280"; // gris neutro
  if (v >= 95) return "#16a34a";      // verde OK
  if (v >= 90) return "#eab308";      // ámbar
  return "#dc2626";                   // rojo
}

function getNegativeColor(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "#6b7280";
  if (v <= NEG_WARNING) return "#16a34a"; // verde
  if (v <= NEG_DANGER) return "#eab308";  // ámbar
  return "#dc2626";                       // rojo
}

function getZeroColor(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "#6b7280";
  if (v <= ZERO_WARNING) return "#16a34a"; // verde
  if (v <= ZERO_DANGER) return "#eab308";  // ámbar
  return "#dc2626";                        // rojo
}

/** Etiquetas de estado según valor */
function getPositiveStatusLabel(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "No data";
  if (v >= 95) return "OK";
  if (v >= 90) return "Warning";
  return "Alarm";
}

function getNegativeStatusLabel(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "No data";
  if (v <= NEG_WARNING) return "OK";
  if (v <= NEG_DANGER) return "Warning";
  return "Alarm";
}

function getZeroStatusLabel(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "No data";
  if (v <= ZERO_WARNING) return "OK";
  if (v <= ZERO_DANGER) return "Warning";
  return "Alarm";
}

/** Chip de estado compacto con color */
function StatusChip(props: { color: string; label: string }) {
  const { color, label } = props;
  const bgWithAlpha = `${color}22`; // hex + transparencia ligera

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: bgWithAlpha, color }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

const GeneratorSequenceGauge: React.FC<Props> = ({
  secuenciaPositiva,
  secuenciaNegativa,
  secuenciaZero,
}) => {
  const rawPositiva = getNumericValue(secuenciaPositiva);
  const rawNegativa = getNumericValue(secuenciaNegativa);
  const rawZero = getNumericValue(secuenciaZero);

  const cx = 100;
  const cy = 110;

  const outerRadius = 90;  // Positiva
  const middleRadius = 74; // Negativa
  const innerRadius = 58;  // Zero

  const startAngle = -90;
  const endAngleFull = 90;

  // --- Ángulos de segmentos (zonas) para cada secuencia ---

  // POSITIVE: rojo 0–90, ámbar 90–95, verde 95–100
  const posRedEnd = mapToAngle(90, POS_MAX);
  const posYellowEnd = mapToAngle(95, POS_MAX);
  const posMaxAngle = mapToAngle(POS_MAX, POS_MAX);

  // NEGATIVE: verde 0–1, ámbar 1–3, rojo 3–10
  const negGreenEnd = mapToAngle(NEG_WARNING, NEG_MAX);
  const negYellowEnd = mapToAngle(NEG_DANGER, NEG_MAX);
  const negMaxAngle = mapToAngle(NEG_MAX, NEG_MAX);

  // ZERO: verde 0–1, ámbar 1–2, rojo 2–5
  const zeroGreenEnd = mapToAngle(ZERO_WARNING, ZERO_MAX);
  const zeroYellowEnd = mapToAngle(ZERO_DANGER, ZERO_MAX);
  const zeroMaxAngle = mapToAngle(ZERO_MAX, ZERO_MAX);

  // --- Ángulos para indicadores de valor actual ---
  const positivaEndAngle = mapToAngle(rawPositiva, POS_MAX);
  const negativaEndAngle = mapToAngle(rawNegativa, NEG_MAX);
  const zeroEndAngle = mapToAngle(rawZero, ZERO_MAX);

  // Colores / estado por secuencia
  const positiveColor = getPositiveColor(rawPositiva);
  const negativeColor = getNegativeColor(rawNegativa);
  const zeroColor = getZeroColor(rawZero);

  const positiveStatus = getPositiveStatusLabel(rawPositiva);
  const negativeStatus = getNegativeStatusLabel(rawNegativa);
  const zeroStatus = getZeroStatusLabel(rawZero);

  // Puntos para las letras P / N / Z (un poco más lejos del arco)
  const pLabelPoint = polarToCartesian(cx, cy, outerRadius + 7, startAngle);
  const nLabelPoint = polarToCartesian(cx, cy, middleRadius + 7, startAngle);
  const zLabelPoint = polarToCartesian(cx, cy, innerRadius + 7, startAngle);

  return (
    <div className="flex flex-col md:flex-row gap-6 items-stretch">
      {/* Lado izquierdo: Gauge triple radial */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Leyenda compacta de colores arriba del medidor */}
        <div className="flex items-center justify-center gap-3 mb-2 text-[10px] text-slate-600">
          <div className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#16a34a" }}
            />
            <span>OK</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#eab308" }}
            />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#dc2626" }}
            />
            <span>Alarm</span>
          </div>
        </div>

        <div className="relative w-48 h-32 md:w-60 md:h-40">
          <svg viewBox="0 0 200 120" className="w-full h-full">
            {/* Pistas de fondo gris para cada anillo */}
            <path
              d={createArcPath(cx, cy, outerRadius, startAngle, endAngleFull)}
              stroke="#e5e7eb"
              strokeWidth={7}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={createArcPath(cx, cy, middleRadius, startAngle, endAngleFull)}
              stroke="#e5e7eb"
              strokeWidth={7}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={createArcPath(cx, cy, innerRadius, startAngle, endAngleFull)}
              stroke="#e5e7eb"
              strokeWidth={7}
              fill="none"
              strokeLinecap="round"
            />

            {/* ================================ */}
            {/* ZONAS COLOREADAS (FONDO SUAVE)  */}
            {/* ================================ */}

            {/* POSITIVE (outer) */}
            {/* Rojo: 0–90% */}
            <path
              d={createArcPath(cx, cy, outerRadius, startAngle, posRedEnd)}
              stroke="#dc2626"
              strokeWidth={4}
              strokeOpacity={0.18}
              fill="none"
              strokeLinecap="round"
            />
            {/* Ámbar: 90–95% */}
            <path
              d={createArcPath(cx, cy, outerRadius, posRedEnd, posYellowEnd)}
              stroke="#eab308"
              strokeWidth={4}
              strokeOpacity={0.24}
              fill="none"
              strokeLinecap="round"
            />
            {/* Verde: 95–100% */}
            <path
              d={createArcPath(cx, cy, outerRadius, posYellowEnd, posMaxAngle)}
              stroke="#16a34a"
              strokeWidth={4}
              strokeOpacity={0.28}
              fill="none"
              strokeLinecap="round"
            />

            {/* NEGATIVE (middle) */}
            {/* Verde: 0–1% */}
            <path
              d={createArcPath(cx, cy, middleRadius, startAngle, negGreenEnd)}
              stroke="#16a34a"
              strokeWidth={4}
              strokeOpacity={0.28}
              fill="none"
              strokeLinecap="round"
            />
            {/* Ámbar: 1–3% */}
            <path
              d={createArcPath(cx, cy, middleRadius, negGreenEnd, negYellowEnd)}
              stroke="#eab308"
              strokeWidth={4}
              strokeOpacity={0.24}
              fill="none"
              strokeLinecap="round"
            />
            {/* Rojo: 3–10% */}
            <path
              d={createArcPath(cx, cy, middleRadius, negYellowEnd, negMaxAngle)}
              stroke="#dc2626"
              strokeWidth={4}
              strokeOpacity={0.18}
              fill="none"
              strokeLinecap="round"
            />

            {/* ZERO (inner) */}
            {/* Verde: 0–1% */}
            <path
              d={createArcPath(cx, cy, innerRadius, startAngle, zeroGreenEnd)}
              stroke="#16a34a"
              strokeWidth={4}
              strokeOpacity={0.28}
              fill="none"
              strokeLinecap="round"
            />
            {/* Ámbar: 1–2% */}
            <path
              d={createArcPath(cx, cy, innerRadius, zeroGreenEnd, zeroYellowEnd)}
              stroke="#eab308"
              strokeWidth={4}
              strokeOpacity={0.24}
              fill="none"
              strokeLinecap="round"
            />
            {/* Rojo: 2–5% */}
            <path
              d={createArcPath(cx, cy, innerRadius, zeroYellowEnd, zeroMaxAngle)}
              stroke="#dc2626"
              strokeWidth={4}
              strokeOpacity={0.18}
              fill="none"
              strokeLinecap="round"
            />

            {/* ================================ */}
            {/* INDICADORES DE VALOR ACTUAL      */}
            {/* ================================ */}

            {/* Secuencia positiva (outer, color según estado) */}
            <path
              d={createArcPath(
                cx,
                cy,
                outerRadius,
                startAngle,
                positivaEndAngle
              )}
              stroke={positiveColor}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
            />

            {/* Secuencia negativa (middle, color según estado) */}
            <path
              d={createArcPath(
                cx,
                cy,
                middleRadius,
                startAngle,
                negativaEndAngle
              )}
              stroke={negativeColor}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
            />

            {/* Secuencia cero (inner, color según estado) */}
            <path
              d={createArcPath(
                cx,
                cy,
                innerRadius,
                startAngle,
                zeroEndAngle
              )}
              stroke={zeroColor}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
            />

            {/* Etiqueta central */}
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              className="fill-slate-500"
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              SEQUENCES
            </text>

            {/* Letras P / N / Z, un poco separadas del arco */}
            <text
              x={pLabelPoint.x}
              y={pLabelPoint.y + 4}
              textAnchor="middle"
              className="fill-slate-500"
              style={{ fontSize: 9, fontWeight: 600 }}
            >
              P
            </text>
            <text
              x={nLabelPoint.x}
              y={nLabelPoint.y + 4}
              textAnchor="middle"
              className="fill-slate-500"
              style={{ fontSize: 9, fontWeight: 600 }}
            >
              N
            </text>
            <text
              x={zLabelPoint.x}
              y={zLabelPoint.y + 4}
              textAnchor="middle"
              className="fill-slate-500"
              style={{ fontSize: 9, fontWeight: 600 }}
            >
              Z
            </text>
          </svg>
        </div>
      </div>

      {/* Lado derecho: lecturas digitales compactas */}
      <div className="flex-1 flex flex-col justify-center gap-4 px-2 md:px-4">
        {/* Positive */}
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-600">
            Positive sequence
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl md:text-4xl font-bold text-slate-900 tabular-nums">
              {rawPositiva !== null && rawPositiva !== undefined
                ? rawPositiva.toFixed(1)
                : "--"}
            </div>
            <span className="text-lg md:text-xl font-semibold text-slate-700">
              %
            </span>
            <div className="ml-auto">
              <StatusChip color={positiveColor} label={positiveStatus} />
            </div>
          </div>
        </div>

        {/* Negative & Zero en fila compacta */}
        <div className="grid grid-cols-2 gap-3 text-xs md:text-sm text-slate-700">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold uppercase tracking-[0.12em] text-[11px] text-slate-600">
                Negative
              </span>
              <StatusChip color={negativeColor} label={negativeStatus} />
            </div>
            <div className="text-base md:text-lg font-semibold text-slate-900 tabular-nums">
              {rawNegativa !== null && rawNegativa !== undefined
                ? rawNegativa.toFixed(2)
                : "--"}{" "}
              %
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold uppercase tracking-[0.12em] text-[11px] text-slate-600">
                Zero
              </span>
              <StatusChip color={zeroColor} label={zeroStatus} />
            </div>
            <div className="text-base md:text-lg font-semibold text-slate-900 tabular-nums">
              {rawZero !== null && rawZero !== undefined
                ? rawZero.toFixed(2)
                : "--"}{" "}
              %
            </div>
          </div>
        </div>

        {/* referencia corta */}
        <div className="text-[10px] text-slate-500 mt-1">
          Ref: Pos ≥ 95% · Neg ≤ {NEG_WARNING}% · Zero ≤ {ZERO_WARNING}%.
        </div>
      </div>
    </div>
  );
};

export default GeneratorSequenceGauge;
