import { redirect } from "next/navigation";
import { getAuthenticatedUseCases } from "@/app/use-cases";

/** Impressão clínica passou para a tela de resultado. Redireciona conforme estado da consulta. */
export default async function ImpressaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: consultaId } = await params;
  const { uc } = await getAuthenticatedUseCases();
  const consulta = await uc.obterConsulta(consultaId);
  if (!consulta) {
    redirect("/avaliacao/nova");
  }
  if (!consulta.estrutura) {
    redirect(`/avaliacao/${consultaId}/estrutura`);
  }
  if (consulta.impressao_clinica || consulta.fase_indicada) {
    redirect(`/avaliacao/${consultaId}/resultado`);
  }
  redirect(`/avaliacao/${consultaId}/bloqueado`);
}
