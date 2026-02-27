"use client";

import { iniciarAvaliacao } from "../../actions";

export function FormNovaAvaliacao() {
  return (
    <form action={iniciarAvaliacao} className="flex flex-col gap-6">
      <div>
        <label htmlFor="nome" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          autoComplete="name"
          className="input-text"
          placeholder="Nome completo"
        />
      </div>
      <div>
        <label
          htmlFor="identificador"
          className="mb-2 block text-sm font-medium text-[var(--foreground)]"
        >
          Identificador (prontuário ou CPF)
        </label>
        <input
          id="identificador"
          name="identificador"
          type="text"
          required
          className="input-text"
          placeholder="Ex.: 12345 ou CPF"
        />
      </div>
      <button type="submit" className="btn-primary h-14 w-full rounded-xl text-lg">
        Iniciar avaliação
      </button>
    </form>
  );
}
