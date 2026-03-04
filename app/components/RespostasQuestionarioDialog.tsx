"use client";

import { memo } from "react";
import type { Consulta } from "@/src/domain";
import {
  ITENS_CLINICOS,
  PILARES,
  ESCALA_CLINICA_LABELS,
  ESCALA_ESTRUTURAL_LABELS,
} from "@/src/application";
import { formatarDataExibicao } from "@/lib/formatacao";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Calendar, FileQuestion } from "lucide-react";

/** Placeholder quando o valor da resposta não está disponível */
const RESPOSTA_VAZIA = "—";

/** JSX estático: evita recriação a cada render (rendering-hoist-jsx, 6.3). */
const DIALOG_TOP_BAR = (
  <div
    className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 shrink-0"
    aria-hidden
  />
);

/** Estado vazio do modal: hoist para evitar recriação (6.3). */
const EMPTY_STATE_CONTENT = (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-14 px-6 text-center">
    <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
      <FileQuestion className="size-6" aria-hidden />
    </span>
    <p className="text-base font-medium text-foreground mb-1">
      Nenhuma resposta registrada
    </p>
    <p className="text-sm text-muted-foreground max-w-xs">
      Esta consulta ainda não possui respostas do questionário clínico ou dos pilares.
    </p>
  </div>
);

interface RespostaItemCardProps {
  pergunta: string;
  valorLabel: string;
}

const RespostaItemCard = memo(function RespostaItemCard({
  pergunta,
  valorLabel,
}: RespostaItemCardProps) {
  const isEmpty = valorLabel === RESPOSTA_VAZIA;
  return (
    <li className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-[var(--shadow-sm)] transition-colors hover:border-border hover:bg-muted/30">
      <p className="text-sm font-medium text-foreground leading-relaxed mb-3">
        {pergunta}
      </p>
      <span
        className={
          isEmpty
            ? "inline-flex items-center rounded-xl border border-dashed border-border/80 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground"
            : "inline-flex items-center rounded-xl border border-selection/40 bg-selection/15 px-3 py-1.5 text-sm font-medium text-foreground"
        }
      >
        {valorLabel}
      </span>
    </li>
  );
});

interface SecaoRespostasProps {
  id: string;
  heading: string;
  count: number;
  children: React.ReactNode;
}

function SecaoRespostas({ id, heading, count, children }: SecaoRespostasProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="rounded-2xl border border-border/80 bg-muted/20 overflow-hidden"
    >
      <div className="border-b border-border/60 bg-card/50 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id={`${id}-heading`}
            className="text-sm font-semibold uppercase tracking-wider text-foreground"
          >
            {heading}
          </h2>
          <Badge variant="secondary" className="text-xs font-medium">
            {count} {count === 1 ? "item" : "itens"}
          </Badge>
        </div>
      </div>
      <ul className="space-y-3 p-4 sm:p-5" role="list">
        {children}
      </ul>
    </section>
  );
}

interface RespostasQuestionarioDialogProps {
  consulta: Consulta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RespostasQuestionarioDialog({
  consulta,
  open,
  onOpenChange,
}: RespostasQuestionarioDialogProps) {
  const dataExibicao = formatarDataExibicao(consulta.date) || consulta.date.slice(0, 10);
  const clinico = consulta.clinico;
  const estrutura = consulta.estrutura;
  const temClinico = clinico != null;
  const temEstrutura = estrutura != null;
  const itens = clinico?.itens;
  const pilares = estrutura?.pilares;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl p-0 gap-0 overflow-hidden sm:rounded-2xl flex flex-col max-h-[90vh]"
        aria-describedby="respostas-questionario-desc"
      >
        {DIALOG_TOP_BAR}

        <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <DialogHeader className="space-y-3 pr-10 px-6 pt-5 pb-4 shrink-0 border-b border-border/60">
            <div className="flex flex-col gap-2">
              <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ClipboardList className="size-5" aria-hidden />
                </span>
                Respostas do questionário
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 pl-12">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <Calendar className="size-3.5" aria-hidden />
                  {dataExibicao}
                </span>
                <span className="text-xs text-muted-foreground">
                  Somente leitura
                </span>
              </div>
            </div>
            <DialogDescription
              id="respostas-questionario-desc"
              className="sr-only"
            >
              Consulta de {dataExibicao}. Respostas em somente leitura.
            </DialogDescription>
          </DialogHeader>

          <div
            className="overflow-y-auto px-6 py-5 space-y-6 flex-1 min-h-0 focus:outline-none"
            role="region"
            aria-label="Respostas do questionário"
            tabIndex={0}
          >
            {temClinico ? (
              <SecaoRespostas
                id="secao-clinico"
                heading="Avaliação clínica"
                count={ITENS_CLINICOS.length}
              >
                {ITENS_CLINICOS.map(({ id, label }) => {
                  const valor = itens?.[id];
                  const valorLabel =
                    valor !== undefined
                      ? ESCALA_CLINICA_LABELS[valor]
                      : RESPOSTA_VAZIA;
                  return (
                    <RespostaItemCard
                      key={id}
                      pergunta={label}
                      valorLabel={valorLabel}
                    />
                  );
                })}
              </SecaoRespostas>
            ) : null}

            {temEstrutura ? (
              <SecaoRespostas
                id="secao-pilares"
                heading="Pilares da Saúde Mental"
                count={PILARES.length}
              >
                {PILARES.map(({ id, pergunta }) => {
                  const valor = pilares?.[id];
                  const valorLabel =
                    valor !== undefined
                      ? ESCALA_ESTRUTURAL_LABELS[valor]
                      : RESPOSTA_VAZIA;
                  return (
                    <RespostaItemCard
                      key={id}
                      pergunta={pergunta}
                      valorLabel={valorLabel}
                    />
                  );
                })}
              </SecaoRespostas>
            ) : null}

            {!temClinico && !temEstrutura ? EMPTY_STATE_CONTENT : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
