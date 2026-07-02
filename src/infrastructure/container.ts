import type { AvaliacaoUseCases, ConsultaRepository, PacienteRepository } from "@/src/application/ports";
import {
  PAGINACAO_PACIENTES_DEFAULT_LIMIT,
  normalizarLimite,
  parseSearchFromQuery,
} from "@/src/config/paginacao-pacientes";
import { ConsultaRepositoryJson } from "./repositories/ConsultaRepositoryJson";
import { PacienteRepositoryJson } from "./repositories/PacienteRepositoryJson";
import { ConsultaRepositoryMongo } from "./repositories/ConsultaRepositoryMongo";
import { PacienteRepositoryMongo } from "./repositories/PacienteRepositoryMongo";
import { createIdentificarPaciente } from "@/src/application/use-cases/IdentificarPaciente";
import { createIniciarNovaConsulta } from "@/src/application/use-cases/IniciarNovaConsulta";
import { createSalvarFormularioClinico } from "@/src/application/use-cases/SalvarFormularioClinico";
import { createSalvarPilaresEstruturais } from "@/src/application/use-cases/SalvarPilaresEstruturais";
import { createSalvarImpressaoClinica } from "@/src/application/use-cases/SalvarImpressaoClinica";
import { createCalcularResultadoCompleto } from "@/src/application/use-cases/CalcularResultadoCompleto";
import { createListarHistoricoPaciente } from "@/src/application/use-cases/ListarHistoricoPaciente";
import { createObterConsulta } from "@/src/application/use-cases/ObterConsulta";
import { createObterResultadoParaExibicao } from "@/src/application/use-cases/ObterResultadoParaExibicao";
import { createExcluirAvaliacao } from "@/src/application/use-cases/ExcluirAvaliacao";
import { createAtualizarPaciente } from "@/src/application/use-cases/AtualizarPaciente";

const useMongo = process.env.PERSISTENCE === "mongo";

let consultaRepoFallback: ConsultaRepository | null = null;
let pacienteRepoFallback: PacienteRepository | null = null;

/** Isolamento entre usuários: repositórios Mongo recebem userId e filtram por user_id. */
function getConsultaRepository(userId?: string): ConsultaRepository {
  if (useMongo) return new ConsultaRepositoryMongo(userId);
  if (!consultaRepoFallback) consultaRepoFallback = new ConsultaRepositoryJson();
  return consultaRepoFallback;
}

function getPacienteRepository(userId?: string): PacienteRepository {
  if (useMongo) return new PacienteRepositoryMongo(userId);
  if (!pacienteRepoFallback) pacienteRepoFallback = new PacienteRepositoryJson();
  return pacienteRepoFallback;
}

export function createAvaliacaoUseCases(userId?: string): AvaliacaoUseCases {
  const consultaRepo = getConsultaRepository(userId);
  const pacienteRepo = getPacienteRepository(userId);
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
    excluirAvaliacao: createExcluirAvaliacao(consultaRepo),
    atualizarPaciente: createAtualizarPaciente(pacienteRepo),
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
