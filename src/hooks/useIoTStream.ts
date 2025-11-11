// // src/hooks/useIoTStream.ts
// 'use client';

// import { useEffect, useState, useRef, useCallback } from 'react';
// import { IoTMessage } from '@/types/iot.types';

// interface UseIoTStreamReturn {
//   isConnected: boolean;
//   lastMessage: IoTMessage | null;
//   messages: IoTMessage[];
//   error: string | null;
//   reconnect: () => void;
//   clearMessages: () => void;
// }

// interface UseIoTStreamOptions {
//   maxMessages?: number; // Número máximo de mensajes a mantener en memoria
//   autoReconnect?: boolean; // Reconectar automáticamente
//   reconnectDelay?: number; // Delay entre reintentos (ms)
// }

// export function useIoTStream(options: UseIoTStreamOptions = {}): UseIoTStreamReturn {
//   const {
//     maxMessages = 100,
//     autoReconnect = true,
//     reconnectDelay = 5000,
//   } = options;

//   const [isConnected, setIsConnected] = useState(false);
//   const [lastMessage, setLastMessage] = useState<IoTMessage | null>(null);
//   const [messages, setMessages] = useState<IoTMessage[]>([]);
//   const [error, setError] = useState<string | null>(null);
  
//   const eventSourceRef = useRef<EventSource | null>(null);
//   const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const shouldReconnectRef = useRef(true);

//   const clearMessages = useCallback(() => {
//     setMessages([]);
//     setLastMessage(null);
//   }, []);

//   const connect = useCallback(() => {
//     // Función interna que maneja la conexión SSE
//     const doConnect = () => {
//       // Limpiar reconexión pendiente
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//         reconnectTimeoutRef.current = null;
//       }

//       // Cerrar conexión existente si la hay
//       if (eventSourceRef.current) {
//         eventSourceRef.current.close();
//         eventSourceRef.current = null;
//       }

//       console.log('🔌 Iniciando conexión SSE...');

//       try {
//         // Crear conexión EventSource (SSE)
//         const eventSource = new EventSource('/api/iot/stream');
//         eventSourceRef.current = eventSource;

//         eventSource.onopen = () => {
//           console.log('✅ Conexión SSE establecida');
//           setIsConnected(true);
//           setError(null);
//         };

//         eventSource.onmessage = (event) => {
//           try {
//             const data = JSON.parse(event.data);
            
//             // Mensajes de sistema
//             if (data.type === 'heartbeat') {
//               console.log('💓 Heartbeat recibido');
//               return;
//             }

//             if (data.type === 'connected') {
//               console.log('✅ Confirmación de conexión:', data.timestamp);
//               return;
//             }

//             if (data.type === 'error') {
//               console.error('❌ Error del servidor:', data.message);
//               setError(data.message);
//               return;
//             }

//             // Mensaje real de IoT Core
//             console.log('📨 Mensaje IoT recibido:', data);
            
//             // Actualizar último mensaje
//             setLastMessage(data);
            
//             // Agregar a la lista de mensajes (mantener solo los últimos N)
//             setMessages((prev) => {
//               const newMessages = [data, ...prev];
//               return newMessages.slice(0, maxMessages);
//             });
            
//           } catch (error) {
//             console.error('❌ Error parseando mensaje:', error, event.data);
//           }
//         };

//         eventSource.onerror = (event) => {
//           console.error('❌ Error en SSE:', event);
//           setIsConnected(false);
          
//           // Cerrar conexión actual
//           if (eventSourceRef.current) {
//             eventSourceRef.current.close();
//             eventSourceRef.current = null;
//           }

//           // Reintentar si está habilitado y el componente sigue montado
//           if (autoReconnect && shouldReconnectRef.current) {
//             setError(`Conexión perdida. Reintentando en ${reconnectDelay / 1000}s...`);
            
//             reconnectTimeoutRef.current = setTimeout(() => {
//               console.log('🔄 Reintentando conexión...');
//               doConnect(); // ✅ ahora usamos la función interna
//             }, reconnectDelay);
//           } else {
//             setError('Conexión perdida. Click en Reconectar.');
//           }
//         };

//       } catch (error) {
//         console.error('❌ Error creando EventSource:', error);
//         setError('Error al crear conexión SSE');
//         setIsConnected(false);
//       }
//     };

//     doConnect(); // Iniciar la conexión
//   }, [autoReconnect, reconnectDelay, maxMessages]);

//   const reconnect = useCallback(() => {
//     console.log('🔄 Reconexión manual solicitada');
//     setError(null);
//     connect();
//   }, [connect]);

//   // Conectar al montar el componente
//   useEffect(() => {
//     shouldReconnectRef.current = true;
//     connect();

//     // Cleanup al desmontar
//     return () => {
//       console.log('🔌 Limpiando conexión SSE');
//       shouldReconnectRef.current = false;

//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//         reconnectTimeoutRef.current = null;
//       }

//       if (eventSourceRef.current) {
//         eventSourceRef.current.close();
//         eventSourceRef.current = null;
//       }
//     };
//   }, [connect]);

//   return {
//     isConnected,
//     lastMessage,
//     messages,
//     error,
//     reconnect,
//     clearMessages,
//   };
// }
