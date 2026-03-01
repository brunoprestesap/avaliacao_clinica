import Link from "next/link";
import { redirect } from "next/navigation";
import { getAvaliacaoUseCases } from "@/app/use-cases";
import { INSTRUCAO_CLINICA } from "@/src/application";
import { FormularioClinico } from "../../../components/FormularioEscala";
import { salvarClinicoForm } from "../../../actions";
import { Stepper } from "../../../components/Stepper";
import { SubmitButton } from "../../../components/SubmitButton";
import { ErrorToast } from "../../../components/ErrorToast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default async function ClinicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id: consultaId }, { error }] = await Promise.all([params, searchParams]);
  const uc = getAvaliacaoUseCases();
  const consulta = await uc.obterConsulta(consultaId);
  if (!consulta) {
    redirect("/avaliacao/nova");
  }
  if (consulta.impressao_clinica) {
    redirect(`/avaliacao/${consultaId}/resultado`);
  }
  const valoresIniciais = consulta.clinico?.itens;

  return (
    <div className="page-container">
      <div className="content-width-medium flex flex-col gap-6">
        <ErrorToast error={error} />
        <Link href="/" className="link-back inline-flex items-center w-fit mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar avaliação
        </Link>
        <Stepper currentStep="clinico" />
        <Card className="border-border/80 shadow-[var(--shadow-card)] mt-2">
          <CardHeader className="pb-4 space-y-3">
            <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              2. Avaliação Clínica
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground leading-relaxed">
              {INSTRUCAO_CLINICA}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={salvarClinicoForm} className="space-y-8 mt-2">
              <input type="hidden" name="consultaId" value={consultaId} />
              <FormularioClinico valoresIniciais={valoresIniciais} />
              <SubmitButton label="Concluir Parte 1" className="h-14 w-full rounded-xl text-lg font-semibold mt-8 shadow-sm hover:shadow-md transition-shadow" />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
