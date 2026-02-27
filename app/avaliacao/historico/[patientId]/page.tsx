import Link from "next/link";
import { redirect } from "next/navigation";
import { getListarHistoricoPaciente, getPacienteRepository } from "@/src/infrastructure/container";

export default async function HistoricoPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const repoPaciente = getPacienteRepository();
  const paciente = await repoPaciente.findById(patientId);
  if (!paciente) {
    redirect("/");
  }
  const listarHistorico = getListarHistoricoPaciente();
  const consultas = await listarHistorico(patientId);
  const consultasRecentesPrimeiro = [...consultas].reverse();

  return (
    <div className="page-container bg-[var(--background)]">
      <div className="content-width-medium flex flex-col gap-6">
        <Link href="/" className="link-back">
          <span aria-hidden>←</span> Voltar ao início
        </Link>
        <div className="card">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Histórico do paciente
          </h1>
          <p className="mb-6 text-[var(--muted)] sm:text-lg">
            {paciente.nome} – {paciente.identificador}
          </p>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Consultas em ordem cronológica (mais recente primeiro). Não é permitida exclusão.
          </p>
          <ul className="grid gap-3">
            {consultasRecentesPrimeiro.length === 0 ? (
              <li className="rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)] p-5 text-center text-[var(--muted)]">
                Nenhuma consulta registrada.
              </li>
            ) : (
              consultasRecentesPrimeiro.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/avaliacao/${c.id}/resultado`}
                    className="block rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)] p-4 transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--muted-bg)]/80 active:bg-[var(--card-border)]/50 sm:p-5"
                  >
                    <span className="font-medium text-[var(--foreground)]">{c.date}</span>
                    {c.clinico && (
                      <span className="mt-1 block text-sm text-[var(--muted)] sm:mt-0 sm:inline sm:ml-2">
                        – Score clínico: {c.clinico.score_total}
                        {c.estrutura != null &&
                          ` | Média estrutural: ${c.estrutura.media.toFixed(2)}`}
                      </span>
                    )}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
