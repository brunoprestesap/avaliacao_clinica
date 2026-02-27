import type { ConsultaRepository, PacienteRepository } from "@/src/application/ports";
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

export function getIdentificarPaciente() {
  return createIdentificarPaciente(getPacienteRepository());
}
export function getIniciarNovaConsulta() {
  return createIniciarNovaConsulta(getConsultaRepository());
}
export function getSalvarFormularioClinico() {
  return createSalvarFormularioClinico(getConsultaRepository());
}
export function getSalvarPilaresEstruturais() {
  return createSalvarPilaresEstruturais(getConsultaRepository());
}
export function getSalvarImpressaoClinica() {
  return createSalvarImpressaoClinica(getConsultaRepository());
}
export function getCalcularResultadoCompleto() {
  return createCalcularResultadoCompleto(getConsultaRepository());
}
export function getListarHistoricoPaciente() {
  return createListarHistoricoPaciente(getConsultaRepository());
}

export { getConsultaRepository, getPacienteRepository };
