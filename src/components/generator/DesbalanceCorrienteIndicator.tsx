"use client";

import React from "react";
import { VariableData, getNumericValue } from "@/types/iot.types";

type Props = {
  desbalance_corriente?: VariableData;
};

// Umbrales (puedes ajustarlos si tu ingeniería define otros)
const NORMAL_MAX = 5; // <= 5%  → OK (verde)
const WARNING_MAX = 10; // <= 10% → Warning (ámbar)
const ABSOLUTE_MAX = 20; // escala visible máxima del indicador

function getStatusColor(value: number): string {
  if (value <= NORMAL_MAX) return "bg-green-500";
  if (value <= WARNING_MAX) return "bg-yellow-400";
  return "bg-red-500";
}

function getStatusLabel(value: number): string {
  if (value <= NORMAL_MAX) return "OK";
  if (value <= WARNING_MAX) return "Warning";
  return "Alarm";
}

export default function DesbalanceCorrienteIndicator({
  desbalance_corriente,
}: Props) {
  const raw = getNumericValue(desbalance_corriente);
  const value = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;

  const percent = Math.max(
    0,
    Math.min((value / ABSOLUTE_MAX) * 100, 100)
  );

  const barColor = getStatusColor(value);
  const statusLabel = getStatusLabel(value);

  return (
    <div className="w-full p-4 rounded-xl bg-[var(--third-paper)] flex flex-col gap-3">
      {/* Valor y estado */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-3xl font-semibold text-gray-900">
            {value.toFixed(1)}%
          </span>
        </div>

        <div
          className={`px-3 py-1 rounded-md text-xs font-semibold text-black ${barColor}`}
        >
          {statusLabel}
        </div>
      </div>

      {/* Barra con banda de alerta */}
      <div className="w-full">
        <div className="relative w-full h-4 rounded-full overflow-hidden bg-gray-300">
          {/* Banda de referencia (verde / ámbar / rojo) */}
          <div className="absolute inset-0 flex">
            {/* 0–5% → verde */}
            <div className="w-[25%] bg-green-500/25" />
            {/* 5–10% → ámbar */}
            <div className="w-[25%] bg-yellow-400/25" />
            {/* 10–20% → rojo */}
            <div className="w-[50%] bg-red-500/20" />
          </div>

          {/* Barra de valor actual */}
          <div
            className={`relative h-full ${barColor} transition-all duration-300`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Marcas numéricas debajo */}
        <div className="mt-1 flex justify-between text-[10px] text-gray-600">
          <span>0%</span>
          <span>5%</span>
          <span>10%</span>
          <span>20%</span>
        </div>
      </div>

      {/* Leyenda de la banda */}
      <div className="flex gap-3 text-[11px] text-gray-600 mt-1">
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          <span>≤ 5% OK</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
          <span>≤ 10% Warning</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          <span>&gt; 10% Alarm</span>
        </div>
      </div>
    </div>
  );
}
