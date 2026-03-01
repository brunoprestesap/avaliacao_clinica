"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { safeDecodeError } from "../lib/safeDecodeError";

export function ErrorToast({ error }: { error?: string }) {
  useEffect(() => {
    if (error) {
      toast.error(safeDecodeError(error));
    }
  }, [error]);

  return null;
}
