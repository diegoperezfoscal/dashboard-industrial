// industrial-iot-lab/dashboard-industrial/src/components/DashboardMotorMovil.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { IoTMessage } from "@/types/iot.types";
import { getNumericValue } from "@/types/iot.types";
import HeaderStatus from "./HeaderStatus";

// Importaremos los componentes móviles
import { OilSystemMobile } from "@/components/motor-mobile/OilSystemMobile";
import { CylindersMobile } from "@/components/motor-mobile/CylindersMobile";
import { CoolingSystemMobile } from "@/components/motor-mobile/CoolingSystemMobile";
import { CylindersChartMobile } from "@/components/motor-mobile/CylindersChartMobile";


// Tab component
function Tab({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 font-bold text-sm transition-all ${
        isActive
          ? "text-blue-700 border-b-3 border-blue-600 bg-white shadow-sm"
          : "text-gray-600 border-b-2 border-gray-300 bg-gray-50 hover:bg-white hover:text-gray-800"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs uppercase tracking-wide font-semibold">{label}</span>
    </button>
  );
}

export default function DashboardMotorMovil() {
  const [data, setData] = useState<IoTMessage | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"aceite" | "cilindros" | "enfriamiento">("aceite");

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
  const MAX_HISTORY_POINTS = 15;

  const addToHistory = useCallback(
    (msg: IoTMessage) => {
      const timestamp = Date.now();

      // Historial de aceite (solo si viene el bloque)
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

      // Historial de enfriamiento (solo si viene el bloque)
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

  useEffect(() => {
    // 👉 Igual que en DashboardMotor
    const WEBSOCKET_URL =
      process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
      "wss://657pcrk382.execute-api.us-east-1.amazonaws.com/production/";

    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connectWebSocket = () => {
      ws = new WebSocket(WEBSOCKET_URL);

      ws.onopen = () => {
        console.log("Motor Móvil Dashboard: WebSocket Connected");
        reconnectAttempts.current = 0;
      };

      ws.onclose = () => {
        console.log("Motor Móvil Dashboard: WebSocket Disconnected");

        if (reconnectAttempts.current < MAX_RECONNECTIONS) {
          reconnectAttempts.current += 1;
          reconnectTimer = window.setTimeout(connectWebSocket, 3000);
        }
      };

      ws.onerror = () => {
        // Registrar error para evitar función vacía (silenciar intencionalmente)
        console.debug("MotorMovilDashboard: WebSocket error");
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
            `📩 Mensaje recibido en MotorMovilDashboard - subsystem: ${
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
          if (!casted.subsystem && !casted.data?.cylinders) {
            console.debug(
              `⏭️ Mensaje descartado (no tiene cylinders) - device_id: ${casted.device_id}`
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300 sticky top-0 z-10 shadow-md">
        <div className="px-3 py-2">
          <HeaderStatus subtitle="Motor - Current Status" lastUpdate={lastUpdate} />
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 border-t border-gray-200">
          <Tab
            label="Aceite"
            icon="🛢️"
            isActive={activeTab === "aceite"}
            onClick={() => setActiveTab("aceite")}
          />
          <Tab
            label="Cilindros"
            icon="🔥"
            isActive={activeTab === "cilindros"}
            onClick={() => setActiveTab("cilindros")}
          />
          <Tab
            label="Enfriamiento"
            icon="❄️"
            isActive={activeTab === "enfriamiento"}
            onClick={() => setActiveTab("enfriamiento")}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-3 bg-white">
        {activeTab === "aceite" && (
          <OilSystemMobile
            data={data?.data.oil_system}
            historicalData={oilHistory}
          />
        )}

        {activeTab === "cilindros" && (
          <div className="flex flex-col gap-4">
            {/* Grid / vista por cilindro */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">
                Vista por cilindro
              </h2>
              <CylindersMobile data={data?.data.cylinders} />
            </div>

            {/* Gráfica de temperaturas (nueva) */}
            <div>
              <CylindersChartMobile data={data?.data.cylinders} />
            </div>
          </div>
        )}

        {activeTab === "enfriamiento" && (
          <CoolingSystemMobile
            data={data?.data.cooling_system}
            historicalData={coolingHistory}
          />
        )}
      </div>
    </div>
  );
}
