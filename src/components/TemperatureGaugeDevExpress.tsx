'use client';

import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jQuery: any;
  }
}

interface VariableData {
  value: number | boolean | string;
  timestamp: string;
}

interface OperatingRange {
  min: number;
  max: number;
  warningThreshold: number;
  criticalThreshold: number;
}

const OPERATING_RANGES: Record<string, OperatingRange> = {
  devanado_u: { min: 0, max: 160, warningThreshold: 120, criticalThreshold: 140 },
  devanado_v: { min: 0, max: 160, warningThreshold: 120, criticalThreshold: 140 },
  devanado_w: { min: 0, max: 160, warningThreshold: 120, criticalThreshold: 140 },
  rodamiento_delantero: { min: 0, max: 100, warningThreshold: 80, criticalThreshold: 85 },
  rodamiento_trasero: { min: 0, max: 100, warningThreshold: 80, criticalThreshold: 85 },
};

const getValueColor = (val: number, range: OperatingRange): string => {
  if (val >= range.criticalThreshold) return '#FF0000';
  if (val >= range.warningThreshold) return '#FFAA00';
  return '#00B050';
};

const getCustomTicks = (max: number): number[] => {
  const step = max <= 100 ? 20 : 200;
  const ticks: number[] = [];
  for (let i = 0; i <= max; i += step) ticks.push(i);
  return ticks;
};

interface TemperatureGaugeProps {
  variableName: string;
  variableData?: VariableData;
  title?: string;
  theme?: 'light' | 'dark';
}

const TemperatureGaugeNew: React.FC<TemperatureGaugeProps> = ({
  variableName,
  variableData,
  title,
  theme = 'light',
}) => {
  const gaugeRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gaugeInstance, setGaugeInstance] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  const range = OPERATING_RANGES[variableName] || {
    min: 0,
    max: 160,
    warningThreshold: 120,
    criticalThreshold: 140,
  };

  const value = typeof variableData?.value === 'number' ? variableData.value : 0;
  const lastUpdate = variableData?.timestamp
    ? new Date(variableData.timestamp).toLocaleTimeString('es-CO')
    : 'N/A';

  // Esperar a que DevExpress se cargue
  useEffect(() => {
    const checkDevExpress = () => {
      const $ = window.$ || window.jQuery;
      if ($ && $.fn && $.fn.dxCircularGauge) {
        setIsReady(true);
      } else {
        setTimeout(checkDevExpress, 100);
      }
    };
    checkDevExpress();
  }, []);

  useEffect(() => {
    if (!isReady || !gaugeRef.current) return;
    const $ = window.$ || window.jQuery;
    if (!$) return;

    // Limpiar instancia anterior
    if (gaugeInstance) {
      try { gaugeInstance.dispose(); } catch {}
    }

    const $element = $(gaugeRef.current);

    const config = {
      value,
      geometry: { startAngle: 180, endAngle: 360 },
      scale: {
        startValue: range.min,
        endValue: range.max,
        customTicks: getCustomTicks(range.max),
        tick: { length: 8 },
        label: { font: { color: theme === 'dark' ? '#ccc' : '#87959f', size: 9 } },
      },
      rangeContainer: {
        backgroundColor: 'transparent',
        ranges: [
          { startValue: range.min, endValue: range.warningThreshold, color: '#00B050' },
          { startValue: range.warningThreshold, endValue: range.criticalThreshold, color: '#FFAA00' },
          { startValue: range.criticalThreshold, endValue: range.max, color: '#FF0000' },
        ],
      },
      valueIndicator: {
        type: 'triangleNeedle',
        color: theme === 'dark' ? '#fff' : '#2c3e50',
        length: 0.7,
        width: 12,
        spindleSize: 18,
      },
      title: {
        text: title || variableName.replace(/_/g, ' ').toUpperCase(),
        subtitle: {
          text: `${value.toFixed(1)} °C`,
          font: { size: 24, weight: 700, color: getValueColor(value, range) },
        },
        font: { size: 12, color: theme === 'dark' ? '#ccc' : '#fff' },
        verticalAlignment: 'bottom',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onInitialized: (e: any) => {
        const $gauge = $(e.element);
        $gauge.find('.dxg-title text').first().attr('y', 48);
        $gauge.find('.dxg-title text').last().attr('y', 28);
      },
    };

    try {
      const instance = $element.dxCircularGauge(config).dxCircularGauge('instance');
      setGaugeInstance(instance);
    } catch (err) {
      console.error('Error al crear gauge:', err);
    }

    return () => {
      if (gaugeInstance) {
        try { gaugeInstance.dispose(); } catch {}
      }
    };
  }, [isReady, variableName, title, theme, range]);

  // Actualización del valor
  useEffect(() => {
    if (gaugeInstance && variableData) {
      gaugeInstance.value(value);
      const $ = window.$ || window.jQuery;
      const $subtitle = $(gaugeRef.current!).find('.dxg-title text').last();
      $subtitle.text(`${value.toFixed(1)} °C`).css('fill', getValueColor(value, range));
    }
  }, [value, gaugeInstance, range]);

  return (
    <div className={`flex flex-col h-full p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
      {!isReady ? (
        <div className="flex items-center justify-center h-56 text-sm text-gray-500">
          Cargando gauge...
        </div>
      ) : (
        <div ref={gaugeRef} style={{ width: '100%', height: '220px' }} className="gauge" />
      )}
      <div className={`text-center text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        <div>Rango: {range.warningThreshold}°C - {range.criticalThreshold}°C</div>
        <div>Última actualización: {lastUpdate}</div>
      </div>
    </div>
  );
};

export default TemperatureGaugeNew;
