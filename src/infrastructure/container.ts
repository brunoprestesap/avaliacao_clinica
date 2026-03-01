import type { AvaliacaoUseCases, ConsultaRepository, PacienteRepository } from "@/src/application/ports";
import { ConsultaRepositoryJson } from "./repositories/ConsultaRepositoryJson";
import { PacienteRepositoryJson } from "./repositories/PacienteRepositoryJson";
import { ConsultaRepositorySupabase } from "./repositories/ConsultaRepositorySupabase";
import { PacienteRepositorySupabase } from "./repositories/PacienteRepositorySupabase";
import { createIdentificarPaciente } from "@/src/application/use-cases/IdentificarPaciente";
import { createIniciarNovaConsulta } from "@/src/application/use-cases/IniciarNovaConsulta";
import { createSalvarFormularioClinico } from "@/src/application/use-cases/SalvarFormularioClinico";
import { createSalvarPilaresEstruturais } from "@/src/application/use-cases/SalvarPilaresEstruturais";
import { createSalvarImpressaoClinica } from "@/src/application/use-cases/SalvarImpressaoClinica";
import { createCalcularResultadoCompleto } from "@/src/application/use-cases/CalcularResultadoCompleto";
import { createListarHistoricoPaciente } from "@/src/application/use-cases/ListarHistoricoPaciente";
import { createObterConsulta } from "@/src/application/use-cases/ObterConsulta";
import { createObterResultadoParaExibicao } from "@/src/application/use-cases/ObterResultadoParaExibicao";

const useSupabase = process.env.PERSISTENCE === "supabase";

let consultaRepo: ConsultaRepository | null = null;
let pacienteRepo: PacienteRepository | null = null;

function getConsultaRepository(): ConsultaRepository {
  if (!consultaRepo) {
    consultaRepo = useSupabase ? new ConsultaRepositorySupabase() : new ConsultaRepositoryJson();
  }
  return consultaRepo;
}

function getPacienteRepository(): PacienteRepository {
  if (!pacienteRepo) {
    pacienteRepo = useSupabase ? new PacienteRepositorySupabase() : new PacienteRepositoryJson();
  }
  return pacienteRepo;
}

export function createAvaliacaoUseCases(): AvaliacaoUseCases {
  const consultaRepo = getConsultaRepository();
  const pacienteRepo = getPacienteRepository();
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
    listarPacientes: () => pacienteRepo.listarTodos(),
    obterPaciente: (id) => pacienteRepo.findById(id),
  };
}
