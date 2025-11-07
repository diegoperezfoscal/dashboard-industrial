import React, { useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';

// Interfaz para datos de variable (compatible con tu sistema)
interface VariableData {
  value: number | boolean | string;
  timestamp: string;
}

// Configuración de rangos operativos por variable
interface OperatingRange {
  min: number;
  max: number;
  warningThreshold: number;
  criticalThreshold: number;
}

// Rangos predefinidos según la tabla
const OPERATING_RANGES: Record<string, OperatingRange> = {
  devanado_u: { min: 0, max: 160, warningThreshold: 120, criticalThreshold: 140 },
  devanado_v: { min: 0, max: 160, warningThreshold: 120, criticalThreshold: 140 },
  devanado_w: { min: 0, max: 160, warningThreshold: 120, criticalThreshold: 140 },
  rodamiento_delantero: { min: 0, max: 100, warningThreshold: 80, criticalThreshold: 85 },
  rodamiento_trasero: { min: 0, max: 100, warningThreshold: 80, criticalThreshold: 85 },
};

interface TemperatureGaugeProps {
  variableName: string; // Nombre de la variable (ej: 'devanado_u')
  variableData: VariableData | undefined; // Datos en tiempo real
  title?: string; // Título personalizado
  theme?: 'light' | 'dark';
  useNeedle?: boolean;
}

const TemperatureGauge: React.FC<TemperatureGaugeProps> = ({
  variableName,
  variableData,
  title,
  theme = 'light',
  useNeedle = true,
}) => {
  const chartRef = useRef<ReactECharts>(null);

  // Obtener rangos operativos
  const range = OPERATING_RANGES[variableName] || {
    min: 0,
    max: 160,
    warningThreshold: 120,
    criticalThreshold: 140,
  };

  // Extraer valor numérico
  const value = variableData && typeof variableData.value === 'number' 
    ? variableData.value 
    : 0;

  // Determinar color según zona operativa
  const getColor = (val: number) => {
    if (val >= range.criticalThreshold) return '#FF0000'; // Crítico: Rojo
    if (val >= range.warningThreshold) return '#FFAA00'; // Advertencia: Naranja
    return '#00B050'; // Normal: Verde
  };

  // Crear gradiente de colores para el gauge
  const colorGradient = [
    [range.warningThreshold / range.max, '#00B050'], // Verde hasta warning
    [range.criticalThreshold / range.max, '#FFAA00'], // Naranja hasta critical
    [1, '#FF0000'], // Rojo desde critical
  ];

  const option = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
    series: [
      {
        type: 'gauge',
        startAngle: 225,
        endAngle: -45,
        min: range.min,
        max: range.max,
        splitNumber: 8,
        radius: '85%',
        center: ['50%', '65%'],
        
        // Línea del arco principal
        axisLine: {
          lineStyle: {
            width: 22,
            color: colorGradient,
          },
        },

        // Barra de progreso (si no usa needle)
        progress: {
          show: !useNeedle,
          width: 22,
          itemStyle: {
            color: getColor(value),
          },
        },

        // Puntero (needle)
        pointer: {
          show: useNeedle,
          length: '65%',
          width: 6,
          itemStyle: {
            color: theme === 'dark' ? '#ffffff' : '#2c3e50',
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowBlur: 5,
          },
        },

        // Marcas pequeñas
        axisTick: {
          show: true,
          splitNumber: 5,
          length: 6,
          lineStyle: {
            color: theme === 'dark' ? '#666' : '#999',
            width: 1,
          },
        },

        // Marcas grandes
        splitLine: {
          show: true,
          length: 14,
          lineStyle: {
            color: theme === 'dark' ? '#999' : '#ccc',
            width: 2,
          },
        },

        // Etiquetas numéricas
        axisLabel: {
          show: true,
          distance: 28,
          color: theme === 'dark' ? '#ffffff' : '#333333',
          fontSize: 11,
          formatter: (value: number) => {
            return Math.round(value).toString();
          },
        },

        // Título del gauge
        title: {
          show: true,
          offsetCenter: [0, '-125%'],
          fontSize: 14,
          color: theme === 'dark' ? '#cccccc' : '#666666',
          fontWeight: '500',
        },

        // Valor central grande
        detail: {
          show: true,
          valueAnimation: true,
          formatter: (val: number) => `${val.toFixed(1)}°C`,
          color: getColor(value),
          fontSize: 28,
          fontWeight: 'bold',
          offsetCenter: [0, '30%'],
        },

        data: [
          {
            value: value,
            name: title || variableName.replace(/_/g, ' ').toUpperCase(),
          },
        ],
      },

      // Indicadores de zona (opcional: marcas visuales para warning/critical)
      {
        type: 'gauge',
        startAngle: 225,
        endAngle: -45,
        min: range.min,
        max: range.max,
        radius: '72%',
        center: ['50%', '65%'],
        splitNumber: 0,
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        detail: {
          show: false,
        },
        pointer: {
          show: false,
        },
      },
    ],
  };

  useEffect(() => {
    if (chartRef.current) {
      const chart = chartRef.current.getEchartsInstance();
      chart.resize();
    }
  }, [value, theme]);

  // Mostrar timestamp si está disponible
  const lastUpdate = variableData?.timestamp 
    ? new Date(variableData.timestamp).toLocaleTimeString('es-CO')
    : 'N/A';

  return (
    <div className="flex flex-col h-full">
      <ReactECharts 
        ref={chartRef} 
        option={option} 
        style={{ height: '280px', width: '100%' }} 
      />
      
      {/* Info adicional */}
      <div className={`text-center text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        <div>Rango: {range.warningThreshold}°C - {range.criticalThreshold}°C</div>
        <div>Última actualización: {lastUpdate}</div>
      </div>
    </div>
  );
};

export default TemperatureGauge;