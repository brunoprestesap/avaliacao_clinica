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
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800" role="alert">
            {safeDecodeError(error)}
          </div>
        )}
        <Link
          href={`/avaliacao/${consultaId}/clinico`}
          className="mb-6 inline-block text-slate-600 underline hover:text-slate-800"
        >
          Voltar
        </Link>
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-2xl font-semibold text-slate-800">
            3. Pilares da saúde mental
          </h1>
          <p className="mb-4 text-slate-600">{INSTRUCAO_PILARES}</p>
          <p className="mb-6 text-sm text-slate-500">
            Escala: 0 = Muito ruim / totalmente desorganizado · 1 = Ruim · 2 = Regular · 3 = Bom · 4 = Muito bom / bem estruturado
          </p>
          <form action={salvarEstruturaForm} className="space-y-6">
            <input type="hidden" name="consultaId" value={consultaId} />
            <FormularioPilares valoresIniciais={valoresIniciais} />
            <button
              type="submit"
              className="h-14 w-full rounded-xl bg-slate-800 text-lg font-medium text-white transition-colors hover:bg-slate-700 active:bg-slate-900"
            >
              Continuar para Impressão clínica
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
