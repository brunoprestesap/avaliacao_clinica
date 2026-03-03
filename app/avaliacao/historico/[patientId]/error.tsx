"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Error boundary da página de histórico do paciente */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Histórico Error]", error);
  }, [error]);

  return (
    <div className="page-container">
      <div className="content-width-medium">
        <Card className="border-destructive/40 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-lg font-semibold text-destructive">
              Erro ao carregar histórico
            </p>
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar o histórico do paciente. Tente novamente.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>
                Tentar novamente
              </Button>
              <Button variant="ghost" asChild>
                <a href="/">Voltar ao início</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
