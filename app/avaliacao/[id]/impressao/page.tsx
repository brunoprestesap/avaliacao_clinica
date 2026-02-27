import Link from "next/link";
import { redirect } from "next/navigation";
import { getConsultaRepository } from "@/src/infrastructure/container";
import { salvarImpressaoForm } from "../../../actions";
import { safeDecodeError } from "../../../lib/safeDecodeError";

export default async function ImpressaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: consultaId } = await params;
  const { error } = await searchParams;
  const repo = getConsultaRepository();
  const consulta = await repo.findById(consultaId);
  if (!consulta) {
    redirect("/avaliacao/nova");
  }
  if (!consulta.estrutura) {
    redirect(`/avaliacao/${consultaId}/estrutura`);
  }
  const valorInicial = consulta.impressao_clinica ?? "";

  return (
    <div className="page-container bg-[var(--background)]">
      <div className="content-width-medium flex flex-col gap-6">
        {error && (
          <div className="alert-error" role="alert">
            {safeDecodeError(error)}
          </div>
        )}
        <Link href={`/avaliacao/${consultaId}/estrutura`} className="link-back">
          <span aria-hidden>←</span> Voltar
        </Link>
        <div className="card">
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            4. Impressão clínica
          </h1>
          <p className="mb-6 text-[var(--muted)]">
            Campo de texto livre, obrigatório. Será armazenado junto ao registro da consulta.
          </p>
          <form action={salvarImpressaoForm} className="space-y-6">
            <input type="hidden" name="consultaId" value={consultaId} />
            <div>
              <label
                htmlFor="impressao_clinica"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                Impressão clínica
              </label>
              <textarea
                id="impressao_clinica"
                name="impressao_clinica"
                required
                rows={8}
                defaultValue={valorInicial}
                className="input-textarea"
                placeholder="Descreva a impressão clínica..."
              />
            </div>
            <button type="submit" className="btn-primary h-14 w-full rounded-xl text-lg">
              Ver resultado
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
