// industrial-iot-lab/dashboard-industrial/src/components/GeneralStatusCard.tsx
'use client';
import React from 'react';
import { Zap } from 'lucide-react';

type Props = {
  activa: number;
  reactiva: number;
  aparente: number;
  fp: number; // porcentaje
};

export default function GeneralStatusCard({ activa, reactiva, aparente, fp }: Props) {
  return (
    <>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-400" /> ESTADO GENERAL
      </h2>
      <div className="grid grid-cols-4 gap-4 text-center">
        <div><p>Activa</p><h3 className="text-2xl font-bold">{activa.toFixed(0)} kW</h3></div>
        <div><p>Reactiva</p><h3 className="text-2xl font-bold">{reactiva.toFixed(0)} kVAr</h3></div>
        <div><p>Aparente</p><h3 className="text-2xl font-bold">{aparente.toFixed(0)} kVA</h3></div>
        <div><p>FP</p><h3 className="text-2xl font-bold">{fp.toFixed(0)}%</h3></div>
      </div>
    </>
  );
}
