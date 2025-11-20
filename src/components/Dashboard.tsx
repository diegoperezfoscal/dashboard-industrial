"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Activity } from "lucide-react";
import {
  getNumericValue,
  getBooleanValue,
  IoTMessage,
} from "@/types/iot.types";

import HeaderStatus from "./HeaderStatus";
import GeneralStatusCard from "./GeneralStatusCard";
import BreakerCard from "./BreakerCard";
import CurrentsChart from "./CurrentsChart";
import VoltagesChart from "./VoltagesChart";
import KPIVoltage from "./KPIVoltage";
import KPITemperatureWindings from "./KPITemperatureWindings";
import PhaseAnglesPanel from "./PhaseAnglesPanel";
import BearingTemperatures from "@/components/BearingTemperatures";
import GeneratorSequenceGauge from "@/components/GeneratorSequenceGauge";
import DesbalanceCorrienteIndicator from "@/components/DesbalanceCorrienteIndicator";

/* --- NEW: components for extra tab (temporalmente desactivados) --- */
/*
import BusbarPhaseTriangle3D from "./BusbarPhaseAnglesPolar";
import BusbarSequenceBars from "./BusbarSequenceBars";
import BusbarFrequencyGauge from "./BusbarFrequencyGauge";
import DeltaBarraChart from "./DeltaBarraChart";
import DeltaBusComparisonChart from "./DeltaBusComparisonChart";
import BreakerOperationFlowPanel from "./BreakerOperationFlowPanel";
import BreakerStatusPanel from "./BreakerStatusPanel";
*/

/* ============ BUFFER ============ */
const MAX_HISTORIAL_MS = 10 * 60 * 1000;
const MAX_RECONNECTIONS = 5;

interface BufferPoint {
  time: number;
  value: Record<string, number>;
}

type Row = { idx: number; ts: number } & Record<string, number>;

/* --- Delta row type for local buffer --- */
interface DeltaPoint {
  time: number;
  delta_L1_barra?: number | null;
  delta_L2_barra?: number | null;
  delta_L3_barra?: number | null;
}

/* ============ Card with internal title ============ */
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
        "flex flex-col h-full",
        className,
      ].join(" ")}
    >
      {/* Header */}
      <div className="px-0 py-0">
        <div className="relative inline-flex items-stretch h-8">
          <div className="bg-[var(--green-dark)] text-white px-16 h-8 flex items-center border-b-4 border-gray-400">
            <h3 className="text-[13px] font-bold uppercase tracking-wider leading-none">
              {title}
            </h3>
          </div>
          <div className="-ml-px h-8 w-9 bg-[var(--green-dark)] border-b-4 border-r-4 border-gray-400 rounded-br-[9999px]" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-2 pb-2 pt-1 md:px-3 md:pb-3 md:pt-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

