"use client";

import { iniciarAvaliacao } from "../../actions";
import { SubmitButton } from "../../components/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormNovaAvaliacao() {
  return (
    <form action={iniciarAvaliacao} className="flex flex-col gap-6">
      <div className="space-y-2">
        <Label htmlFor="nome" className="text-sm font-semibold text-foreground tracking-tight">
          Nome
        </Label>
        <Input
          id="nome"
          name="nome"
          type="text"
          required
          autoComplete="name"
          placeholder="Ex.: João da Silva"
          className="h-12 rounded-2xl border-2 focus-visible:ring-2"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="identificador" className="text-sm font-semibold text-foreground tracking-tight">
          Nº Prontuário
        </Label>
        <Input
          id="identificador"
          name="identificador"
          type="text"
          required
          placeholder="Ex.: 123456"
          className="h-12 rounded-2xl border-2 focus-visible:ring-2"
        />
      </div>
      <SubmitButton
        label="Iniciar"
        className="h-14 w-full rounded-2xl text-lg font-semibold mt-4 shadow-lg hover:shadow-xl transition-all"
      />
    </form>
  );
}
