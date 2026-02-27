import Link from "next/link";
import { redirect } from "next/navigation";
import { getListarHistoricoPaciente, getPacienteRepository } from "@/src/infrastructure/container";

export default async function HistoricoPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const repoPaciente = getPacienteRepository();
  const paciente = await repoPaciente.findById(patientId);
  if (!paciente) {
    redirect("/");
  }
  const listarHistorico = getListarHistoricoPaciente();
  const consultas = await listarHistorico(patientId);
  const consultasRecentesPrimeiro = [...consultas].reverse();

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-6 inline-block text-slate-600 underline hover:text-slate-800">
          Voltar ao início
        </Link>
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="mb-2 text-2xl font-semibold text-slate-800">Histórico do paciente</h1>
          <p className="mb-6 text-slate-600">
            {paciente.nome} – {paciente.identificador}
          </p>
          <p className="mb-4 text-sm text-slate-500">
            Consultas em ordem cronológica (mais recente primeiro). Não é permitida exclusão.
          </p>
          <ul className="space-y-3">
            {consultasRecentesPrimeiro.length === 0 ? (
              <li className="text-slate-500">Nenhuma consulta registrada.</li>
            ) : (
              consultasRecentesPrimeiro.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/avaliacao/${c.id}/resultado`}
                    className="block rounded-lg border border-slate-200 bg-slate-50/50 p-4 transition-colors hover:bg-slate-100"
                  >
                    <span className="font-medium text-slate-800">{c.date}</span>
                    {c.clinico && (
                      <span className="ml-2 text-slate-600">
                        – Score clínico: {c.clinico.score_total}
                        {c.estrutura != null && ` | Média estrutural: ${c.estrutura.media.toFixed(2)}`}
                      </span>
                    )}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
