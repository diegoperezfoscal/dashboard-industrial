'use client';

import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting?: boolean;
  error?: string | null;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  isConnecting = false,
  error 
}) => {
  if (isConnecting) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-yellow-100 text-yellow-700">
        <Loader2 size={20} className="animate-spin" />
        <span className="font-medium">Conectando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-red-100 text-red-700">
        <WifiOff size={20} />
        <span className="font-medium">Error: {error}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
      isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {isConnected ? <Wifi size={20} /> : <WifiOff size={20} />}
      <span className="font-medium">
        {isConnected ? 'Conectado' : 'Desconectado'}
      </span>
    </div>
  );
};