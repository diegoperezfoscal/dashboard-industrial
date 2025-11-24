"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  lazy,
  Suspense,
} from "react";
import { Activity } from "lucide-react";
import {
  getNumericValue,
  getBooleanValue,
  IoTMessage,
} from "@/types/iot.types";

// Common components
import HeaderStatus from "./HeaderStatus";

// Generator components
import {
  GeneralStatusCard,
  CurrentsChart,
  VoltagesChart,
  KPIVoltage,
  GeneratorSequenceGauge,
  DesbalanceCorrienteIndicator,
} from "./generator";

// Breaker components
import { BreakerCard } from "./breaker";

// Temperature components
import { BearingTemperatures } from "./temperature";

/* --- Lazy Load components for extra tab --- */
const BusbarPhaseTriangle3D = lazy(() =>
  import("./busbar").then((m) => ({ default: m.BusbarPhaseAnglesPolar }))
);
const BusbarSequenceBars = lazy(() =>
  import("./busbar").then((m) => ({ default: m.BusbarSequenceBars }))
);
const BusbarFrequencyGauge = lazy(() =>
  import("./busbar").then((m) => ({ default: m.BusbarFrequencyGauge }))
);
const BreakerOperationFlowPanel = lazy(() =>
  import("./breaker").then((m) => ({ default: m.BreakerOperationFlowPanel }))
);
const BreakerStatusPanel = lazy(() =>
  import("./breaker").then((m) => ({ default: m.BreakerStatusPanel }))
);
const DeltaBusDeltaTrend = lazy(() =>
  import("./busbar").then((m) => ({ default: m.DeltaBusDeltaTrend }))
);

/* ============ BUFFER ============ */
const MAX_HISTORIAL_MS = 10 * 60 * 1000;
const MAX_RECONNECTIONS = 5;

interface BufferPoint {
  time: number;
  value: Record<string, number>;
}

type Row = { idx: number; ts: number } & Record<string, number>;

interface DeltaPoint {
  time: number;
  delta_L1_barra: number | null;
  delta_L2_barra: number | null;
  delta_L3_barra: number | null;
}

interface DeltaRow {
  ts: number;
  delta_L1_barra?: number;
  delta_L2_barra?: number;
  delta_L3_barra?: number;
}

