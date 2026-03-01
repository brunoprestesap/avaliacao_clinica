"use client";

import type { ItemClinicoId, PilarId } from "@/src/domain";
import {
  ITENS_CLINICOS,
  ESCALA_CLINICA_LABELS,
  PILARES,
  ESCALA_ESTRUTURAL_LABELS,
} from "@/src/domain/constants";

type EscalaClinica = 0 | 1 | 2 | 3;
type EscalaEstrutural = 0 | 1 | 2 | 3 | 4;

interface FormularioClinicoProps {
  valoresIniciais?: Partial<Record<ItemClinicoId, EscalaClinica>>;
}

const scaleOptionBase =
  "group relative flex min-h-[4rem] cursor-pointer items-center justify-center rounded-2xl border-2 border-border/60 bg-muted/30 px-4 py-3 text-center transition-all duration-200 hover:bg-muted/60 hover:border-border has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-[var(--shadow-sm)] has-[:checked]:ring-1 has-[:checked]:ring-primary/20";

export function FormularioClinico({ valoresIniciais = {} }: FormularioClinicoProps) {
  return (
    <div className="space-y-8">
      {ITENS_CLINICOS.map(({ id, label }) => (
        <div
          key={id}
          className="flex flex-col gap-5 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-[var(--shadow-card)]"
          role="group"
          aria-labelledby={`legend-${id}`}
        >
          <div id={`legend-${id}`} className="text-base font-medium leading-relaxed text-foreground sm:text-lg">
            {label}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {([0, 1, 2, 3] as const).map((v) => (
              <label key={v} className={scaleOptionBase}>
                <input
                  type="radio"
                  name={id}
                  value={v}
                  defaultChecked={valoresIniciais[id] === v}
                  required
                  className="sr-only"
                  aria-label={`${label}: ${ESCALA_CLINICA_LABELS[v]}`}
                />
                <span className="text-sm font-medium text-foreground/80 transition-colors group-has-[:checked]:text-primary group-has-[:checked]:font-bold">
                  {ESCALA_CLINICA_LABELS[v]}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface FormularioPilaresProps {
  valoresIniciais?: Partial<Record<PilarId, EscalaEstrutural>>;
}

export function FormularioPilares({ valoresIniciais = {} }: FormularioPilaresProps) {
  return (
    <div className="space-y-8">
      {PILARES.map(({ id, label, pergunta }) => (
        <div
          key={id}
          className="flex flex-col gap-5 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-[var(--shadow-card)]"
          role="group"
          aria-labelledby={`legend-${id}`}
        >
          <div id={`legend-${id}`} className="text-base font-medium leading-relaxed text-foreground sm:text-lg">
            {pergunta}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-wrap">
            {([0, 1, 2, 3, 4] as const).map((v) => (
              <label key={v} className={`${scaleOptionBase} xl:flex-1`}>
                <input
                  type="radio"
                  name={id}
                  value={v}
                  defaultChecked={valoresIniciais[id] === v}
                  required
                  className="sr-only"
                  aria-label={`${label}: ${ESCALA_ESTRUTURAL_LABELS[v]}`}
                />
                <span className="text-sm font-medium text-foreground/80 transition-colors group-has-[:checked]:text-primary group-has-[:checked]:font-bold">
                  {ESCALA_ESTRUTURAL_LABELS[v]}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
