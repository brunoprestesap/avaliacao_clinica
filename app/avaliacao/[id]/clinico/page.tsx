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
    <div className="page-container bg-[var(--background)]">
      <div className="content-width-medium flex flex-col gap-6">
        {error && (
          <div className="alert-error" role="alert">
            {safeDecodeError(error)}
          </div>
        )}
        <Link href="/" className="link-back">
          <span aria-hidden>←</span> Voltar ao início
        </Link>
        <div className="card">
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            2. Formulário – Avaliação clínica
          </h1>
          <p className="mb-3 text-[var(--muted)] sm:text-base">{INSTRUCAO_CLINICA}</p>
          <p className="mb-6 text-sm text-[var(--muted)]">
            Escala: 0 = Não aconteceu · 1 = Aconteceu poucos dias · 2 = Aconteceu mais da metade
            dos dias · 3 = Aconteceu quase todos os dias ou com intensidade importante
          </p>
          <form action={salvarClinicoForm} className="space-y-6">
            <input type="hidden" name="consultaId" value={consultaId} />
            <FormularioClinico valoresIniciais={valoresIniciais} />
            <button type="submit" className="btn-primary h-14 w-full rounded-xl text-lg">
              Continuar para Pilares Estruturais
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
