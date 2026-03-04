"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { safeDecodeError } from "@/app/lib/safeDecodeError";

interface HistoricoToastsProps {
  toastParam?: string | null;
  error?: string | null;
}

/** Exibe toasts de sucesso/erro a partir dos searchParams e remove os params da URL. */
export function HistoricoToasts({ toastParam, error }: HistoricoToastsProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const hasToast = toastParam != null && toastParam !== "";
    const hasError = error != null && error !== "";

    if (toastParam === "excluido") {
      toast.success("Avaliação excluída.");
    }
    if (hasError) {
      toast.error(safeDecodeError(error ?? ""));
    }

    if (hasToast || hasError) {
      router.replace(pathname, { scroll: false });
    }
  }, [toastParam, error, pathname, router]);

  return null;
}
