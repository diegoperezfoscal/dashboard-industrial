"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import type { Layout, Data } from "plotly.js";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type DeltaRow = {
  idx: number;
  ts: number; // timestamp en ms
  delta_L1_barra?: number;
  delta_L2_barra?: number;
  delta_L3_barra?: number;
};

type Props = {
  data: DeltaRow[];
  height?: number;
  yRange?: [number, number];
};

const WINDOW_MS = 60_000; // ventana visible tipo ECG: últimos 60s

export default function DeltaBarraChart({
  data,
  height = 320,
  yRange,
}: Props) {
  const { traces, layout } = useMemo(() => {
    if (data.length === 0) {
      const emptyLayout: Partial<Layout> = {
        height,
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        margin: { l: 40, r: 10, t: 10, b: 30 },
        xaxis: {
          showgrid: true,
          gridcolor: "rgba(0,0,0,0.08)",
          tickfont: { size: 10 },
        },
        yaxis: {
          zeroline: true,
          zerolinecolor: "rgba(0,0,0,0.3)",
          showgrid: true,
          gridcolor: "rgba(0,0,0,0.08)",
          tickfont: { size: 10 },
        },
        showlegend: true,
        legend: {
          orientation: "h",
          x: 0,
          y: -0.15,
          font: { size: 10 },
        },
      };

      return { traces: [] as Data[], layout: emptyLayout };
    }

    const xValues = data.map((row) => new Date(row.ts));

    const l1Values = data.map((row) =>
      typeof row.delta_L1_barra === "number" ? row.delta_L1_barra : null
    );
    const l2Values = data.map((row) =>
      typeof row.delta_L2_barra === "number" ? row.delta_L2_barra : null
    );
    const l3Values = data.map((row) =>
      typeof row.delta_L3_barra === "number" ? row.delta_L3_barra : null
    );

    const allNumbers: number[] = [];
    l1Values.forEach((v) => {
      if (typeof v === "number") allNumbers.push(v);
    });
    l2Values.forEach((v) => {
      if (typeof v === "number") allNumbers.push(v);
    });
    l3Values.forEach((v) => {
      if (typeof v === "number") allNumbers.push(v);
    });

    const hasData = allNumbers.length > 0;

    const minY = hasData ? Math.min(...allNumbers) : -5;
    const maxY = hasData ? Math.max(...allNumbers) : 5;
    const padding = hasData ? Math.max(Math.abs(minY), Math.abs(maxY)) * 0.2 : 1;

    const yMin = yRange ? yRange[0] : minY - padding;
    const yMax = yRange ? yRange[1] : maxY + padding;

    const latestTs = data[data.length - 1].ts;
    const xMax = new Date(latestTs);
    const xMin = new Date(latestTs - WINDOW_MS);

    const traces: Data[] = [
      {
        type: "scatter",
        mode: "lines",
        x: xValues,
        y: l1Values,
        name: "ΔL1",
        line: {
          shape: "linear",
          width: 1.8,
        },
      },
      {
        type: "scatter",
        mode: "lines",
        x: xValues,
        y: l2Values,
        name: "ΔL2",
        line: {
          shape: "linear",
          width: 1.8,
          dash: "dot",
        },
      },
      {
        type: "scatter",
        mode: "lines",
        x: xValues,
        y: l3Values,
        name: "ΔL3",
        line: {
          shape: "linear",
          width: 1.8,
          dash: "dash",
        },
      },
    ];

    const layout: Partial<Layout> = {
      height,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      margin: { l: 40, r: 10, t: 10, b: 30 },
      xaxis: {
        type: "date",
        range: [xMin, xMax],
        showgrid: true,
        gridcolor: "rgba(0,0,0,0.08)",
        tickfont: { size: 10 },
      },
      yaxis: {
        range: [yMin, yMax],
        zeroline: true,
        zerolinecolor: "rgba(0,0,0,0.3)",
        showgrid: true,
        gridcolor: "rgba(0,0,0,0.08)",
        tickfont: { size: 10 },
      },
      showlegend: true,
      legend: {
        orientation: "h",
        x: 0,
        y: -0.15,
        font: { size: 10 },
      },
      dragmode: false,
    };

    return { traces, layout };
  }, [data, height, yRange]);

  return (
    <div className="w-full h-full">
      <Plot
        data={traces}
        layout={layout}
        style={{ width: "100%", height: "100%" }}
        config={{
          displaylogo: false,
          responsive: true,
          scrollZoom: false,
          modeBarButtonsToRemove: [
            "toImage",
            "toggleSpikelines",
            "zoom2d",
            "select2d",
            "lasso2d",
            "zoomIn2d",
            "zoomOut2d",
            "autoScale2d",
            "resetScale2d",
          ],
        }}
      />
    </div>
  );
}
