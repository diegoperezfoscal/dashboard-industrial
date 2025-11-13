// industrial-iot-lab/dashboard-industrial/src/components/Dashboard.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Activity } from "lucide-react";
import { getNumericValue, getBooleanValue } from "@/types/iot.types";

import HeaderStatus from "./HeaderStatus";
import GeneralStatusCard from "./GeneralStatusCard";
import BreakerCard from "./BreakerCard";
import CurrentsChart from "./CurrentsChart";
import VoltagesChart from "./VoltagesChart";
import KPIVoltage from "./KPIVoltage";

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

      // Nuevos campos para KPI de tensiones línea-línea
      voltage_L1_L2?: VariableData;
      voltage_L2_L3?: VariableData;
      voltage_L1_L3?: VariableData;
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
const MAX_HISTORIAL_MS = 10 * 60 * 1000;
const MAX_RECONNECTIONS = 5;

interface BufferPoint {
  time: number;
  value: Record<string, number>;
}

type Row = { idx: number; ts: number } & Record<string, number>;

/* ============ Card con TÍTULO INTERNO ============ */
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
        "bg-white rounded-2xl",
        "border border-[var(--color-panel-border)]",
        "overflow-hidden",
        "shadow-[8px_8px_20px_rgba(0,0,0,0.18)]",
        "hover:shadow-[10px_10px_25px_rgba(0,0,0,0.25)] transition-shadow duration-300",
        className,
      ].join(" ")}
    >
      {/* Header */}
      <div className="px-0 py-0">
        <div className="relative inline-flex items-stretch h-8">
          {/* Bloque verde con borde solo inferior */}
          <div className="bg-[var(--green-dark)] text-white px-16 h-8 flex items-center border-b-4 border-gray-400">
            <h3 className="text-[13px] font-bold uppercase tracking-wider leading-none">
              {title}
            </h3>
          </div>

          {/* Curva lateral */}
          <div className="-ml-px h-8 w-9 bg-[var(--green-dark)] border-b-4 border-r-4 border-gray-400 rounded-br-[9999px]" />
        </div>
      </div>

      {/* Cuerpo */}
      <div className="px-2 pb-2 pt-1 md:px-3 md:pb-3 md:pt-1">
        {children}
      </div>
    </div>
  );
}

