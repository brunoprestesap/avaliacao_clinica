import React, { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { getSessionContext } from "@/app/auth";
import { getAvaliacaoUseCases } from "@/app/use-cases";
import { AvaliacaoPDFDocument } from "@/app/components/pdf/AvaliacaoPDFDocument";
import {
  formatarDataParaNomeArquivo,
  nomeArquivoSeguro,
} from "@/lib/formatacao";

const CONTENT_TYPE_PDF = "application/pdf";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Vercel React Best Practices 1.3: start independent ops early, await late.
  const sessionPromise = getSessionContext();
  const paramsPromise = context.params;

  const ctx = await sessionPromise;
  if (!ctx) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401 }
    );
  }

  const { id } = await paramsPromise;
  if (!id) {
    return NextResponse.json(
      { error: "ID da avaliação não informado" },
      { status: 400 }
    );
  }

  const uc = getAvaliacaoUseCases(ctx.supabaseClient, ctx.user.id);
  const resultado = await uc.obterResultadoParaExibicao(id);
  if (!resultado) {
    return NextResponse.json(
      { error: "Avaliação não encontrada" },
      { status: 404 }
    );
  }

  if (!resultado.consulta.impressao_clinica?.trim()) {
    return NextResponse.json(
      { error: "Avaliação ainda não finalizada" },
      { status: 404 }
    );
  }

  const paciente = await uc.obterPaciente(resultado.consulta.patient_id);
  if (!paciente) {
    return NextResponse.json(
      { error: "Paciente não encontrado" },
      { status: 404 }
    );
  }

  let buffer: Buffer;
  try {
    const docElement = createElement(AvaliacaoPDFDocument, {
      resultado,
      paciente,
    });
    // renderToBuffer espera ReactElement<DocumentProps>; nosso componente retorna Document.
    buffer = await renderToBuffer(
      docElement as React.ReactElement<DocumentProps>
    );
  } catch (error) {
    console.error("[PDF] Erro ao gerar PDF da avaliação:", error);
    return NextResponse.json(
      { error: "Erro ao gerar PDF. Tente novamente." },
      { status: 500 }
    );
  }

  const dateStr = formatarDataParaNomeArquivo(resultado.consulta.date);
  const ident = nomeArquivoSeguro(paciente.identificador);
  const filename = `avaliacao-${dateStr}-${ident}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPE_PDF,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
