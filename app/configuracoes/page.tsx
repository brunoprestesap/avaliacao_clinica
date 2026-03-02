import Link from "next/link";
import { getAuthenticatedUseCases } from "@/app/use-cases";
import { getUnlockPasswordHash } from "@/src/infrastructure/unlockPassword";
import { definirSenhaDesbloqueio } from "../actions";
import { ErrorToast } from "@/app/components/ErrorToast";
import { SubmitButton } from "@/app/components/SubmitButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Lock } from "lucide-react";

const MIN_SENHA = 4;

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; next?: string }>;
}) {
  const params = await searchParams;
  const { user, supabaseClient } = await getAuthenticatedUseCases();

  let senhaDefinida = false;
  if (process.env.PERSISTENCE === "supabase") {
    const stored = await getUnlockPasswordHash(supabaseClient, user.id);
    senhaDefinida = stored != null;
  }

  return (
    <div className="page-container flex min-h-[60vh] flex-col items-center pt-8 pb-12">
      <div className="content-width-medium w-full max-w-[28rem] flex flex-col gap-6">
        <div className="flex items-center gap-3 text-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Configurações</h1>
        </div>

        {params.success ? (
          <p className="text-sm text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            {params.success}
          </p>
        ) : null}
        <ErrorToast error={params.error} />

        <Card className="border-border/80 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Senha de desbloqueio
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground mt-1">
              Usada na tela &quot;Sou o médico&quot; após o paciente finalizar o preenchimento. Só você pode
              desbloquear para gerar o resultado.
            </CardDescription>
            {process.env.PERSISTENCE === "supabase" && (
              <p className="text-sm text-muted-foreground mt-2">
                Status: {senhaDefinida ? "Definida" : "Não definida"}
              </p>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            <form action={definirSenhaDesbloqueio} className="space-y-5">
              {params.next ? (
                <input type="hidden" name="next" value={params.next} />
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="senha" className="text-foreground">
                  Nova senha
                </Label>
                <Input
                  id="senha"
                  name="senha"
                  type="password"
                  minLength={MIN_SENHA}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmacao" className="text-foreground">
                  Confirmar senha
                </Label>
                <Input
                  id="confirmacao"
                  name="confirmacao"
                  type="password"
                  minLength={MIN_SENHA}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="h-12 rounded-xl"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo de {MIN_SENHA} caracteres.
              </p>
              <SubmitButton label="Salvar senha" className="w-full h-12 rounded-xl text-base font-semibold" />
            </form>
          </CardContent>
        </Card>

        <Button asChild variant="outline" className="w-full h-12 rounded-xl">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
