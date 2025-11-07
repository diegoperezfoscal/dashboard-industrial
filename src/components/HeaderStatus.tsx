// industrial-iot-lab/dashboard-industrial/src/components/HeaderStatus.tsx
'use client';
import React from 'react';

type Props = {
  title: string;
  subtitle?: string;
  lastUpdate: Date | null;
};

export default function HeaderStatus({ title, subtitle, lastUpdate }: Props) {
  return (
    <div className="text-center mb-6">
      <h1 className="text-4xl font-bold">{title}</h1>
      {subtitle && <p className="text-gray-400">{subtitle}</p>}
      <p className="text-sm text-gray-500">
        Última actualización: {lastUpdate?.toLocaleTimeString('es-CO')}
      </p>
    </div>
  );
}
