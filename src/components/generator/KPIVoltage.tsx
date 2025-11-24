// industrial-iot-lab/dashboard-industrial/src/components/KPIVoltage.tsx
'use client';

interface VariableData {
  value: number | boolean | string;
  timestamp: string;
}

interface VoltageData {
  voltage_L1_L2?: VariableData;
  voltage_L2_L3?: VariableData;
  voltage_L1_L3?: VariableData;
}

type VoltageKey = 'voltage_L1_L2' | 'voltage_L2_L3' | 'voltage_L1_L3';

interface KPIVoltageProps {
  voltages: VoltageData;
  title?: string; // ya no se usa visualmente, pero se mantiene por compatibilidad
  /** Valor esperado de línea-línea (ej: 400V) */
  expectedLineLine?: number;
  /** Porcentaje de tolerancia para "normal" (ej: 5 => ±5%) */
  warningTolerancePercent?: number;
  /** Porcentaje de tolerancia para "alerta" (ej: 10 => ±10%) */
  dangerTolerancePercent?: number;
}

type StatusLevel = 'normal' | 'warning' | 'danger' | 'unknown';

interface VoltageConfig {
  key: VoltageKey;
  label: string;
  description: string;
}

/**
 * Panel de KPIs de tensiones línea-línea
 * Muestra: L1-L2, L2-L3, L1-L3 con colores según desviación del valor esperado.
 */
const KPIVoltage = ({
  voltages,
  // el título ya lo pone tu Card externo, aquí no se usa
  expectedLineLine = 4200,
  warningTolerancePercent = 5,
  dangerTolerancePercent = 10,
}: KPIVoltageProps) => {
  const voltageConfigs: VoltageConfig[] = [
    {
      key: 'voltage_L1_L2',
      label: 'L1 - L2',
      description: 'Tensión entre fase L1 y fase L2',
    },
    {
      key: 'voltage_L2_L3',
      label: 'L2 - L3',
      description: 'Tensión entre fase L2 y fase L3',
    },
    {
      key: 'voltage_L1_L3',
      label: 'L1 - L3',
      description: 'Tensión entre fase L1 y fase L3',
    },
  ];

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

  const getStatus = (value: number | null): StatusLevel => {
    if (value === null) return 'unknown';

    const diff = Math.abs(value - expectedLineLine);
    const diffPercent = (diff / expectedLineLine) * 100;

    if (diffPercent <= warningTolerancePercent) return 'normal';
    if (diffPercent <= dangerTolerancePercent) return 'warning';
    return 'danger';
  };

  const getStatusText = (status: StatusLevel): string => {
    switch (status) {
      case 'normal':
        return 'Dentro de rango';
      case 'warning':
        return 'Desviación moderada';
      case 'danger':
        return 'Fuera de rango';
      case 'unknown':
      default:
        return 'Sin datos';
    }
  };

  const getCardClasses = (status: StatusLevel): string => {
    // Versiones claras para que integren con tu dashboard blanco
    switch (status) {
      case 'normal':
        return 'border-emerald-200 bg-emerald-50/70';
      case 'warning':
        return 'border-amber-200 bg-amber-50/70';
      case 'danger':
        return 'border-red-200 bg-red-50/70';
      case 'unknown':
      default:
        return 'border-gray-200 bg-gray-50/70';
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
    // Pill de estado más suave, sin tanto contraste
    switch (status) {
      case 'normal':
        return 'bg-white/70 text-emerald-700 border-emerald-200';
      case 'warning':
        return 'bg-white/70 text-amber-700 border-amber-200';
      case 'danger':
        return 'bg-white/70 text-red-700 border-red-200';
      case 'unknown':
      default:
        return 'bg-white/70 text-gray-600 border-gray-200';
    }
  };

  const getDotClasses = (status: StatusLevel): string => {
    switch (status) {
      case 'normal':
        return 'bg-emerald-500';
      case 'warning':
        return 'bg-amber-500';
      case 'danger':
        return 'bg-red-500';
      case 'unknown':
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="w-full">
      {/* Rangos de referencia arriba */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600">

  {/* IZQUIERDA — Rangos + Chips */}
  <div className="flex items-center gap-2">
    <span className="font-semibold text-gray-700">
      Rangos de referencia
    </span>

    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
      ±{warningTolerancePercent}% normal
    </span>

    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
      ±{dangerTolerancePercent}% alerta
    </span>
  </div>

  {/* DERECHA — Leyenda colores */}
  <div className="hidden md:flex items-center gap-3 text-[10px] text-gray-500">
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full bg-emerald-500" />
      <span>Normal</span>
    </div>

    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full bg-amber-500" />
      <span>Desviación</span>
    </div>

    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full bg-red-500" />
      <span>Crítico</span>
    </div>
  </div>
</div>



      {/* Grid principal de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {voltageConfigs.map((config) => {
          const data = voltages[config.key];
          const value = getNumericValue(data);
          const status = getStatus(value);

          const deviationPercent =
            value !== null
              ? ((Math.abs(value - expectedLineLine) / expectedLineLine) * 100).toFixed(1)
              : null;

          return (
            <div
              key={config.key}
              className={`relative p-3 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${getCardClasses(
                status,
              )}`}
            >
              {/* Encabezado KPI */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${getDotClasses(
                      status,
                    )} ${status !== 'unknown' ? 'animate-pulse' : ''}`}
                  />
                  <span className="text-xs font-semibold text-gray-800 tracking-wide">
                    {config.label}
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

              {/* Valor + Desv en la misma línea visual */}
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-2xl font-bold tabular-nums ${getValueClasses(
                      status,
                    )}`}
                  >
                    {value !== null ? value.toFixed(1) : '—'}
                  </span>
                  <span className="text-xs text-gray-500">V</span>
                </div>

                {deviationPercent !== null && (
                  <span className="text-[11px] text-gray-700">
                    Desv: {deviationPercent}%
                  </span>
                )}
              </div>

              {/* Solo referencia a nominal, sin descripciones largas ni horas */}
              <div className="mt-2 flex items-center justify-end text-[10px] text-gray-500">
                Ref: {expectedLineLine.toFixed(0)}V
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KPIVoltage;
