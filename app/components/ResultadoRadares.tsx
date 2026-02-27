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
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          Radar estrutural
        </h2>
        <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-6">
          <RadarEstrutural data={resultado} />
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          Radar combinado (clínico normalizado + pilares)
        </h2>
        <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-6">
          <RadarCombinado data={resultado} />
        </div>
      </section>
    </>
  );
}
