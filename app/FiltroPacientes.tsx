"use client";

interface FiltroPacientesProps {
  /** Valor inicial da busca (vindo da URL, ex.: searchParams.q). */
  initialSearch: string;
  /** Limite atual para preservar na submissão e resetar página para 1. */
  currentLimit: number;
}

export function FiltroPacientes({ initialSearch, currentLimit }: FiltroPacientesProps) {
  return (
    <form action="/" method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="limit" value={currentLimit} />
      <label htmlFor="filtro-pacientes" className="sr-only">
        Buscar por nome ou prontuário
      </label>
      <input
        type="search"
        id="filtro-pacientes"
        name="q"
        defaultValue={initialSearch}
        placeholder="Nome ou prontuário"
        aria-label="Buscar por nome ou prontuário"
        className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="submit"
        className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        Buscar
      </button>
    </form>
  );
}
