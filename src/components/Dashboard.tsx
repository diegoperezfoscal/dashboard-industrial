// industrial-iot-lab/dashboard-industrial/src/components/Dashboard.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Activity } from "lucide-react";
import { getNumericValue, getBooleanValue } from "@/types/iot.types";

import HeaderStatus from "./HeaderStatus";
import GeneralStatusCard from "./GeneralStatusCard";
import BreakerCard from "./BreakerCard";
import CurrentsChart from "./CurrentsChart";
import VoltagesChart from "./VoltagesChart";
import PhaseAnglesRadar from "./PhaseAnglesRadar";
import SequenceBars from "./SequenceBars";
import TemperatureBars from "./TemperatureBars";

/* ============ INTERFACES SIMPLIFICADAS ============ */
interface VariableData {
  value: number | boolean;
  timestamp: string;
}

interface IoTData {
  timestamp: string;
  data: {
    generator: {
      potencia_activa?: VariableData;
      potencia_reactiva?: VariableData;
      potencia_aparente?: VariableData;
      factor_potencia?: VariableData;
      frecuencia?: VariableData;
      corriente_L1?: VariableData;
      corriente_L2?: VariableData;
      corriente_L3?: VariableData;
      voltage_L1_N?: VariableData;
      voltage_L2_N?: VariableData;
      voltage_L3_N?: VariableData;
      promedio_corrientes?: VariableData;
      promedio_voltajes?: VariableData;
      angulo_fase_A?: VariableData;
      angulo_fase_B?: VariableData;
      angulo_fase_C?: VariableData;
      secuencia_positiva?: VariableData;
      secuencia_negativa?: VariableData;
      secuencia_zero?: VariableData;
      desbalance_corriente?: VariableData;
    };
    busbar?: { frecuencia?: VariableData };
    breaker: {
      closed?: VariableData;
      fault?: VariableData;
      voltage_freq_ok?: VariableData;
    };
    temperature: {
      devanado_u?: VariableData;
      devanado_v?: VariableData;
      devanado_w?: VariableData;
      rodamiento_delantero?: VariableData;
      rodamiento_trasero?: VariableData;
    };
  };
}

/* ============ CONFIGURACIÓN ============ */
const BUFFER_SIZE = 80; // ~1 minuto si llegan cada 0.75s
interface BufferPoint {
  time: number;
  value: Record<string, number>;
}

