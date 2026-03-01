"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { ResultadoCompletoDTO } from "@/src/application/use-cases/CalcularResultadoCompleto";
import { PILARES_FULL_MARK } from "@/src/domain/constants";

interface RadarChartsProps {
  data: ResultadoCompletoDTO;
}

const CHART_COLOR_PRIMARY = "var(--primary)";

const tooltipStyle = {
  backgroundColor: "var(--card)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  boxShadow: "var(--shadow-md)"
};

export function RadarEstrutural({ data }: RadarChartsProps) {
  return (
    <div className="h-[280px] w-full sm:h-[320px] md:h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data.radar_pilares} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--foreground)" }} />
          <PolarRadiusAxis angle={30} domain={[0, PILARES_FULL_MARK]} tick={{ fill: "var(--muted-foreground)" }} />
          <Radar
            name="Pilares"
            dataKey="value"
            stroke={CHART_COLOR_PRIMARY}
            fill={CHART_COLOR_PRIMARY}
            fillOpacity={0.25}
          />
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "var(--foreground)" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarrasPilares({ data }: RadarChartsProps) {
  return (
    <div className="h-[350px] w-full sm:h-[400px] md:h-[450px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.radar_pilares} margin={{ top: 24, right: 24, left: 0, bottom: 100 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis 
            dataKey="subject" 
            tick={{ fontSize: 11, fill: "var(--foreground)" }} 
            angle={-45} 
            textAnchor="end" 
            height={100} 
            interval={0}
            tickMargin={15}
          />
          <YAxis domain={[0, PILARES_FULL_MARK]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <Bar dataKey="value" name="Nota" fill={CHART_COLOR_PRIMARY} radius={[4, 4, 0, 0]} />
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "var(--foreground)" }} cursor={{ fill: "var(--muted)" }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
