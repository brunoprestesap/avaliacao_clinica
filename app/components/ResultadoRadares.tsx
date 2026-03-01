"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ResultadoCompletoDTO } from "@/src/application";
import { Card, CardContent } from "@/components/ui/card";

const RadarEstrutural = dynamic(
  () => import("./RadarCharts").then((m) => ({ default: m.RadarEstrutural })),
  { ssr: false }
);
const BarrasPilares = dynamic(
  () => import("./RadarCharts").then((m) => ({ default: m.BarrasPilares })),
  { ssr: false }
);

interface ResultadoRadaresProps {
  resultado: ResultadoCompletoDTO;
}

type TipoGrafico = "radar" | "barras";

export function ResultadoRadares({ resultado }: ResultadoRadaresProps) {
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("radar");

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">
          Estrutura dos 9 pilares
        </h2>
        <div className="flex rounded-xl border border-border/80 p-1 bg-muted/40 shadow-sm" role="tablist" aria-label="Tipo de gráfico">
          <button
            type="button"
            role="tab"
            aria-selected={tipoGrafico === "radar"}
            onClick={() => setTipoGrafico("radar")}
            className={`min-h-10 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              tipoGrafico === "radar"
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Radar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tipoGrafico === "barras"}
            onClick={() => setTipoGrafico("barras")}
            className={`min-h-10 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              tipoGrafico === "barras"
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Barras
          </button>
        </div>
      </div>
      <Card className="overflow-hidden p-2 sm:p-4 border-border/80 shadow-[var(--shadow-card)] rounded-2xl">
        <CardContent className="p-0">
          {tipoGrafico === "radar" ? (
            <RadarEstrutural data={resultado} />
          ) : (
            <BarrasPilares data={resultado} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
