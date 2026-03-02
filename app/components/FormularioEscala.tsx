"use client";

import type { ItemClinicoId, PilarId } from "@/src/application";
import {
  ITENS_CLINICOS,
  ESCALA_CLINICA_LABELS,
  PILARES,
  ESCALA_ESTRUTURAL_LABELS,
} from "@/src/application";

type EscalaClinica = 0 | 1 | 2 | 3;
type EscalaEstrutural = 0 | 1 | 2 | 3 | 4;

interface FormularioClinicoProps {
  valoresIniciais?: Partial<Record<ItemClinicoId, EscalaClinica>>;
}

const scaleOptionBase =
  "group relative flex min-h-[5.25rem] cursor-pointer items-center justify-center rounded-2xl border-2 border-border bg-muted/40 px-4 py-4 text-center transition-all duration-200 hover:bg-muted/70 hover:border-border/90 has-[:checked]:border-selection has-[:checked]:bg-selection/25 has-[:checked]:shadow-[var(--shadow-md)] has-[:checked]:ring-2 has-[:checked]:ring-selection/35";

export function FormularioClinico({ valoresIniciais = {} }: FormularioClinicoProps) {
  return (
    <div className="space-y-8">
      {ITENS_CLINICOS.map(({ id, label }) => (
        <div
          key={id}
          className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6 md:p-6 shadow-[var(--shadow-md)]"
          role="group"
          aria-labelledby={`legend-${id}`}
        >
          <div id={`legend-${id}`} className="text-base font-medium leading-relaxed text-foreground sm:text-lg">
            {label}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                <span className="block text-sm font-medium leading-relaxed break-words text-muted-foreground transition-colors group-has-[:checked]:text-selection group-has-[:checked]:font-bold">
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
          className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6 md:p-6 shadow-[var(--shadow-md)]"
          role="group"
          aria-labelledby={`legend-${id}`}
        >
          <div id={`legend-${id}`} className="text-base font-medium leading-relaxed text-foreground sm:text-lg">
            {pergunta}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-wrap">
            {([0, 1, 2, 3, 4] as const).map((v) => (
              <label key={v} className={`${scaleOptionBase} lg:min-w-[5.5rem] xl:flex-1`}>
                <input
                  type="radio"
                  name={id}
                  value={v}
                  defaultChecked={valoresIniciais[id] === v}
                  required
                  className="sr-only"
                  aria-label={`${label}: ${ESCALA_ESTRUTURAL_LABELS[v]}`}
                />
                <span className="block text-sm font-medium leading-relaxed break-words text-muted-foreground transition-colors group-has-[:checked]:text-selection group-has-[:checked]:font-bold">
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
