import Link from "next/link";
import { redirect } from "next/navigation";
import { getCalcularResultadoCompleto } from "@/src/infrastructure/container";
import { ResultadoRadares } from "../../../components/ResultadoRadares";

const CLASSIFICACAO_CLINICA_LABELS: Record<string, string> = {
  CLINICO_ESTAVEL: "Estável",
  CLINICO_LEVE: "Leve",
  CLINICO_MODERADO: "Moderado - alto",
  CLINICO_GRAVE: "Grave",
};

const CLASSIFICACAO_ESTRUTURA_LABELS: Record<string, string> = {
  ESTRUTURA_COMPROMETIDA: "Estrutura comprometida",
  ESTRUTURA_INSTAVEL: "Estrutura instável",
  ESTRUTURA_FUNCIONAL: "Estrutura funcional",
  ESTRUTURA_BEM_ESTRUTURADA: "Alta organização",
};

const VARIACAO_LABELS: Record<string, string> = {
  MELHORA_RELEVANTE: "Melhora relevante",
  ESTAVEL: "Estável",
  PIORA_RELEVANTE: "Piora relevante",
};

export default async function ResultadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: consultaId } = await params;
  const calcular = getCalcularResultadoCompleto();
  const resultado = await calcular(consultaId);
  if (!resultado) {
    redirect("/avaliacao/nova");
  }
  const { consulta } = resultado;
  if (!consulta.clinico || !consulta.estrutura) {
    redirect(`/avaliacao/${consultaId}/clinico`);
  }
  if (!consulta.impressao_clinica) {
    redirect(`/avaliacao/${consultaId}/impressao`);
  }

  const c = consulta.clinico;
  const e = consulta.estrutura;
  const comp = consulta.comparacao;

  return (
    <div className="page-container bg-[var(--background)]">
      <div className="content-width-wide flex flex-col gap-6">
        <nav className="flex flex-wrap items-center gap-3 gap-y-2 sm:gap-4" aria-label="Navegação">
          <Link href="/" className="link-back">
            <span aria-hidden>←</span> Voltar ao início
          </Link>
          <span className="text-[var(--muted)]" aria-hidden>·</span>
          <Link
            href={`/avaliacao/historico/${consulta.patient_id}`}
            className="link-back"
          >
            Ver histórico do paciente
          </Link>
        </nav>

        <div className="card space-y-8">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            5. Resultado da avaliação
          </h1>

          {c.alerta_ideacao && (
            <div
              className="rounded-xl border-2 border-red-600 bg-[var(--error-bg)] p-5 text-center sm:p-6"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-lg font-bold text-[var(--error-text)] sm:text-xl">
                Alerta: ideação suicida
              </p>
              <p className="mt-2 text-sm text-[var(--error-text)]/90 sm:text-base">
                Item C14 (Ideação suicida) com pontuação ≥ 2. Atenção necessária.
              </p>
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 sm:gap-6">
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)] p-5 sm:p-6">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Score clínico
              </h2>
              <p className="text-3xl font-bold text-[var(--foreground)] sm:text-4xl">{c.score_total}</p>
              <p className="mt-1 text-[var(--muted)]">
                {CLASSIFICACAO_CLINICA_LABELS[c.classificacao] ?? c.classificacao}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)] p-5 sm:p-6">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Média estrutural
              </h2>
              <p className="text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
                {e.media.toFixed(2)}
              </p>
              <p className="mt-1 text-[var(--muted)]">
                {CLASSIFICACAO_ESTRUTURA_LABELS[e.classificacao] ?? e.classificacao}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              FASE indicada
            </h2>
            <p className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
              Fase {consulta.fase_indicada}
            </p>
          </section>

          {comp && (
            <section className="rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)] p-5 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
                Comparação com última consulta
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-[var(--muted)]">Clínico (delta: {comp.delta_clinico})</p>
                  <p className="font-medium text-[var(--foreground)]">
                    {VARIACAO_LABELS[comp.variacao_clinica] ?? comp.variacao_clinica}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--muted)]">
                    Estrutura (delta: {comp.delta_estrutura.toFixed(2)})
                  </p>
                  <p className="font-medium text-[var(--foreground)]">
                    {VARIACAO_LABELS[comp.variacao_estrutura] ?? comp.variacao_estrutura}
                  </p>
                </div>
                {comp.pilar_maior_melhora && (
                  <div>
                    <p className="text-sm text-[var(--muted)]">Pilar com maior melhora</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {comp.pilar_maior_melhora.label} (+{comp.pilar_maior_melhora.delta})
                    </p>
                  </div>
                )}
                {comp.pilar_maior_piora && (
                  <div>
                    <p className="text-sm text-[var(--muted)]">Pilar com maior piora</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {comp.pilar_maior_piora.label} ({comp.pilar_maior_piora.delta})
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Impressão clínica
            </h2>
            <p className="whitespace-pre-wrap rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 text-[var(--foreground)]">
              {consulta.impressao_clinica}
            </p>
          </section>

          <ResultadoRadares resultado={resultado} />
        </div>
      </div>
    </div>
  );
}
