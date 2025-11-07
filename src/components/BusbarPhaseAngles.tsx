'use client';

import { useEffect, useRef, useState, useMemo } from 'react';

interface VariableData {
  value: number | boolean | string;
  timestamp: string;
}

interface BusbarPhaseData  {
  angulo_fase_A?: VariableData;
  angulo_fase_B?: VariableData;
  angulo_fase_C?: VariableData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface BusbarPhaseAnglesProps {
  busbarData: BusbarPhaseData ;
  title?: string;
}

const BusbarPhaseAngles = ({
  busbarData,
  title = 'Ángulos de Fase - Barra (Busbar)',
}: BusbarPhaseAnglesProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [themeVersion, setThemeVersion] = useState(0);
  const currentTheme = useRef<string>('');
  const plotInitialized = useRef<boolean>(false);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Extraer y normalizar ángulos
  const angles = useMemo(() => {
    const getAngle = (data?: VariableData): number => {
      if (!data?.value || typeof data.value !== 'number') return 0;
      let angle = data.value % 360;
      if (angle < 0) angle += 360;
      return angle;
    };

    const a = getAngle(busbarData.angulo_fase_A);
    const b = getAngle(busbarData.angulo_fase_B);
    const c = getAngle(busbarData.angulo_fase_C);

    let l1l2 = b - a;
    let l2l3 = c - b;
    let l3l1 = (360 + a) - c;

    if (l1l2 < 0) l1l2 += 360;
    if (l2l3 < 0) l2l3 += 360;
    if (l3l1 < 0) l3l1 += 360;

    return { l1l2, l2l3, l3l1, raw: { a, b, c } };
  }, [busbarData]);

  // Detectar cambios de tema
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      if (newTheme !== currentTheme.current) {
        currentTheme.current = newTheme;
        setThemeVersion((v) => v + 1);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Función para actualizar el plot
  const updatePlot = async (
    colors: {
      paperColor: string;
      plotColor: string;
      textColor: string;
      gridColor: string;
      referenceLine: string;
      trianguleBg: string;
      trianguleBg2: string;
    },
    plotData: typeof angles
  ) => {
    if (!containerRef.current) return;

    try {
      const Plotly = await import('plotly.js-dist-min');

      const data: Plotly.Data[] = [
        // Triángulo de referencia (120° ideal)
        {
          type: 'scatterpolar',
          r: [1, 1, 1, 1],
          theta: [0, 120, 240, 0],
          fill: 'toself',
          fillcolor: colors.trianguleBg,
          line: { color: colors.trianguleBg, width: 0.5 },
          mode: 'lines',
          showlegend: false,
          hoverinfo: 'skip',
        } as const,
        // Triángulo actual
        {
          type: 'scatterpolar',
          r: [0.8, 0.8, 0.8, 0.8],
          theta: [0, plotData.l1l2, plotData.l1l2 + plotData.l2l3, 0],
          fill: 'toself',
          fillcolor: colors.trianguleBg2,
          line: { color: colors.trianguleBg2, width: 1.5 },
          mode: 'lines',
          name: 'Sistema actual',
          hoverinfo: 'skip',
        } as const,
        // L1-L2
        {
          type: 'scatterpolar',
          r: [0, 1, 1, 0],
          theta: [0, 0, plotData.l1l2, 0],
          mode: 'lines',
          line: { width: 3 },
          name: 'L1-L2',
          hovertemplate: '<b>L1-L2</b>: %{theta:.1f}°<extra></extra>',
        } as const,
        // L2-L3
        {
          type: 'scatterpolar',
          r: [0, 1, 1, 0],
          theta: [plotData.l1l2, plotData.l1l2, plotData.l1l2 + plotData.l2l3, plotData.l1l2],
          mode: 'lines',
          line: { width: 3 },
          name: 'L2-L3',
          hovertemplate: '<b>L2-L3</b>: %{theta:.1f}°<extra></extra>',
        } as const,
        // L3-L1
        {
          type: 'scatterpolar',
          r: [0, 1, 1, 0],
          theta: [plotData.l1l2 + plotData.l2l3, plotData.l1l2 + plotData.l2l3, 360, plotData.l1l2 + plotData.l2l3],
          mode: 'lines',
          line: { width: 3 },
          name: 'L3-L1',
          hovertemplate: '<b>L3-L1</b>: %{theta:.1f}°<extra></extra>',
        } as const,
        // Líneas de referencia 120°
        ...[0, 120, 240].map((angle) => ({
          type: 'scatterpolar' as const,
          r: [0, 1.15] as number[],
          theta: [angle, angle] as number[],
          mode: 'lines' as const,
          line: {
            color: colors.referenceLine,
            width: 1,
            dash: 'dot' as const,
          },
          showlegend: false,
          hoverinfo: 'skip' as const,
        })),
        // Etiquetas de ángulos
        {
          type: 'scatterpolar',
          r: [0.65, 0.65, 0.65],
          theta: [
            plotData.l1l2 / 2,
            plotData.l1l2 + plotData.l2l3 / 2,
            plotData.l1l2 + plotData.l2l3 + plotData.l3l1 / 2,
          ],
          mode: 'text',
          text: [`${plotData.l1l2.toFixed(1)}°`, `${plotData.l2l3.toFixed(1)}°`, `${plotData.l3l1.toFixed(1)}°`],
          textfont: { size: 13, color: colors.textColor },
          showlegend: false,
          hoverinfo: 'skip',
        } as const,
      ];

      const layout: Partial<Plotly.Layout> = {
        autosize: true,
        paper_bgcolor: colors.paperColor,
        plot_bgcolor: colors.plotColor,
        font: { color: colors.textColor },
        title: {
          text: `<b>L1-L2: ${plotData.l1l2.toFixed(1)}° | L2-L3: ${plotData.l2l3.toFixed(1)}° | L3-L1: ${plotData.l3l1.toFixed(1)}°</b>`,
          font: { size: 12 },
          x: 0.5,
          xanchor: 'center',
          y: 0.92,
          yanchor: 'bottom',
          pad: { t: 0, b: 0 },
        },
        polar: {
          radialaxis: {
            visible: false,
            range: [0, 1.2],
            angle: 90,
          },
          angularaxis: {
            direction: 'clockwise',
            rotation: 90,
            tickvals: [0, 60, 120, 180, 240, 300],
            tickfont: { size: 11, color: colors.textColor },
            tickcolor: colors.textColor,
            linecolor: colors.gridColor,
            gridcolor: colors.gridColor,
            showline: true,
          },
          bgcolor: 'rgba(0,0,0,0)',
        },
        showlegend: true,
        legend: {
          yanchor: 'bottom',
          y: 0,
          xanchor: 'center',
          x: 0.5,
          bgcolor: 'rgba(0,0,0,0)',
          font: { size: 11 },
          orientation: 'h',
          itemwidth: 30,
        },
        margin: { r: 30, b: 25, t: 30, l: 30 },
        transition: {
          duration: 500,
          easing: 'cubic-in-out',
        },
      };

      const config: Partial<Plotly.Config> = {
        displayModeBar: false,
        responsive: true,
        staticPlot: false,
      };

      if (!plotInitialized.current) {
        await Plotly.newPlot(containerRef.current, data, layout, config);
        plotInitialized.current = true;
      } else {
        await Plotly.react(containerRef.current, data, layout, config);
      }
    } catch (error) {
      console.error('Error al actualizar plot de busbar:', error);
    }
  };

  // Efecto principal: actualizar gráfico
  useEffect(() => {
    if (!containerRef.current) return;

    const style = getComputedStyle(document.documentElement);
    const colors = {
      paperColor: style.getPropertyValue('--third-paper').trim(),
      plotColor: style.getPropertyValue('--third-plot').trim(),
      textColor: style.getPropertyValue('--third-text').trim(),
      gridColor: style.getPropertyValue('--third-grid').trim(),
      referenceLine: style.getPropertyValue('--foreground').trim(),
      trianguleBg: style.getPropertyValue('--plotly-5').trim(),
      trianguleBg2: style.getPropertyValue('--plotly-6').trim(),
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      updatePlot(colors, angles);
    });

    return () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [angles, themeVersion]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (containerRef.current && plotInitialized.current) {
        import('plotly.js-dist-min').then((Plotly) => {
          Plotly.purge(containerRef.current!);
        });
      }
    };
  }, []);

  return (
    <div className="w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />
    </div>
  );
};

export default BusbarPhaseAngles;