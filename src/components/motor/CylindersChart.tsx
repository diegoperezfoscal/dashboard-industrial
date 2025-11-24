//industrial-iot-lab\dashboard-industrial\src\components\motor\CylindersChart.tsx
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
import { getNumericValue, type CylindersData } from "@/types/iot.types";

interface CylindersChartProps {
  data?: CylindersData;
}

export function CylindersChart({ data }: CylindersChartProps) {
  const chartData = useMemo(() => {
    const cylinders = Array.from({ length: 20 }, (_, i) => {
      const key = `Tem_Cyl_${i + 1}` as keyof CylindersData;
      const temp = getNumericValue(data?.[key]);
      return {
        cylinder: `C${i + 1}`,
        temperature: temp,
        advertencia: null, // Solo para leyenda
        critico: null, // Solo para leyenda
      };
    });
    return cylinders;
  }, [data]);

  const promedio = getNumericValue(data?.Promedio_tem_cyl);
  const diferencia = getNumericValue(data?.Diferencia_temp_clynders);

  // Determinar estado general
  const getOverallStatus = () => {
    const temps = chartData
      .map((c) => c.temperature)
      .filter((t): t is number => t !== null);
    if (temps.length === 0) return "sin-datos";
    const maxTemp = Math.max(...temps);
    if (maxTemp > 610) return "critico";
    if (maxTemp > 600) return "advertencia";
    return "normal";
  };

  const status = getOverallStatus();
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
      {/* Header con status y métricas */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4">
          <div className="text-center px-4 py-2 bg-blue-100 rounded-lg border border-blue-300">
            <div className="text-xs text-gray-600 uppercase font-semibold">
              Promedio
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {promedio !== null ? `${promedio.toFixed(1)}°C` : "--"}
            </div>
          </div>
          <div className="text-center px-4 py-2 bg-purple-100 rounded-lg border border-purple-300">
            <div className="text-xs text-gray-600 uppercase font-semibold">
              Diferencia
            </div>
            <div className="text-2xl font-bold text-purple-700">
              {diferencia !== null ? `${diferencia.toFixed(1)}°C` : "--"}
            </div>
          </div>
        </div>

        <div
          className={`px-3 py-1 rounded-full text-sm font-bold ${statusColors[status]}`}
        >
          {statusLabels[status]}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

            <XAxis
              dataKey="cylinder"
              tick={{ fontSize: 11, fill: "#666" }}
              stroke="#666"
              label={{
                value: "Cilindros",
                position: "insideBottom",
                offset: -10,
                style: { fontSize: 13, fill: "#333", fontWeight: "bold" },
              }}
            />

            <YAxis
              domain={[580, 620]}
              tick={{ fontSize: 11, fill: "#666" }}
              stroke="#666"
              label={{
                value: "Temperatura (°C)",
                angle: -90,
                position: "insideLeft",
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
              formatter={(value: unknown, name: string) => {
                if (name === "Temperatura Actual") {
                  if (typeof value === "number") {
                    return [`${value.toFixed(1)}°C`, "Temperatura Actual"];
                  }
                  // If value is an array or other, fall back to string
                  return [String(value ?? "N/A"), "Temperatura Actual"];
                }
                return [String(value ?? ""), name];
              }}
            />

            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              iconType="line"
              verticalAlign="top"
            />

            {/* Línea de referencia para umbral de advertencia (600°C) */}
            <ReferenceLine
              y={600}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={2}
            />

            {/* Línea de referencia para umbral crítico (610°C) */}
            <ReferenceLine
              y={610}
              stroke="#dc2626"
              strokeDasharray="5 5"
              strokeWidth={2}
            />

            {/* Línea de temperatura actual */}
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{
                r: 4,
                fill: "#3b82f6",
                strokeWidth: 2,
                stroke: "#fff",
              }}
              activeDot={{
                r: 6,
                fill: "#3b82f6",
                strokeWidth: 2,
              }}
              name="Temperatura Actual"
              connectNulls
              isAnimationActive={false}
            />

            {/* Líneas invisibles solo para mostrar en la leyenda */}
            <Line
              type="monotone"
              dataKey="advertencia"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Advertencia (600°C)"
              isAnimationActive={false}
              legendType="line"
            />

            <Line
              type="monotone"
              dataKey="critico"
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Critico (610°C)"
              isAnimationActive={false}
              legendType="line"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Información adicional */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Umbrales de temperatura:</span>
            <span className="font-mono">
              Normal: ≤600°C | Advertencia: 600-610°C | Crítico: &gt;610°C
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
