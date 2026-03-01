import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const HOME_PATH = "/";

interface NavegacaoPaginacaoProps {
  currentPage: number;
  currentLimit: number;
  totalPages: number;
  basePath?: string;
  currentSearch?: string;
}

function buildPageUrl(
  page: number,
  limit: number,
  basePath: string,
  currentSearch?: string
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (currentSearch?.trim()) params.set("q", currentSearch.trim());
  return `${basePath}?${params.toString()}`;
}

export function NavegacaoPaginacao({
  currentPage,
  currentLimit,
  totalPages,
  basePath = HOME_PATH,
  currentSearch,
}: NavegacaoPaginacaoProps) {
  if (totalPages <= 1) return null;

  const prevHref = buildPageUrl(currentPage - 1, currentLimit, basePath, currentSearch);
  const nextHref = buildPageUrl(currentPage + 1, currentLimit, basePath, currentSearch);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-2 pt-2"
      aria-label="Navegação de páginas"
    >
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl"
        disabled={!hasPrev}
        asChild={hasPrev}
      >
        {hasPrev ? (
          <Link href={prevHref} className="inline-flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </span>
        )}
      </Button>
      <span className="text-sm text-muted-foreground px-2">
        Página {currentPage} de {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl"
        disabled={!hasNext}
        asChild={hasNext}
      >
        {hasNext ? (
          <Link href={nextHref} className="inline-flex items-center gap-1">
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1">
            Próxima
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </Button>
    </nav>
  );
}
