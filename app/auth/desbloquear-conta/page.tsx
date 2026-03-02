import Link from "next/link";
import { unlockAccountAction } from "../../auth-actions";
import { SubmitButton } from "../../components/SubmitButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorToast } from "../../components/ErrorToast";

export default async function DesbloquearContaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; id?: string; token?: string }>;
}) {
  const params = await searchParams;
  const { error, id, token } = params;
  const hasValidLink = id && token;

  return (
    <div className="min-h-[60vh] flex items-center justify-center pt-[max(1rem,var(--safe-top))] pr-[max(1rem,var(--safe-right))] pb-[max(1.5rem,var(--safe-bottom))] pl-[max(1rem,var(--safe-left))]">
      <Card className="w-full max-w-[33.6rem] sm:max-w-[38.4rem] border-border/80 shadow-[var(--shadow-card)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/70" aria-hidden />
        <CardHeader className="pb-2 pt-6">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Desbloquear conta
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            {hasValidLink
              ? "Sua conta foi bloqueada após várias tentativas de login. Clique abaixo para desbloquear e voltar a acessar."
              : "Link inválido ou expirado. Tente fazer login e use o link que enviamos ao seu email."}
          </p>
        </CardHeader>
        <CardContent className="pt-4 pb-8">
          <ErrorToast error={error} />
          {hasValidLink ? (
            <form action={unlockAccountAction} className="flex flex-col gap-6">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="token" value={token} />
              <SubmitButton
                label="Desbloquear minha conta"
                className="h-14 w-full rounded-2xl text-lg font-semibold mt-4 shadow-lg hover:shadow-xl transition-all"
              />
            </form>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-6 text-lg font-semibold text-primary-foreground shadow-lg hover:shadow-xl transition-all"
            >
              Ir para o login
            </Link>
          )}
          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link href="/login" className="text-primary font-medium underline underline-offset-2">
              Voltar ao login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
