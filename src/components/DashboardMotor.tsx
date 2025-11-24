//industrial-iot-lab\dashboard-industrial\src\components\DashboardMotor.tsx

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  OilSystemDualChart,
  CylindersChart,
  CoolingSystemCard,
} from "@/components/motor";
import type { IoTMessage } from "@/types/iot.types";
import { getNumericValue } from "@/types/iot.types";
import HeaderStatus from "./HeaderStatus";

/* ============ Card Component ============ */
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
          {/* Banda principal */}
          <div className="bg-[var(--green-dark)] text-white h-8 flex items-center border-b-4 border-gray-400 w-3/5 min-w-[160px] max-w-full px-3 md:px-4">
            <h3 className="text-[13px] font-bold uppercase tracking-wider leading-none">
              {title}
            </h3>
          </div>

          {/* Cola curva */}
          <div className="-ml-px h-8 w-9 bg-[var(--green-dark)] border-b-4 border-r-4 border-gray-400 rounded-br-[9999px]" />
        </div>
      </div>

      <div className="flex-1 px-2 pb-2 pt-1 md:px-3 md:pb-3 md:pt-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

export default function DashboardMotor() {
  const [data, setData] = useState<IoTMessage | null>(null);
  // Omitimos el valor si solo usamos el setter para evitar la alerta "no-unused-vars"
  const [, setConnected] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Historial de datos para las gráficas
  const [oilHistory, setOilHistory] = useState<
    Array<{
      timestamp: number;
      temperatura_aceite: number | null;
      temperatura_filtro: number | null;
      presion_aceite: number | null;
    }>
  >([]);

  const [coolingHistory, setCoolingHistory] = useState<
    Array<{
      timestamp: number;
      temp_lt_salida: number | null;
      t_ht_entrada: number | null;
      tem_ht_ref_salida: number | null;
      presion_ht: number | null;
    }>
  >([]);

  const reconnectAttempts = useRef(0);
  const MAX_RECONNECTIONS = 5;
  const MAX_HISTORY_POINTS = 10; // Mantener últimos 15 puntos para mejor legibilidad

  // Función para agregar datos al historial
  const addToHistory = useCallback(
    (msg: IoTMessage) => {
      const timestamp = Date.now();

      // Acumular datos del sistema de aceite
      if (msg.data.oil_system) {
        setOilHistory((prev) => {
          const newPoint = {
            timestamp,
            temperatura_aceite: getNumericValue(
              msg.data.oil_system?.Temperatura_aceite
            ),
            temperatura_filtro: getNumericValue(
              msg.data.oil_system?.Tempe_filtro
            ),
            presion_aceite: getNumericValue(
              msg.data.oil_system?.Presion_aceite
            ),
          };

          const updated = [...prev, newPoint];
          return updated.slice(-MAX_HISTORY_POINTS);
        });
      }

      // Acumular datos del sistema de enfriamiento
      if (msg.data.cooling_system) {
        setCoolingHistory((prev) => {
          const newPoint = {
            timestamp,
            temp_lt_salida: getNumericValue(
              msg.data.cooling_system?.Temp_LT_salida
            ),
            t_ht_entrada: getNumericValue(
              msg.data.cooling_system?.T_HT_ENTRADA
            ),
            tem_ht_ref_salida: getNumericValue(
              msg.data.cooling_system?.Tem_HT_ref_salida
            ),
            presion_ht: getNumericValue(msg.data.cooling_system?.Presion_HT),
          };

          const updated = [...prev, newPoint];
          return updated.slice(-MAX_HISTORY_POINTS);
        });
      }
    },
    [MAX_HISTORY_POINTS]
  );

  /* ============ WEBSOCKET CONNECTION ============ */
  useEffect(() => {
    const WEBSOCKET_URL =
      process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
      "wss://657pcrk382.execute-api.us-east-1.amazonaws.com/production/";

    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connectWebSocket = () => {
      ws = new WebSocket(WEBSOCKET_URL);

      ws.onopen = () => {
        console.log("Motor Dashboard: WebSocket Connected");
        reconnectAttempts.current = 0;
        setConnected(true);
        setError(null);
      };

      ws.onclose = () => {
        console.log("Motor Dashboard: WebSocket Disconnected");
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

          // Ignorar mensajes de control tipo { type: ... }
          if (
            typeof msg === "object" &&
            msg !== null &&
            "type" in (msg as Record<string, unknown>)
          ) {
            return;
          }

          // Añadimos campo opcional subsystem para filtrar
          const casted = msg as IoTMessage & { subsystem?: string };

          console.debug(
            `📩 Mensaje recibido en MotorDashboard - subsystem: ${
              casted.subsystem ?? "undefined"
            }`
          );

          // 1) Si viene con subsystem explícito, solo aceptamos "motor"
          if (casted.subsystem && casted.subsystem !== "motor") {
            console.debug(
              `⏭️ Mensaje ignorado (subsystem: ${casted.subsystem})`
            );
            return;
          }

          // 2) Si NO tiene subsystem, filtramos por forma:
          //    Para motor esperamos que en data exista "cylinders"
          if (
            !casted.subsystem &&
            casted.data &&
            !("cylinders" in casted.data)
          ) {
            console.debug(
              "⏭️ Mensaje ignorado (no tiene 'cylinders', se asume que no es motor)"
            );
            return;
          }

          // Si pasa los filtros, es un mensaje de motor
          console.debug("✅ Procesando mensaje de motor");
          setData(casted);
          setLastUpdate(new Date());
          addToHistory(casted);
        } catch (err: unknown) {
          console.error("Error parseando mensaje:", err);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      if (ws) ws.close();
    };
  }, [addToHistory]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-2 md:p-3">
      {/* Header */}
      <HeaderStatus
        subtitle="Motor - Current Status"
        lastUpdate={lastUpdate}
      />

      {/* Dashboard Content */}
      <div className="space-y-3 mt-3">
        {/* Fila 1: Sistemas de Aceite y Enfriamiento lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Sistema de Aceite */}
          <Card title="Sistema de Aceite">
            <OilSystemDualChart
              data={data?.data.oil_system}
              historicalData={oilHistory}
            />
          </Card>

          {/* Sistema de Enfriamiento */}
          <Card title="Sistema de Enfriamiento">
            <CoolingSystemCard
              data={data?.data.cooling_system}
              historicalData={coolingHistory}
            />
          </Card>
        </div>

        {/* Fila 2: Cilindros (horizontal, ancho completo) */}
        <Card title="Temperaturas de Cilindros">
          {/* Opción 1: Grid de cilindros */}
          {/* <CylindersGrid data={data?.data.cylinders} /> */}

          {/* Opción 2: Gráfica de línea con rangos */}
          <CylindersChart data={data?.data.cylinders} />
        </Card>
      </div>
    </div>
  );
}
