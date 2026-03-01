"use server";

/**
 * Server Actions são expostas como endpoints públicos (como API routes).
 * Ao adicionar autenticação, validar sessão dentro de cada action — não depender
 * só de middleware ou guards na página. Ver: Next.js Auth, Vercel React Best Practices 3.1.
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  getIdentificarPaciente,
  getIniciarNovaConsulta,
  getSalvarFormularioClinico,
  getSalvarPilaresEstruturais,
  getSalvarImpressaoClinica,
  getCalcularResultadoCompleto,
  getConsultaRepository,
} from "@/src/infrastructure/container";
import type { ItensClinicos, ValorEscalaClinica, PilaresEstruturais, ValorEscalaEstrutural } from "@/src/domain";
import { ITENS_CLINICOS } from "@/src/domain/constants";
import { PILARES } from "@/src/domain/constants";

const COOKIE_MEDICO = "medico_consulta_id";

function pathAvaliacao(consultaId: string, segment = "") {
  const base = `/avaliacao/${consultaId}`;
  return segment ? `${base}/${segment}` : base;
}

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
    redirect(pathAvaliacao(consultaId, "clinico"));
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
    redirect(pathAvaliacao(consultaId, "estrutura"));
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Erro ao salvar.";
    redirect(`${pathAvaliacao(consultaId, "clinico")}?error=${encodeURIComponent(msg)}`);
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
    redirect(pathAvaliacao(consultaId, "bloqueado"));
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Erro ao salvar.";
    redirect(`${pathAvaliacao(consultaId, "estrutura")}?error=${encodeURIComponent(msg)}`);
  }
}

export async function desbloquearMedico(formData: FormData) {
  const consultaId = formData.get("consultaId");
  const senha = (formData.get("senha") as string)?.trim() ?? "";
  if (!isConsultaIdValido(consultaId)) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não identificada."));
  }
  const senhaEsperada = process.env.SENHA_MEDICO ?? "";
  if (!senhaEsperada || senha !== senhaEsperada) {
    redirect(`${pathAvaliacao(consultaId, "desbloquear")}?error=` + encodeURIComponent("Senha incorreta."));
  }
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_MEDICO, consultaId, {
    path: pathAvaliacao(consultaId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 15, // 15 min
  });
  redirect(pathAvaliacao(consultaId, "gerar"));
}

export async function gerarResultados(formData: FormData) {
  const consultaId = formData.get("consultaId");
  if (!isConsultaIdValido(consultaId)) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não identificada."));
  }
  const cookieStore = await cookies();
  const valor = cookieStore.get(COOKIE_MEDICO)?.value;
  if (valor !== consultaId) {
    redirect(pathAvaliacao(consultaId, "bloqueado"));
  }
  try {
    const calcular = getCalcularResultadoCompleto();
    const resultado = await calcular(consultaId);
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
  const consultaId = formData.get("consultaId");
  const impressaoClinica = (formData.get("impressao_clinica") as string)?.trim() ?? "";
  if (!isConsultaIdValido(consultaId)) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não identificada."));
  }
  if (!impressaoClinica) {
    redirect(`${pathAvaliacao(consultaId, "resultado")}?error=` + encodeURIComponent("Impressão clínica é obrigatória."));
  }
  try {
    const repo = getConsultaRepository();
    const consulta = await repo.findById(consultaId);
    if (!consulta) {
      redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não encontrada."));
    }
    const salvar = getSalvarImpressaoClinica();
    await salvar(consultaId, impressaoClinica);
    redirect(consulta.patient_id ? `/avaliacao/historico/${consulta.patient_id}` : "/");
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Erro ao salvar.";
    redirect(`${pathAvaliacao(consultaId, "resultado")}?error=${encodeURIComponent(msg)}`);
  }
}

/** Legado: impressão clínica passou para a tela de resultado; mantido para compatibilidade. */
export async function salvarImpressaoForm(formData: FormData) {
  const consultaId = formData.get("consultaId");
  const impressaoClinica = (formData.get("impressao_clinica") as string)?.trim() ?? "";
  if (!isConsultaIdValido(consultaId)) {
    redirect("/avaliacao/nova?error=" + encodeURIComponent("Consulta não identificada."));
  }
  try {
    const salvar = getSalvarImpressaoClinica();
    await salvar(consultaId, impressaoClinica);
    redirect(pathAvaliacao(consultaId, "resultado"));
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "Erro ao salvar.";
    redirect(`${pathAvaliacao(consultaId, "impressao")}?error=${encodeURIComponent(msg)}`);
  }
}
