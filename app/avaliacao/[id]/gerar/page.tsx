import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/app/auth";
import { getAvaliacaoUseCases } from "@/app/use-cases";
import { gerarResultados } from "../../../actions";
import { ErrorToast } from "../../../components/ErrorToast";
import { SubmitButton } from "../../../components/SubmitButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default async function GerarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id: consultaId }, { error }] = await Promise.all([params, searchParams]);
  const { supabase } = await getSession({ redirectIfUnauthenticated: true });
  const uc = getAvaliacaoUseCases(process.env.PERSISTENCE === "supabase" ? supabase ?? undefined : undefined);
  const consulta = await uc.obterConsulta(consultaId);
  if (!consulta) {
    redirect("/avaliacao/nova");
  }
  if (!consulta.clinico || !consulta.estrutura) {
    redirect(`/avaliacao/${consultaId}/clinico`);
  }
  if (consulta.fase_indicada) {
    redirect(`/avaliacao/${consultaId}/resultado`);
  }

  return (
    <div className="page-container flex min-h-[80vh] flex-col justify-center">
      <div className="content-width-medium flex flex-col gap-6">
        <ErrorToast error={error} />
        <Card className="border-border/80 shadow-[var(--shadow-card)] text-center">
          <CardHeader className="pb-4 items-center space-y-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mx-auto">
              <Sparkles className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              Gerar Resultados
            </CardTitle>
            <CardDescription className="text-base max-w-sm mx-auto leading-relaxed text-muted-foreground">
              O sistema irá calcular o score clínico, a média estrutural, a fase indicada e a comparação com a última consulta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={gerarResultados} className="mt-4">
              <input type="hidden" name="consultaId" value={consultaId} />
              <SubmitButton label="Analisar e Gerar Relatório" className="h-14 w-full rounded-xl text-lg font-semibold sm:max-w-xs mx-auto shadow-sm hover:shadow-md transition-shadow" />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
