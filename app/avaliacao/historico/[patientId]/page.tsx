import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUseCases } from "@/app/use-cases";
import { excluirAvaliacao } from "@/app/actions";
import { ArrowLeft, Calendar, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { HistoricoConsultaItem } from "../HistoricoConsultaItem";

export default async function HistoricoPage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ patientId }, { error: errorMessage }, { uc }] = await Promise.all([
    params,
    searchParams,
    getAuthenticatedUseCases(),
  ]);
  const [paciente, consultas] = await Promise.all([
    uc.obterPaciente(patientId),
    uc.listarHistoricoPaciente(patientId),
  ]);
  if (!paciente) {
    redirect("/");
  }
  const LIMITE_HISTORICO = 50;
  const consultasRecentesPrimeiro = [...consultas].reverse().slice(0, LIMITE_HISTORICO);
  const temMais = consultas.length > LIMITE_HISTORICO;

  return (
    <div className="page-container">
      <div className="content-width-medium flex flex-col gap-6">
        <Link href="/" className="link-back inline-flex items-center w-fit mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao início
        </Link>
        <Card className="border-border/80 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl mb-1 text-foreground">
                  {paciente.nome}
                </CardTitle>
                <CardDescription className="text-base font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Prontuário: {paciente.identificador}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Histórico de Consultas
              </h3>
              {errorMessage ? (
                <p className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}
              {temMais && (
                <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  Exibindo as {LIMITE_HISTORICO} consultas mais recentes de {consultas.length} registradas.
                </p>
              )}
              {consultasRecentesPrimeiro.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-12 px-4 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground font-medium">
                    Nenhuma consulta registrada ainda.
                  </p>
                </div>
              ) : (
                <ul className="grid gap-4">
                  {consultasRecentesPrimeiro.map((consulta) => (
                    <HistoricoConsultaItem
                      key={consulta.id}
                      consulta={consulta}
                      patientId={patientId}
                      onExcluir={excluirAvaliacao}
                    />
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
