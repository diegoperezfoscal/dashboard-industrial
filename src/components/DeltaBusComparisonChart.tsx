// src/components/DeltaBarraChart.tsx
"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from "recharts";
type DeltaRow = {
  ts: number; // timestamp en ms (epoch)
  delta_L1_barra: number;
  delta_L2_barra: number;
  delta_L3_barra: number;
};

type DeltaBarraChartProps = {
  data: DeltaRow[];
  height?: number;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    name: string;
    color?: string;
  }>;
  label?: number | string;
}

// Tooltip personalizado con formato de hora + valores
const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const timestamp =
    typeof label === "number" ? new Date(label) : new Date(Number(label));
  const timeLabel = isNaN(timestamp.getTime())
    ? ""
    : timestamp.toLocaleTimeString();

  return (
    <div className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs shadow-md">
      {timeLabel && (
        <p className="mb-1 font-semibold text-gray-700">{timeLabel}</p>
      )}
      {payload.map((item) => {
        if (!item || typeof item.value !== "number") return null;

        return (
          <div key={item.dataKey} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color ?? "#000000" }}
            />
            <span className="text-gray-600">
              {item.name}:{" "}
              <span className="font-semibold text-gray-900">
                {item.value.toFixed(2)}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
};

const DeltaBarraChart: React.FC<DeltaBarraChartProps> = ({
  data,
  height = 320,
}) => {
  // Dominio fijo para sensación "ECG" centrado en 0
  const yDomain: [number, number] = [-20, 20];

  return (
    <div className="h-full w-full">
      <div className="mb-2 flex items-center gap-4 text-[11px] uppercase tracking-wide text-gray-600">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span>±5% OK</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span>±10% Warning</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span>&gt;10% Alarm</span>
        </div>
      </div>

      <div className="h-[260px] md:h-[280px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
            {/* Grid industrial sutil */}
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            {/* Eje X usando timestamp, con formato HH:MM:SS */}
            <XAxis
              dataKey="ts"
              tickMargin={6}
              minTickGap={24}
              tickFormatter={(value: number) => {
                const d = new Date(value);
                if (isNaN(d.getTime())) return "";
                return d.toLocaleTimeString([], {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
              }}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={{ stroke: "#d1d5db" }}
              tickLine={{ stroke: "#d1d5db" }}
            />

            {/* Eje Y centrado en 0 con dominio fijo */}
            <YAxis
              domain={yDomain}
              tickMargin={4}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={{ stroke: "#d1d5db" }}
              tickLine={{ stroke: "#d1d5db" }}
            />

            {/* Bandas de referencia */}
            {/* Zona verde: ±5% */}
            <ReferenceArea
              y1={-5}
              y2={5}
              fill="rgba(34,197,94,0.08)"
              stroke="none"
            />
            {/* Zona ámbar: -10% a -5% y 5% a 10% */}
            <ReferenceArea
              y1={-10}
              y2={-5}
              fill="rgba(250,204,21,0.1)"
              stroke="none"
            />
            <ReferenceArea
              y1={5}
              y2={10}
              fill="rgba(250,204,21,0.1)"
              stroke="none"
            />
            {/* Zona roja fuera de ±10% (solo fondo superior/inferior del dominio) */}
            <ReferenceArea
              y1={yDomain[0]}
              y2={-10}
              fill="rgba(239,68,68,0.08)"
              stroke="none"
            />
            <ReferenceArea
              y1={10}
              y2={yDomain[1]}
              fill="rgba(239,68,68,0.08)"
              stroke="none"
            />

            {/* Tooltip */}
            <Tooltip content={<CustomTooltip />} />

            {/* Líneas tipo ECG para cada delta */}
            <Line
              type="monotone"
              dataKey="delta_L1_barra"
              name="Δ L1"
              stroke="#16a34a"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="delta_L2_barra"
              name="Δ L2"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="delta_L3_barra"
              name="Δ L3"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DeltaBarraChart;
