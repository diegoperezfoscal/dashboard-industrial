// src/app/page.tsx o tu componente
'use client';

import { useIoTStream } from "@/hooks/useIoTStream";

export default function Dashboard() {
  const { isConnected, lastMessage, error } = useIoTStream();

  return (
    <div>
      <h1>Dashboard Industrial</h1>
      
      {/* Estado de conexión */}
      <div className={isConnected ? 'text-green-500' : 'text-red-500'}>
        {isConnected ? '✅ Conectado' : '❌ Desconectado'}
      </div>

      {/* Error si existe */}
      {error && <div className="text-red-500">Error: {error}</div>}

      {/* Último mensaje */}
      {lastMessage && (
        <div className="mt-4">
          <h2>Último mensaje:</h2>
          <pre>{JSON.stringify(lastMessage, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}