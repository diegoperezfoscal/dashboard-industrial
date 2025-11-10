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

/* ============ TIPOS ============ */
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
      promedio_corrientes?: VariableData;

      voltage_L1_N?: VariableData;
      voltage_L2_N?: VariableData;
      voltage_L3_N?: VariableData;
      promedio_voltajes?: VariableData;
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

/* ============ BUFFER ============ */
const BUFFER_SIZE = 80;

interface BufferPoint {
  time: number;
  value: Record<string, number>;
}

type Row = { idx: number; ts: number } & Record<string, number>;

/* ============ Card con “base” ancha y píldora verde ============ */
function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        // Fondo menos brillante (gris suave, como la imagen)
        "relative rounded-2xl bg-[var(--gray-soft)]",
        "border border-[var(--color-panel-border)] shadow-lg",
        // sutil separación interna
        "px-3 pb-3 pt-6",
        className,
      ].join(" ")}
    >
      {/* BASE amplia (pestaña gris) */}
      <div className="absolute -top-4 left-5">
        <div
          className={[
            "h-8 rounded-full",
            // gris clarito, ancho mayor para parecerse al ejemplo
            "bg-[rgba(0,0,0,0.06)]",
            "backdrop-blur-[1px]",
            "px-6",
            "inline-flex items-center shadow-sm",
          ].join(" ")}
          style={{ minWidth: 160 }}
        >
          {/* PÍLDORA verde encima */}
          <div className="inline-flex items-center rounded-full bg-[var(--green-medium)] text-white px-4 py-1 font-semibold uppercase tracking-wide text-[11px] relative -top-[2px] shadow">
            {title}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="mt-2 rounded-xl bg-white/70 p-3">
        {children}
      </div>
    </div>
  );
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

  /* ============ ACTUALIZAR BUFFER ============ */
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

  /* ============ SSE ============ */
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
        const msg: unknown = JSON.parse(e.data);
        if (typeof msg === "object" && msg !== null && "type" in (msg as Record<string, unknown>)) {
          return;
        }
        const casted = msg as IoTData;
        setData(casted);
        setLastUpdate(new Date());
        updateBuffer(casted);
      } catch (err) {
        console.error(err);
      }
    };
    return () => es.close();
  }, [updateBuffer]);

  /* ============ FILAS PARA GRÁFICAS ============ */
  const corrienteData: Row[] = buffer.corriente.map((p, i) => ({
    idx: i,
    ts: p.time,
    ...p.value,
  }));

  const voltajeData: Row[] = buffer.voltaje.map((p, i) => ({
    idx: i,
    ts: p.time,
    ...p.value,
  }));

  /* ============ RENDER ============ */
  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-[var(--green-dark)] via-[var(--gray-soft)] to-[var(--gray-soft)] text-gray-900">
      {/* Estado conexión */}
      <div className="absolute right-6 top-6 z-50">
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium shadow-md ${
            error
              ? "bg-red-600 text-white"
              : connected
              ? "bg-[var(--green-light)] text-white"
              : "bg-yellow-500 text-black"
          }`}
          title={lastUpdate ? `Última: ${lastUpdate.toLocaleTimeString()}` : ""}
        >
          <Activity className={`w-4 h-4 ${connected ? "animate-pulse" : ""}`} />
          <span>{error ? error : connected ? "Conectado" : "Conectando..."}</span>
        </div>
      </div>

      {/* Header superior (se conserva) */}
      <HeaderStatus
        title="DASHBOARD GPC-300"
        subtitle="Generador Principal - Estado Actual"
        lastUpdate={lastUpdate}
      />

      {/* PANEL 1: ESTADO GENERAL (se conserva) */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <Card title="Estado General" className="col-span-12 lg:col-span-8">
          <GeneralStatusCard
            activa={getNumericValue(data?.data.generator.potencia_activa) || 0}
            reactiva={getNumericValue(data?.data.generator.potencia_reactiva) || 0}
            aparente={getNumericValue(data?.data.generator.potencia_aparente) || 0}
            fp={(getNumericValue(data?.data.generator.factor_potencia) || 0) * 100}
          />
        </Card>

        <Card title="Breaker" className="col-span-12 lg:col-span-4">
          <BreakerCard
            closed={!!getBooleanValue(data?.data.breaker.closed)}
            ok={!!getBooleanValue(data?.data.breaker.voltage_freq_ok)}
            fault={!!getBooleanValue(data?.data.breaker.fault)}
            frecuencia={getNumericValue(data?.data.generator.frecuencia) || 0}
          />
        </Card>
      </div>

      {/* PANEL 2: SOLO CORRIENTE Y VOLTAJE (lo demás se elimina) */}
      <Card title="Mediciones Eléctricas" className="mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Corriente">
            <CurrentsChart data={corrienteData} height={360} />
          </Card>

          <Card title="Voltaje">
            <VoltagesChart data={voltajeData} height={360} />
          </Card>
        </div>
      </Card>
    </div>
  );
}
