"use client";

import { useState, useEffect } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { ResultadoCompletoDTO } from "@/src/application";
import { PILARES_FULL_MARK } from "@/src/application";

function useNarrowViewport(maxWidth = 480) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    setNarrow(mq.matches);
    const handler = () => setNarrow(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [maxWidth]);
  return narrow;
}

interface RadarChartsProps {
  data: ResultadoCompletoDTO;
}

const CHART_COLOR_PRIMARY = "var(--primary)";
const CHART_COLOR_ANTERIOR = "var(--muted-foreground)";

const tooltipStyle = {
  backgroundColor: "var(--card)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  boxShadow: "var(--shadow-md)"
};

const temComparacao = (pilares: { value_anterior?: number }[]) =>
  pilares.some((p) => p.value_anterior != null);

function TooltipRadar({ active, payload }: { active?: boolean; payload?: { name: string; value: number; dataKey: string }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as { subject: string; value: number; value_anterior?: number };
  return (
    <div style={tooltipStyle} className="rounded-lg border p-3 shadow-md">
      <p className="font-medium text-foreground">{row.subject}</p>
      <p style={{ color: "var(--primary)" }}>Esta avaliação: {row.value}</p>
      {row.value_anterior != null && (
        <p style={{ color: "var(--muted-foreground)" }}>Última avaliação: {row.value_anterior}</p>
      )}
    </div>
  );
}

function TooltipBarras({ active, payload }: { active?: boolean; payload?: { name: string; value: number; dataKey: string }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as { subject: string; value: number; value_anterior?: number };
  return (
    <div style={tooltipStyle} className="rounded-lg border p-3 shadow-md">
      <p className="font-medium text-foreground">{row.subject}</p>
      <p style={{ color: "var(--primary)" }}>Esta avaliação: {row.value}</p>
      {row.value_anterior != null && (
        <p style={{ color: "var(--muted-foreground)" }}>Última avaliação: {row.value_anterior}</p>
      )}
    </div>
  );
}

export function RadarEstrutural({ data }: RadarChartsProps) {
  const comparacao = temComparacao(data.radar_pilares);
  return (
    <div className="h-[280px] w-full sm:h-[320px] md:h-[380px] lg:h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data.radar_pilares} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--foreground)" }} />
          <PolarRadiusAxis angle={30} domain={[0, PILARES_FULL_MARK]} tick={{ fill: "var(--muted-foreground)" }} />
          <Radar
            name="Esta avaliação"
            dataKey="value"
            stroke={CHART_COLOR_PRIMARY}
            fill={CHART_COLOR_PRIMARY}
            fillOpacity={0.25}
          />
          {comparacao && (
            <Radar
              name="Última avaliação"
              dataKey="value_anterior"
              stroke={CHART_COLOR_ANTERIOR}
              fill={CHART_COLOR_ANTERIOR}
              fillOpacity={0.15}
              strokeDasharray="4 4"
            />
          )}
          <Tooltip content={<TooltipRadar />} contentStyle={tooltipStyle} />
          {comparacao && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarrasPilares({ data }: RadarChartsProps) {
  const isNarrow = useNarrowViewport(480);
  const tickFontSize = isNarrow ? 9 : 11;
  const marginBottom = isNarrow ? 110 : 100;
  const comparacao = temComparacao(data.radar_pilares);
  return (
    <div className="h-[350px] w-full sm:h-[400px] md:h-[450px] lg:h-[480px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.radar_pilares} margin={{ top: 24, right: 24, left: 0, bottom: marginBottom }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="subject"
            tick={{ fontSize: tickFontSize, fill: "var(--foreground)" }}
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
            tickMargin={15}
          />
          <YAxis domain={[0, PILARES_FULL_MARK]} tick={{ fontSize: tickFontSize, fill: "var(--muted-foreground)" }} />
          <Tooltip content={<TooltipBarras />} contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
          {comparacao && <Legend wrapperStyle={{ fontSize: 12 }} />}
          <Bar
            dataKey="value"
            name="Esta avaliação"
            fill={CHART_COLOR_PRIMARY}
            radius={[4, 4, 0, 0]}
          />
          {comparacao && (
            <Bar
              dataKey="value_anterior"
              name="Última avaliação"
              fill={CHART_COLOR_ANTERIOR}
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