export default function GPC300Dashboard() {
  const [data, setData] = useState<IoTData | null>(null);
  const [buffer, setBuffer] = useState<{
    corriente: BufferPoint[];
    voltaje: BufferPoint[];
  }>({ corriente: [], voltaje: [] });
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ============ FUNCIONES DE BUFFER ============ */
  const updateBuffer = useCallback((msg: IoTData) => {
    const gen = msg.data.generator;
    const t = Date.now();
    setBuffer((prev) => {
      const append = (arr: BufferPoint[], value: Record<string, number>) =>
        [...arr, { time: t, value }].slice(-BUFFER_SIZE);

      return {
        corriente: append(prev.corriente, {
          L1: getNumericValue(gen.corriente_L1) || 0,
          L2: getNumericValue(gen.corriente_L2) || 0,
          L3: getNumericValue(gen.corriente_L3) || 0,
          Promedio: getNumericValue(gen.promedio_corrientes) || 0,
        }),
        voltaje: append(prev.voltaje, {
          "L1-N": getNumericValue(gen.voltage_L1_N) || 0,
          "L2-N": getNumericValue(gen.voltage_L2_N) || 0,
          "L3-N": getNumericValue(gen.voltage_L3_N) || 0,
          Promedio: getNumericValue(gen.promedio_voltajes) || 0,
        }),
      };
    });
  }, []);

  /* ============ SSE CONEXIÓN REAL ============ */
  useEffect(() => {
    const es = new EventSource("/api/iot/stream");
    es.onopen = () => {
      setConnected(true);
      setError(null);
    };
    es.onerror = () => {
      setConnected(false);
      setError("Error de conexión");
    };
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type) return; // saltar mensajes de control
        setData(msg);
        setLastUpdate(new Date());
        updateBuffer(msg);
      } catch (err) {
        console.error(err);
      }
    };
    return () => es.close();
  }, [updateBuffer]);

  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gen = (data?.data?.generator ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const breaker = (data?.data?.breaker ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const temp = (data?.data?.temperature ?? {}) as any;

  const corrienteData: Array<{ idx: number; ts: number } & Record<string, number>> =
  buffer.corriente.map((p, i) => ({
    idx: i,
    ts: p.time,          // <-- IMPORTANTE: timestamp en ms
    ...p.value
  }));
  const voltajeData: Array<{ idx: number; ts: number } & Record<string, number>> =
  buffer.voltaje.map((p, i) => ({
    idx: i,
    ts: p.time,          // <-- IMPORTANTE: timestamp en ms
    ...p.value
  }));

  const faseData = [
    { fase: "A", valor: getNumericValue(gen.angulo_fase_A) || 0 },
    { fase: "B", valor: getNumericValue(gen.angulo_fase_B) || 0 },
    { fase: "C", valor: getNumericValue(gen.angulo_fase_C) || 0 },
  ];
  const secuenciaData = [
    { name: "Positiva", value: getNumericValue(gen.secuencia_positiva) || 0 },
    { name: "Negativa", value: getNumericValue(gen.secuencia_negativa) || 0 },
    { name: "Zero", value: getNumericValue(gen.secuencia_zero) || 0 },
  ];
  const tempData = [
    { name: "Devanado U", value: getNumericValue(temp.devanado_u) || 0 },
    { name: "Devanado V", value: getNumericValue(temp.devanado_v) || 0 },
    { name: "Devanado W", value: getNumericValue(temp.devanado_w) || 0 },
    {
      name: "Rod. Delantero",
      value: getNumericValue(temp.rodamiento_delantero) || 0,
    },
    {
      name: "Rod. Trasero",
      value: getNumericValue(temp.rodamiento_trasero) || 0,
    },
  ];

  /* ============ RENDER ============ */
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Conexión SSE: indicador no bloqueante */}
      <div className="absolute right-6 top-6 z-50">
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
            error ? 'bg-red-600 text-white' : (connected ? 'bg-green-600 text-white' : 'bg-yellow-600 text-black')
          }`}
        >
          <Activity className={`w-4 h-4 ${connected ? 'animate-pulse text-white' : ''}`} />
          <span>
            {error ? error : (connected ? 'Conectado' : 'Conectando...')}
          </span>
        </div>
      </div>
      <HeaderStatus
        title="DASHBOARD GPC-300"
        subtitle="Generador Principal - Estado Actual"
        lastUpdate={lastUpdate}
      />

      {/* PANEL 1: ESTADO GENERAL */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-12 lg:col-span-8 bg-gray-800 p-4 rounded-lg border border-gray-700">
          <GeneralStatusCard
            activa={getNumericValue(gen.potencia_activa) || 0}
            reactiva={getNumericValue(gen.potencia_reactiva) || 0}
            aparente={getNumericValue(gen.potencia_aparente) || 0}
            fp={(getNumericValue(gen.factor_potencia) || 0) * 100}
          />
        </div>

        <div className="col-span-12 lg:col-span-4 bg-gray-800 p-4 rounded-lg border border-gray-700">
          <BreakerCard
            closed={!!getBooleanValue(breaker.closed)}
            ok={!!getBooleanValue(breaker.voltage_freq_ok)}
            fault={!!getBooleanValue(breaker.fault)}
            frecuencia={getNumericValue(gen.frecuencia) || 0}
          />
        </div>
      </div>

      {/* === PANEL 2A: CORRIENTES === */}
      <div className="bg-gray-800 p-4 mb-4 rounded-lg border border-gray-700">
        <h2 className="text-xl font-semibold mb-2">Corrientes (Tiempo Real)</h2>
        <CurrentsChart data={corrienteData} height={340} />
      </div>

      {/* === PANEL 2B: VOLTAJES === */}
      <div className="bg-gray-800 p-4 mb-4 rounded-lg border border-gray-700">
        <h2 className="text-xl font-semibold mb-2">Voltajes (Tiempo Real)</h2>
        <VoltagesChart data={voltajeData} height={340} />
      </div>

      {/* PANEL 3: FASES Y SECUENCIAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <PhaseAnglesRadar data={faseData} />
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <SequenceBars data={secuenciaData} />
        </div>
      </div>

      {/* PANEL 4: TEMPERATURAS */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <TemperatureBars data={tempData} />
      </div>
    </div>
  );
}
