import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvaliacaoUseCases, ConsultaRepository, PacienteRepository } from "@/src/application/ports";
import type { Database } from "./supabase/database.types";
import {
  PAGINACAO_PACIENTES_DEFAULT_LIMIT,
  normalizarLimite,
  parseSearchFromQuery,
} from "@/src/config/paginacao-pacientes";
import { ConsultaRepositoryJson } from "./repositories/ConsultaRepositoryJson";
import { PacienteRepositoryJson } from "./repositories/PacienteRepositoryJson";
import { ConsultaRepositorySupabase } from "./repositories/ConsultaRepositorySupabase";
import { PacienteRepositorySupabase } from "./repositories/PacienteRepositorySupabase";
import { getSupabase } from "./supabase/server";
import { createIdentificarPaciente } from "@/src/application/use-cases/IdentificarPaciente";
import { createIniciarNovaConsulta } from "@/src/application/use-cases/IniciarNovaConsulta";
import { createSalvarFormularioClinico } from "@/src/application/use-cases/SalvarFormularioClinico";
import { createSalvarPilaresEstruturais } from "@/src/application/use-cases/SalvarPilaresEstruturais";
import { createSalvarImpressaoClinica } from "@/src/application/use-cases/SalvarImpressaoClinica";
import { createCalcularResultadoCompleto } from "@/src/application/use-cases/CalcularResultadoCompleto";
import { createListarHistoricoPaciente } from "@/src/application/use-cases/ListarHistoricoPaciente";
import { createObterConsulta } from "@/src/application/use-cases/ObterConsulta";
import { createObterResultadoParaExibicao } from "@/src/application/use-cases/ObterResultadoParaExibicao";
import { createExcluirAvaliacaoEmBranco } from "@/src/application/use-cases/ExcluirAvaliacaoEmBranco";

const useSupabase = process.env.PERSISTENCE === "supabase";

let consultaRepoFallback: ConsultaRepository | null = null;
let pacienteRepoFallback: PacienteRepository | null = null;

function getConsultaRepository(
  supabase?: SupabaseClient<Database>,
  userId?: string
): ConsultaRepository {
  if (supabase) return new ConsultaRepositorySupabase(supabase, userId);
  if (!consultaRepoFallback) {
    consultaRepoFallback = useSupabase
      ? new ConsultaRepositorySupabase(getSupabase())
      : new ConsultaRepositoryJson();
  }
  return consultaRepoFallback;
}

function getPacienteRepository(
  supabase?: SupabaseClient<Database>,
  userId?: string
): PacienteRepository {
  if (supabase) return new PacienteRepositorySupabase(supabase, userId);
  if (!pacienteRepoFallback) {
    pacienteRepoFallback = useSupabase
      ? new PacienteRepositorySupabase(getSupabase())
      : new PacienteRepositoryJson();
  }
  return pacienteRepoFallback;
}

export function createAvaliacaoUseCases(
  supabase?: SupabaseClient<Database>,
  userId?: string
): AvaliacaoUseCases {
  const consultaRepo = getConsultaRepository(supabase, userId);
  const pacienteRepo = getPacienteRepository(supabase, userId);
  return {
    identificarPaciente: createIdentificarPaciente(pacienteRepo),
    iniciarNovaConsulta: createIniciarNovaConsulta(consultaRepo),
    salvarFormularioClinico: createSalvarFormularioClinico(consultaRepo),
    salvarPilaresEstruturais: createSalvarPilaresEstruturais(consultaRepo),
    salvarImpressaoClinica: createSalvarImpressaoClinica(consultaRepo),
    calcularResultadoCompleto: createCalcularResultadoCompleto(consultaRepo),
    listarHistoricoPaciente: createListarHistoricoPaciente(consultaRepo),
    obterConsulta: createObterConsulta(consultaRepo),
    obterResultadoParaExibicao: createObterResultadoParaExibicao(consultaRepo),
    excluirAvaliacaoEmBranco: createExcluirAvaliacaoEmBranco(consultaRepo),
    listarPacientes: async (opts) => {
      const rawPage = opts?.page ?? 1;
      const page =
        Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(Number(rawPage)) : 1;
      const limit = normalizarLimite(opts?.limit ?? PAGINACAO_PACIENTES_DEFAULT_LIMIT);
      const offset = (page - 1) * limit;
      const query = opts?.query != null ? parseSearchFromQuery(opts.query) : "";
      const { pacientes, total } = await pacienteRepo.listarPaginado(offset, limit, query || undefined);
      return { pacientes, total, page, limit };
    },
    obterPaciente: (id) => pacienteRepo.findById(id),
  };
}
