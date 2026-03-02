"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent } from "@/components/ui/card"
import { SubmitButton } from "@/app/components/SubmitButton"

type SaveAction = (formData: FormData) => Promise<void>

interface ImpressaoClinicaAccordionProps {
  consultaId: string
  jaSalvou: boolean
  impressaoClinica: string | null | undefined
  saveAction: SaveAction
}

export function ImpressaoClinicaAccordion({
  consultaId,
  jaSalvou,
  impressaoClinica,
  saveAction,
}: ImpressaoClinicaAccordionProps) {
  return (
    <Card className="border-border/80 shadow-[var(--shadow-card)]">
      <CardContent className="p-0">
        <Accordion type="single" collapsible defaultValue="">
          <AccordionItem value="impressao-clinica" className="border-none">
            <AccordionTrigger className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider text-muted-foreground hover:no-underline hover:text-muted-foreground [.border-b]:pb-4">
              Impressão clínica
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-0">
              {jaSalvou ? (
                <p className="whitespace-pre-wrap rounded-xl bg-muted/30 p-5 text-foreground leading-relaxed">
                  {impressaoClinica ?? ""}
                </p>
              ) : (
                <form action={saveAction} className="space-y-4">
                  <input type="hidden" name="consultaId" value={consultaId} />
                  <textarea
                    id="impressao_clinica"
                    name="impressao_clinica"
                    required
                    rows={8}
                    className="input-textarea"
                    placeholder="Descreva a impressão clínica (obrigatório)..."
                  />
                  <SubmitButton
                    label="Salvar e Finalizar"
                    className="mt-4 h-14 w-full rounded-xl text-lg font-semibold shadow-sm transition-shadow hover:shadow-md"
                  />
                </form>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
