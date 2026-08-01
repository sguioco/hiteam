import * as FileSystem from "expo-file-system/legacy";
import { useSyncExternalStore } from "react";

export type WorkspaceScope = {
  companyId: string;
  locationId: string;
};

const STORAGE_PATH = `${FileSystem.documentDirectory ?? ""}smart-workspace-scope.json`;
const listeners = new Set<() => void>();
let currentScope: WorkspaceScope | null = null;
let hydrated = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function isWorkspaceScope(value: unknown): value is WorkspaceScope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WorkspaceScope>;
  return (
    typeof candidate.companyId === "string" &&
    candidate.companyId.length > 0 &&
    typeof candidate.locationId === "string" &&
    candidate.locationId.length > 0
  );
}

export async function hydrateWorkspaceScope() {
  if (hydrated) return currentScope;
  hydrated = true;
  if (!FileSystem.documentDirectory) return currentScope;

  try {
    const info = await FileSystem.getInfoAsync(STORAGE_PATH);
    if (!info.exists) return currentScope;
    const parsed: unknown = JSON.parse(
      await FileSystem.readAsStringAsync(STORAGE_PATH),
    );
    if (isWorkspaceScope(parsed)) {
      currentScope = parsed;
      emit();
    }
  } catch {
    currentScope = null;
  }
  return currentScope;
}

export async function setWorkspaceScope(scope: WorkspaceScope | null) {
  currentScope = scope;
  hydrated = true;
  emit();

  if (!FileSystem.documentDirectory) return;
  if (!scope) {
    await FileSystem.deleteAsync(STORAGE_PATH, { idempotent: true });
    return;
  }
  await FileSystem.writeAsStringAsync(STORAGE_PATH, JSON.stringify(scope));
}

export function getWorkspaceScope() {
  return currentScope;
}

export function subscribeWorkspaceScope(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWorkspaceScope() {
  return useSyncExternalStore(
    subscribeWorkspaceScope,
    getWorkspaceScope,
    getWorkspaceScope,
  );
}
