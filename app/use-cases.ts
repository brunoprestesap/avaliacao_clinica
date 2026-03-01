import type { AvaliacaoUseCases } from "@/src/application";
import { createAvaliacaoUseCases } from "@/src/infrastructure/container";

let instance: AvaliacaoUseCases | null = null;

export function getAvaliacaoUseCases(): AvaliacaoUseCases {
  if (!instance) {
    instance = createAvaliacaoUseCases();
  }
  return instance;
}
