import Link from "next/link";
import { getAvaliacaoUseCases } from "./use-cases";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

export default async function Home() {
  const uc = getAvaliacaoUseCases();
  const pacientes = await uc.listarPacientes();

  return (
    <div className="page-container">
      <main className="content-width-narrow flex flex-col gap-8 sm:gap-10">
        <Card className="border border-border/80 bg-card/95 shadow-[var(--shadow-card)] backdrop-blur-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary/80 to-primary/40" aria-hidden />
          <CardHeader className="text-center pb-2 pt-8">
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Avaliação Clínica Estrutural
            </CardTitle>
            <CardDescription className="text-base sm:text-lg text-muted-foreground mt-1.5">
              Sistema interno – uso durante consulta médica.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-8">
            <Button
              asChild
              className="h-14 w-full rounded-xl text-lg font-semibold shadow-md hover:shadow-lg transition-shadow"
              size="lg"
            >
              <Link href="/avaliacao/nova">Nova avaliação</Link>
            </Button>
          </CardContent>
        </Card>

        {pacientes.length > 0 ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold px-1 text-foreground tracking-tight">
              Histórico por paciente
            </h2>
            <ul className="grid gap-3 sm:grid-cols-1">
              {pacientes.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/avaliacao/historico/${p.id}`}
                    className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-md)] hover:bg-card/80 active:scale-[0.99] sm:p-5"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                        {p.nome}
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">
                        Prontuário: {p.identificador}
                      </span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </main>
    </div>
  );
}
