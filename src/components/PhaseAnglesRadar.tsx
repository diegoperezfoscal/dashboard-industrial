// industrial-iot-lab/dashboard-industrial/src/components/PhaseAnglesRadar.tsx
'use client';
import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';

// Usa string para que acepte 'A'|'B'|'C' sin “as const”
type Row = { fase: string; valor: number };
type Props = { data: Row[] };

export default function PhaseAnglesRadar({ data }: Props) {
  return (
    <>
      <h2 className="text-xl mb-2 text-center">Ángulos de Fase</h2>
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="fase" stroke="#9ca3af" />
          <Radar dataKey="valor" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
        </RadarChart>
      </ResponsiveContainer>
    </>
  );
}
