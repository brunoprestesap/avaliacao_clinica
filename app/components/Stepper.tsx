import { Check, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepItem = {
  id: string;
  label: string;
};

const steps: StepItem[] = [
  { id: "identificacao", label: "Identificação" },
  { id: "clinico", label: "Clínico" },
  { id: "pilares", label: "Pilares" },
  { id: "resultado", label: "Resultado" },
];

interface StepperProps {
  currentStep: "identificacao" | "clinico" | "pilares" | "resultado";
}

export function Stepper({ currentStep }: StepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="mb-8 w-full">
      <nav aria-label="Progresso da avaliação">
        <ol className="flex items-center justify-between w-full">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isLast = index === steps.length - 1;

            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-center",
                  !isLast ? "flex-1 min-w-0" : "flex-none"
                )}
              >
                <div className="flex flex-col items-center gap-3 relative shrink-0">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200",
                      isCompleted
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : isCurrent
                        ? "border-primary bg-primary/15 text-primary ring-2 ring-primary/30 dark:bg-primary/20 dark:ring-primary/40"
                        : "border-border bg-muted/60 text-muted-foreground dark:bg-muted dark:border-border dark:text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" strokeWidth={2.5} />
                    ) : isCurrent ? (
                      <CircleDot className="h-5 w-5" />
                    ) : (
                      <span className="text-xs font-semibold tabular-nums">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium text-center max-w-[5rem] whitespace-normal sm:max-w-none sm:whitespace-nowrap",
                      isCompleted || isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground dark:text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 min-w-3 mx-1 sm:mx-3 md:mx-4 rounded-full transition-colors duration-200",
                      isCompleted ? "bg-primary" : "bg-muted/50"
                    )}
                    aria-hidden
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
