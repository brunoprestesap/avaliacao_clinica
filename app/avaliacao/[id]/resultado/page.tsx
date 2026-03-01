import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/app/auth";
import { getAvaliacaoUseCases } from "@/app/use-cases";
import {
  CLASSIFICACAO_CLINICA_LABELS,
  CLASSIFICACAO_ESTRUTURA_LABELS,
  VARIACAO_LABELS,
} from "@/src/application";
import { ResultadoRadares } from "../../../components/ResultadoRadares";
import { salvarImpressaoEFinalizar } from "../../../actions";
import { Stepper } from "../../../components/Stepper";
import { SubmitButton } from "../../../components/SubmitButton";
import { ErrorToast } from "../../../components/ErrorToast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ResultadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id: consultaId }, { error }] = await Promise.all([params, searchParams]);
  const { supabase } = await getSession({ redirectIfUnauthenticated: true });
  const uc = getAvaliacaoUseCases(process.env.PERSISTENCE === "supabase" ? supabase ?? undefined : undefined);
  const resultado = await uc.obterResultadoParaExibicao(consultaId);
  if (!resultado) {
    redirect("/avaliacao/nova");
  }
  const { consulta } = resultado;
  const c = consulta.clinico!;
  const e = consulta.estrutura!;
  const comp = consulta.comparacao;
  const jaSalvou = Boolean(consulta.impressao_clinica);

  return (
    <div className="page-container">
      <div className="content-width-wide flex flex-col gap-6">
        <nav className="flex flex-wrap items-center gap-3 gap-y-2 sm:gap-4" aria-label="Navegação">
          <Link href="/" className="link-back">
            <span aria-hidden>←</span> Voltar ao início
          </Link>
          <span className="text-muted-foreground" aria-hidden>·</span>
          <Link
            href={`/avaliacao/historico/${consulta.patient_id}`}
            className="link-back"
          >
            Ver histórico do paciente
          </Link>
        </nav>

        {!jaSalvou && (
          <div className="mx-auto w-full max-w-2xl px-4 mt-2">
            <Stepper currentStep="resultado" />
          </div>
        )}

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Resultado da avaliação
            </h1>
          </div>

          {c.alerta_ideacao && (
            <Card className="border-destructive/40 bg-destructive/10 shadow-none" role="alert" aria-live="assertive">
              <CardContent className="p-6 text-center">
                <p className="text-lg font-bold text-destructive sm:text-xl">
                  ALERTA DE IDEAÇÃO – PRIORIDADE MÁXIMA
                </p>
              </CardContent>
            </Card>
          )}

          <ErrorToast error={error} />

          <section className="grid gap-4 sm:grid-cols-2 sm:gap-6">
            <Card className="border-border/80 shadow-[var(--shadow-card)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Score clínico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold sm:text-4xl text-foreground">{c.score_total}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {CLASSIFICACAO_CLINICA_LABELS[c.classificacao]}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-[var(--shadow-card)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Média estrutural</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold sm:text-4xl text-foreground">{e.media.toFixed(2)}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {CLASSIFICACAO_ESTRUTURA_LABELS[e.classificacao]}
                </p>
              </CardContent>
            </Card>
          </section>

          <Card className="bg-primary/10 border-primary/30 shadow-[var(--shadow-card)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">FASE indicada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold sm:text-3xl text-primary">{consulta.fase_indicada}</div>
            </CardContent>
          </Card>

          {comp && (
            <Card className="border-border/80 shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Comparação com última consulta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clínico</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-foreground">{VARIACAO_LABELS[comp.variacao_clinica]}</span>
                      <Badge variant={comp.delta_clinico < 0 ? "default" : comp.delta_clinico > 0 ? "destructive" : "secondary"}>
                        {comp.delta_clinico > 0 ? "+" : ""}{comp.delta_clinico}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estrutura</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-foreground">{VARIACAO_LABELS[comp.variacao_estrutura]}</span>
                      <Badge variant={comp.delta_estrutura > 0 ? "default" : comp.delta_estrutura < 0 ? "destructive" : "secondary"}>
                        {comp.delta_estrutura > 0 ? "+" : ""}{comp.delta_estrutura.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                  {comp.pilar_maior_melhora && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Maior melhora</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-foreground">{comp.pilar_maior_melhora.label}</span>
                        <Badge variant="default">+{comp.pilar_maior_melhora.delta}</Badge>
                      </div>
                    </div>
                  )}
                  {comp.pilar_maior_piora && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Maior piora</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-foreground">{comp.pilar_maior_piora.label}</span>
                        <Badge variant="destructive">{comp.pilar_maior_piora.delta}</Badge>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <ResultadoRadares resultado={resultado} />

          <Card className="border-border/80 shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="text-lg uppercase tracking-wider text-muted-foreground text-sm">
                Impressão clínica
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jaSalvou ? (
                <p className="whitespace-pre-wrap rounded-xl bg-muted/30 p-5 text-foreground leading-relaxed">
                  {consulta.impressao_clinica}
                </p>
              ) : (
                <form action={salvarImpressaoEFinalizar} className="space-y-4">
                  <input type="hidden" name="consultaId" value={consultaId} />
                  <textarea
                    id="impressao_clinica"
                    name="impressao_clinica"
                    required
                    rows={8}
                    className="input-textarea"
                    placeholder="Descreva a impressão clínica (obrigatório)..."
                  />
                  <SubmitButton label="Salvar e Finalizar" className="h-14 w-full rounded-xl text-lg font-semibold mt-4 shadow-sm hover:shadow-md transition-shadow" />
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
