"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { OilSystemData, getNumericValue } from "@/types/iot.types";

interface OilSystemDualChartProps {
  data?: OilSystemData;
  historicalData?: Array<{
    timestamp: number;
    temperatura_aceite: number | null;
    temperatura_filtro: number | null;
    presion_aceite: number | null;
  }>;
}

export function OilSystemDualChart({
  data,
  historicalData = [],
}: OilSystemDualChartProps) {
  const tempAceite = getNumericValue(data?.Temperatura_aceite);
  const tempFiltro = getNumericValue(data?.Tempe_filtro);
  const presionAceite = getNumericValue(data?.Presion_aceite);

  const chartData = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.map((point) => ({
        id: point.timestamp, // ID único para que React identifique cada punto
        time: new Date(point.timestamp).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        tempAceite: point.temperatura_aceite,
        tempFiltro: point.temperatura_filtro,
        presion: point.presion_aceite,
      }));
    }

    // Generar datos placeholder estáticos (solo cuando no hay historicalData)
    // Estos datos NO cambian con tempAceite/tempFiltro/presionAceite para evitar redibujados
    return Array.from({ length: 20 }, (_, i) => {
      const seconds = 20 - i;
      const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

      return {
        id: i,
        time,
        tempAceite: 85, // Valores estáticos de ejemplo
        tempFiltro: 45,
        presion: 1.5,
      };
    });
  }, [historicalData]); // Solo depende de historicalData

  const getSystemStatus = () => {
    if (tempAceite === null || presionAceite === null) return "sin-datos";
    if (tempAceite > 95 || presionAceite < 0.8) return "critico";
    if (tempAceite > 90 || presionAceite < 1.0) return "advertencia";
    return "normal";
  };

  const getAlertBadge = (value: number | null, highThreshold?: number, lowThreshold?: number) => {
    if (value === null) return null;

    // Alerta por valor alto
    if (highThreshold !== undefined && value > highThreshold) {
      const isCritical = value > highThreshold + 5;
      return (
        <div className={`mt-1.5 px-2 py-0.5 rounded text-xs font-bold ${
          isCritical
            ? 'bg-red-500 text-white border border-red-700 animate-pulse'
            : 'bg-yellow-400 text-gray-900 border border-yellow-600'
        }`}>
          {isCritical ? '🔴 CRÍTICO' : '⚠️ ALTA'}
        </div>
      );
    }

    // Alerta por valor bajo
    if (lowThreshold !== undefined && value < lowThreshold) {
      const isCritical = value < lowThreshold - 0.2;
      return (
        <div className={`mt-1.5 px-2 py-0.5 rounded text-xs font-bold ${
          isCritical
            ? 'bg-red-500 text-white border border-red-700 animate-pulse'
            : 'bg-yellow-400 text-gray-900 border border-yellow-600'
        }`}>
          {isCritical ? '🔴 CRÍTICO' : '⚠️ BAJA'}
        </div>
      );
    }

    return (
      <div className="mt-1.5 px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold text-xs border border-green-300">
        ✓ NORMAL
      </div>
    );
  };

  const status = getSystemStatus();
  const statusColors = {
    normal: "text-green-600",
    advertencia: "text-yellow-600",
    critico: "text-red-600",
    "sin-datos": "text-gray-400",
  };

  const statusLabels = {
    normal: "NORMAL",
    advertencia: "ADVERTENCIA",
    critico: "CRITICO",
    "sin-datos": "SIN DATOS",
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <div
          className={`px-3 py-1 rounded-full text-sm font-bold ${statusColors[status]} bg-opacity-10`}
        >
          {statusLabels[status]}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">
            Temp. Aceite
          </div>
          <div className="text-2xl font-bold text-orange-700">
            {tempAceite !== null ? `${tempAceite.toFixed(1)}°C` : "--"}
          </div>
          {getAlertBadge(tempAceite, 90)}
        </div>

        <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">
            Temp. Filtro
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {tempFiltro !== null ? `${tempFiltro.toFixed(1)}°C` : "--"}
          </div>
          {getAlertBadge(tempFiltro, 50)}
        </div>

        <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">
            Presion
          </div>
          <div className="text-2xl font-bold text-purple-700">
            {presionAceite !== null ? `${presionAceite.toFixed(2)} bar` : "--"}
          </div>
          {getAlertBadge(presionAceite, undefined, 1.0)}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

            <XAxis
              dataKey="time"
              tick={{ fontSize: 11 }}
              stroke="#666"
            />

            <YAxis
              yAxisId="temp"
              domain={[0, 120]}
              tick={{ fontSize: 11 }}
              stroke="#666"
              label={{
                value: "Temperatura (C)",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12, fill: "#666" },
              }}
            />

            <YAxis
              yAxisId="presion"
              orientation="right"
              domain={[0, 3]}
              tick={{ fontSize: 11 }}
              stroke="#666"
              label={{
                value: "Presion (bar)",
                angle: 90,
                position: "insideRight",
                style: { fontSize: 12, fill: "#666" },
              }}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #ccc",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value) =>
                typeof value === 'number' ? value.toFixed(2) : "N/A"
              }
            />

            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              iconType="line"
            />

            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="tempAceite"
              stroke="#f97316"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              name="Temp. Aceite (C)"
              connectNulls
              isAnimationActive={false}
            />

            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="tempFiltro"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              name="Temp. Filtro (C)"
              connectNulls
              isAnimationActive={false}
            />

            <Line
              yAxisId="presion"
              type="monotone"
              dataKey="presion"
              stroke="#9333ea"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              name="Presion (bar)"
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Rangos normales:</span>
            <span className="font-mono">
              Aceite: 80-90C | Filtro menor a 50C | Presion: 1.0-2.0 bar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
