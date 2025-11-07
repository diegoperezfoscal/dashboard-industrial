'use client';

import { Thermometer, Activity, Zap, Droplets } from 'lucide-react';
import { PLCData } from '@/types/iot.types';

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, icon, color }) => (
  <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold mt-2" style={{ color }}>
          {value.toFixed(2)}
          <span className="text-lg ml-1">{unit}</span>
        </p>
      </div>
      <div className="p-3 rounded-full bg-gray-100" style={{ color }}>
        {icon}
      </div>
    </div>
  </div>
);

interface MetricsGridProps {
  data: PLCData;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Temperatura"
        value={data.temperatura || 0}
        unit="°C"
        icon={<Thermometer size={32} />}
        color="#ef4444"
      />
      <MetricCard
        title="Presión"
        value={data.presion || 0}
        unit="hPa"
        icon={<Activity size={32} />}
        color="#3b82f6"
      />
      <MetricCard
        title="Consumo"
        value={data.consumo_kw || 0}
        unit="kW"
        icon={<Zap size={32} />}
        color="#f59e0b"
      />
      <MetricCard
        title="Flujo"
        value={data.flujo || 0}
        unit="L/min"
        icon={<Droplets size={32} />}
        color="#10b981"
      />
    </div>
  );
};