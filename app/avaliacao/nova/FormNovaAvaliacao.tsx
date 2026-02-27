"use client";

import { iniciarAvaliacao } from "../../actions";

export function FormNovaAvaliacao() {
  return (
    <>
      <form action={iniciarAvaliacao} className="flex flex-col gap-6">
        <div>
          <label htmlFor="nome" className="mb-2 block text-sm font-medium text-slate-700">
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            autoComplete="name"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Nome completo"
          />
        </div>
        <div>
          <label htmlFor="identificador" className="mb-2 block text-sm font-medium text-slate-700">
            Identificador (prontuário ou CPF)
          </label>
          <input
            id="identificador"
            name="identificador"
            type="text"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Ex.: 12345 ou CPF"
          />
        </div>
        <button
          type="submit"
          className="h-14 rounded-xl bg-slate-800 text-lg font-medium text-white transition-colors hover:bg-slate-700 active:bg-slate-900"
        >
          Iniciar avaliação
        </button>
      </form>
    </>
  );
}
