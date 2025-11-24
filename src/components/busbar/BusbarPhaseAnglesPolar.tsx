"use client";

import React, { useMemo } from "react";
import type { BusbarData } from "@/types/iot.types";
import { getNumericValue } from "@/types/iot.types";

type Props = {
  busbar?: BusbarData;
};

type PhaseLabel = "A" | "B" | "C";
type PhaseStatus = "OK" | "WARN" | "ALARM";

interface PhaseVector {
  label: PhaseLabel;
  angleDeg: number;        // ángulo tal como lo mostramos en el polar
  deviationDeg: number;    // desbalance en grados (siempre positivo)
  color: string;           // color de identidad de fase
  status: PhaseStatus;
}

interface PhaseSeparations {
  AB: number;
  BC: number;
  CA: number;
}

// Tolerancias de desbalance respecto a 120°
const WARN_TOLERANCE_DEG = 10;   // hasta 10° -> OK
const ALARM_TOLERANCE_DEG = 20;  // 10–20° -> WARN, >20° -> ALARM

const STATUS_COLORS: Record<PhaseStatus, string> = {
  OK: "#16a34a",    // verde
  WARN: "#f97316",  // naranja
  ALARM: "#dc2626", // rojo
};

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Diferencia angular mínima entre dos ángulos, en rango [-180, 180]
function shortestAngleDiff(a: number, b: number): number {
  let diff = a - b;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
}

function getStatusFromDeviation(deviationDeg: number): PhaseStatus {
  const absDev = Math.abs(deviationDeg);
  if (absDev <= WARN_TOLERANCE_DEG) return "OK";
  if (absDev <= ALARM_TOLERANCE_DEG) return "WARN";
  return "ALARM";
}

