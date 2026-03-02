import Link from "next/link";
import { getSession } from "./auth";
import { getAvaliacaoUseCases } from "./use-cases";
import { iniciarAvaliacao } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  parsePageFromQuery,
  parseLimitFromQuery,
  parseSearchFromQuery,
} from "@/src/config/paginacao-pacientes";
import { SelectLimitePacientes } from "./SelectLimitePacientes";
import { NavegacaoPaginacao } from "./NavegacaoPaginacao";
import { PacienteListItem } from "./PacienteListItem";
import { FiltroPacientes } from "./FiltroPacientes";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string; q?: string }>;
}) {
  const { supabase, user } = await getSession({ redirectIfUnauthenticated: true });
  const uc = getAvaliacaoUseCases(
    process.env.PERSISTENCE === "supabase" ? supabase ?? undefined : undefined,
    user?.id
  );

  const params = await searchParams;
  const page = parsePageFromQuery(params.page);
  const limit = parseLimitFromQuery(params.limit);
  const query = parseSearchFromQuery(params.q);

  const { pacientes, total, page: currentPage, limit: currentLimit } = await uc.listarPacientes({
    page,
    limit,
    query: query || undefined,
  });

  const currentSearch = query;

  const totalPages = Math.max(1, Math.ceil(total / currentLimit));
  const from = total === 0 ? 0 : (currentPage - 1) * currentLimit + 1;
  const to = Math.min(currentPage * currentLimit, total);

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

        {(total > 0 || currentSearch) ? (
          <div className="flex flex-col gap-4">
            <FiltroPacientes initialSearch={currentSearch} currentLimit={currentLimit} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold px-1 text-foreground tracking-tight">
                  Histórico por paciente
                </h2>
                <span className="text-sm text-muted-foreground">
                  Mostrando {from}–{to} de {total}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="limit-pacientes" className="text-sm font-medium text-foreground">
                  Por página:
                </label>
                <SelectLimitePacientes
                  currentLimit={currentLimit}
                  currentSearch={currentSearch}
                />
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-1">
              {pacientes.map((p) => (
                <PacienteListItem
                  key={p.id}
                  paciente={p}
                  iniciarAvaliacao={iniciarAvaliacao}
                />
              ))}
            </ul>
            <NavegacaoPaginacao
              currentPage={currentPage}
              currentLimit={currentLimit}
              totalPages={totalPages}
              currentSearch={currentSearch}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
