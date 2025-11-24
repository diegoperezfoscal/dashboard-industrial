// industrial-iot-lab\dashboard-industrial\src\components\motor-mobile\CylindersChartMobile.tsx
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
  ReferenceArea, // ⬅️ NUEVO: para el sombreado de zonas
} from "recharts";
import { getNumericValue, type CylindersData } from "@/types/iot.types";

type CylindersChartMobileProps = {
  data?: CylindersData;
};

type Status = "normal" | "advertencia" | "critico" | "sin-datos";

type CylinderPoint = {
  cylinder: string;
  temperature: number | null;
  advertencia: null;
  critico: null;
};

const statusColors: Record<Status, string> = {
  normal: "text-green-600 bg-green-50",
  advertencia: "text-yellow-600 bg-yellow-50",
  critico: "text-red-600 bg-red-50",
  "sin-datos": "text-gray-400 bg-gray-50",
};

const statusLabels: Record<Status, string> = {
  normal: "NORMAL",
  advertencia: "ADVERTENCIA",
  critico: "CRÍTICO",
  "sin-datos": "SIN DATOS",
};

export function CylindersChartMobile({ data }: CylindersChartMobileProps) {
  const chartData: CylinderPoint[] = useMemo(() => {
    const cylinders = Array.from({ length: 20 }, (_, i) => {
      const key = `Tem_Cyl_${i + 1}` as keyof CylindersData;
      const temp = getNumericValue(data?.[key]);
      return {
        cylinder: `C${i + 1}`,
        temperature: temp,
        advertencia: null, // solo para leyenda
        critico: null, // solo para leyenda
      };
    });
    return cylinders;
  }, [data]);

  const promedioRaw = getNumericValue(data?.Promedio_tem_cyl);
  const diferenciaRaw = getNumericValue(data?.Diferencia_temp_clynders);

  const promedio = Number.isFinite(promedioRaw ?? NaN) ? promedioRaw : null;
  const diferencia = Number.isFinite(diferenciaRaw ?? NaN) ? diferenciaRaw : null;

  const getOverallStatus = (): Status => {
    const temps = chartData
      .map((c) => c.temperature)
      .filter((t): t is number => t !== null);

    if (temps.length === 0) return "sin-datos";

    const maxTemp = Math.max(...temps);
    if (maxTemp > 610) return "critico";
    if (maxTemp > 600) return "advertencia";
    return "normal";
  };

  const status: Status = getOverallStatus();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3">
      {/* Header con métricas resumidas para móvil */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex gap-2">
          <div className="text-center px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-[10px] text-gray-600 uppercase font-semibold">
              Promedio
            </div>
            <div className="text-lg font-bold text-blue-700">
              {promedio !== null ? `${promedio.toFixed(1)}°C` : "--"}
            </div>
          </div>
          <div className="text-center px-3 py-2 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-[10px] text-gray-600 uppercase font-semibold">
              Diferencia
            </div>
            <div className="text-lg font-bold text-purple-700">
              {diferencia !== null ? `${diferencia.toFixed(1)}°C` : "--"}
            </div>
          </div>
        </div>

        <div
          className={`px-3 py-1 rounded-full text-[11px] font-bold ${statusColors[status]}`}
        >
          {statusLabels[status]}
        </div>
      </div>

      {/* Gráfica (altura un poco menor para móvil) */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 16, left: 12, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

            <XAxis
              dataKey="cylinder"
              tick={{ fontSize: 10, fill: "#666" }}
              stroke="#666"
              interval={0}
              angle={-45}
              textAnchor="end"
            />

            <YAxis
              domain={[580, 620]}
              tick={{ fontSize: 10, fill: "#666" }}
              stroke="#666"
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #ccc",
                borderRadius: "8px",
                fontSize: "11px",
              }}
              formatter={(value: unknown, name: string) => {
                if (name === "Temperatura Actual") {
                  let numeric: number | null = null;

                  if (typeof value === "number") {
                    numeric = value;
                  } else if (
                    Array.isArray(value) &&
                    typeof value[0] === "number"
                  ) {
                    numeric = value[0];
                  }

                  if (numeric !== null) {
                    return [`${numeric.toFixed(1)}°C`, "Temperatura Actual"];
                  }

                  return [String(value ?? "N/A"), "Temperatura Actual"];
                }
                return [String(value ?? ""), name];
              }}
            />

            <Legend
              wrapperStyle={{ fontSize: "11px" }}
              iconType="line"
              verticalAlign="top"
            />

            {/* 🔶 Zona de ADVERTENCIA: 600–610°C */}
            <ReferenceArea
              y1={600}
              y2={610}
              fill="#f59e0b"
              fillOpacity={0.08}
              stroke={undefined}
            />

            {/* 🔴 Zona CRÍTICA: >610°C */}
            <ReferenceArea
              y1={610}
              y2={620}
              fill="#dc2626"
              fillOpacity={0.10}
              stroke={undefined}
            />

            {/* Umbral advertencia (600°C) */}
            <ReferenceLine
              y={600}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={2}
            />

            {/* Umbral crítico (610°C) */}
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
                r: 3,
                fill: "#3b82f6",
                strokeWidth: 2,
                stroke: "#fff",
              }}
              activeDot={{
                r: 5,
                fill: "#3b82f6",
                strokeWidth: 2,
              }}
              name="Temperatura Actual"
              connectNulls
              isAnimationActive={false}
            />

            {/* Líneas "fantasma" solo para leyenda de umbrales */}
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
              name="Crítico (610°C)"
              isAnimationActive={false}
              legendType="line"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Info muy breve debajo para móvil */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-[10px] text-gray-600">
          Normal: ≤600°C | Advertencia: 600-610°C | Crítico: &gt;610°C
        </div>
      </div>
    </div>
  );
}
