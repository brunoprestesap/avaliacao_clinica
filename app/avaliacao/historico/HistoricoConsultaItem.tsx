import Link from "next/link";
import { excluirAvaliacao } from "@/app/actions";
import { Calendar, Activity, Trash2, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarDataExibicao } from "@/lib/formatacao";
import type { Consulta } from "@/src/domain";

const PDF_API_PATH = "/api/avaliacao";

interface HistoricoConsultaItemProps {
  consulta: Consulta;
  patientId: string;
  onExcluir: typeof excluirAvaliacao;
}

export function HistoricoConsultaItem({
  consulta,
  patientId,
  onExcluir,
}: HistoricoConsultaItemProps) {
  const dataExibicao = formatarDataExibicao(consulta.date);
  const pdfHref = `${PDF_API_PATH}/${consulta.id}/pdf`;
  const isFinalizada = Boolean(consulta.impressao_clinica?.trim());

  return (
    <li className="flex flex-col sm:flex-row sm:items-stretch gap-3 sm:gap-4">
      <Link
        href={`/avaliacao/${consulta.id}/resultado`}
        className="group flex-1 block rounded-2xl border border-border/80 bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-md)] active:scale-[0.99]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold text-foreground group-hover:text-primary transition-colors block text-lg">
                {dataExibicao || consulta.date.slice(0, 10)}
              </span>
            </div>
          </div>
          {consulta.clinico && (
            <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0">
              <Badge
                variant="outline"
                className="px-3 py-1 flex items-center gap-1.5 bg-background text-sm font-medium border-border/80"
              >
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                Clínico: {consulta.clinico.score_total}
              </Badge>
              {consulta.estrutura != null && (
                <Badge
                  variant="outline"
                  className="px-3 py-1 flex items-center gap-1.5 bg-background text-sm font-medium border-border/80"
                >
                  Estrutural: {consulta.estrutura.media.toFixed(2)}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
        {isFinalizada && (
          <a
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 min-h-11 rounded-xl border border-border/80 bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
            title="Gerar PDF desta avaliação"
            aria-label="Gerar PDF desta avaliação"
          >
            <FileDown className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Gerar PDF</span>
          </a>
        )}
        {!consulta.clinico && (
          <form action={onExcluir} className="flex sm:items-center">
            <input type="hidden" name="consultaId" value={consulta.id} />
            <input type="hidden" name="patientId" value={patientId} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive h-full sm:h-auto min-h-11 rounded-xl"
              aria-label="Excluir avaliação"
            >
              <Trash2 className="h-4 w-4 sm:mr-1.5" aria-hidden />
              <span className="hidden sm:inline">Excluir</span>
            </Button>
          </form>
        )}
      </div>
    </li>
  );
}
