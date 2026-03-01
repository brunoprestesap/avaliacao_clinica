import { redirect } from "next/navigation";
import { getConsultaRepository } from "@/src/infrastructure/container";

/** Impressão clínica passou para a tela de resultado. Redireciona conforme estado da consulta. */
export default async function ImpressaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: consultaId } = await params;
  const repo = getConsultaRepository();
  const consulta = await repo.findById(consultaId);
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
