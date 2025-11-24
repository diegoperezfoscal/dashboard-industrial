// industrial-iot-lab\dashboard-industrial\src\components\motor-mobile\OilSystemMobile.tsx
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
import type { OilSystemData } from "@/types/iot.types";
import { getNumericValue } from "@/types/iot.types";

interface OilSystemMobileProps {
  data?: OilSystemData;
  historicalData: Array<{
    timestamp: number;
    temperatura_aceite: number | null;
    temperatura_filtro: number | null;
    presion_aceite: number | null;
  }>;
}

type AlertStatus = "critical" | "warning" | "normal" | "no-data";

/* ==========================================
   🔧 Sanitización de datos anómalos
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

export function OilSystemMobile({
  data,
  historicalData,
}: OilSystemMobileProps) {
  const tempAceite = sanitizeTemp(getNumericValue(data?.Temperatura_aceite));
  const tempFiltro = sanitizeTemp(getNumericValue(data?.Tempe_filtro));
  const presionAceite = sanitizePressure(getNumericValue(data?.Presion_aceite));

  /* ==========================================
     🔧 Construcción de datos limpios
     ========================================== */
  const chartData = useMemo(
    () =>
      historicalData
        .map((point) => ({
          timestamp: point.timestamp,
          temperatura_aceite: sanitizeTemp(point.temperatura_aceite),
          temperatura_filtro: sanitizeTemp(point.temperatura_filtro),
          presion_aceite: sanitizePressure(point.presion_aceite),
        }))
        .filter((point) =>
          // Solo incluir puntos que tengan al menos un valor válido
          point.temperatura_aceite !== null ||
          point.temperatura_filtro !== null ||
          point.presion_aceite !== null
        ),
    [historicalData]
  );

  const timeRange = useMemo(() => {
    if (!historicalData.length) return null;
    const first = historicalData[0]?.timestamp;
    const last = historicalData[historicalData.length - 1]?.timestamp;
    if (!first || !last) return null;
    return { first, last };
  }, [historicalData]);

  /* ==========================================
     🔥 UMBRALES TEMPERATURA
     ========================================== */
  const OIL_TEMP_OPTIMAL_MAX = 80;
  const OIL_TEMP_WARNING_MAX = 90;
  const OIL_TEMP_MAX = 100;

  const getTempStatus = (value: number | null): AlertStatus => {
    if (value === null) return "no-data";
    if (value > OIL_TEMP_WARNING_MAX) return "critical";
    if (value > OIL_TEMP_OPTIMAL_MAX) return "warning";
    return "normal";
  };

  /* ==========================================
     🔥 UMBRALES PRESIÓN ACEITE
     ========================================== */
  const OIL_PRESSURE_CRITICAL_MAX = 1.0;
  const OIL_PRESSURE_WARNING_MAX = 1.3;

  const getPressureStatus = (value: number | null): AlertStatus => {
    if (value === null) return "no-data";
    if (value < OIL_PRESSURE_CRITICAL_MAX) return "critical";
    if (value < OIL_PRESSURE_WARNING_MAX) return "warning";
    return "normal";
  };

  /* ==========================================
     🔧 Estilos de tarjetas KPI
     ========================================== */
  const getCardStyle = (status: AlertStatus): string => {
    if (status === "critical") return "border-red-400 bg-red-50";
    if (status === "warning") return "border-amber-400 bg-amber-50";
    if (status === "normal") return "border-emerald-400 bg-emerald-50/40";
    return "border-slate-200 bg-white";
  };

  const getStatusDotClasses = (status: AlertStatus): string => {
    if (status === "critical") return "bg-red-500";
    if (status === "warning") return "bg-amber-500";
    if (status === "normal") return "bg-emerald-500";
    return "bg-slate-300";
  };

  const renderStatusBadge = (status: AlertStatus) => {
    if (status === "no-data") return null;
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <span className={`h-2 w-2 rounded-full ${getStatusDotClasses(status)}`} />
        <span className="text-[10px] font-semibold uppercase">
          {status === "critical"
            ? "CRÍTICO"
            : status === "warning"
            ? "ALERTA"
            : "NORMAL"}
        </span>
      </div>
    );
  };

  /* ==========================================
     🔥 INTERFAZ PRINCIPAL
     ========================================== */
  return (
    <div className="space-y-4">
      {/* =======================
          KPIs
      ======================= */}
      <div className="overflow-x-auto -mx-3 px-3 pb-2">
        <div className="flex gap-3 min-w-max">
          {/* TEMP ACEITE */}
          {(() => {
            const status = getTempStatus(tempAceite);
            return (
              <div className={`min-w-[140px] p-3 rounded-xl border shadow-sm ${getCardStyle(status)}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] text-slate-600 uppercase font-semibold">Temp. Aceite</div>
                  <span className={`h-1.5 w-6 rounded-full ${getStatusDotClasses(status)}`} />
                </div>
                <div className="text-2xl font-semibold">{tempAceite !== null ? `${tempAceite.toFixed(1)}°C` : "--"}</div>
                {renderStatusBadge(status)}
              </div>
            );
          })()}

          {/* TEMP FILTRO */}
          {(() => {
            const status = getTempStatus(tempFiltro);
            return (
              <div className={`min-w-[140px] p-3 rounded-xl border shadow-sm ${getCardStyle(status)}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] text-slate-600 uppercase font-semibold">Temp. Filtro</div>
                  <span className={`h-1.5 w-6 rounded-full ${getStatusDotClasses(status)}`} />
                </div>
                <div className="text-2xl font-semibold">{tempFiltro !== null ? `${tempFiltro.toFixed(1)}°C` : "--"}</div>
                {renderStatusBadge(status)}
              </div>
            );
          })()}

          {/* PRESIÓN ACEITE */}
          {(() => {
            const status = getPressureStatus(presionAceite);
            return (
              <div className={`min-w-[140px] p-3 rounded-xl border shadow-sm ${getCardStyle(status)}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] text-slate-600 uppercase font-semibold">Presión Aceite</div>
                  <span className={`h-1.5 w-6 rounded-full ${getStatusDotClasses(status)}`} />
                </div>
                <div className="text-2xl font-semibold">
                  {presionAceite !== null ? `${presionAceite.toFixed(2)} bar` : "--"}
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
        <h3 className="text-xs font-semibold text-slate-700 uppercase mb-2">Temperaturas Aceite</h3>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="timestamp" tickFormatter={formatTime} tick={{ fontSize: 9 }} />
              <YAxis
                domain={[40, 100]}
                tick={{ fontSize: 10 }}
                allowDataOverflow={false}
                type="number"
                ticks={[40, 50, 60, 70, 80, 90, 100]}
              />

              <Tooltip
                labelFormatter={(value) => (typeof value === "number" ? formatTime(value) : "")}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  fontSize: "10px",
                }}
              />

              {/* 🔶 ALERTA (80–90°C) */}
              <ReferenceArea
                y1={OIL_TEMP_OPTIMAL_MAX}
                y2={OIL_TEMP_WARNING_MAX}
                fill="#f59e0b"
                fillOpacity={0.08}
              />

              {/* 🔴 CRÍTICO (>90°C) */}
              <ReferenceArea
                y1={OIL_TEMP_WARNING_MAX}
                y2={OIL_TEMP_MAX}
                fill="#dc2626"
                fillOpacity={0.1}
              />

              <ReferenceLine y={OIL_TEMP_OPTIMAL_MAX} stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={2} />
              <ReferenceLine y={OIL_TEMP_WARNING_MAX} stroke="#dc2626" strokeDasharray="5 5" strokeWidth={2} />

              <Line type="monotone" dataKey="temperatura_aceite" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="temperatura_filtro" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =======================
          GRÁFICA PRESIÓN ACEITE
      ======================= */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="text-xs font-semibold text-slate-700 uppercase mb-2">Presión Aceite</h3>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="timestamp" tickFormatter={formatTime} tick={{ fontSize: 9 }} />
              <YAxis domain={[0, 3]} tick={{ fontSize: 10 }} allowDataOverflow={false} type="number" />

              <Tooltip
                labelFormatter={(value) => (typeof value === "number" ? formatTime(value) : "")}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  fontSize: "10px",
                }}
              />

              {/* 🔴 CRÍTICO (<1.0 bar) */}
              <ReferenceArea
                y1={0}
                y2={OIL_PRESSURE_CRITICAL_MAX}
                fill="#dc2626"
                fillOpacity={0.1}
              />

              {/* 🔶 ALERTA (1.0–1.3 bar) */}
              <ReferenceArea
                y1={OIL_PRESSURE_CRITICAL_MAX}
                y2={OIL_PRESSURE_WARNING_MAX}
                fill="#f59e0b"
                fillOpacity={0.08}
              />

              <ReferenceLine
                y={OIL_PRESSURE_CRITICAL_MAX}
                stroke="#dc2626"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
              <ReferenceLine
                y={OIL_PRESSURE_WARNING_MAX}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                strokeWidth={2}
              />

              <Line type="monotone" dataKey="presion_aceite" stroke="#0f766e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ==========================================
   ⏱ Formateador de tiempo
   ========================================== */
function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}
