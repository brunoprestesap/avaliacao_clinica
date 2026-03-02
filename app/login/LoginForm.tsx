"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorToast } from "../components/ErrorToast";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { safeDecodeError } from "../lib/safeDecodeError";

export function LoginForm({
  error: initialError,
  success: initialSuccess,
}: { error?: string; success?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorFromUrl = searchParams.get("error");
  const successFromUrl = searchParams.get("success");
  const [pending, setPending] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const success = initialSuccess ?? (successFromUrl ? decodeURIComponent(successFromUrl) : undefined);
  const error =
    clientError ??
    initialError ??
    (errorFromUrl ? decodeURIComponent(errorFromUrl) : undefined);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClientError(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value?.trim() ?? "";
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value ?? "";
    if (!email || !password) {
      setClientError("Email e senha são obrigatórios.");
      return;
    }
    setPending(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.ok) {
        router.push("/");
        router.refresh();
        return;
      }
      if (result?.error) {
        setClientError(result.error);
        return;
      }
      setClientError("Credenciais inválidas. Tente novamente.");
    } catch {
      setClientError("Erro ao entrar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  function handleGoogleSignIn() {
    setClientError(null);
    signIn("google", { callbackUrl: "/" });
  }

  useEffect(() => {
    if (success) toast.success(safeDecodeError(success));
  }, [success]);

  return (
    <>
      <ErrorToast error={error} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
        <Button
          type="submit"
          disabled={pending}
          className="h-14 w-full rounded-2xl text-lg font-semibold mt-4 shadow-lg hover:shadow-xl transition-all"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
        <div className="relative my-2">
          <span className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </span>
          <span className="relative flex justify-center text-xs uppercase text-muted-foreground">
            ou
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-14 w-full rounded-2xl text-lg font-semibold border-2"
          onClick={handleGoogleSignIn}
          disabled={pending}
        >
          Entrar com Google
        </Button>
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
    </>
  );
}
