"use client";

import dynamic from "next/dynamic";
import type { ResultadoCompletoDTO } from "@/src/application/use-cases/CalcularResultadoCompleto";

const RadarEstrutural = dynamic(
  () => import("./RadarCharts").then((m) => ({ default: m.RadarEstrutural })),
  { ssr: false }
);
const RadarCombinado = dynamic(
  () => import("./RadarCharts").then((m) => ({ default: m.RadarCombinado })),
  { ssr: false }
);

interface ResultadoRadaresProps {
  resultado: ResultadoCompletoDTO;
}

export function ResultadoRadares({ resultado }: ResultadoRadaresProps) {
  return (
    <>
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Radar estrutural
        </h2>
        <RadarEstrutural data={resultado} />
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Radar combinado (clínico normalizado + pilares)
        </h2>
        <RadarCombinado data={resultado} />
      </section>
    </>
  );
}
