import Link from "next/link";
import { redirect } from "next/navigation";
import { getConsultaRepository } from "@/src/infrastructure/container";
import { INSTRUCAO_PILARES } from "@/src/domain/constants";
import { FormularioPilares } from "../../../components/FormularioEscala";
import { salvarEstruturaForm } from "../../../actions";
import { safeDecodeError } from "../../../lib/safeDecodeError";

export default async function EstruturaPage({
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
  if (!consulta.clinico) {
    redirect(`/avaliacao/${consultaId}/clinico`);
  }
  const valoresIniciais = consulta.estrutura?.pilares;

  return (
    <div className="page-container bg-[var(--background)]">
      <div className="content-width-medium flex flex-col gap-6">
        {error && (
          <div className="alert-error" role="alert">
            {safeDecodeError(error)}
          </div>
        )}
        <Link href={`/avaliacao/${consultaId}/clinico`} className="link-back">
          <span aria-hidden>←</span> Voltar
        </Link>
        <div className="card">
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            3. Pilares da saúde mental
          </h1>
          <p className="mb-3 text-[var(--muted)] sm:text-base">{INSTRUCAO_PILARES}</p>
          <p className="mb-6 text-sm text-[var(--muted)]">
            Escala: 0 = Muito ruim / totalmente desorganizado · 1 = Ruim · 2 = Regular · 3 = Bom ·
            4 = Muito bom / bem estruturado
          </p>
          <form action={salvarEstruturaForm} className="space-y-6">
            <input type="hidden" name="consultaId" value={consultaId} />
            <FormularioPilares valoresIniciais={valoresIniciais} />
            <button type="submit" className="btn-primary h-14 w-full rounded-xl text-lg">
              Continuar para Impressão clínica
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
