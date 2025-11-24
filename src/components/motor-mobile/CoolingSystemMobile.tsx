// industrial-iot-lab\dashboard-industrial\src\components\motor-mobile\CoolingSystemMobile.tsx
"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import type { CoolingSystemData } from "@/types/iot.types";
import { getNumericValue } from "@/types/iot.types";

interface CoolingSystemMobileProps {
  data?: CoolingSystemData;
  historicalData: Array<{
    timestamp: number;
    temp_lt_salida: number | null;
    t_ht_entrada: number | null;
    tem_ht_ref_salida: number | null;
    presion_ht: number | null;
  }>;
}

type AlertStatus = "critical" | "warning" | "normal" | "no-data";

/* ==========================================
   🔧 Sanitización de datos anómalos
   (mismo criterio que OilSystem)
   ========================================== */
const MIN_TEMP = -20;
const MAX_TEMP = 200;
const MIN_PRESSURE = 0;
const MAX_PRESSURE = 10;

function sanitizeTemp(value: number | null): number | null {
  if (value === null) return null;
  if (value < MIN_TEMP || value > MAX_TEMP) return null;
  return value;
}

function sanitizePressure(value: number | null): number | null {
  if (value === null) return null;
  if (value < MIN_PRESSURE || value > MAX_PRESSURE) return null;
  return value;
}

/* ==========================================
   🔥 Umbrales de operación (COOLING)
   ========================================== */
// Temperaturas (alineado con OilSystem)
const COOL_TEMP_OPTIMAL_MAX = 80; // hasta aquí óptimo
const COOL_TEMP_WARNING_MAX = 90; // 80–90 alerta
const COOL_TEMP_MAX = 110;        // >90 crítico visualmente

// Presión HT
const COOL_PRESSURE_OPTIMAL_MIN = 2.0; // >2.0 bar óptimo
const COOL_PRESSURE_WARNING_MIN = 1.5; // 1.5–2.0 alerta
const COOL_PRESSURE_MIN = 0;           // <1.5 crítico

function getTempStatus(
  value: number | null,
  optimalMax: number,
  warningMax: number
): AlertStatus {
  if (value === null) return "no-data";
  if (value > warningMax) return "critical";
  if (value > optimalMax) return "warning";
  return "normal";
}

function getPressureStatus(value: number | null): AlertStatus {
  if (value === null) return "no-data";
  if (value < COOL_PRESSURE_WARNING_MIN) return "critical"; // <1.5
  if (value < COOL_PRESSURE_OPTIMAL_MIN) return "warning";  // 1.5–2.0
  return "normal";
}

/* ==========================================
   🔧 Estilos KPI (mismos que OilSystem)
   ========================================== */
function getCardStyle(status: AlertStatus): string {
  if (status === "critical") return "border-red-400 bg-red-50";
  if (status === "warning") return "border-amber-400 bg-amber-50";
  if (status === "normal") return "border-emerald-400 bg-emerald-50/40";
  return "border-slate-200 bg-white";
}

function getStatusDotClasses(status: AlertStatus): string {
  if (status === "critical") return "bg-red-500";
  if (status === "warning") return "bg-amber-500";
  if (status === "normal") return "bg-emerald-500";
  return "bg-slate-300";
}

function renderStatusBadge(status: AlertStatus) {
  if (status === "no-data") return null;

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className={`h-2 w-2 rounded-full ${getStatusDotClasses(status)}`} />
      <span className="text-[10px] font-semibold tracking-wide uppercase">
        {status === "critical"
          ? "CRÍTICO"
          : status === "warning"
          ? "ALERTA"
          : "NORMAL"}
      </span>
    </div>
  );
}

