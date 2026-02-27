import Link from "next/link";
import { getPacienteRepository } from "@/src/infrastructure/container";

export default async function Home() {
  const repo = getPacienteRepository();
  const pacientes = await repo.listarTodos();

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <main className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="mb-2 text-2xl font-semibold text-slate-800">
            Avaliação Clínica Estrutural
          </h1>
          <p className="mb-8 text-slate-600">
            Sistema interno – uso durante consulta médica.
          </p>
          <Link
            href="/avaliacao/nova"
            className="flex h-14 w-full items-center justify-center rounded-xl bg-slate-800 text-lg font-medium text-white transition-colors hover:bg-slate-700 active:bg-slate-900"
          >
            Nova avaliação
          </Link>
        </div>
        {pacientes.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white p-8 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Histórico por paciente
            </h2>
            <ul className="space-y-3">
              {pacientes.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/avaliacao/historico/${p.id}`}
                    className="block rounded-lg border border-slate-200 bg-slate-50/50 p-4 transition-colors hover:bg-slate-100"
                  >
                    <span className="font-medium text-slate-800">{p.nome}</span>
                    <span className="ml-2 text-slate-600">– {p.identificador}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
