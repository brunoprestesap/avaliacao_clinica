"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ResultadoCompletoDTO } from "@/src/application/use-cases/CalcularResultadoCompleto";

interface RadarChartsProps {
  data: ResultadoCompletoDTO;
}

export function RadarEstrutural({ data }: RadarChartsProps) {
  return (
    <div className="h-[280px] w-full sm:h-[320px] md:h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data.radar_pilares} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="var(--card-border)" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 4]} />
          <Radar
            name="Pilares"
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.25}
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RadarCombinado({ data }: RadarChartsProps) {
  return (
    <div className="h-[280px] w-full sm:h-[320px] md:h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data.radar_combinado} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="var(--card-border)" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 4]} />
          <Radar
            name="Clínico + Estrutura"
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.25}
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