/* ============ Card ============ */
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
      <div className="px-0 py-0">
        <div className="relative flex items-stretch h-8 w-full">
          {/* Banda principal: ocupa ~60% del ancho del card */}
          <div className="bg-[var(--green-dark)] text-white h-8 flex items-center border-b-4 border-gray-400 w-3/5 min-w-[160px] max-w-full px-3 md:px-4">
            <h3 className="text-[13px] font-bold uppercase tracking-wider leading-none">
              {title}
            </h3>
          </div>

          {/* “Cola” curva a la derecha */}
          <div className="-ml-px h-8 w-9 bg-[var(--green-dark)] border-b-4 border-r-4 border-gray-400 rounded-br-[9999px]" />
        </div>
      </div>

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

  const [deltaBuffer, setDeltaBuffer] = useState<DeltaPoint[]>([]);

  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const messageCount = useRef(0);

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

    setDeltaBuffer((prev) => {
      const deltaL1 = getNumericValue(gen?.delta_L1_barra);
      const deltaL2 = getNumericValue(gen?.delta_L2_barra);
      const deltaL3 = getNumericValue(gen?.delta_L3_barra);

      const next: DeltaPoint[] = [
        ...prev,
        {
          time: ahora,
          delta_L1_barra: deltaL1,
          delta_L2_barra: deltaL2,
          delta_L3_barra: deltaL3,
        },
      ];
      return next.filter((p) => ahora - p.time < MAX_HISTORIAL_MS);
    });
  }, []);

  /* ============ WEBSOCKET ============ */
  useEffect(() => {
    const WEBSOCKET_URL =
      process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
      "wss://657pcrk382.execute-api.us-east-1.amazonaws.com/production/";

    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connectWebSocket = () => {
      ws = new WebSocket(WEBSOCKET_URL);

      ws.onopen = () => {
        reconnectAttempts.current = 0;
        setConnected(true);
        setError(null);
      };

      ws.onclose = () => {
        setConnected(false);

        if (reconnectAttempts.current < MAX_RECONNECTIONS) {
          reconnectAttempts.current += 1;
          reconnectTimer = window.setTimeout(connectWebSocket, 3000);
        } else {
          setError("Conexión fallida");
        }
      };

      ws.onerror = () => {
        setError("Error de conexión WebSocket");
      };

      ws.onmessage = (event) => {
        try {
          const msg: unknown = JSON.parse(event.data);

          // Control message - ignore
          if (
            typeof msg === "object" &&
            msg !== null &&
            "type" in (msg as Record<string, unknown>)
          ) {
            return;
          }

          // 🆕 FILTRAR: Solo procesar mensajes del generador
          const casted = msg as IoTMessage & { subsystem?: string };

          // Log para debug
          console.debug(`📩 Mensaje recibido - Subsystem: ${casted.subsystem || 'undefined'}`);

          // Si tiene subsystem y NO es generator, ignorar
          if (casted.subsystem && casted.subsystem !== "generator") {
            console.debug(`⏭️ Mensaje ignorado (subsystem: ${casted.subsystem})`);
            return;
          }

          // Si no tiene subsystem pero tiene data.cylinders, es del motor - ignorar
          if (!casted.subsystem && casted.data && 'cylinders' in casted.data) {
            console.debug("⏭️ Mensaje ignorado (detectado como motor por estructura)");
            return;
          }

          messageCount.current++;
          console.log(`✅ Procesando mensaje de generador #${messageCount.current}`);

          setData(casted);
          setLastUpdate(new Date());
          updateBuffer(casted);
        } catch (err: unknown) {
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

  /* ============ ROWS ============ */
  const corrienteData: Row[] = useMemo(
    () =>
      buffer.corriente.map((p, i): Row => ({
        idx: i,
        ts: p.time,
        ...p.value,
      })),
    [buffer.corriente]
  );

  const voltajeData: Row[] = useMemo(
    () =>
      buffer.voltaje.map((p, i): Row => ({
        idx: i,
        ts: p.time,
        ...p.value,
      })),
    [buffer.voltaje]
  );

  const deltaDataRows: DeltaRow[] = useMemo(
    () =>
      deltaBuffer.map(
        (p): DeltaRow => ({
          ts: p.time,
          delta_L1_barra:
            p.delta_L1_barra !== null && !Number.isNaN(p.delta_L1_barra)
              ? p.delta_L1_barra
              : undefined,
          delta_L2_barra:
            p.delta_L2_barra !== null && !Number.isNaN(p.delta_L2_barra)
              ? p.delta_L2_barra
              : undefined,
          delta_L3_barra:
            p.delta_L3_barra !== null && !Number.isNaN(p.delta_L3_barra)
              ? p.delta_L3_barra
              : undefined,
        })
      ),
    [deltaBuffer]
  );

  /* ============ TABS ACTIVADOS ============ */
  const [activeTab, setActiveTab] = useState<"main" | "extras">("main");

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
          <Activity className={`w-4 h-4 ${connected ? "animate-pulse" : ""}`} />
          <span>
            {error ? error : connected ? "Connected" : "Connecting..."}
          </span>
        </div>
      </div>

      <div className="container mx-auto px-3 md:px-6 2xl:px-10 max-w-[1600px] py-3 md:py-4">
        <HeaderStatus
          subtitle="Main Generator - Current Status"
          lastUpdate={lastUpdate}
        />

        {/* Tabs restored */}
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
            {/* MAIN CONTENT */}
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
                    getNumericValue(
                      data?.data.generator?.potencia_reactiva
                    ) || 0
                  }
                  aparente={
                    getNumericValue(
                      data?.data.generator?.potencia_aparente
                    ) || 0
                  }
                  fp={
                    (getNumericValue(
                      data?.data.generator?.factor_potencia
                    ) || 0) * 100
                  }
                />
              </Card>

              <Card
                title="Breaker"
                className="col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-2"
              >
                <BreakerCard
                  closed={!!getBooleanValue(data?.data.breaker?.closed)}
                  ok={!!getBooleanValue(
                    data?.data.breaker?.voltage_freq_ok
                  )}
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
                <CurrentsChart data={corrienteData} height={364} />
              </Card>

              <Card title="Voltage" className="col-span-12 lg:col-span-6">
                <VoltagesChart data={voltajeData} height={364} />
              </Card>
            </div>

            <div className="grid grid-cols-12 gap-4 mb-4 items-start">
              <Card
                title="Bearing Temperatures"
                className="col-span-12 lg:col-span-6"
              >
                <BearingTemperatures
                  rodamientoDelantero={
                    data?.data.temperature?.rodamiento_delantero
                  }
                  rodamientoTrasero={
                    data?.data.temperature?.rodamiento_trasero
                  }
                />
              </Card>

              <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
                <Card title="Generator Sequences" className="flex-1">
                  <GeneratorSequenceGauge
                    secuenciaPositiva={
                      data?.data.generator?.secuencia_positiva
                    }
                    secuenciaNegativa={
                      data?.data.generator?.secuencia_negativa
                    }
                    secuenciaZero={data?.data.generator?.secuencia_zero}
                  />
                </Card>

                <Card title="Current Unbalance" className="flex-1">
                  <DesbalanceCorrienteIndicator
                    desbalance_corriente={
                      data?.data.generator?.desbalance_corriente
                    }
                  />
                </Card>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* EXTRAS CONTENT */}

            {/* Fila 1: Breaker Operation Flow (40%) + Busbar Sequences (40%) + Busbar Frequency (20%) */}
            <div className="grid grid-cols-12 gap-4 mb-4 auto-rows-max">
              <Card
                title="Breaker Operation Flow"
                className="col-span-12 lg:col-span-5 h-[480px]"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <Suspense fallback={<div>Loading...</div>}>
                    <BreakerOperationFlowPanel
                      breaker={data?.data.breaker}
                      generator={data?.data.generator}
                      busbar={data?.data.busbar}
                    />
                  </Suspense>
                </div>
              </Card>

              <Card
                title="Busbar Sequences"
                className="col-span-12 lg:col-span-5 h-[480px]"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <Suspense fallback={<div>Loading...</div>}>
                    <BusbarSequenceBars busbar={data?.data.busbar} />
                  </Suspense>
                </div>
              </Card>

              <Card
                title="Busbar Frequency"
                className="col-span-12 lg:col-span-2 h-[480px]"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <Suspense fallback={<div>Loading...</div>}>
                    <BusbarFrequencyGauge busbar={data?.data.busbar} />
                  </Suspense>
                </div>
              </Card>
            </div>

            {/* Fila 2: Busbar Phase Angles + Breaker Status */}
            <div className="grid grid-cols-12 gap-4 mb-4 auto-rows-max">
              <Card
                title="Busbar Phase Angles"
                className="col-span-12 lg:col-span-4 h-[480px]"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <Suspense fallback={<div>Loading...</div>}>
                    <BusbarPhaseTriangle3D busbar={data?.data.busbar} />
                  </Suspense>
                </div>
              </Card>

              <Card
                title="Breaker Status"
                className="col-span-12 lg:col-span-4 h-[480px]"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <Suspense fallback={<div>Loading...</div>}>
                    <BreakerStatusPanel breakerData={data?.data.breaker ?? {}} />
                  </Suspense>
                </div>
              </Card>

              <Card
                title="Generator–Busbar Voltage Δ"
                className="col-span-12 lg:col-span-4 h-[220px]"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <Suspense fallback={<div>Loading...</div>}>
                    <DeltaBusDeltaTrend
                      data={deltaDataRows}
                      maxRange={10}
                      warningThreshold={2}
                      alarmThreshold={5}
                      height={180}
                    />
                  </Suspense>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
