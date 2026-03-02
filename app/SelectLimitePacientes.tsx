"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  PAGINACAO_PACIENTES_LIMITES,
  isLimiteValido,
} from "@/src/config/paginacao-pacientes";

interface SelectLimitePacientesProps {
  currentLimit: number;
  currentSearch?: string;
}

export function SelectLimitePacientes({
  currentLimit,
  currentSearch,
}: SelectLimitePacientesProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(value: string) {
    const limit = Number(value);
    if (!isLimiteValido(limit)) return;
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("page", "1");
    if (currentSearch?.trim()) params.set("q", currentSearch.trim());
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={currentLimit}
      onChange={(e) => handleChange(e.target.value)}
      id="limit-pacientes"
      aria-label="Itens por página"
      className="min-h-11 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {PAGINACAO_PACIENTES_LIMITES.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}
