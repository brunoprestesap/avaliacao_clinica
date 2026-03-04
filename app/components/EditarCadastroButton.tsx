"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Paciente } from "@/src/domain";
import { Button } from "@/components/ui/button";
import { EditarPacienteDialog } from "@/app/components/EditarPacienteDialog";
import { Pencil } from "lucide-react";

interface EditarCadastroButtonProps {
  paciente: Paciente;
  className?: string;
}

export function EditarCadastroButton({ paciente, className }: EditarCadastroButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Pencil className="mr-2 h-4 w-4" />
        Editar cadastro
      </Button>
      <EditarPacienteDialog
        paciente={paciente}
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
