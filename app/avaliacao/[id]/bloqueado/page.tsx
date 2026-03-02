import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/app/auth";
import { getAvaliacaoUseCases } from "@/app/use-cases";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default async function BloqueadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: consultaId } = await params;
  const { supabase, user } = await getSession({ redirectIfUnauthenticated: true });
  const uc = getAvaliacaoUseCases(
    process.env.PERSISTENCE === "supabase" ? supabase ?? undefined : undefined,
    user?.id
  );
  const consulta = await uc.obterConsulta(consultaId);
  if (!consulta) {
    redirect("/avaliacao/nova");
  }
  if (!consulta.estrutura) {
    redirect(`/avaliacao/${consultaId}/estrutura`);
  }

  return (
    <div className="page-container flex min-h-[80vh] flex-col items-center justify-center">
      <div className="content-width-medium flex flex-col items-center text-center max-w-[28.8rem]">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-8 shadow-[var(--shadow-card)] border border-primary/20">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Entregue o tablet ao médico
        </h1>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          O preenchimento pelo paciente foi concluído. O médico deve desbloquear a tela para continuar a avaliação.
        </p>
        <Button asChild variant="outline" className="mt-10 h-12 w-full rounded-xl text-base font-medium max-w-[24rem]">
          <Link href={`/avaliacao/${consultaId}/desbloquear`}>
            Sou o médico
          </Link>
        </Button>
      </div>
    </div>
  );
}
