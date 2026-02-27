import Link from "next/link";
import { FormNovaAvaliacao } from "./FormNovaAvaliacao";
import { safeDecodeError } from "../../lib/safeDecodeError";

export default async function NovaAvaliacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorQuery } = await searchParams;
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-lg">
        <Link
          href="/"
          className="mb-6 inline-block text-slate-600 underline hover:text-slate-800"
        >
          Voltar
        </Link>
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-2xl font-semibold text-slate-800">
            1. Identificação do paciente
          </h1>
          {errorQuery && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800" role="alert">
              {safeDecodeError(errorQuery)}
            </div>
          )}
          <FormNovaAvaliacao />
        </div>
      </div>
    </div>
  );
}
