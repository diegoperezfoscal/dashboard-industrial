// src/hooks/useIoTConnection.ts

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { iotService } from '@/services/iotService';
import { IoTMessage } from '@/types/iot.types';

export const useIoTConnection = (onMessage: (message: IoTMessage) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Usar ref para evitar recreación del callback en cada render
  const onMessageRef = useRef(onMessage);
  
  // Actualizar ref cuando cambie el callback
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(async () => {
    if (isConnecting) {
      console.log("⏳ Conexión ya en progreso...");
      return;
    }

    

    setIsConnecting(true);
    setError(null);

    try {
      await iotService.connect(onMessageRef.current);
      setIsConnected(true);
      console.log('✅ Hook: Conexión establecida');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      setIsConnected(false);
      console.error('❌ Hook: Error de conexión:', errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  useEffect(() => {
    // Solo conectar una vez al montar
    connect();

    // Cleanup al desmontar (solo en producción o cambio de ruta)
    return () => {
      // En desarrollo, React Strict Mode desmonta/monta dos veces
      // No desconectar para mantener la conexión WebSocket estable
      if (process.env.NODE_ENV === 'production') {
        console.log('🔄 Desmontando hook en producción');
        iotService.disconnect();
        setIsConnected(false);
      } else {
        console.log('🔄 Desmontando hook en desarrollo (manteniendo conexión)');
      }
    };
  }, []); // Solo ejecutar al montar/desmontar

  return {
    isConnected,
    isConnecting,
    error,
    reconnect: connect,
  };
};