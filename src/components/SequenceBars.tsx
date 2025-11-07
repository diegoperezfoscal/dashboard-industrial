// industrial-iot-lab/dashboard-industrial/src/components/SequenceBars.tsx
'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

// Usa string para que acepte 'Positiva'|'Negativa'|'Zero' sin “as const”
type Row = { name: string; value: number };
type Props = { data: Row[] };

export default function SequenceBars({ data }: Props) {
  const colors = ['#22c55e', '#f59e0b', '#ef4444'];
  return (
    <>
      <h2 className="text-xl mb-2 text-center">Secuencias</h2>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
