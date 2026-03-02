import Link from "next/link";
import { loginAction } from "../auth-actions";
import { SubmitButton } from "../components/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorToast } from "../components/ErrorToast";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="min-h-[60vh] flex items-center justify-center pt-[max(1rem,var(--safe-top))] pr-[max(1rem,var(--safe-right))] pb-[max(1.5rem,var(--safe-bottom))] pl-[max(1rem,var(--safe-left))]">
      <Card className="w-full max-w-[33.6rem] sm:max-w-[38.4rem] border-border/80 shadow-[var(--shadow-card)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/70" aria-hidden />
        <CardHeader className="pb-2 pt-6">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Entrar
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            Use seu email e senha para acessar o sistema.
          </p>
        </CardHeader>
        <CardContent className="pt-4 pb-8">
          <ErrorToast error={error} />
          <form action={loginAction} className="flex flex-col gap-6">
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
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-foreground tracking-tight">
                Senha
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-12 rounded-2xl border-2 focus-visible:ring-2"
              />
            </div>
            <SubmitButton
              label="Entrar"
              className="h-14 w-full rounded-2xl text-lg font-semibold mt-4 shadow-lg hover:shadow-xl transition-all"
            />
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Não tem conta?{" "}
            <Link href="/auth/cadastro" className="text-primary font-medium underline underline-offset-2">
              Cadastre-se
            </Link>
          </p>
          <p className="text-center text-sm text-muted-foreground mt-2">
            <Link href="/auth/recuperar-senha" className="text-primary font-medium underline underline-offset-2">
              Esqueci minha senha
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
