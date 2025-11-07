'use client';
import { useEffect, useState } from 'react';

interface VariableData {
  value: number | boolean | string;
  timestamp: string;
}

interface BreakerPhaseData {
  voltage_freq_ok?: VariableData;
  opened?: VariableData;
  closed?: VariableData;
  fault?: VariableData;
  ready_to_close?: VariableData;
  sync_in_progress?: VariableData;
  ready_to_open?: VariableData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface BreakerStatusPanelProps {
  breakerData: BreakerPhaseData;
  title?: string;
}

interface StatusConfig {
  key: keyof BreakerPhaseData;
  label: string;
  description: string;
  priority: 'critical' | 'high' | 'normal';
}

const BreakerStatusPanel = ({
  breakerData,
  title = 'Estado del Breaker',
}: BreakerStatusPanelProps) => {
  // Configuración mejorada con descripciones
  const statusConfigs: StatusConfig[] = [
    {
      key: 'closed',
      label: 'CERRADO',
      description: 'Breaker energizado y en operación',
      priority: 'critical',
    },
    {
      key: 'opened',
      label: 'ABIERTO',
      description: 'Breaker desenergizado y aislado',
      priority: 'critical',
    },
    {
      key: 'fault',
      label: 'FALLA',
      description: 'Condición de falla detectada',
      priority: 'critical',
    },
    {
      key: 'voltage_freq_ok',
      label: 'VOLTAJE/FREQ',
      description: 'Parámetros eléctricos dentro de rango',
      priority: 'high',
    },
    {
      key: 'ready_to_close',
      label: 'LISTO CERRAR',
      description: 'Preparado para operación de cierre',
      priority: 'normal',
    },
    {
      key: 'ready_to_open',
      label: 'LISTO ABRIR',
      description: 'Preparado para operación de apertura',
      priority: 'normal',
    },
    {
      key: 'sync_in_progress',
      label: 'SINCRONIZACIÓN',
      description: 'Proceso de sincronización en curso',
      priority: 'normal',
    },
  ];

  // Estado para controlar tooltips
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Obtener valor booleano
  const getBooleanValue = (data?: VariableData): boolean => {
    return data?.value === true;
  };

  // Función para determinar el color del LED basado en el estado y prioridad
  const getLedColor = (config: StatusConfig, isActive: boolean) => {
    if (!isActive) return 'bg-gray-600';
    
    switch (config.priority) {
      case 'critical':
        return config.key === 'fault' 
          ? 'bg-red-500 shadow-red-500/50' 
          : config.key === 'closed'
          ? 'bg-green-500 shadow-green-500/50'
          : 'bg-yellow-500 shadow-yellow-500/50';
      case 'high':
        return 'bg-blue-500 shadow-blue-500/50';
      case 'normal':
        return 'bg-cyan-500 shadow-cyan-500/50';
      default:
        return 'bg-gray-500';
    }
  };

  // Función para determinar el color del texto
  const getTextColor = (config: StatusConfig, isActive: boolean) => {
    if (!isActive) return 'text-gray-400';
    
    switch (config.priority) {
      case 'critical':
        return config.key === 'fault' 
          ? 'text-red-400' 
          : config.key === 'closed'
          ? 'text-green-400'
          : 'text-yellow-400';
      case 'high':
        return 'text-blue-400';
      case 'normal':
        return 'text-cyan-400';
      default:
        return 'text-gray-300';
    }
  };

  // Agrupar estados por prioridad
  const criticalStates = statusConfigs.filter(s => s.priority === 'critical');
  const otherStates = statusConfigs.filter(s => s.priority !== 'critical');

  return (
    <div className="w-full bg-gray-900/80 rounded-lg p-4 border border-gray-700">
      {/* Header compacto */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <div className="flex items-center space-x-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Conectado</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400 font-mono">
            {new Date().toLocaleTimeString('es-CO')}
          </div>
          <div className="text-[10px] text-gray-500">Actualizado</div>
        </div>
      </div>

      {/* Grid principal compacto */}
      <div className="grid grid-cols-2 gap-3">
        {/* Estados críticos - siempre visibles */}
        {criticalStates.map((config) => {
          const data = breakerData[config.key];
          const isActive = getBooleanValue(data);
          
          return (
            <div
              key={config.key as string}
              className={`
                relative p-3 rounded-lg border transition-all duration-200
                ${isActive ? 'bg-gray-800/80 border-gray-600' : 'bg-gray-800/50 border-gray-700'}
                hover:bg-gray-800/70 cursor-help
              `}
              onMouseEnter={() => setActiveTooltip(config.key as string)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* LED indicator con efecto de brillo */}
                  <div className="relative">
                    <div className={`
                      w-3 h-3 rounded-full transition-all duration-300
                      ${getLedColor(config, isActive)}
                      ${isActive ? 'animate-pulse shadow-lg' : ''}
                    `} />
                    {isActive && (
                      <div className={`
                        absolute inset-0 rounded-full animate-ping
                        ${getLedColor(config, isActive).replace('bg-', 'bg-').split(' ')[0]}
                        opacity-40
                      `} />
                    )}
                  </div>
                  
                  <div>
                    <div className={`
                      text-sm font-semibold transition-colors duration-200
                      ${getTextColor(config, isActive)}
                    `}>
                      {config.label}
                    </div>
                    <div className="text-xs text-gray-400">
                      {isActive ? 'ACTIVO' : 'INACTIVO'}
                    </div>
                  </div>
                </div>
                
                {/* Indicador de estado crítico */}
                {isActive && config.priority === 'critical' && (
                  <div className={`
                    w-2 h-2 rounded-full animate-pulse
                    ${config.key === 'fault' ? 'bg-red-500' : 
                      config.key === 'closed' ? 'bg-green-500' : 'bg-yellow-500'}
                  `} />
                )}
              </div>

              {/* Tooltip emergente */}
              {activeTooltip === config.key && (
                <div className="absolute z-10 top-full left-0 mt-2 w-48 p-2 bg-gray-900 border border-gray-600 rounded-lg shadow-lg">
                  <div className="text-xs font-semibold text-white mb-1">
                    {config.label}
                  </div>
                  <div className="text-xs text-gray-300">
                    {config.description}
                  </div>
                  {data?.timestamp && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      Actualizado: {new Date(data.timestamp).toLocaleTimeString('es-CO')}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Estados adicionales - diseño más compacto */}
        {otherStates.map((config) => {
          const data = breakerData[config.key];
          const isActive = getBooleanValue(data);
          
          return (
            <div
              key={config.key as string}
              className={`
                relative p-2 rounded border transition-all duration-200
                ${isActive ? 'bg-gray-800/60 border-gray-600' : 'bg-gray-800/30 border-gray-700'}
                hover:bg-gray-800/50 cursor-help
              `}
              onMouseEnter={() => setActiveTooltip(config.key as string)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <div className="flex items-center space-x-2">
                {/* LED pequeño */}
                <div className={`
                  w-2 h-2 rounded-full transition-all duration-300
                  ${getLedColor(config, isActive)}
                  ${isActive ? 'animate-pulse' : ''}
                `} />
                
                <div className="flex-1 min-w-0">
                  <div className={`
                    text-xs font-medium truncate transition-colors duration-200
                    ${getTextColor(config, isActive)}
                  `}>
                    {config.label}
                  </div>
                </div>
              </div>

              {/* Tooltip para estados adicionales */}
              {activeTooltip === config.key && (
                <div className="absolute z-10 top-full left-0 mt-1 w-48 p-2 bg-gray-900 border border-gray-600 rounded-lg shadow-lg">
                  <div className="text-xs font-semibold text-white mb-1">
                    {config.label}
                  </div>
                  <div className="text-xs text-gray-300">
                    {config.description}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Estado: {isActive ? 'ACTIVO' : 'INACTIVO'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer con información de resumen */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <div>
            Estados activos: {statusConfigs.filter(config => getBooleanValue(breakerData[config.key])).length}
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Operativo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakerStatusPanel;