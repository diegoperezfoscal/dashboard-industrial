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
  ReferenceLine,
} from "recharts";
import type { CoolingSystemData } from "@/types/iot.types";
import { getNumericValue } from "@/types/iot.types";

interface CoolingSystemCardProps {
  data?: CoolingSystemData;
  historicalData?: Array<{
    timestamp: number;
    temp_lt_salida: number | null;
    t_ht_entrada: number | null;
    tem_ht_ref_salida: number | null;
    presion_ht: number | null;
  }>;
}

export function CoolingSystemCard({
  data,
  historicalData = [],
}: CoolingSystemCardProps) {
  const tempLTSalida = getNumericValue(data?.Temp_LT_salida);
  const tempHTEntrada = getNumericValue(data?.T_HT_ENTRADA);
  const tempHTRefSalida = getNumericValue(data?.Tem_HT_ref_salida);
  const presionHT = getNumericValue(data?.Presion_HT);

  const chartData = useMemo(() => {
    if (historicalData.length > 0) {
      // Ya vienen ordenados por timestamp desde el padre, no necesitamos reordenar
      return historicalData.map((point) => ({
        id: point.timestamp, // ID único para que React identifique cada punto
        time: new Date(point.timestamp).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        ltSalida: point.temp_lt_salida,
        htEntrada: point.t_ht_entrada,
        htRefSalida: point.tem_ht_ref_salida,
        presion: point.presion_ht,
      }));
    }

    // Generar datos placeholder estáticos (solo cuando no hay historicalData)
    // Estos datos NO cambian para evitar redibujados constantes
    return Array.from({ length: 20 }, (_, i) => {
      const seconds = 20 - i;
      const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

      return {
        id: i,
        time,
        ltSalida: 45, // Valores estáticos de ejemplo
        htEntrada: 85,
        htRefSalida: 80,
        presion: 2.5,
      };
    });
  }, [historicalData]); // Solo depende de historicalData

  const getSystemStatus = () => {
    if (
      tempLTSalida === null ||
      tempHTEntrada === null ||
      presionHT === null
    ) {
      return "sin-datos";
    }
    if (tempHTEntrada > 95 || presionHT < 1.5 || tempLTSalida > 55) {
      return "critico";
    }
    if (tempHTEntrada > 90 || presionHT < 2.0 || tempLTSalida > 50) {
      return "advertencia";
    }
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
      const isCritical = value < lowThreshold - 0.5;
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
    normal: "text-green-600 bg-green-50",
    advertencia: "text-yellow-600 bg-yellow-50",
    critico: "text-red-600 bg-red-50",
    "sin-datos": "text-gray-400 bg-gray-50",
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
          className={`px-3 py-1 rounded-full text-sm font-bold ${statusColors[status]}`}
        >
          {statusLabels[status]}
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="text-center p-3 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg border border-cyan-200">
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">
            LT Salida
          </div>
          <div className="text-2xl font-bold text-cyan-700">
            {tempLTSalida !== null ? `${tempLTSalida.toFixed(1)}°C` : "--"}
          </div>
          {getAlertBadge(tempLTSalida, 50)}
        </div>

        <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">
            HT Entrada
          </div>
          <div className="text-2xl font-bold text-red-700">
            {tempHTEntrada !== null ? `${tempHTEntrada.toFixed(1)}°C` : "--"}
          </div>
          {getAlertBadge(tempHTEntrada, 90)}
        </div>

        <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">
            HT Ref. Salida
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {tempHTRefSalida !== null
              ? `${tempHTRefSalida.toFixed(1)}°C`
              : "--"}
          </div>
          {getAlertBadge(tempHTRefSalida, 85)}
        </div>

        <div className="text-center p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">
            Presión HT
          </div>
          <div className="text-2xl font-bold text-indigo-700">
            {presionHT !== null ? `${presionHT.toFixed(2)} bar` : "--"}
          </div>
          {getAlertBadge(presionHT, undefined, 2.0)}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

            <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#666" />

            <YAxis
              yAxisId="temp"
              domain={[0, 120]}
              tick={{ fontSize: 11 }}
              stroke="#666"
              label={{
                value: "Temperatura (°C)",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12, fill: "#666" },
              }}
            />

            <YAxis
              yAxisId="presion"
              orientation="right"
              domain={[0, 5]}
              tick={{ fontSize: 11 }}
              stroke="#666"
              label={{
                value: "Presión (bar)",
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
                typeof value === "number" ? value.toFixed(2) : "N/A"
              }
            />

            <Legend wrapperStyle={{ fontSize: "12px" }} iconType="line" />

            {/* Líneas de referencia para rangos críticos */}
            <ReferenceLine
              yAxisId="temp"
              y={90}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1.5}
            />
            <ReferenceLine
              yAxisId="presion"
              y={2.0}
              stroke="#8b5cf6"
              strokeDasharray="3 3"
              strokeWidth={1.5}
            />

            {/* Líneas de datos */}
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="ltSalida"
              stroke="#06b6d4"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              name="LT Salida (°C)"
              connectNulls
              isAnimationActive={false}
            />

            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="htEntrada"
              stroke="#dc2626"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              name="HT Entrada (°C)"
              connectNulls
              isAnimationActive={false}
            />

            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="htRefSalida"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              name="HT Ref. Salida (°C)"
              connectNulls
              isAnimationActive={false}
            />

            <Line
              yAxisId="presion"
              type="monotone"
              dataKey="presion"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              name="Presión HT (bar)"
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Rangos de referencia */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Rangos normales:</span>
            <span className="font-mono">
              LT Salida: 40-50°C | HT Entrada: 80-90°C | HT Ref: 75-85°C |
              Presión: 2.0-3.0 bar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
