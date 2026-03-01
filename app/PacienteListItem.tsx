import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import type { Paciente } from "@/src/domain";

interface PacienteListItemProps {
  paciente: Paciente;
  iniciarAvaliacao: (formData: FormData) => Promise<void>;
}

const HISTORICO_BASE = "/avaliacao/historico";

export function PacienteListItem({ paciente, iniciarAvaliacao }: PacienteListItemProps) {
  const { id, nome, identificador } = paciente;
  return (
    <li className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-md)] hover:bg-card/80 active:scale-[0.99] sm:p-5">
      <Link href={`${HISTORICO_BASE}/${id}`} className="flex-1 flex flex-col gap-0.5">
        <span className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
          {nome}
        </span>
        <span className="text-sm text-muted-foreground font-medium">
          Prontuário: {identificador}
        </span>
      </Link>
      <div className="flex items-center gap-3 ml-4">
        <form action={iniciarAvaliacao}>
          <input type="hidden" name="nome" value={nome} />
          <input type="hidden" name="identificador" value={identificador} />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="min-h-10 rounded-xl font-medium shadow-sm hover:shadow transition-all sm:min-h-8"
          >
            Nova Avaliação
          </Button>
        </form>
        <Link href={`${HISTORICO_BASE}/${id}`} tabIndex={-1} aria-hidden="true">
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>
    </li>
  );
}
