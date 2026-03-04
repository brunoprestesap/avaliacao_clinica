"use server";

/**
 * Server Actions são expostas como endpoints públicos (como API routes).
 * Ao adicionar autenticação, validar sessão dentro de cada action — não depender
 * só de middleware ou guards na página. Ver: Next.js Auth, Vercel React Best Practices 3.1.
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { getAuthenticatedUseCases } from "./use-cases";
import {
  getUnlockPasswordHash,
  setUnlockPassword,
  verifyUnlockPassword,
} from "@/src/infrastructure/unlockPassword";
import type { ItensClinicos, PilaresEstruturais } from "@/src/application";
import type { ValorEscalaClinica, ValorEscalaEstrutural } from "@/src/domain";
import { ITENS_CLINICOS, PILARES } from "@/src/application";

const COOKIE_MEDICO = "medico_unlock_token";
const UNLOCK_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Gera um token HMAC-assinado que prova que o desbloqueio foi feito server-side.
 * Formato interno: consultaId:timestamp|hmac (base64url-encoded).
 * O cookie armazena apenas o token opaco — nunca o consultaId diretamente.
 */
function criarUnlockToken(consultaId: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "";
  const payload = `${consultaId}:${Date.now()}`;
  const hmac = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}|${hmac}`).toString("base64url");
}

/**
 * Verifica se o token é válido para o consultaId dado.
 * Retorna false se assinatura inválida, expirado ou pertencer a outra consulta.
 */
function verificarUnlockToken(token: string, consultaId: string): boolean {
  try {
    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "";
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastPipe = decoded.lastIndexOf("|");
    if (lastPipe === -1) return false;
    const payload = decoded.slice(0, lastPipe);
    const hmacRecebido = decoded.slice(lastPipe + 1);
    const hmacEsperado = createHmac("sha256", secret).update(payload).digest("hex");
    // Comparação em tempo constante para evitar timing attacks
    if (!timingSafeEqual(Buffer.from(hmacRecebido, "hex"), Buffer.from(hmacEsperado, "hex"))) {
      return false;
    }
    const colonIndex = payload.lastIndexOf(":");
    if (colonIndex === -1) return false;
    const tokenConsultaId = payload.slice(0, colonIndex);
    const timestamp = Number(payload.slice(colonIndex + 1));
    if (tokenConsultaId !== consultaId) return false;
    if (Date.now() - timestamp > UNLOCK_TOKEN_MAX_AGE_MS) return false;
    return true;
  } catch {
    return false;
  }
}

function pathAvaliacao(consultaId: string, segment = "") {
  const base = `/avaliacao/${consultaId}`;
  return segment ? `${base}/${segment}` : base;
}

const ID_SEGURO_REGEX = /^[a-zA-Z0-9-]{1,64}$/;

/** Valida id (consulta, paciente, etc.) para evitar path traversal. */
function isIdSeguro(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && ID_SEGURO_REGEX.test(id);
}

function isConsultaIdValido(id: unknown): id is string {
  return isIdSeguro(id);
}

function isPatientIdValido(id: unknown): id is string {
  return isIdSeguro(id);
}

/** Extrai e normaliza string de FormData (trim; vazio vira ""). */
function getFormDataString(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
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
  const { uc, user } = await getAuthenticatedUseCases();

  const nome = getFormDataString(formData, "nome");
  const identificador = getFormDataString(formData, "identificador");
  if (!nome || !identificador) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Nome e identificador são obrigatórios."));
  }
  try {
    const { paciente } = await uc.identificarPaciente({
      nome,
      identificador,
      userId: process.env.PERSISTENCE === "supabase" ? user.id : undefined,
    });
    const consultaId = await uc.iniciarNovaConsulta(paciente.id);
    redirect(pathAvaliacao(consultaId, "clinico"));
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Erro ao iniciar avaliação.";
    redirect("/avaliacao/nova?error=" + encodeURIComponent(msg));
  }
}

export type AtualizarPacienteResult =
  | { ok: true }
  | { ok: false; error: string };

export async function atualizarPaciente(
  formData: FormData
): Promise<AtualizarPacienteResult> {
  const patientId = formData.get("patientId");
  if (!isPatientIdValido(patientId)) {
    return { ok: false, error: "Paciente não identificado." };
  }
  const nome = getFormDataString(formData, "nome");
  const identificador = getFormDataString(formData, "identificador");
  if (!nome || !identificador) {
    return { ok: false, error: "Nome e identificador são obrigatórios." };
  }
  try {
    const { uc } = await getAuthenticatedUseCases();
    await uc.atualizarPaciente(patientId, { nome, identificador });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erro ao atualizar.",
    };
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
  const { uc } = await getAuthenticatedUseCases();

  const consultaId = formData.get("consultaId");
  if (!isConsultaIdValido(consultaId)) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não identificada."));
  }
  const itens = parseItensFromFormData(formData);
  try {
    await uc.salvarFormularioClinico(consultaId, itens);
    redirect(pathAvaliacao(consultaId, "estrutura"));
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Erro ao salvar.";
    redirect(`${pathAvaliacao(consultaId, "clinico")}?error=${encodeURIComponent(msg)}`);
  }
}

export async function salvarEstruturaForm(formData: FormData) {
  const { uc } = await getAuthenticatedUseCases();

  const consultaId = formData.get("consultaId");
  if (!isConsultaIdValido(consultaId)) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não identificada."));
  }
  const pilares = parsePilaresFromFormData(formData);
  try {
    await uc.salvarPilaresEstruturais(consultaId, pilares);
    redirect(pathAvaliacao(consultaId, "bloqueado"));
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Erro ao salvar.";
    redirect(`${pathAvaliacao(consultaId, "estrutura")}?error=${encodeURIComponent(msg)}`);
  }
}

const MIN_SENHA_DESBLOQUEIO = 4;

/** Desbloqueio da tela de gerar resultado: valida a senha da equipe de saúde (profiles), não o desbloqueio de conta (auth). */
export async function desbloquearEquipeSaude(formData: FormData) {
  const consultaId = formData.get("consultaId");
  const senha = (formData.get("senha") as string)?.trim() ?? "";
  if (!isConsultaIdValido(consultaId)) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não identificada."));
  }

  const useSupabase = process.env.PERSISTENCE === "supabase";
  if (useSupabase) {
    const { uc, user, supabaseClient } = await getAuthenticatedUseCases();
    const consulta = await uc.obterConsulta(consultaId);
    if (!consulta) {
      redirect("/avaliacao/nova");
    }
    if (!consulta.estrutura) {
      redirect(pathAvaliacao(consultaId, "bloqueado"));
    }
    const stored = await getUnlockPasswordHash(supabaseClient, user.id);
    if (!stored) {
      const nextUrl = encodeURIComponent(pathAvaliacao(consultaId, "desbloquear"));
      redirect(`/configuracoes?error=${encodeURIComponent("Defina sua senha de desbloqueio primeiro.")}&next=${nextUrl}`);
    }
    if (!verifyUnlockPassword(senha, stored.hash, stored.salt)) {
      redirect(`${pathAvaliacao(consultaId, "desbloquear")}?error=` + encodeURIComponent("Senha incorreta."));
    }
    const token = criarUnlockToken(consultaId);
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_MEDICO, token, {
      path: pathAvaliacao(consultaId),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 15, // 15 min
    });
    redirect(pathAvaliacao(consultaId, "gerar"));
  }

  // Fallback: modo JSON ou sem Supabase — senha global
  const senhaEsperada = process.env.SENHA_MEDICO ?? "";
  if (!senhaEsperada || senha !== senhaEsperada) {
    redirect(`${pathAvaliacao(consultaId, "desbloquear")}?error=` + encodeURIComponent("Senha incorreta."));
  }
  const token = criarUnlockToken(consultaId);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_MEDICO, token, {
    path: pathAvaliacao(consultaId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 15, // 15 min
  });
  redirect(pathAvaliacao(consultaId, "gerar"));
}

/** Define a senha de desbloqueio da equipe de saúde (tela gerar resultado), em Configurações. */
export async function definirSenhaDesbloqueio(formData: FormData) {
  const senha = (formData.get("senha") as string)?.trim() ?? "";
  const confirmacao = (formData.get("confirmacao") as string)?.trim() ?? "";
  const nextUrl = (formData.get("next") as string)?.trim() ?? "";
  if (!senha || !confirmacao) {
    redirect("/configuracoes?error=" + encodeURIComponent("Preencha a senha e a confirmação."));
  }
  if (senha.length < MIN_SENHA_DESBLOQUEIO) {
    redirect(
      "/configuracoes?error=" +
        encodeURIComponent(`Senha deve ter no mínimo ${MIN_SENHA_DESBLOQUEIO} caracteres.`)
    );
  }
  if (senha !== confirmacao) {
    redirect("/configuracoes?error=" + encodeURIComponent("As senhas não coincidem."));
  }
  const { supabaseClient, user } = await getAuthenticatedUseCases();
  if (process.env.PERSISTENCE !== "supabase") {
    redirect("/configuracoes?error=" + encodeURIComponent("Configuração disponível apenas com Supabase."));
  }
  try {
    await setUnlockPassword(supabaseClient, user.id, senha);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Erro ao salvar senha.";
    redirect("/configuracoes?error=" + encodeURIComponent(msg));
  }
  if (nextUrl && nextUrl.startsWith("/")) {
    redirect(nextUrl);
  }
  redirect("/configuracoes?success=" + encodeURIComponent("Senha de desbloqueio definida."));
}

export async function gerarResultados(formData: FormData) {
  const { uc } = await getAuthenticatedUseCases();

  const consultaId = formData.get("consultaId");
  if (!isConsultaIdValido(consultaId)) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não identificada."));
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_MEDICO)?.value;
  if (!token || !verificarUnlockToken(token, consultaId)) {
    redirect(pathAvaliacao(consultaId, "bloqueado"));
  }
  try {
    const resultado = await uc.calcularResultadoCompleto(consultaId);
    if (!resultado) {
      redirect(pathAvaliacao(consultaId, "bloqueado"));
    }
    redirect(pathAvaliacao(consultaId, "resultado"));
  } catch (e) {
    if (isRedirectError(e)) throw e;
    if (process.env.NODE_ENV === "development") {
      console.error("[gerarResultados]", e instanceof Error ? e.message : e, e);
    }
    redirect(`${pathAvaliacao(consultaId, "gerar")}?error=` + encodeURIComponent("Erro ao gerar resultados."));
  }
}

export async function salvarImpressaoEFinalizar(formData: FormData) {
  const { uc } = await getAuthenticatedUseCases();

  const consultaId = formData.get("consultaId");
  const impressaoClinica = (formData.get("impressao_clinica") as string)?.trim() ?? "";
  if (!isConsultaIdValido(consultaId)) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não identificada."));
  }
  if (!impressaoClinica) {
    redirect(`${pathAvaliacao(consultaId, "resultado")}?error=` + encodeURIComponent("Impressão clínica é obrigatória."));
  }
  try {
    const consulta = await uc.obterConsulta(consultaId);
    if (!consulta) {
      redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não encontrada."));
    }
    await uc.salvarImpressaoClinica(consultaId, impressaoClinica);
    redirect(consulta.patient_id ? `/avaliacao/historico/${consulta.patient_id}` : "/");
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Erro ao salvar.";
    redirect(`${pathAvaliacao(consultaId, "resultado")}?error=${encodeURIComponent(msg)}`);
  }
}

export async function excluirAvaliacao(formData: FormData) {
  const { uc } = await getAuthenticatedUseCases();

  const consultaId = formData.get("consultaId");
  const patientId = (formData.get("patientId") as string)?.trim() ?? "";
  if (!isConsultaIdValido(consultaId)) {
    redirect(patientId ? `/avaliacao/historico/${patientId}?error=` + encodeURIComponent("Consulta não identificada.") : "/");
  }
  try {
    const returnedPatientId = await uc.excluirAvaliacaoEmBranco(consultaId);
    redirect(`/avaliacao/historico/${returnedPatientId}`);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Não foi possível excluir.";
    redirect(`/avaliacao/historico/${patientId}?error=${encodeURIComponent(msg)}`);
  }
}

/** Legado: impressão clínica passou para a tela de resultado; mantido para compatibilidade. */
export async function salvarImpressaoForm(formData: FormData) {
  const { uc } = await getAuthenticatedUseCases();

  const consultaId = formData.get("consultaId");
  const impressaoClinica = (formData.get("impressao_clinica") as string)?.trim() ?? "";
  if (!isConsultaIdValido(consultaId)) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não identificada."));
  }
  try {
    await uc.salvarImpressaoClinica(consultaId, impressaoClinica);
    redirect(pathAvaliacao(consultaId, "resultado"));
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Erro ao salvar.";
    redirect(`${pathAvaliacao(consultaId, "impressao")}?error=${encodeURIComponent(msg)}`);
  }
}
