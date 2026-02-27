import Link from "next/link";
import { redirect } from "next/navigation";
import { getConsultaRepository } from "@/src/infrastructure/container";
import { INSTRUCAO_CLINICA } from "@/src/domain/constants";
import { FormularioClinico } from "../../../components/FormularioEscala";
import { salvarClinicoForm } from "../../../actions";
import { safeDecodeError } from "../../../lib/safeDecodeError";

export default async function ClinicoPage({
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
  const valoresIniciais = consulta.clinico?.itens;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800" role="alert">
            {safeDecodeError(error)}
          </div>
        )}
        <Link
          href="/"
          className="mb-6 inline-block text-slate-600 underline hover:text-slate-800"
        >
          Voltar ao início
        </Link>
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-2xl font-semibold text-slate-800">
            2. Formulário – Avaliação clínica
          </h1>
          <p className="mb-4 text-slate-600">{INSTRUCAO_CLINICA}</p>
          <p className="mb-6 text-sm text-slate-500">
            Escala: 0 = Não aconteceu · 1 = Aconteceu poucos dias · 2 = Aconteceu mais da metade dos dias · 3 = Aconteceu quase todos os dias ou com intensidade importante
          </p>
          <form action={salvarClinicoForm} className="space-y-6">
            <input type="hidden" name="consultaId" value={consultaId} />
            <FormularioClinico valoresIniciais={valoresIniciais} />
            <button
              type="submit"
              className="h-14 w-full rounded-xl bg-slate-800 text-lg font-medium text-white transition-colors hover:bg-slate-700 active:bg-slate-900"
            >
              Continuar para Pilares Estruturais
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
