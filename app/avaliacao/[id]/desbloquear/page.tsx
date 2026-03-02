import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/app/auth";
import { getAvaliacaoUseCases } from "@/app/use-cases";
import { getUnlockPasswordHash } from "@/src/infrastructure/unlockPassword";
import { desbloquearMedico } from "../../../actions";
import { ErrorToast } from "../../../components/ErrorToast";
import { SubmitButton } from "../../../components/SubmitButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export default async function DesbloquearPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id: consultaId }, { error }] = await Promise.all([params, searchParams]);
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

  const useSupabase = process.env.PERSISTENCE === "supabase";
  let senhaDefinida = true;
  if (useSupabase && supabase && user) {
    const stored = await getUnlockPasswordHash(supabase, user.id);
    senhaDefinida = stored != null;
  }

  const configUrl = `/configuracoes?next=${encodeURIComponent(`/avaliacao/${consultaId}/desbloquear`)}`;

  return (
    <div className="page-container flex min-h-[80vh] flex-col justify-center">
      <div className="content-width-medium flex flex-col gap-6">
        <ErrorToast error={error} />
        {useSupabase && !senhaDefinida ? (
          <Card className="border-border/80 shadow-[var(--shadow-card)]">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
                Senha não definida
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-2">
                Defina sua senha de desbloqueio em Configurações para poder desbloquear e gerar o resultado após o
                paciente finalizar.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button asChild className="h-12 rounded-xl text-base font-semibold" size="lg">
                <Link href={configUrl}>
                  <Settings className="mr-2 h-5 w-5" />
                  Ir para Configurações
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-xl text-base">
                <Link href={`/avaliacao/${consultaId}/bloqueado`}>Voltar</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/80 shadow-[var(--shadow-card)]">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
                Desbloqueio médico
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Digite a senha para acessar a geração de resultados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={desbloquearMedico} className="space-y-6">
                <input type="hidden" name="consultaId" value={consultaId} />
                <div className="space-y-2">
                  <Label htmlFor="senha" className="text-foreground">Senha</Label>
                  <Input
                    id="senha"
                    name="senha"
                    type="password"
                    required
                    autoComplete="off"
                    placeholder="••••••••"
                    className="h-12 text-center text-xl tracking-widest"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button asChild variant="outline" className="flex-1 h-12 rounded-xl text-base">
                    <Link href={`/avaliacao/${consultaId}/bloqueado`}>
                      Voltar
                    </Link>
                  </Button>
                  <SubmitButton label="Desbloquear" className="flex-1 h-12 rounded-xl text-base font-semibold" />
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