export function CoolingSystemMobile({
  data,
  historicalData,
}: CoolingSystemMobileProps) {
  // Valores actuales saneados
  const tempLTSalida = sanitizeTemp(getNumericValue(data?.Temp_LT_salida));
  const tempHTEntrada = sanitizeTemp(getNumericValue(data?.T_HT_ENTRADA));
  const tempHTRefSalida = sanitizeTemp(getNumericValue(data?.Tem_HT_ref_salida));
  const presionHT = sanitizePressure(getNumericValue(data?.Presion_HT));

  // Datos para las gráficas (limpios + filtrados)
  const chartData = useMemo(
    () =>
      historicalData
        .map((point) => ({
          timestamp: point.timestamp,
          temp_lt_salida: sanitizeTemp(point.temp_lt_salida),
          t_ht_entrada: sanitizeTemp(point.t_ht_entrada),
          tem_ht_ref_salida: sanitizeTemp(point.tem_ht_ref_salida),
          presion_ht: sanitizePressure(point.presion_ht),
        }))
        .filter(
          (point) =>
            point.temp_lt_salida !== null ||
            point.t_ht_entrada !== null ||
            point.tem_ht_ref_salida !== null ||
            point.presion_ht !== null
        ),
    [historicalData]
  );

  // Rango de tiempo visible según datos limpios
  const timeRange = useMemo(() => {
    if (!chartData.length) return null;
    const first = chartData[0]?.timestamp;
    const last = chartData[chartData.length - 1]?.timestamp;
    if (first == null || last == null) return null;
    return { first, last };
  }, [chartData]);

  return (
    <div className="space-y-4">
      {/* =======================
          KPIs
      ======================= */}
      <div className="overflow-x-auto -mx-3 px-3 pb-2">
        <div className="flex gap-3 min-w-max">
          {/* LT Salida */}
          {(() => {
            const status = getTempStatus(
              tempLTSalida,
              COOL_TEMP_OPTIMAL_MAX,
              COOL_TEMP_WARNING_MAX
            );
            return (
              <div
                className={`min-w-[140px] p-3 rounded-xl border shadow-sm ${getCardStyle(
                  status
                )}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] text-slate-600 uppercase font-semibold">
                    LT Salida
                  </div>
                  <span
                    className={`h-1.5 w-6 rounded-full ${getStatusDotClasses(
                      status
                    )}`}
                  />
                </div>

                <div className="text-2xl font-semibold text-slate-900 mb-1">
                  {tempLTSalida !== null ? `${tempLTSalida.toFixed(1)}°C` : "--"}
                </div>

                {renderStatusBadge(status)}
              </div>
            );
          })()}

          {/* HT Entrada */}
          {(() => {
            // Para HT Entrada podemos tolerar un poco más alta,
            // pero visualmente usamos la misma banda en la gráfica
            const status = getTempStatus(
              tempHTEntrada,
              COOL_TEMP_OPTIMAL_MAX,
              COOL_TEMP_WARNING_MAX
            );
            return (
              <div
                className={`min-w-[140px] p-3 rounded-xl border shadow-sm ${getCardStyle(
                  status
                )}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] text-slate-600 uppercase font-semibold">
                    HT Entrada
                  </div>
                  <span
                    className={`h-1.5 w-6 rounded-full ${getStatusDotClasses(
                      status
                    )}`}
                  />
                </div>

                <div className="text-2xl font-semibold text-slate-900 mb-1">
                  {tempHTEntrada !== null ? `${tempHTEntrada.toFixed(1)}°C` : "--"}
                </div>

                {renderStatusBadge(status)}
              </div>
            );
          })()}

          {/* HT Ref Salida */}
          {(() => {
            const status = getTempStatus(
              tempHTRefSalida,
              COOL_TEMP_OPTIMAL_MAX,
              COOL_TEMP_WARNING_MAX
            );
            return (
              <div
                className={`min-w-[140px] p-3 rounded-xl border shadow-sm ${getCardStyle(
                  status
                )}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] text-slate-600 uppercase font-semibold">
                    HT Ref. Salida
                  </div>
                  <span
                    className={`h-1.5 w-6 rounded-full ${getStatusDotClasses(
                      status
                    )}`}
                  />
                </div>

                <div className="text-2xl font-semibold text-slate-900 mb-1">
                  {tempHTRefSalida !== null
                    ? `${tempHTRefSalida.toFixed(1)}°C`
                    : "--"}
                </div>

                {renderStatusBadge(status)}
              </div>
            );
          })()}

          {/* Presión HT */}
          {(() => {
            const status = getPressureStatus(presionHT);
            return (
              <div
                className={`min-w-[140px] p-3 rounded-xl border shadow-sm ${getCardStyle(
                  status
                )}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] text-slate-600 uppercase font-semibold">
                    Presión HT
                  </div>
                  <span
                    className={`h-1.5 w-6 rounded-full ${getStatusDotClasses(
                      status
                    )}`}
                  />
                </div>

                <div className="text-2xl font-semibold text-slate-900 mb-1">
                  {presionHT !== null ? `${presionHT.toFixed(2)} bar` : "--"}
                </div>

                {renderStatusBadge(status)}
              </div>
            );
          })()}
        </div>
      </div>

      {/* =======================
          GRÁFICA TEMPERATURAS
      ======================= */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        {/* --- Título + Leyendas --- */}
        <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Temperaturas
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <LegendItem label="LT Salida" color="#14b8a6" />
            <LegendItem label="HT Entrada" color="#0369a1" />
            <LegendItem label="HT Ref. Salida" color="#38bdf8" />
            <LegendItem label="Límite óptimo" color="#9ca3af" dashed />
          </div>
        </div>

        {/* Leyenda de rangos */}
        <div className="mb-3 flex flex-wrap gap-2 text-[9px] text-slate-500">
          <LegendRange
            label="Óptimo"
            rangeText={`< ${COOL_TEMP_OPTIMAL_MAX}°C`}
            dotClass="bg-emerald-500"
          />
          <LegendRange
            label="Alerta"
            rangeText={`${COOL_TEMP_OPTIMAL_MAX}–${COOL_TEMP_WARNING_MAX}°C`}
            dotClass="bg-amber-500"
          />
          <LegendRange
            label="Crítico"
            rangeText={`> ${COOL_TEMP_WARNING_MAX}°C`}
            dotClass="bg-red-500"
          />
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -10, bottom: 18 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                tick={{ fontSize: 9 }}
                minTickGap={16}
              />
              <YAxis
                domain={[40, COOL_TEMP_MAX]}
                tick={{ fontSize: 10 }}
                allowDataOverflow={false}
              />
              <Tooltip
                labelFormatter={(value) =>
                  typeof value === "number" ? formatTime(value) : ""
                }
                contentStyle={{
                  fontSize: "10px",
                  backgroundColor: "rgba(255,255,255,0.96)",
                  borderRadius: "6px",
                  borderColor: "#e5e7eb",
                }}
              />

              {/* ZONA ALERTA: 80–90 °C */}
              <ReferenceArea
                y1={COOL_TEMP_OPTIMAL_MAX}
                y2={COOL_TEMP_WARNING_MAX}
                stroke="none"
                fill="#f59e0b"
                fillOpacity={0.08}
              />

              {/* ZONA CRÍTICA: >90 °C */}
              <ReferenceArea
                y1={COOL_TEMP_WARNING_MAX}
                y2={COOL_TEMP_MAX}
                stroke="none"
                fill="#dc2626"
                fillOpacity={0.1}
              />

              {/* Líneas de umbral */}
              <ReferenceLine
                y={COOL_TEMP_OPTIMAL_MAX}
                stroke="#9ca3af"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <ReferenceLine
                y={COOL_TEMP_WARNING_MAX}
                stroke="#9ca3af"
                strokeDasharray="4 4"
                strokeWidth={1}
              />

              <Line
                type="monotone"
                dataKey="temp_lt_salida"
                stroke="#14b8a6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="t_ht_entrada"
                stroke="#0369a1"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="tem_ht_ref_salida"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {timeRange && (
          <div className="mt-1 flex justify-between text-[9px] text-slate-400">
            <span>{formatTime(timeRange.first)}</span>
            <span>{formatTime(timeRange.last)}</span>
          </div>
        )}
      </div>

      {/* =======================
          GRÁFICA PRESIÓN
      ======================= */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Presión HT
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <LegendItem label="Presión HT" color="#0f766e" />
            <LegendItem label="Umbrales" color="#94a3b8" dashed />
          </div>
        </div>

        {/* Leyenda de rangos Presión HT */}
        <div className="mb-3 flex flex-wrap gap-2 text-[9px] text-slate-500">
          <LegendRange
            label="Óptimo"
            rangeText={"> 2.0 bar"}
            dotClass="bg-emerald-500"
          />
          <LegendRange
            label="Alerta"
            rangeText={"1.5 – 2.0 bar"}
            dotClass="bg-amber-500"
          />
          <LegendRange
            label="Crítico"
            rangeText={"< 1.5 bar"}
            dotClass="bg-red-500"
          />
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -10, bottom: 18 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                tick={{ fontSize: 9 }}
                minTickGap={16}
              />
              <YAxis domain={[COOL_PRESSURE_MIN, 4]} tick={{ fontSize: 10 }} />

              <Tooltip
                labelFormatter={(value) =>
                  typeof value === "number" ? formatTime(value) : ""
                }
                contentStyle={{
                  fontSize: "10px",
                  backgroundColor: "rgba(255,255,255,0.96)",
                  borderRadius: "6px",
                  borderColor: "#e5e7eb",
                }}
              />

              {/* 🔴 CRÍTICO (<1.5 bar) */}
              <ReferenceArea
                y1={COOL_PRESSURE_MIN}
                y2={COOL_PRESSURE_WARNING_MIN}
                stroke="none"
                fill="#dc2626"
                fillOpacity={0.1}
              />

              {/* 🔶 ALERTA (1.5–2.0 bar) */}
              <ReferenceArea
                y1={COOL_PRESSURE_WARNING_MIN}
                y2={COOL_PRESSURE_OPTIMAL_MIN}
                stroke="none"
                fill="#f59e0b"
                fillOpacity={0.08}
              />

              {/* Líneas de umbral */}
              <ReferenceLine
                y={COOL_PRESSURE_WARNING_MIN}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <ReferenceLine
                y={COOL_PRESSURE_OPTIMAL_MIN}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />

              <Line
                type="monotone"
                dataKey="presion_ht"
                stroke="#0f766e"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {timeRange && (
          <div className="mt-1 flex justify-between text-[9px] text-slate-400">
            <span>{formatTime(timeRange.first)}</span>
            <span>{formatTime(timeRange.last)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============== FORMATEADOR TIEMPO ============== */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  const s = date.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/* ============== COMPONENTE LEYENDA ============== */
function LegendItem({
  label,
  color,
  dashed,
}: {
  label: string;
  color: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 whitespace-nowrap">
      <div
        className="h-2 w-4 rounded-sm"
        style={{
          backgroundColor: dashed ? "transparent" : color,
          border: dashed ? `1px dashed ${color}` : undefined,
        }}
      />
      <span className="uppercase tracking-wide">{label}</span>
    </div>
  );
}

/* ============== LEYENDA DE RANGOS ============== */
function LegendRange({
  label,
  rangeText,
  dotClass,
}: {
  label: string;
  rangeText: string;
  dotClass: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span className="uppercase font-semibold">{label}:</span>
      <span>{rangeText}</span>
    </div>
  );
}
