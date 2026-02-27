import Link from "next/link";
import { redirect } from "next/navigation";
import { getCalcularResultadoCompleto } from "@/src/infrastructure/container";
import { ResultadoRadares } from "../../../components/ResultadoRadares";

/** Rótulos alinhados à planilha (Score Ansiedade/depressão; Moderado - alto) */
const CLASSIFICACAO_CLINICA_LABELS: Record<string, string> = {
  CLINICO_ESTAVEL: "Estável",
  CLINICO_LEVE: "Leve",
  CLINICO_MODERADO: "Moderado - alto",
  CLINICO_GRAVE: "Grave",
};

/** Rótulos alinhados à planilha (Estrutura comprometida/instável/funcional/Alta organização) */
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
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="mb-6 flex flex-wrap gap-4">
          <Link href="/" className="text-slate-600 underline hover:text-slate-800">
            Voltar ao início
          </Link>
          <Link
            href={`/avaliacao/historico/${consulta.patient_id}`}
            className="text-slate-600 underline hover:text-slate-800"
          >
            Ver histórico do paciente
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="mb-8 text-2xl font-semibold text-slate-800">
            5. Resultado da avaliação
          </h1>

          {c.alerta_ideacao && (
            <div
              className="mb-8 rounded-xl border-2 border-red-600 bg-red-50 p-6 text-center"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-xl font-bold text-red-800">Alerta: ideação suicida</p>
              <p className="mt-2 text-red-700">
                Item C14 (Ideação suicida) com pontuação ≥ 2. Atenção necessária.
              </p>
            </div>
          )}

          <section className="mb-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
              <h2 className="mb-2 text-sm font-medium uppercase text-slate-500">
                Score clínico
              </h2>
              <p className="text-3xl font-bold text-slate-800">{c.score_total}</p>
              <p className="mt-1 text-slate-600">
                {CLASSIFICACAO_CLINICA_LABELS[c.classificacao] ?? c.classificacao}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
              <h2 className="mb-2 text-sm font-medium uppercase text-slate-500">
                Média estrutural
              </h2>
              <p className="text-3xl font-bold text-slate-800">{e.media.toFixed(2)}</p>
              <p className="mt-1 text-slate-600">
                {CLASSIFICACAO_ESTRUTURA_LABELS[e.classificacao] ?? e.classificacao}
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-2 text-sm font-medium uppercase text-slate-500">
              FASE indicada
            </h2>
            <p className="text-2xl font-bold text-slate-800">Fase {consulta.fase_indicada}</p>
          </section>

          {comp && (
            <section className="mb-8 rounded-xl border border-slate-200 bg-slate-50/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">
                Comparação com última consulta
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-600">Clínico (delta: {comp.delta_clinico})</p>
                  <p className="font-medium text-slate-800">
                    {VARIACAO_LABELS[comp.variacao_clinica] ?? comp.variacao_clinica}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">
                    Estrutura (delta: {comp.delta_estrutura.toFixed(2)})
                  </p>
                  <p className="font-medium text-slate-800">
                    {VARIACAO_LABELS[comp.variacao_estrutura] ?? comp.variacao_estrutura}
                  </p>
                </div>
                {comp.pilar_maior_melhora && (
                  <div>
                    <p className="text-sm text-slate-600">Pilar com maior melhora</p>
                    <p className="font-medium text-slate-800">
                      {comp.pilar_maior_melhora.label} (+{comp.pilar_maior_melhora.delta})
                    </p>
                  </div>
                )}
                {comp.pilar_maior_piora && (
                  <div>
                    <p className="text-sm text-slate-600">Pilar com maior piora</p>
                    <p className="font-medium text-slate-800">
                      {comp.pilar_maior_piora.label} ({comp.pilar_maior_piora.delta})
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="mb-8">
            <h2 className="mb-2 text-sm font-medium uppercase text-slate-500">
              Impressão clínica
            </h2>
            <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 text-slate-700">
              {consulta.impressao_clinica}
            </p>
          </section>

          <ResultadoRadares resultado={resultado} />
        </div>
      </div>
    </div>
  );
}
