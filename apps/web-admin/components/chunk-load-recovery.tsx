"use client";

import { useEffect } from "react";
import {
  isChunkLoadFailure,
  recoverFromChunkLoadFailure,
} from "../lib/chunk-load-recovery";

export function ChunkLoadRecovery() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      if (!isChunkLoadFailure(event.error ?? event.message)) {
        return;
      }

      event.preventDefault();
      recoverFromChunkLoadFailure();
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (!isChunkLoadFailure(event.reason)) {
        return;
      }

      event.preventDefault();
      recoverFromChunkLoadFailure();
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  return null;
}
