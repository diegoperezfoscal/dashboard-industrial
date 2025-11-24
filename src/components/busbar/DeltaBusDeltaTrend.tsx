"use client";

import React, { useMemo } from "react";

type DeltaRow = {
  ts: number;
  delta_L1_barra?: number;
  delta_L2_barra?: number;
  delta_L3_barra?: number;
};

type Props = {
  data: DeltaRow[];
  maxRange: number;
  warningThreshold: number;
  alarmThreshold: number;
  height?: number;
};

type Status = "ok" | "warn" | "alarm";

function classify(
  v: number,
  warningThreshold: number,
  alarmThreshold: number
): Status {
  const abs = Math.abs(v);
  if (abs >= alarmThreshold) return "alarm";
  if (abs >= warningThreshold) return "warn";
  return "ok";
}

function barColor(status: Status): string {
  if (status === "alarm") return "bg-red-500";
  if (status === "warn") return "bg-yellow-400";
  return "bg-[var(--green-light)]";
}

export default function DeltaBusDeltaTrend({
  data,
  maxRange,
  warningThreshold,
  alarmThreshold,
  height = 380,
}: Props) {
  const latest = useMemo(() => {
    if (data.length === 0) return null;
    return data[data.length - 1];
  }, [data]);

  const phases = useMemo(
  () => [
    { key: "delta_L1_barra" as const, label: "L1" },
    { key: "delta_L2_barra" as const, label: "L2" },
    { key: "delta_L3_barra" as const, label: "L3" },
  ],
  []
);

  const generalStatus = useMemo<Status>(() => {
    if (!latest) return "ok";

    let worst: Status = "ok";

    phases.forEach((p) => {
      const raw = latest[p.key];
      const value = typeof raw === "number" ? raw : 0;
      const s = classify(value, warningThreshold, alarmThreshold);

      if (s === "alarm") worst = "alarm";
      else if (s === "warn" && worst !== "alarm") worst = "warn";
    });

    return worst;
  }, [latest, warningThreshold, alarmThreshold, phases]);

  const center = 50;

  return (
    <div className="w-full flex flex-col items-center justify-center" style={{ height }}>
      {/* Título + indicadores globales */}
      <div className="w-full flex items-center justify-between mb-4 px-6">
        <div className="text-sm font-semibold text-gray-900">
          ΔV – Desbalance de voltaje
        </div>

        {/* Indicadores globales */}
        <div className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full bg-[var(--green-light)] ${
              generalStatus === "ok" ? "opacity-100" : "opacity-30"
            }`}
          />
          <span
            className={`w-3 h-3 rounded-full bg-yellow-400 ${
              generalStatus === "warn" ? "opacity-100" : "opacity-30"
            }`}
          />
          <span
            className={`w-3 h-3 rounded-full bg-red-500 ${
              generalStatus === "alarm" ? "opacity-100" : "opacity-30"
            }`}
          />
        </div>
      </div>

      {/* Fases */}
      <div className="flex flex-col gap-4 w-full px-6">
        {phases.map((p) => {
          const raw = latest ? latest[p.key] : undefined;
          const value = typeof raw === "number" ? raw : 0;

          const pct = ((value + maxRange) / (maxRange * 2)) * 100;
          const clamped = Math.min(98, Math.max(2, pct));
          const status = classify(value, warningThreshold, alarmThreshold);

          const isPos = value >= 0;
          let left: number;
          let width: number;

          if (isPos) {
            left = center;
            width = Math.max(0, clamped - center);
          } else {
            left = clamped;
            width = Math.max(0, center - clamped);
          }

          return (
            <div key={p.key} className="flex flex-col gap-1">
              {/* Header */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-800">{p.label}</span>
                <span className="text-base font-bold text-gray-900">
                  {value.toFixed(1)} V
                </span>
              </div>

              {/* Contenedor general de la barra + triángulo */}
            <div className="relative w-full">

              {/* Barra horizontal */}
              <div className="relative w-full h-6 rounded-full border border-black-400 bg-gray-100 overflow-hidden">
                {/* Barra del valor (debajo) */}
                {width > 0 && (
                  <div
                    className={`absolute top-0 h-full ${barColor(status)}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                )}

                {/* Línea central marcada (encima) */}
                <div
                  className="absolute top-0 h-full w-[2px] bg-black/80 z-10"
                  style={{ left: "50%" }}
                />
              </div>

              {/* Triángulo fuera de la barra, ya no lo tapa overflow-hidden */}
              <div
                className="absolute left-1/2 top-full -translate-x-1/2 mt-[2px]
                          w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px]
                          border-l-transparent border-r-transparent border-t-black/70"
              />
            </div>
            </div>
          );
        })}
      </div>

      {/* Escala */}
      <div className="flex justify-between w-full text-xs text-gray-600 mt-3 px-10">
        <span>-{maxRange} V</span>
        <span>0 V</span>
        <span>+{maxRange} V</span>
      </div>

      {/* ⭐ LEYENDAS RESTAURADAS (más minimalistas) */}
      <div className="mt-3 flex flex-col items-center text-[11px] text-gray-600 px-8">
        <div className="flex flex-wrap justify-center gap-4">

          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[var(--green-light)]" />
            <span>OK (&lt; {warningThreshold} V)</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span>Warning ({warningThreshold}–{alarmThreshold} V)</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>Alarm (≥ {alarmThreshold} V)</span>
          </div>

        </div>
      </div>
    </div>
  );
}
