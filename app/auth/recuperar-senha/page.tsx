import Link from "next/link";
import { requestResetAction } from "../../auth-actions";
import { SubmitButton } from "../../components/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorToast } from "../../components/ErrorToast";
import { safeDecodeError } from "../../lib/safeDecodeError";

export default async function RecuperarSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-[60vh] flex items-center justify-center pt-[max(1rem,var(--safe-top))] pr-[max(1rem,var(--safe-right))] pb-[max(1.5rem,var(--safe-bottom))] pl-[max(1rem,var(--safe-left))]">
      <Card className="w-full max-w-[33.6rem] sm:max-w-[38.4rem] border-border/80 shadow-[var(--shadow-card)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/70" aria-hidden />
        <CardHeader className="pb-2 pt-6">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Recuperar senha
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            Informe o email da sua conta para receber o link de redefinição.
          </p>
        </CardHeader>
        <CardContent className="pt-4 pb-8">
          {params.success ? (
            <p className="text-sm text-green-600 dark:text-green-400 mb-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              {safeDecodeError(params.success)}
            </p>
          ) : null}
          <ErrorToast error={params.error} />
          <form action={requestResetAction} className="flex flex-col gap-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-foreground tracking-tight">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="h-12 rounded-2xl border-2 focus-visible:ring-2"
              />
            </div>
            <SubmitButton
              label="Enviar link"
              className="h-14 w-full rounded-2xl text-lg font-semibold mt-4 shadow-lg hover:shadow-xl transition-all"
            />
          </form>
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
