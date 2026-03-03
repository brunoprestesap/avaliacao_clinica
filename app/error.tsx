"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Error boundary global — captura erros de Server Components em qualquer rota */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error boundary]", error);
  }, [error]);

  return (
    <div className="page-container">
      <div className="content-width-narrow">
        <Card className="border-destructive/40 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-lg font-semibold text-destructive">Algo deu errado</p>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Tente novamente ou volte ao início.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>
                Tentar novamente
              </Button>
              <Button variant="ghost" asChild>
                <a href="/">Ir ao início</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
