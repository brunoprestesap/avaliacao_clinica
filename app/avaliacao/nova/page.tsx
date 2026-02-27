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
    <div className="page-container bg-[var(--background)]">
      <div className="content-width-medium flex flex-col gap-6">
        <Link href="/" className="link-back">
          <span aria-hidden>←</span> Voltar
        </Link>
        <div className="card">
          <h1 className="mb-6 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            1. Identificação do paciente
          </h1>
          {errorQuery && (
            <div className="alert-error mb-6" role="alert">
              {safeDecodeError(errorQuery)}
            </div>
          )}
          <FormNovaAvaliacao />
        </div>
      </div>
    </div>
  );
}
