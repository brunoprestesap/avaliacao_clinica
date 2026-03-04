"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Pencil } from "lucide-react";
import type { Paciente } from "@/src/domain";
import { EditarPacienteDialog } from "@/app/components/EditarPacienteDialog";

interface PacienteListItemProps {
  paciente: Paciente;
  iniciarAvaliacao: (formData: FormData) => Promise<void>;
}

const HISTORICO_BASE = "/avaliacao/historico";

export function PacienteListItem({ paciente, iniciarAvaliacao }: PacienteListItemProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const { id, nome, identificador } = paciente;

  return (
    <>
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
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="min-h-11 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => setEditOpen(true)}
            aria-label="Editar cadastro do paciente"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <form action={iniciarAvaliacao}>
            <input type="hidden" name="nome" value={nome} />
            <input type="hidden" name="identificador" value={identificador} />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="min-h-11 rounded-xl font-medium shadow-sm hover:shadow transition-all"
            >
              Nova Avaliação
            </Button>
          </form>
          <Link href={`${HISTORICO_BASE}/${id}`} tabIndex={-1} aria-hidden="true">
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </li>
      <EditarPacienteDialog
        paciente={paciente}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
