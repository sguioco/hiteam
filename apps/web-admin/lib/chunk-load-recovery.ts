"use client";

export const CHUNK_PENDING_ROUTE_STORAGE_KEY = "smart-admin:pending-route";

const CHUNK_RELOAD_STORAGE_KEY = "smart-admin:chunk-reload-at";
const CHUNK_RELOAD_GUARD_MS = 15_000;

function readErrorText(value: unknown): string {
  if (value instanceof Error) {
    return `${value.name} ${value.message} ${value.stack ?? ""}`;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as {
      message?: unknown;
      name?: unknown;
      stack?: unknown;
    };

    return [record.name, record.message, record.stack]
      .filter((item): item is string => typeof item === "string")
      .join(" ");
  }

  return "";
}

export function isChunkLoadFailure(value: unknown): boolean {
  const errorText = readErrorText(value);

  return (
    /ChunkLoadError/i.test(errorText) ||
    /Loading chunk \d+ failed/i.test(errorText) ||
    /\/_next\/static\/chunks\//i.test(errorText)
  );
}

export function recoverFromChunkLoadFailure() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const lastReloadAt = Number(
      window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) ?? "0",
    );

    if (Date.now() - lastReloadAt < CHUNK_RELOAD_GUARD_MS) {
      return;
    }

    window.sessionStorage.setItem(
      CHUNK_RELOAD_STORAGE_KEY,
      String(Date.now()),
    );

    const pendingRoute = window.sessionStorage.getItem(
      CHUNK_PENDING_ROUTE_STORAGE_KEY,
    );
    const currentRoute = `${window.location.pathname}${window.location.search}`;

    if (pendingRoute && pendingRoute !== currentRoute) {
      window.location.assign(pendingRoute);
      return;
    }
  } catch {
    // Storage can be blocked; a plain reload still refreshes the Next runtime.
  }

  window.location.reload();
}
