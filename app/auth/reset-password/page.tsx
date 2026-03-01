import Link from "next/link";
import { redirect } from "next/navigation";
import { resetPasswordAction } from "../../auth-actions";
import { SubmitButton } from "../../components/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorToast } from "../../components/ErrorToast";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const params = await searchParams;
  if (params.code && typeof params.code === "string") {
    redirect(
      `/auth/callback?code=${encodeURIComponent(params.code)}&next=${encodeURIComponent("/auth/reset-password")}`
    );
  }
  const { error } = params;
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/80 shadow-[var(--shadow-card)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/70" aria-hidden />
        <CardHeader className="pb-2 pt-6">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Nova senha
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            Defina uma nova senha. Use o link que enviamos ao seu email.
          </p>
        </CardHeader>
        <CardContent className="pt-4 pb-8">
          <ErrorToast error={error} />
          <form action={resetPasswordAction} className="flex flex-col gap-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-foreground tracking-tight">
                Nova senha
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className="h-12 rounded-2xl border-2 focus-visible:ring-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground tracking-tight">
                Confirmar nova senha
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Repita a senha"
                className="h-12 rounded-2xl border-2 focus-visible:ring-2"
              />
            </div>
            <SubmitButton
              label="Alterar senha"
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
