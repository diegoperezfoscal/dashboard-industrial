// industrial-iot-lab/dashboard-industrial/src/components/BreakerCard.tsx
'use client';
import React from 'react';
import { Power } from 'lucide-react';

type Props = {
  closed: boolean;
  ok: boolean;
  fault: boolean;
  frecuencia: number;
};

export default function BreakerCard({ closed, ok, fault, frecuencia }: Props) {
  return (
    <>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Power className="w-5 h-5 text-blue-400" /> BREAKER
      </h2>
      <div className="space-y-2 text-sm">
        <div>Estado: <span className={closed ? 'text-green-400' : 'text-red-400'}>
          {closed ? 'CERRADO' : 'ABIERTO'}</span></div>
        <div>Volt/Freq OK: {ok ? '✅' : '❌'}</div>
        <div>Falla: {fault ? '⚠️' : 'OK'}</div>
        <div>Frecuencia: {frecuencia.toFixed(2)} Hz</div>
      </div>
    </>
  );
}
