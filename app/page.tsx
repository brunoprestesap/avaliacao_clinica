import Link from "next/link";
import { getPacienteRepository } from "@/src/infrastructure/container";

export default async function Home() {
  const repo = getPacienteRepository();
  const pacientes = await repo.listarTodos();

  return (
    <div className="page-container bg-[var(--background)]">
      <main className="content-width-narrow flex flex-col gap-6 sm:gap-8">
        <div className="card">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Avaliação Clínica Estrutural
          </h1>
          <p className="mb-8 text-[var(--muted)] sm:text-lg">
            Sistema interno – uso durante consulta médica.
          </p>
          <Link
            href="/avaliacao/nova"
            className="btn-primary flex h-14 w-full items-center justify-center rounded-xl text-lg"
          >
            Nova avaliação
          </Link>
        </div>

        {pacientes.length > 0 && (
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)] sm:text-xl">
              Histórico por paciente
            </h2>
            <ul className="grid gap-3 sm:grid-cols-1">
              {pacientes.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/avaliacao/historico/${p.id}`}
                    className="block rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)] p-4 transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--muted-bg)]/80 active:bg-[var(--card-border)]/50 sm:p-5"
                  >
                    <span className="font-medium text-[var(--foreground)]">{p.nome}</span>
                    <span className="mt-1 block text-sm text-[var(--muted)] sm:mt-0 sm:inline sm:ml-2">
                      {p.identificador}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
