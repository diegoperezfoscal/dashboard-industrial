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
        <Zap className="w-5 h-5 text-yellow-400" /> INDICATORS
      </h2>

      {/* 3 filas, 4 columnas */}
      <div className="grid grid-cols-4 gap-y-2 text-center">

        {/* ---------- TITULOS ---------- */}
        <p className="text-sm font-semibold text-gray-800">Active Power</p>
        <p className="text-sm font-semibold text-gray-800">Reactive Power</p>
        <p className="text-sm font-semibold text-gray-800">Apparent Power</p>
        <p className="text-sm font-semibold text-gray-800">Power Factor</p>

        {/* ---------- VALORES ---------- */}
        <h3 className="text-3xl font-bold text-gray-900">{activa.toFixed(0)}</h3>
        <h3 className="text-3xl font-bold text-gray-900">{reactiva.toFixed(0)}</h3>
        <h3 className="text-3xl font-bold text-gray-900">{aparente.toFixed(0)}</h3>
        <h3 className="text-3xl font-bold text-gray-900">{fp.toFixed(0)}%</h3>

        {/* ---------- UNIDADES ---------- */}
        <span className="text-sm font-medium text-gray-700">kW</span>
        <span className="text-sm font-medium text-gray-700">kVAr</span>
        <span className="text-sm font-medium text-gray-700">kVA</span>
        <span className="text-sm font-medium text-gray-700"> </span>
      </div>
    </>
  );
}
