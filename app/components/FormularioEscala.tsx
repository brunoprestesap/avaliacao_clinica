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

export function FormularioClinico({ valoresIniciais = {} }: FormularioClinicoProps) {
  return (
    <div className="space-y-6">
      {ITENS_CLINICOS.map(({ id, label }) => (
        <fieldset key={id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <legend className="mb-3 text-sm font-medium text-slate-800">{label}</legend>
          <div className="flex flex-wrap gap-3" role="group" aria-label={label}>
            {([0, 1, 2, 3] as const).map((v) => (
              <label key={v} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-2 hover:bg-slate-100 has-[:checked]:border-slate-800 has-[:checked]:bg-slate-100">
                <input
                  type="radio"
                  name={id}
                  value={v}
                  defaultChecked={valoresIniciais[id] === v}
                  required
                  className="h-5 w-5 border-slate-300 text-slate-800 focus:ring-slate-500"
                  aria-label={`${label}: ${ESCALA_CLINICA_LABELS[v]}`}
                />
                <span className="text-base text-slate-700">{ESCALA_CLINICA_LABELS[v]}</span>
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
        <fieldset key={id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <legend className="mb-3 text-sm font-medium text-slate-800">{label}</legend>
          <div className="flex flex-wrap gap-3" role="group" aria-label={label}>
            {([0, 1, 2, 3, 4] as const).map((v) => (
              <label key={v} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-2 hover:bg-slate-100 has-[:checked]:border-slate-800 has-[:checked]:bg-slate-100">
                <input
                  type="radio"
                  name={id}
                  value={v}
                  defaultChecked={valoresIniciais[id] === v}
                  required
                  className="h-5 w-5 border-slate-300 text-slate-800 focus:ring-slate-500"
                  aria-label={`${label}: ${ESCALA_ESTRUTURAL_LABELS[v]}`}
                />
                <span className="text-base text-slate-700">{ESCALA_ESTRUTURAL_LABELS[v]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
