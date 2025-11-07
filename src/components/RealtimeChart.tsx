'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { DataPoint } from '@/types/iot.types';
import { Activity } from 'lucide-react';
import { Layout, Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface RealtimeChartProps {
  data: DataPoint[];
  dataKey: keyof Omit<DataPoint, 'timestamp'>;
  title: string;
  color: string;
  unit: string;
}

export const RealtimeChart: React.FC<RealtimeChartProps> = ({ 
  data, 
  dataKey, 
  title, 
  color, 
  unit 
}) => {
  // Convertir timestamps y extraer valores
  const timestamps = data.map(point => new Date(point.timestamp));
  const values = data.map(point => {
    const value = point[dataKey];
    // Manejar valores booleanos y convertirlos a números
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    return value as number;
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Activity className="mr-2" style={{ color }} />
        {title}
      </h3>

      <Plot
        data={
          [
            {
              x: timestamps,
              y: values,
              type: 'scatter',
              mode: 'lines',
              line: {
                color: color,
                width: 2,
              },
              name: title,
              fill: 'tozeroy',
              fillcolor: `${color}20`, // 20 = transparencia
            },
          ] as Data[]
        }
        layout={
          {
            autosize: true,
            margin: { l: 50, r: 30, t: 10, b: 50 },
            xaxis: {
              title: 'Tiempo',
              type: 'date',
              tickformat: '%H:%M:%S',
              showgrid: true,
              gridcolor: '#e5e7eb',
            },
            yaxis: {
              title: `${title} (${unit})`,
              showgrid: true,
              gridcolor: '#e5e7eb',
            },
            showlegend: false,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(255,255,255,1)',
            hovermode: 'closest',
          } as Partial<Layout>
        }
        config={{
          displayModeBar: false,
          responsive: true,
        }}
        style={{ width: '100%', height: '300px' }}
      />
    </div>
  );
};