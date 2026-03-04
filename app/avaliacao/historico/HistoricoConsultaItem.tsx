"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Calendar, Activity, LayoutGrid, Trash2, FileDown, ClipboardList, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RespostasQuestionarioDialog } from "@/app/components/RespostasQuestionarioDialog";
import { excluirAvaliacao } from "@/app/actions";
import { formatarDataExibicao } from "@/lib/formatacao";
import type { Consulta } from "@/src/domain";

const PDF_API_PATH = "/api/avaliacao";
const FORM_ID_PREFIX_EXCLUIR = "form-excluir";

/** Botão de submit do form de exclusão; usa useFormStatus para estado pending (Vercel best practice 6.9). */
function ExcluirSubmitButton({ onClose }: { onClose: () => void }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={pending}
      onClick={() => onClose()}
      className="w-full sm:w-auto"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" aria-hidden />
          <span className="hidden sm:inline">Excluindo...</span>
        </>
      ) : (
        "Excluir avaliação"
      )}
    </Button>
  );
}

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
  const [respostasOpen, setRespostasOpen] = useState(false);
  const [excluirDialogOpen, setExcluirDialogOpen] = useState(false);
  const dataExibicao = formatarDataExibicao(consulta.date);
  const temClinico = consulta.clinico != null;
  const temEstrutura = consulta.estrutura != null;
  const temDadosClinicos = temClinico || Boolean(consulta.impressao_clinica?.trim());
  const isFinalizada = Boolean(consulta.impressao_clinica?.trim());
  const pdfHref = `${PDF_API_PATH}/${consulta.id}/pdf`;

  return (
    <li className="rounded-2xl border border-border/80 bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-md)] [content-visibility:auto] [contain-intrinsic-size:0_6rem]">
      {/* Grid garante coluna fixa para os botões: evita métricas atrás de "Ver respostas" (tablet/desktop) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:gap-6 sm:items-center">
        <Link
          href={`/avaliacao/${consulta.id}/resultado`}
          className="group flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-6 overflow-hidden"
        >
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" aria-hidden />
            </div>
            <span className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
              {dataExibicao || consulta.date.slice(0, 10)}
            </span>
          </div>

          {/* Área de métricas: mesma estrutura; wrap em telas estreitas para não colidir com botões */}
          <div className="flex flex-nowrap items-center gap-4 sm:gap-6 min-w-0">
            {temClinico ? (
              <>
                <div className="flex flex-nowrap items-baseline gap-2 shrink-0">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider shrink-0 min-w-[4.5rem]">
                    Clínico
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {consulta.clinico?.score_total ?? 0}
                  </span>
                  <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                </div>
                <div className="flex flex-nowrap items-baseline gap-2 shrink-0">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider shrink-0 min-w-[4.5rem]">
                    Estrutural
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {temEstrutura && consulta.estrutura != null
                      ? consulta.estrutura.media.toFixed(2)
                      : "—"}
                  </span>
                  <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                </div>
              </>
            ) : (
              <span className="text-muted-foreground text-sm">Aguardando preenchimento</span>
            )}
          </div>
        </Link>

        {/* Ações em coluna própria: nunca sobrepostas ao conteúdo (Galaxy Tab S6 e demais) */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-4 sm:border-t-0 sm:pt-0 sm:justify-start">
          {temClinico ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 min-h-10 rounded-xl border-border/80"
              onClick={() => setRespostasOpen(true)}
              aria-label="Ver respostas do questionário desta consulta"
            >
              <ClipboardList className="h-4 w-4 sm:mr-1.5" aria-hidden />
              <span className="hidden sm:inline">Ver respostas</span>
            </Button>
          ) : null}
          {isFinalizada ? (
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 min-h-10 rounded-xl border border-border/80 bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
              title="Gerar PDF desta avaliação"
              aria-label="Gerar PDF desta avaliação"
            >
              <FileDown className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Gerar PDF</span>
            </a>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive min-h-10 rounded-xl"
            aria-label="Excluir avaliação"
            onClick={() => setExcluirDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 sm:mr-1.5" aria-hidden />
            <span className="hidden sm:inline">Excluir</span>
          </Button>
        </div>
      </div>
      {temClinico ? (
        <RespostasQuestionarioDialog
          consulta={consulta}
          open={respostasOpen}
          onOpenChange={setRespostasOpen}
        />
      ) : null}
      <Dialog open={excluirDialogOpen} onOpenChange={setExcluirDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {/* DialogTitle e DialogDescription como primeiros filhos para o Radix reconhecer acessibilidade */}
          <DialogHeader className="flex flex-row gap-3 sm:gap-4 text-left">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
              aria-hidden
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <DialogTitle className="text-base sm:text-lg">
                Excluir avaliação?
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {temDadosClinicos
                  ? "Esta avaliação contém dados clínicos. Ela será removida de forma permanente e não poderá ser recuperada."
                  : "Esta avaliação será removida permanentemente. Não será possível desfazer."}
              </DialogDescription>
            </div>
          </DialogHeader>
          <form action={onExcluir} id={`${FORM_ID_PREFIX_EXCLUIR}-${consulta.id}`}>
            <input type="hidden" name="consultaId" value={consulta.id} />
            <input type="hidden" name="patientId" value={patientId} />
            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExcluirDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <ExcluirSubmitButton onClose={() => setExcluirDialogOpen(false)} />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </li>
  );
}