/* ============ DASHBOARD ============ */
export default function GPC300Dashboard() {
  const [data, setData] = useState<IoTMessage | null>(null);
  const [buffer, setBuffer] = useState<{
    corriente: BufferPoint[];
    voltaje: BufferPoint[];
  }>({ corriente: [], voltaje: [] });

  /* --- new delta buffer for delta charts --- */
  const [deltaBuffer, setDeltaBuffer] = useState<DeltaPoint[]>([]);

  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);

  /* ============ UPDATE BUFFER ============ */
  const updateBuffer = useCallback((msg: IoTMessage) => {
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
          L1: getNumericValue(gen?.corriente_L1) || 0,
          L2: getNumericValue(gen?.corriente_L2) || 0,
          L3: getNumericValue(gen?.corriente_L3) || 0,
          Promedio: getNumericValue(gen?.promedio_corrientes) || 0,
        }),
        voltaje: append(prev.voltaje, {
          "L1-N": getNumericValue(gen?.voltage_L1_N) || 0,
          "L2-N": getNumericValue(gen?.voltage_L2_N) || 0,
          "L3-N": getNumericValue(gen?.voltage_L3_N) || 0,
          Promedio: getNumericValue(gen?.promedio_voltajes) || 0,
        }),
      };
    });

    // Update deltaBuffer (keep same trimming behavior)
    setDeltaBuffer((prev) => {
      const next = [
        ...prev,
        {
          time: ahora,
          delta_L1_barra:
            typeof gen?.delta_L1_barra === "number"
              ? gen.delta_L1_barra
              : null,
          delta_L2_barra:
            typeof gen?.delta_L2_barra === "number"
              ? gen.delta_L2_barra
              : null,
          delta_L3_barra:
            typeof gen?.delta_L3_barra === "number"
              ? gen.delta_L3_barra
              : null,
        },
      ];
      return next.filter((p) => ahora - p.time < MAX_HISTORIAL_MS);
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
            // Control message (e.g. handshake) - ignore
            return;
          }

          const casted = msg as IoTMessage;
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

  /* ============ ROWS FOR CHARTS ============ */
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

  /* --- delta rows for delta charts (por ahora solo se calculan, se usan en Extras comentado) --- */
  const deltaDataRows = deltaBuffer.map((p, i) => ({
    idx: i,
    ts: p.time,
    delta_L1_barra: p.delta_L1_barra ?? undefined,
    delta_L2_barra: p.delta_L2_barra ?? undefined,
    delta_L3_barra: p.delta_L3_barra ?? undefined,
  }));

  /* ============ TABS (estado desactivado temporalmente) ============ */
  /*
  const [activeTab, setActiveTab] = useState<"main" | "extras">("main");
  */

  /* ============ RENDER ============ */
  return (
    <div
      className="min-h-screen bg-white text-black overflow-x-hidden"
      style={{ scrollbarGutter: "stable both-edges" }}
    >
      {/* Connection status */}
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
          <Activity
            className={`w-4 h-4 ${connected ? "animate-pulse" : ""}`}
          />
          <span>
            {error ? error : connected ? "Connected" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Page container */}
      <div className="container mx-auto px-3 md:px-6 2xl:px-10 max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1920px] py-3 md:py-4">
        {/* Header */}
        <HeaderStatus
          subtitle="Main Generator - Current Status"
          lastUpdate={lastUpdate}
        />

        {/* Tabs (solo Main visible, controles comentados) */}
        {/*
        <div className="mt-4 mb-4 flex items-center gap-3">
          <button
            onClick={() => setActiveTab("main")}
            className={`px-3 py-1 rounded-full border ${
              activeTab === "main"
                ? "bg-[var(--green-dark)] text-white border-[var(--green-dark)]"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            Main
          </button>
          <button
            onClick={() => setActiveTab("extras")}
            className={`px-3 py-1 rounded-full border ${
              activeTab === "extras"
                ? "bg-[var(--green-dark)] text-white border-[var(--green-dark)]"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            Extras (Busbar / Delta / Breaker)
          </button>
        </div>
        */}

        {/* Contenido actual: solo MAIN (Extras comentado abajo para poder reactivarlo luego) */}
        <>
          <div className="grid grid-cols-12 gap-4 mb-3 items-start">
            <Card
              title="General Status"
              className="col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-4"
            >
              <GeneralStatusCard
                activa={
                  getNumericValue(data?.data.generator?.potencia_activa) || 0
                }
                reactiva={
                  getNumericValue(data?.data.generator?.potencia_reactiva) || 0
                }
                aparente={
                  getNumericValue(data?.data.generator?.potencia_aparente) || 0
                }
                fp={
                  (getNumericValue(data?.data.generator?.factor_potencia) ||
                    0) * 100
                }
              />
            </Card>

            <Card
              title="Breaker"
              className="col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-2"
            >
              <BreakerCard
                closed={!!getBooleanValue(data?.data.breaker?.closed)}
                ok={!!getBooleanValue(data?.data.breaker?.voltage_freq_ok)}
                fault={!!getBooleanValue(data?.data.breaker?.fault)}
                frecuencia={
                  getNumericValue(data?.data.generator?.frecuencia) || 0
                }
              />
            </Card>

            <Card
              title="Voltage KPIs"
              className="col-span-12 md:col-span-12 lg:col-span-6"
            >
              <KPIVoltage voltages={data?.data.generator ?? {}} />
            </Card>
          </div>

          <div className="grid grid-cols-12 gap-4 mb-4 items-start">
            <Card title="Current" className="col-span-12 lg:col-span-6">
              <div className="w-full">
                <CurrentsChart data={corrienteData} height={364} />
              </div>
            </Card>

            <Card title="Voltage" className="col-span-12 lg:col-span-6">
              <div className="w-full">
                <VoltagesChart data={voltajeData} height={364} />
              </div>
            </Card>
          </div>

        {/* Bearing + Sequences + Unbalance (50% - 50%) */}
          <div className="grid grid-cols-12 gap-4 mb-4 items-start">

            {/* Izquierda (50%): Bearing */}
            <Card
              title="Bearing Temperatures"
              className="col-span-12 lg:col-span-6"
            >
              <BearingTemperatures
                rodamientoDelantero={data?.data.temperature?.rodamiento_delantero}
                rodamientoTrasero={data?.data.temperature?.rodamiento_trasero}
              />
            </Card>

            {/* Derecha (50%): Sequences + Unbalance apilados */}
            <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
              <Card
                title="Generator Sequences"
                className="flex-1"
              >
                <GeneratorSequenceGauge
                  secuenciaPositiva={data?.data.generator?.secuencia_positiva}
                  secuenciaNegativa={data?.data.generator?.secuencia_negativa}
                  secuenciaZero={data?.data.generator?.secuencia_zero}
                />
              </Card>

              <Card
                title="Current Unbalance"
                className="flex-1"
              >
                <DesbalanceCorrienteIndicator
                  desbalance_corriente={data?.data.generator?.desbalance_corriente}
                />
              </Card>
            </div>

          </div>


        </>

        {/* ================== BLOQUE ORIGINAL CON TABS (MAIN + EXTRAS) GUARDADO COMENTADO ==================
        
        <div className="mt-4 mb-4 flex items-center gap-3">
          <button
            onClick={() => setActiveTab("main")}
            className={`px-3 py-1 rounded-full border ${
              activeTab === "main"
                ? "bg-[var(--green-dark)] text-white border-[var(--green-dark)]"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            Main
          </button>
          <button
            onClick={() => setActiveTab("extras")}
            className={`px-3 py-1 rounded-full border ${
              activeTab === "extras"
                ? "bg-[var(--green-dark)] text-white border-[var(--green-dark)]"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            Extras (Busbar / Delta / Breaker)
          </button>
        </div>

        {activeTab === "main" ? (
          <>
            ... (contenido MAIN, igual al de arriba)
          </>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-4 mb-4 items-start">
              <Card title="Busbar Phase Angles" className="col-span-12 md:col-span-6 lg:col-span-4">
                <div className="w-full h-[360px]">
                  <BusbarPhaseTriangle3D busbar={data?.data.busbar} />
                </div>
              </Card>

              <Card title="Busbar Sequences" className="col-span-12 md:col-span-6 lg:col-span-4">
                <BusbarSequenceBars busbar={data?.data.busbar} />
              </Card>

              <Card title="Busbar Frequency" className="col-span-12 md:col-span-12 lg:col-span-4">
                <BusbarFrequencyGauge busbar={data?.data.busbar} />
              </Card>
            </div>

            <div className="grid grid-cols-12 gap-4 mb-4 items-start">
              <Card title="Delta (Generator vs Bus) - Plotly" className="col-span-12 lg:col-span-6">
                <div className="w-full h-[360px]">
                  <DeltaBarraChart data={deltaDataRows} height={340} />
                </div>
              </Card>

              <Card title="Delta (Generator vs Bus) - Recharts" className="col-span-12 lg:col-span-6">
                <div className="w-full h-[360px]">
                  <DeltaBusComparisonChart
                    data={deltaDataRows.map(d => ({
                      ts: d.ts,
                      delta_L1_barra: d.delta_L1_barra ?? 0,
                      delta_L2_barra: d.delta_L2_barra ?? 0,
                      delta_L3_barra: d.delta_L3_barra ?? 0,
                    }))}
                    height={340}
                  />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-12 gap-4 mb-4 items-start">
              <Card title="Breaker Operation Flow" className="col-span-12 lg:col-span-6">
                <BreakerOperationFlowPanel
                  breaker={data?.data.breaker}
                  generator={data?.data.generator}
                  busbar={data?.data.busbar}
                />
              </Card>

              <Card title="Breaker Status" className="col-span-12 lg:col-span-6">
                <BreakerStatusPanel breakerData={data?.data.breaker ?? {}} />
              </Card>
            </div>
          </>
        )}
        
        ====================================================================== */}
      </div>
    </div>
  );
}
