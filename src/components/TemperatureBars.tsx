// industrial-iot-lab/dashboard-industrial/src/components/TemperatureBars.tsx
'use client';
import React from 'react';
import { ThermometerSun } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

type Row = { name: string; value: number };
type Props = { data: Row[] };

export default function TemperatureBars({ data }: Props) {
  return (
    <>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <ThermometerSun className="w-5 h-5 text-orange-400" /> TEMPERATURAS
      </h2>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" />
          <YAxis type="category" dataKey="name" stroke="#9ca3af" width={120} />
          <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {data.map((t, i) => {
              const color = t.value > 90 ? '#ef4444' : t.value > 80 ? '#eab308' : '#3b82f6';
              return <Cell key={i} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
