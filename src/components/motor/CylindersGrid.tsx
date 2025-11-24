"use client";

import React from "react";
import type { CylindersData } from "@/types/iot.types";
import { getNumericValue } from "@/types/iot.types";

interface CylindersGridProps {
  data?: CylindersData;
}

type TempStatus = "critico" | "advertencia" | "normal" | "sin-datos";

export function CylindersGrid({ data }: CylindersGridProps) {
  const cylinders = Array.from({ length: 20 }, (_, i) => {
    const key = `Tem_Cyl_${i + 1}` as keyof CylindersData;
    const temp = getNumericValue(data?.[key]);
    return {
      id: i + 1,
      temp,
    };
  });

  const promedio = getNumericValue(data?.Promedio_tem_cyl);
  const diferencia = getNumericValue(data?.Diferencia_temp_clynders);

  const getTempStatus = (temp: number | null): TempStatus => {
    if (temp === null) return "sin-datos";
    if (temp > 610) return "critico";
    if (temp > 600) return "advertencia";
    return "normal";
  };

  const getStatusColor = (status: TempStatus): string => {
    switch (status) {
      case "critico":
        return "bg-red-500 text-white border-red-600";
      case "advertencia":
        return "bg-yellow-400 text-gray-900 border-yellow-500";
      case "normal":
        return "bg-green-100 text-green-800 border-green-300";
      case "sin-datos":
      default:
        return "bg-gray-200 text-gray-600 border-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con métricas */}
      <div className="flex items-center justify-end">
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
      </div>

      {/* Grid de cilindros (4 filas x 5 columnas) */}
      <div className="grid grid-cols-5 gap-3">
        {cylinders.map((cyl) => {
          const status = getTempStatus(cyl.temp);
          const colorClass = getStatusColor(status);

          return (
            <div
              key={cyl.id}
              className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${colorClass}`}
            >
              <div className="text-xs font-bold uppercase mb-1">
                Cyl {cyl.id}
              </div>
              <div className="text-3xl font-bold tabular-nums">
                {cyl.temp !== null ? cyl.temp.toFixed(1) : "--"}
              </div>
              <div className="text-xs mt-1">°C</div>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded" />
          <span className="text-gray-700">Normal (≤600°C)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-400 border-2 border-yellow-500 rounded" />
          <span className="text-gray-700">Advertencia (600–610°C)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 border-2 border-red-600 rounded" />
          <span className="text-gray-700">Crítico (&gt;610°C)</span>
        </div>
      </div>
    </div>
  );
}