export default function BusbarPhaseAnglesPolar({ busbar }: Props) {
  const { phases, separations } = useMemo(() => {
    const rawA = getNumericValue(busbar?.angulo_fase_A);
    const rawB = getNumericValue(busbar?.angulo_fase_B);
    const rawC = getNumericValue(busbar?.angulo_fase_C);

    // Si no hay datos, valores típicos trifásicos
    const angleA = rawA ?? 0;
    const angleB = rawB ?? -120;
    const angleC = rawC ?? 120;

    // Separaciones reales entre fases (considerando circularidad)
    const sepAB = Math.abs(shortestAngleDiff(angleB, angleA));
    const sepBC = Math.abs(shortestAngleDiff(angleC, angleB));
    const sepCA = Math.abs(shortestAngleDiff(angleA, angleC));

    // Desbalance vs 120° (positivo = cuántos grados se aleja de 120)
    const devAB = sepAB - 120;
    const devBC = sepBC - 120;
    const devCA = sepCA - 120;

    // Desbalance por fase (máximo de sus separaciones vecinas)
    const devA = Math.max(Math.abs(devAB), Math.abs(devCA));
    const devB = Math.max(Math.abs(devAB), Math.abs(devBC));
    const devC = Math.max(Math.abs(devBC), Math.abs(devCA));

    const statusA = getStatusFromDeviation(devA);
    const statusB = getStatusFromDeviation(devB);
    const statusC = getStatusFromDeviation(devC);

    const phasesLocal: PhaseVector[] = [
      {
        label: "A",
        angleDeg: angleA,
        deviationDeg: devA,
        color: "#1d4ed8", // azul
        status: statusA,
      },
      {
        label: "B",
        angleDeg: angleB,
        deviationDeg: devB,
        color: "#f59e0b", // ámbar
        status: statusB,
      },
      {
        label: "C",
        angleDeg: angleC,
        deviationDeg: devC,
        color: "#10b981", // verde
        status: statusC,
      },
    ];

    const separationsLocal: PhaseSeparations = {
      AB: sepAB,
      BC: sepBC,
      CA: sepCA,
    };

    return { phases: phasesLocal, separations: separationsLocal };
  }, [busbar]);

  // Estado global según la peor fase
  const globalStatus: PhaseStatus = useMemo(() => {
    if (phases.some((p) => p.status === "ALARM")) return "ALARM";
    if (phases.some((p) => p.status === "WARN")) return "WARN";
    return "OK";
  }, [phases]);

  const centerX = 100;
  const centerY = 100;
  const radius = 70;

  const globalStatusColor = STATUS_COLORS[globalStatus];

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Fila superior: estado global + referencia nominal */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 font-medium">Phase balance</span>
          <span
            className="px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: `${globalStatusColor}1A`,
              color: globalStatusColor,
            }}
          >
            {globalStatus}
          </span>
        </div>
        <span className="text-gray-400">
          Ref: AB ≈ BC ≈ CA ≈ 120°
        </span>
      </div>

      {/* Diagrama polar */}
      <div className="flex justify-center">
        <svg viewBox="0 0 200 200" width={200} height={200}>
          {/* Círculo base */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="#f9fafb"
            stroke="#e5e7eb"
            strokeWidth={2}
          />

          {/* Aros concéntricos suaves */}
          {[0.4, 0.7, 1].map((factor) => (
            <circle
              key={factor}
              cx={centerX}
              cy={centerY}
              r={radius * factor}
              fill="none"
              stroke="#eef2f7"
              strokeWidth={1}
            />
          ))}

          {/* Ejes de referencia */}
          <line
            x1={centerX - radius}
            y1={centerY}
            x2={centerX + radius}
            y2={centerY}
            stroke="#e5e7eb"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <line
            x1={centerX}
            y1={centerY - radius}
            x2={centerX}
            y2={centerY + radius}
            stroke="#f3f4f6"
            strokeWidth={1}
          />

          {/* Ticks básicos (0°, ±120°) */}
          {[
            { angleDeg: 0, label: "0°" },
            { angleDeg: -120, label: "-120°" },
            { angleDeg: 120, label: "+120°" },
          ].map((tick) => {
            const rad = toRadians(tick.angleDeg);
            const outerR = radius + 4;
            const innerR = radius - 4;
            const tx = centerX + outerR * Math.cos(rad);
            const ty = centerY + outerR * Math.sin(rad);
            const x2 = centerX + innerR * Math.cos(rad);
            const y2 = centerY + innerR * Math.sin(rad);
            const lx = centerX + (radius + 10) * Math.cos(rad);
            const ly = centerY + (radius + 10) * Math.sin(rad);
            return (
              <g key={tick.angleDeg}>
                <line
                  x1={x2}
                  y1={y2}
                  x2={tx}
                  y2={ty}
                  stroke="#d1d5db"
                  strokeWidth={1}
                />
                <text
                  x={lx}
                  y={ly}
                  fontSize={9}
                  fill="#6b7280"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {tick.label}
                </text>
              </g>
            );
          })}

          {/* Vectores de fase (ángulo absoluto) */}
          {phases.map((phase) => {
            const rad = toRadians(phase.angleDeg);
            const length = radius * 0.9;
            const x2 = centerX + length * Math.cos(rad);
            const y2 = centerY + length * Math.sin(rad);

            const labelRadius = radius * 1.05;
            const lx = centerX + labelRadius * Math.cos(rad);
            const ly = centerY + labelRadius * Math.sin(rad);

            const statusColor = STATUS_COLORS[phase.status];

            return (
              <g key={phase.label}>
                {/* Glow de estado */}
                {phase.status !== "OK" && (
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={x2}
                    y2={y2}
                    stroke={statusColor}
                    strokeWidth={5}
                    strokeLinecap="round"
                    opacity={0.18}
                  />
                )}

                {/* Línea de fase */}
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={x2}
                  y2={y2}
                  stroke={phase.color}
                  strokeWidth={3}
                  strokeLinecap="round"
                />

                {/* Punta */}
                <circle cx={x2} cy={y2} r={3} fill={phase.color} />

                {/* Etiqueta A/B/C */}
                <text
                  x={lx}
                  y={ly}
                  fontSize={11}
                  fontWeight={600}
                  fill={phase.color}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {phase.label}
                </text>
              </g>
            );
          })}

          {/* Centro */}
          <circle cx={centerX} cy={centerY} r={3} fill="#6b7280" />
        </svg>
      </div>

      {/* Tarjetas por fase con relleno según estado */}
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        {phases.map((phase) => {
          const statusColor = STATUS_COLORS[phase.status];
          const absDeviation = Math.abs(phase.deviationDeg).toFixed(1);

          const cardBg =
            phase.status === "OK"
              ? "#ecfdf3" // verde muy suave
              : phase.status === "WARN"
              ? "#fff7ed" // ámbar muy suave
              : "#fef2f2"; // rojo muy suave

          return (
            <div
              key={phase.label}
              className="flex flex-col items-center gap-1 rounded-md border px-2 py-1.5"
              style={{
                backgroundColor: cardBg,
                borderColor: `${statusColor}40`,
              }}
            >
              {/* Título fase */}
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex w-2 h-2 rounded-full"
                  style={{ backgroundColor: phase.color }}
                />
                <span className="text-[11px] font-semibold text-gray-700">
                  Fase {phase.label}
                </span>
              </div>

              {/* Ángulo actual */}
              <div className="text-[12px] font-semibold text-gray-900">
                {phase.angleDeg.toFixed(1)}°
              </div>

              {/* Desbalance vs 120° */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-gray-500">
                  Desbalance (vs 120°)
                </span>
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    backgroundColor: `${statusColor}10`,
                    color: statusColor,
                  }}
                >
                  Δ {absDeviation}°
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Separaciones entre fases */}
      <div className="flex justify-center gap-3 text-[11px] text-gray-600">
        <div className="flex items-center gap-1">
          <span className="font-medium">AB</span>
          <span className="text-gray-900 font-semibold">
            {separations.AB.toFixed(1)}°
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">BC</span>
          <span className="text-gray-900 font-semibold">
            {separations.BC.toFixed(1)}°
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">CA</span>
          <span className="text-gray-900 font-semibold">
            {separations.CA.toFixed(1)}°
          </span>
        </div>
      </div>
    </div>
  );
}
