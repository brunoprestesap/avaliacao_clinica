"use server";

import { redirect } from "next/navigation";
import {
  getIdentificarPaciente,
  getIniciarNovaConsulta,
  getSalvarFormularioClinico,
  getSalvarPilaresEstruturais,
  getSalvarImpressaoClinica,
} from "@/src/infrastructure/container";
import type { ItensClinicos, ValorEscalaClinica, PilaresEstruturais, ValorEscalaEstrutural } from "@/src/domain";
import { ITENS_CLINICOS } from "@/src/domain/constants";
import { PILARES } from "@/src/domain/constants";

/** Valida id de consulta (UUID ou string alfanumérica com hífens) para evitar path traversal. */
function isConsultaIdValido(id: unknown): id is string {
  if (typeof id !== "string" || !id.length) return false;
  return /^[a-zA-Z0-9-]{1,64}$/.test(id);
}

/** Verifica se o erro é o redirect do Next.js (que deve ser re-lançado, não tratado). */
function isRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest?: string }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function iniciarAvaliacao(formData: FormData) {
  const nome = (formData.get("nome") as string)?.trim() ?? "";
  const identificador = (formData.get("identificador") as string)?.trim() ?? "";
  if (!nome || !identificador) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Nome e identificador são obrigatórios."));
  }
  try {
    const identificarPaciente = getIdentificarPaciente();
    const { paciente } = await identificarPaciente({ nome, identificador });
    const iniciarNovaConsulta = getIniciarNovaConsulta();
    const consultaId = await iniciarNovaConsulta(paciente.id);
    redirect(`/avaliacao/${consultaId}/clinico`);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Erro ao iniciar avaliação.";
    redirect("/avaliacao/nova?error=" + encodeURIComponent(msg));
  }
}

function parseItensFromFormData(formData: FormData): ItensClinicos {
  const itens = {} as ItensClinicos;
  for (const { id } of ITENS_CLINICOS) {
    const v = Number(formData.get(id));
    itens[id] = (v >= 0 && v <= 3 ? v : 0) as ValorEscalaClinica;
  }
  return itens;
}

function parsePilaresFromFormData(formData: FormData): PilaresEstruturais {
  const pilares = {} as PilaresEstruturais;
  for (const { id } of PILARES) {
    const v = Number(formData.get(id));
    pilares[id] = (v >= 0 && v <= 4 ? v : 0) as ValorEscalaEstrutural;
  }
  return pilares;
}

export async function salvarClinicoForm(formData: FormData) {
  const consultaId = formData.get("consultaId");
  if (!isConsultaIdValido(consultaId)) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não identificada."));
  }
  const itens = parseItensFromFormData(formData);
  try {
    const salvar = getSalvarFormularioClinico();
    await salvar(consultaId, itens);
    redirect(`/avaliacao/${consultaId}/estrutura`);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Erro ao salvar.";
    redirect(`/avaliacao/${consultaId}/clinico?error=${encodeURIComponent(msg)}`);
  }
}

export async function salvarEstruturaForm(formData: FormData) {
  const consultaId = formData.get("consultaId");
  if (!isConsultaIdValido(consultaId)) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não identificada."));
  }
  const pilares = parsePilaresFromFormData(formData);
  try {
    const salvar = getSalvarPilaresEstruturais();
    await salvar(consultaId, pilares);
    redirect(`/avaliacao/${consultaId}/impressao`);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Erro ao salvar.";
    redirect(`/avaliacao/${consultaId}/estrutura?error=${encodeURIComponent(msg)}`);
  }
}

export async function salvarImpressaoForm(formData: FormData) {
  const consultaId = formData.get("consultaId");
  const impressaoClinica = (formData.get("impressao_clinica") as string)?.trim() ?? "";
  if (!isConsultaIdValido(consultaId)) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não identificada."));
  }
  try {
    const salvar = getSalvarImpressaoClinica();
    await salvar(consultaId, impressaoClinica);
    redirect(`/avaliacao/${consultaId}/resultado`);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Erro ao salvar.";
    redirect(`/avaliacao/${consultaId}/impressao?error=${encodeURIComponent(msg)}`);
  }
}
