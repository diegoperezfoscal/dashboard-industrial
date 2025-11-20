// industrial-iot-lab/dashboard-industrial/src/components/KPITemperatureWindings.tsx
'use client';

import type { TemperatureData, VariableData } from '@/types/iot.types';

type WindingKey = 'devanado_u' | 'devanado_v' | 'devanado_w';

type StatusLevel = 'normal' | 'warning' | 'danger' | 'unknown';

interface KPITemperatureWindingsProps {
  temperatures: TemperatureData;
  /** Escala máxima visual para las barras (ej: 150°C) */
  maxScale?: number;
  /** Hasta este valor es "Normal" (<= normalMax) */
  normalMax?: number;
  /** Hasta este valor es "Alerta" (<= warningMax), >warningMax es "Crítico" */
  warningMax?: number;
}

interface WindingConfig {
  key: WindingKey;
  label: string;
}

// ==================== CONFIGURACIÓN ====================

const windingConfigs: WindingConfig[] = [
  { key: 'devanado_u', label: 'Dev U' },
  { key: 'devanado_v', label: 'Dev V' },
  { key: 'devanado_w', label: 'Dev W' },
];

// ==================== HELPERS ====================

const getNumericValue = (data?: VariableData): number | null => {
  if (!data) return null;
  const { value } = data;

  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const getStatus = (
  value: number | null,
  normalMax: number,
  warningMax: number,
): StatusLevel => {
  if (value === null) return 'unknown';
  if (value <= normalMax) return 'normal';
  if (value <= warningMax) return 'warning';
  return 'danger';
};

const getStatusText = (status: StatusLevel): string => {
  switch (status) {
    case 'normal':
      return 'Normal';
    case 'warning':
      return 'Alerta';
    case 'danger':
      return 'Crítico';
    case 'unknown':
    default:
      return 'Sin datos';
  }
};

const getBarClasses = (status: StatusLevel): string => {
  switch (status) {
    case 'normal':
      return 'bg-emerald-400';
    case 'warning':
      return 'bg-amber-400';
    case 'danger':
      return 'bg-red-500';
    case 'unknown':
    default:
      return 'bg-gray-300';
  }
};

const getValueClasses = (status: StatusLevel): string => {
  switch (status) {
    case 'normal':
      return 'text-emerald-800';
    case 'warning':
      return 'text-amber-800';
    case 'danger':
      return 'text-red-800';
    case 'unknown':
    default:
      return 'text-gray-600';
  }
};

const getChipClasses = (status: StatusLevel): string => {
  switch (status) {
    case 'normal':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'warning':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'danger':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'unknown':
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};

const clampPercent = (value: number): number => {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
};

// ==================== COMPONENTE PRINCIPAL ====================

const KPITemperatureWindings = ({
  temperatures,
  maxScale = 150,
  normalMax = 90,
  warningMax = 110,
}: KPITemperatureWindingsProps) => {
  const safeMaxScale = maxScale > 0 ? maxScale : 150;

  const normalPercent = clampPercent((normalMax / safeMaxScale) * 100);
  const warningPercent = clampPercent((warningMax / safeMaxScale) * 100);

  return (
    <div className="w-full">
      {/* Rangos de referencia arriba (leyenda compacta, sin título de panel) */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
        <span className="font-semibold text-gray-700">
          Rangos de temperatura
        </span>

        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
          ≤ {normalMax}°C normal
        </span>

        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
          ≤ {warningMax}°C alerta
        </span>

        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px]">
          &gt; {warningMax}°C crítico
        </span>
      </div>

      {/* Barras horizontales para U, V, W */}
      <div className="space-y-3">
        {windingConfigs.map((config) => {
          const data = temperatures[config.key];
          const value = getNumericValue(data);
          const status = getStatus(value, normalMax, warningMax);

          const percentage =
            value !== null
              ? clampPercent((value / safeMaxScale) * 100)
              : 0;

          return (
            <div
              key={config.key}
              className="rounded-md border border-gray-200 bg-white/70 px-3 py-2 shadow-sm"
            >
              {/* Encabezado: etiqueta + valor + chip estado */}
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-gray-800">
                    {config.label}
                  </span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${getValueClasses(
                      status,
                    )}`}
                  >
                    {value !== null ? value.toFixed(1) : '—'}
                  </span>
                  <span className="text-[11px] font-medium text-gray-500">
                    °C
                  </span>
                </div>

                <div
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-medium uppercase tracking-wide ${getChipClasses(
                    status,
                  )}`}
                >
                  {getStatusText(status)}
                </div>
              </div>

              {/* Barra horizontal tipo termómetro industrial */}
              <div className="mt-1">
                <div className="relative h-2 w-full rounded-full bg-gray-200/80 overflow-hidden">
                  {/* Marcador límite normal */}
                  <div
                    className="absolute inset-y-0 w-[2px] bg-emerald-500/70"
                    style={{ left: `${normalPercent}%` }}
                  />
                  {/* Marcador límite alerta */}
                  <div
                    className="absolute inset-y-0 w-[2px] bg-amber-500/70"
                    style={{ left: `${warningPercent}%` }}
                  />
                  {/* Barra de valor actual */}
                  <div
                    className={`h-full ${getBarClasses(
                      status,
                    )} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Marcas de escala compactas */}
                <div className="mt-1 flex justify-between text-[10px] text-gray-500">
                  <span>0°C</span>
                  <span>{normalMax}°C</span>
                  <span>{warningMax}°C</span>
                  <span>{safeMaxScale}°C</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KPITemperatureWindings;