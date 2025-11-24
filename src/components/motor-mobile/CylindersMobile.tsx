//industrial-iot-lab\dashboard-industrial\src\components\motor-mobile\CylindersMobile.tsx
"use client";

import React from "react";
import type { CylindersData } from "@/types/iot.types";
import { getNumericValue } from "@/types/iot.types";

interface CylindersMobileProps {
  data?: CylindersData;
}

type TempStatus = "critico" | "advertencia" | "normal" | "sin-datos";

export function CylindersMobile({ data }: CylindersMobileProps) {
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
        return "bg-gradient-to-br from-red-600 to-red-700 text-white border-red-800 shadow-md";
      case "advertencia":
        return "bg-gradient-to-br from-amber-500 to-amber-600 text-white border-amber-700 shadow-md";
      case "normal":
        return "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-700 shadow-sm";
      case "sin-datos":
      default:
        return "bg-gradient-to-br from-gray-400 to-gray-500 text-white border-gray-600";
    }
  };

  return (
    <div className="space-y-4">
      {/* Métricas principales */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-300 shadow-md">
          <div className="text-xs text-gray-700 uppercase font-semibold mb-1 tracking-wide">
            Promedio
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {promedio !== null ? `${promedio.toFixed(1)}°` : "--"}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-300 shadow-md">
          <div className="text-xs text-gray-700 uppercase font-semibold mb-1 tracking-wide">
            Diferencia
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {diferencia !== null ? `${diferencia.toFixed(1)}°` : "--"}
          </div>
        </div>
      </div>

      {/* Grid de cilindros optimizado para móvil (4 columnas x 5 filas) */}
      <div className="bg-white rounded-xl p-4 shadow-md border border-gray-300">
        <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide">
          20 Cilindros - Temperaturas
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {cylinders.map((cyl) => {
            const status = getTempStatus(cyl.temp);
            const colorClass = getStatusColor(status);

            return (
              <div
                key={cyl.id}
                className={`p-2 rounded-lg border-2 transition-all ${colorClass}`}
              >
                <div className="text-[9px] font-bold uppercase mb-0.5 leading-none">
                  C{cyl.id}
                </div>
                <div className="text-lg font-bold tabular-nums leading-none">
                  {cyl.temp !== null ? cyl.temp.toFixed(0) : "--"}
                </div>
                <div className="text-[8px] mt-0.5 leading-none">°C</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 border border-gray-300 shadow-md">
        <div className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wide">Leyenda:</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-gradient-to-br from-emerald-500 to-emerald-600 border-2 border-emerald-700 rounded flex-shrink-0" />
            <span className="text-gray-700 font-medium">Normal ≤600°C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-gradient-to-br from-amber-500 to-amber-600 border-2 border-amber-700 rounded flex-shrink-0" />
            <span className="text-gray-700 font-medium">600-610°C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-gradient-to-br from-red-600 to-red-700 border-2 border-red-800 rounded flex-shrink-0" />
            <span className="text-gray-700 font-medium">Crítico &gt;610°C</span>
          </div>
        </div>
      </div>
    </div>
  );
}