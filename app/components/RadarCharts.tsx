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
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data.radar_pilares} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 4]} />
          <Radar name="Pilares" dataKey="value" stroke="#0f172a" fill="#0f172a" fillOpacity={0.3} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RadarCombinado({ data }: RadarChartsProps) {
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data.radar_combinado} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 4]} />
          <Radar name="Clínico + Estrutura" dataKey="value" stroke="#334155" fill="#334155" fillOpacity={0.3} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
