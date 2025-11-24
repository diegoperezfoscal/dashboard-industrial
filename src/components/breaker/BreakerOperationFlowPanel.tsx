// src/components/BreakerOperationFlowPanel.tsx
"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Power,
  Zap,
  ArrowRightLeft,
} from "lucide-react";
import {
  BreakerData,
  BusbarData,
  GeneratorData,
  getBooleanValue,
  getNumericValue,
} from "@/types/iot.types";

type Props = {
  breaker?: BreakerData;
  generator?: GeneratorData;
  busbar?: BusbarData;
};

type StepState = "inactive" | "active" | "blocked";

function getStepClasses(state: StepState): string {
  if (state === "blocked") {
    return "bg-red-500 border-red-600 text-white";
  }
  if (state === "active") {
    return "bg-[var(--green-dark)] border-[var(--green-dark)] text-white";
  }
  return "bg-gray-100 border-gray-300 text-gray-500";
}

const BreakerOperationFlowPanel: React.FC<Props> = ({
  breaker,
  generator,
  busbar,
}) => {
  // --- Breaker flags ---
  const voltageOk = !!getBooleanValue(breaker?.voltage_freq_ok);
  const opened = !!getBooleanValue(breaker?.opened);
  const closed = !!getBooleanValue(breaker?.closed);
  const fault = !!getBooleanValue(breaker?.fault);
  const readyToClose = !!getBooleanValue(breaker?.ready_to_close);
  const syncInProgress = !!getBooleanValue(breaker?.sync_in_progress);
  const readyToOpen = !!getBooleanValue(breaker?.ready_to_open);

  // --- Frecuencias GEN / BUS ---
  const genFreq = getNumericValue(generator?.frecuencia);
  const busFreq = getNumericValue(busbar?.frecuencia);
  const deltaFreq =
    genFreq !== null && busFreq !== null ? genFreq - busFreq : null;

  // --- Estados de los pasos de operación ---
  const stepReadyToClose: StepState = fault
    ? "blocked"
    : readyToClose
    ? "active"
    : "inactive";

  const stepSync: StepState = fault
    ? "blocked"
    : syncInProgress
    ? "active"
    : "inactive";

  const stepClosed: StepState = fault
    ? "blocked"
    : closed
    ? "active"
    : "inactive";

  const stepReadyToOpen: StepState = fault
    ? "blocked"
    : readyToOpen
    ? "active"
    : "inactive";

  // --- Estado textual abierto/cerrado ---
  const stateLabel = fault
    ? "FAULT"
    : closed
    ? "CLOSED"
    : opened
    ? "OPENED"
    : "INTERMEDIATE";

  const stateColorClass = fault
    ? "bg-red-600 text-white"
    : closed
    ? "bg-[var(--green-dark)] text-white"
    : opened
    ? "bg-gray-100 text-gray-800"
    : "bg-amber-400 text-black";

  return (
    <div className="flex h-full w-full flex-col gap-3 text-xs text-gray-700">
      {/* Resumen superior: frecuencias + estado general */}
      <div className="grid grid-cols-12 gap-2">
        {/* GEN / BUS / Δf */}
        <div className="col-span-7 grid grid-cols-3 gap-2">
          <div className="flex flex-col rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
            <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              <Zap className="h-3 w-3" />
              <span>GEN FREQ</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {genFreq !== null ? `${genFreq.toFixed(2)} Hz` : "--"}
            </div>
          </div>

          <div className="flex flex-col rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
            <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              <Zap className="h-3 w-3" />
              <span>BUS FREQ</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {busFreq !== null ? `${busFreq.toFixed(2)} Hz` : "--"}
            </div>
          </div>

          <div className="flex flex-col rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
            <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              <ArrowRightLeft className="h-3 w-3" />
              <span>ΔF GEN-BUS</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {deltaFreq !== null ? `${deltaFreq.toFixed(2)} Hz` : "--"}
            </div>
          </div>
        </div>

        {/* Estado principal del breaker */}
        <div className="col-span-5 flex flex-col rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Power className="h-3 w-3" />
              Breaker State
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2
                className={`h-3 w-3 ${
                  voltageOk ? "text-[var(--green-dark)]" : "text-gray-400"
                }`}
              />
              <span className="text-[10px]">
                {voltageOk ? "V/F OK" : "V/F NOT OK"}
              </span>
            </span>
          </div>
          <div className="mt-1 inline-flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${stateColorClass}`}
            >
              {stateLabel}
            </span>
            {fault && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                <AlertTriangle className="h-3 w-3" />
                FAULT ACTIVE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Línea de pasos de operación */}
      <div className="mt-1 rounded-xl border border-gray-200 bg-white px-3 py-2">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-500">
          Operation Sequence
        </div>
        <div className="flex items-center justify-between gap-3">
          {/* Paso 1: Ready to Close */}
          <div className="flex flex-1 flex-col items-center gap-1 text-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${getStepClasses(
                stepReadyToClose
              )}`}
            >
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-gray-700">
              Ready to Close
            </span>
          </div>

          <div className="h-px flex-1 bg-gray-300" />

          {/* Paso 2: Sync in Progress */}
          <div className="flex flex-1 flex-col items-center gap-1 text-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${getStepClasses(
                stepSync
              )}`}
            >
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-gray-700">
              Sync in Progress
            </span>
          </div>

          <div className="h-px flex-1 bg-gray-300" />

          {/* Paso 3: Closed */}
          <div className="flex flex-1 flex-col items-center gap-1 text-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${getStepClasses(
                stepClosed
              )}`}
            >
              <Power className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-gray-700">
              Closed
            </span>
          </div>

          <div className="h-px flex-1 bg-gray-300" />

          {/* Paso 4: Ready to Open */}
          <div className="flex flex-1 flex-col items-center gap-1 text-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${getStepClasses(
                stepReadyToOpen
              )}`}
            >
              <Power className="h-4 w-4 rotate-180" />
            </div>
            <span className="text-[11px] font-medium text-gray-700">
              Ready to Open
            </span>
          </div>
        </div>

        {/* Indicadores inferiores: OPENED / CLOSED flags brutos */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-gray-600">
          <span className="inline-flex items-center gap-1">
            <span
              className={`h-2 w-2 rounded-full ${
                opened ? "bg-[var(--green-dark)]" : "bg-gray-300"
              }`}
            />
            OPENED FLAG
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className={`h-2 w-2 rounded-full ${
                closed ? "bg-[var(--green-dark)]" : "bg-gray-300"
              }`}
            />
            CLOSED FLAG
          </span>
        </div>
      </div>
    </div>
  );
};

export default BreakerOperationFlowPanel;
