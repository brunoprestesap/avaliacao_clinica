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
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800" role="alert">
            {safeDecodeError(error)}
          </div>
        )}
        <Link
          href={`/avaliacao/${consultaId}/estrutura`}
          className="mb-6 inline-block text-slate-600 underline hover:text-slate-800"
        >
          Voltar
        </Link>
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-2xl font-semibold text-slate-800">
            4. Impressão clínica
          </h1>
          <p className="mb-6 text-slate-600">
            Campo de texto livre, obrigatório. Será armazenado junto ao registro da consulta.
          </p>
          <form action={salvarImpressaoForm} className="space-y-6">
            <input type="hidden" name="consultaId" value={consultaId} />
            <div>
              <label htmlFor="impressao_clinica" className="mb-2 block text-sm font-medium text-slate-700">
                Impressão clínica
              </label>
              <textarea
                id="impressao_clinica"
                name="impressao_clinica"
                required
                rows={8}
                defaultValue={valorInicial}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Descreva a impressão clínica..."
              />
            </div>
            <button
              type="submit"
              className="h-14 w-full rounded-xl bg-slate-800 text-lg font-medium text-white transition-colors hover:bg-slate-700 active:bg-slate-900"
            >
              Ver resultado
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
