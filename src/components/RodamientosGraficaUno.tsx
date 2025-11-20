// src/components/BearingTemperatures.tsx
"use client";

import React from "react";
import { VariableData, getNumericValue } from "@/types/iot.types";

type Props = {
  rodamientoDelantero?: VariableData;
  rodamientoTrasero?: VariableData;
};

const MAX_TEMP = 120; // °C - límite superior para la barra

function getBarColor(temp: number | null): string {
  if (temp === null) return "bg-slate-500/60";

  if (temp < 70) return "bg-emerald-400"; // zona segura
  if (temp < 90) return "bg-amber-400";   // atención
  return "bg-red-500";                    // alarma
}

interface BearingBarProps {
  label: string;
  value: number | null;
}

const BearingBar: React.FC<BearingBarProps> = ({ label, value }) => {
  const clamped =
    value === null
      ? 0
      : Math.max(0, Math.min(value, MAX_TEMP));

  const percent = (clamped / MAX_TEMP) * 100;
  const colorClass = getBarColor(value);

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs md:text-sm text-slate-800">
        <span className="uppercase tracking-wide text-slate-900">
          {label}
        </span>
        <span className="font-semibold tabular-nums">
          {value !== null ? `${value.toFixed(1)} °C` : "-- °C"}
        </span>
      </div>

      <div className="h-3 w-full rounded-full bg-slate-900/70 border border-slate-700/70 overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] md:text-[11px] text-slate-700">
        <span>0 °C</span>
        <span>70 °C</span>
        <span>90 °C</span>
        <span>{MAX_TEMP} °C</span>
      </div>
    </div>
  );
};

const BearingTemperatures: React.FC<Props> = ({
  rodamientoDelantero,
  rodamientoTrasero,
}) => {
  const front = getNumericValue(rodamientoDelantero);
  const rear = getNumericValue(rodamientoTrasero);

  return (
    <div className="space-y-4">
      {/* Aquí no coloco título grande para que lo manejes en tu panel padre */}
      <BearingBar label="Rodamiento delantero" value={front} />
      <BearingBar label="Rodamiento trasero" value={rear} />
    </div>
  );
};

export default BearingTemperatures;
