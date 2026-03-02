import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";
import { getSession } from "../auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { user } = await getSession();
  if (user) {
    redirect("/");
  }
  const { error, success } = await searchParams;
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
          <LoginForm error={error} success={success} />
        </CardContent>
      </Card>
    </div>
  );
}
