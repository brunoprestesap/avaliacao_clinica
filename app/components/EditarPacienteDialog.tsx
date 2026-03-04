"use client";

import { useState, useTransition } from "react";
import type { Paciente } from "@/src/domain";
import { atualizarPaciente } from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, UserRoundPen } from "lucide-react";

/** JSX estático: evita recriação a cada render (rendering-hoist-jsx). */
const DIALOG_TOP_BAR = (
  <div
    className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 shrink-0"
    aria-hidden
  />
);

/** Conteúdo do botão em estado de loading: hoist para não recriar a cada render. */
const SUBMIT_LOADING_CONTENT = (
  <>
    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
    Salvando...
  </>
);

interface EditarPacienteDialogProps {
  paciente: Paciente;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditarPacienteDialog({
  paciente,
  open,
  onOpenChange,
  onSuccess,
}: EditarPacienteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("patientId", paciente.id);

    startTransition(async () => {
      const result = await atualizarPaciente(formData);
      if (result.ok) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md p-0 gap-0 overflow-hidden sm:rounded-2xl"
        aria-describedby="editar-paciente-desc"
      >
        {DIALOG_TOP_BAR}

        <div className="flex flex-col gap-5 px-6 pt-5 pb-6">
          <DialogHeader className="space-y-1.5 pr-8">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserRoundPen className="size-4" aria-hidden />
              </span>
              Editar cadastro
            </DialogTitle>
            <DialogDescription
              id="editar-paciente-desc"
              className="text-muted-foreground text-sm leading-relaxed"
            >
              Atualize o nome ou o prontuário. O número de prontuário deve ser
              único entre os pacientes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <input type="hidden" name="patientId" value={paciente.id} />

            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="editar-paciente-nome"
                  className="text-sm font-semibold text-foreground tracking-tight"
                >
                  Nome
                </Label>
                <Input
                  id="editar-paciente-nome"
                  name="nome"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Ex.: João da Silva"
                  defaultValue={paciente.nome}
                  className="h-12 rounded-2xl border-2 focus-visible:ring-2 transition-shadow duration-150"
                  disabled={isPending}
                  aria-invalid={!!error}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="editar-paciente-identificador"
                  className="text-sm font-semibold text-foreground tracking-tight"
                >
                  Nº Prontuário
                </Label>
                <Input
                  id="editar-paciente-identificador"
                  name="identificador"
                  type="text"
                  required
                  placeholder="Ex.: 123456"
                  defaultValue={paciente.identificador}
                  className="h-12 rounded-2xl border-2 focus-visible:ring-2 transition-shadow duration-150"
                  disabled={isPending}
                  aria-invalid={!!error}
                />
                <p className="text-muted-foreground text-xs">
                  Deve ser único entre os pacientes.
                </p>
              </div>
            </div>

            {error !== null ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-in fade-in-0 duration-200"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden />
                <p>{error}</p>
              </div>
            ) : null}

            <DialogFooter className="flex-row gap-2 sm:gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="min-h-11 rounded-2xl font-medium"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="min-h-11 rounded-2xl font-medium shadow-md"
              >
                {isPending ? SUBMIT_LOADING_CONTENT : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