/* ============ DASHBOARD ============ */
export default function GPC300Dashboard() {
  const [data, setData] = useState<IoTData | null>(null);
  const [buffer, setBuffer] = useState<{
    corriente: BufferPoint[];
    voltaje: BufferPoint[];
  }>({ corriente: [], voltaje: [] });

  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);

  /* ============ ACTUALIZAR BUFFER ============ */
  const updateBuffer = useCallback((msg: IoTData) => {
    const gen = msg.data.generator;
    const ahora = Date.now();

    setBuffer((prev) => {
      const append = (arr: BufferPoint[], value: Record<string, number>) => {
        const nuevoHistorial = [...arr, { time: ahora, value }];
        return nuevoHistorial.filter(
          (punto) => ahora - punto.time < MAX_HISTORIAL_MS
        );
      };

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

  /* ============ WEBSOCKET CONNECTION ============ */
  useEffect(() => {
    const WEBSOCKET_URL =
      process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
      "wss://657pcrk382.execute-api.us-east-1.amazonaws.com/production/";

    console.group("🌐 WebSocket Debug");
    console.log("➡️ Intentando conectar a:", WEBSOCKET_URL);
    console.groupEnd();

    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let messageCount = 0;

    const connectWebSocket = () => {
      ws = new WebSocket(WEBSOCKET_URL);

      ws.onopen = () => {
        reconnectAttempts.current = 0;
        setConnected(true);
        setError(null);
        console.log("✅ WebSocket conectado correctamente");
      };

      ws.onclose = () => {
        setConnected(false);
        console.warn("🔌 WebSocket desconectado");

        if (reconnectAttempts.current < MAX_RECONNECTIONS) {
          reconnectAttempts.current += 1;
          console.warn(
            `🔄 Intento de reconexión #${reconnectAttempts.current} en 3 segundos...`
          );
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        } else {
          console.error("❌ Se alcanzó el número máximo de reconexiones");
          setError("Conexión fallida: límite de reconexiones alcanzado");
        }
      };

      ws.onerror = (err) => {
        console.error("❌ Error en WebSocket:", err);
        setError("Error de conexión WebSocket");
      };

      ws.onmessage = (event) => {
        try {
          const msg: unknown = JSON.parse(event.data);
          if (
            typeof msg === "object" &&
            msg !== null &&
            "type" in (msg as Record<string, unknown>)
          ) {
            return; // Mensaje de control, se ignora
          }

          const casted = msg as IoTData;
          messageCount++;
          console.debug(`📩 Mensaje recibido #${messageCount}`, casted);

          setData(casted);
          setLastUpdate(new Date());
          updateBuffer(casted);
        } catch (err) {
          console.error("⚠️ Error parseando mensaje:", err);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
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
    <div
      className="min-h-screen bg-white text-black overflow-x-hidden"
      style={{ scrollbarGutter: "stable both-edges" }}
    >
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
          title={lastUpdate ? `Last: ${lastUpdate.toLocaleTimeString()}` : ""}
        >
          <Activity className={`w-4 h-4 ${connected ? "animate-pulse" : ""}`} />
          <span>{error ? error : connected ? "Connected" : "Connecting..."}</span>
        </div>
      </div>

      {/* Contenedor principal */}
      <div className="container mx-auto px-3 md:px-6 2xl:px-10 max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1920px] py-3 md:py-4">
        {/* Header superior */}
        <HeaderStatus
          subtitle="Main Generator - Current Status"
          lastUpdate={lastUpdate}
        />

        {/* PANEL 1: ESTADO GENERAL + BREAKER + KPIs VOLTAJE */}
        <div className="grid grid-cols-12 gap-4 mb-3">
          {/* Más ancho a la izquierda */}
          <Card title="General Status" className="col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-4">
            <GeneralStatusCard
              activa={getNumericValue(data?.data.generator.potencia_activa) || 0}
              reactiva={getNumericValue(data?.data.generator.potencia_reactiva) || 0}
              aparente={getNumericValue(data?.data.generator.potencia_aparente) || 0}
              fp={(getNumericValue(data?.data.generator.factor_potencia) || 0) * 100}
            />
          </Card>

          {/* Breaker más compacto al centro */}
          <Card title="Breaker" className="col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-2">
            <BreakerCard
              closed={!!getBooleanValue(data?.data.breaker.closed)}
              ok={!!getBooleanValue(data?.data.breaker.voltage_freq_ok)}
              fault={!!getBooleanValue(data?.data.breaker.fault)}
              frecuencia={getNumericValue(data?.data.generator.frecuencia) || 0}
            />
          </Card>

          {/* Nuevo KPI de Tensiones a la derecha */}
          <Card
            title="Voltage KPIs"
            className="col-span-12 md:col-span-12 lg:col-span-6"
          >
            <KPIVoltage
              voltages={data?.data.generator ?? {}}
              // Si quieres ajustar el valor nominal y tolerancias:
              // expectedLineLine={400}
              // warningTolerancePercent={5}
              // dangerTolerancePercent={10}
            />
          </Card>
        </div>

        {/* PANEL 2: CORRIENTE + VOLTAJE */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          <Card title="Current" className="col-span-12 lg:col-span-6 h-full">
            <CurrentsChart data={corrienteData} height={364} />
          </Card>

          <Card title="Voltage" className="col-span-12 lg:col-span-6 h-full">
            <VoltagesChart data={voltajeData} height={364} />
          </Card>
        </div>
      </div>
    </div>
  );
}
