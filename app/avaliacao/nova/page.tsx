import Link from "next/link";
import { FormNovaAvaliacao } from "./FormNovaAvaliacao";
import { Stepper } from "../../components/Stepper";
import { ErrorToast } from "../../components/ErrorToast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default async function NovaAvaliacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorQuery } = await searchParams;
  return (
    <div className="page-container">
      <div className="content-width-medium flex flex-col gap-6">
        <Link href="/" className="link-back inline-flex items-center w-fit mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Link>
        <Stepper currentStep="identificacao" />
        <ErrorToast error={errorQuery} />
        <Card className="border-border/80 shadow-[var(--shadow-card)] mt-2 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/70" aria-hidden />
          <CardHeader className="pb-2 pt-6">
            <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              1. Identificação
            </CardTitle>
            <p className="text-muted-foreground text-sm mt-1">
              Informe os dados do paciente para iniciar a avaliação.
            </p>
          </CardHeader>
          <CardContent className="pt-4 pb-8">
            <FormNovaAvaliacao />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
