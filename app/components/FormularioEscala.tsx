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
  "flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 transition-colors hover:bg-[var(--muted-bg)] has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--muted-bg)] has-[:checked]:ring-2 has-[:checked]:ring-[var(--primary)]/20";

export function FormularioClinico({ valoresIniciais = {} }: FormularioClinicoProps) {
  return (
    <div className="space-y-6">
      {ITENS_CLINICOS.map(({ id, label }) => (
        <fieldset
          key={id}
          className="rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)] p-4 sm:p-5"
        >
          <legend className="mb-4 block w-full border-b border-[var(--card-border)] pb-3 text-left text-base font-semibold leading-tight text-[var(--foreground)] sm:text-lg">
            {label}
          </legend>
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:flex lg:flex-wrap"
            role="group"
            aria-label={label}
          >
            {([0, 1, 2, 3] as const).map((v) => (
              <label key={v} className={scaleOptionBase}>
                <input
                  type="radio"
                  name={id}
                  value={v}
                  defaultChecked={valoresIniciais[id] === v}
                  required
                  className="h-5 w-5 border-[var(--card-border)] text-[var(--primary)] focus:ring-[var(--focus-ring)]"
                  aria-label={`${label}: ${ESCALA_CLINICA_LABELS[v]}`}
                />
                <span className="text-sm text-[var(--foreground)] sm:text-base">
                  {ESCALA_CLINICA_LABELS[v]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

interface FormularioPilaresProps {
  valoresIniciais?: Partial<Record<PilarId, EscalaEstrutural>>;
}

export function FormularioPilares({ valoresIniciais = {} }: FormularioPilaresProps) {
  return (
    <div className="space-y-6">
      {PILARES.map(({ id, label }) => (
        <fieldset
          key={id}
          className="rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)] p-4 sm:p-5"
        >
          <legend className="mb-4 block w-full border-b border-[var(--card-border)] pb-3 text-left text-base font-semibold leading-tight text-[var(--foreground)] sm:text-lg">
            {label}
          </legend>
          <div
            className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3"
            role="group"
            aria-label={label}
          >
            {([0, 1, 2, 3, 4] as const).map((v) => (
              <label key={v} className={scaleOptionBase}>
                <input
                  type="radio"
                  name={id}
                  value={v}
                  defaultChecked={valoresIniciais[id] === v}
                  required
                  className="h-5 w-5 border-[var(--card-border)] text-[var(--primary)] focus:ring-[var(--focus-ring)]"
                  aria-label={`${label}: ${ESCALA_ESTRUTURAL_LABELS[v]}`}
                />
                <span className="text-sm text-[var(--foreground)] sm:text-base">
                  {ESCALA_ESTRUTURAL_LABELS[v]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
