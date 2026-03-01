import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/app/auth";
import { getAvaliacaoUseCases } from "@/app/use-cases";
import { ArrowLeft, Calendar, FileText, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function HistoricoPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const { supabase } = await getSession({ redirectIfUnauthenticated: true });
  const uc = getAvaliacaoUseCases(process.env.PERSISTENCE === "supabase" ? supabase ?? undefined : undefined);
  const [paciente, consultas] = await Promise.all([
    uc.obterPaciente(patientId),
    uc.listarHistoricoPaciente(patientId),
  ]);
  if (!paciente) {
    redirect("/");
  }
  const consultasRecentesPrimeiro = [...consultas].reverse();

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
              {consultasRecentesPrimeiro.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-12 px-4 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground font-medium">
                    Nenhuma consulta registrada ainda.
                  </p>
                </div>
              ) : (
                <ul className="grid gap-4">
                  {consultasRecentesPrimeiro.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/avaliacao/${c.id}/resultado`}
                        className="group block rounded-2xl border border-border/80 bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-md)] active:scale-[0.99]"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                              <span className="font-semibold text-foreground group-hover:text-primary transition-colors block text-lg">
                                {c.date.split("T")[0].split("-").reverse().join("/")}
                              </span>
                            </div>
                          </div>
                          {c.clinico && (
                            <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0">
                              <Badge variant="outline" className="px-3 py-1 flex items-center gap-1.5 bg-background text-sm font-medium border-border/80">
                                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                                Clínico: {c.clinico.score_total}
                              </Badge>
                              {c.estrutura != null && (
                                <Badge variant="outline" className="px-3 py-1 flex items-center gap-1.5 bg-background text-sm font-medium border-border/80">
                                  Estrutural: {c.estrutura.media.toFixed(2)}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                    </li>
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
