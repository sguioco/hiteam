"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useRef } from "react";
import type { AuthSession } from "@/lib/auth";
import type {
  ShellHeaderCachePayload,
  ShellNotificationsCachePayload,
} from "@/lib/shell-bootstrap";

type ShellMode = "admin" | "employee";

type PersistentShellSnapshot = {
  header: ShellHeaderCachePayload | null;
  notifications: ShellNotificationsCachePayload | null;
};

type AdminShellStateContextValue = {
  clear: () => void;
  read: (
    session: AuthSession,
    mode: ShellMode,
  ) => PersistentShellSnapshot | null;
  readLatest: (mode: ShellMode) => PersistentShellSnapshot | null;
  write: (
    session: AuthSession,
    mode: ShellMode,
    patch: Partial<PersistentShellSnapshot>,
  ) => void;
};

const AdminShellStateContext =
  createContext<AdminShellStateContextValue | null>(null);

function buildKey(session: AuthSession, mode: ShellMode) {
  return `${mode}:${session.user.tenantId}:${session.user.id}`;
}

export function AdminShellStateProvider({ children }: { children: ReactNode }) {
  const snapshotsRef = useRef(new Map<string, PersistentShellSnapshot>());
  const latestKeysRef = useRef<Partial<Record<ShellMode, string>>>({});

  const value = useMemo<AdminShellStateContextValue>(
    () => ({
      clear() {
        snapshotsRef.current.clear();
        latestKeysRef.current = {};
      },
      read(session, mode) {
        return snapshotsRef.current.get(buildKey(session, mode)) ?? null;
      },
      readLatest(mode) {
        const key = latestKeysRef.current[mode];
        return key ? (snapshotsRef.current.get(key) ?? null) : null;
      },
      write(session, mode, patch) {
        const key = buildKey(session, mode);
        const current = snapshotsRef.current.get(key) ?? {
          header: null,
          notifications: null,
        };

        snapshotsRef.current.set(key, { ...current, ...patch });
        latestKeysRef.current[mode] = key;
      },
    }),
    [],
  );

  return (
    <AdminShellStateContext.Provider value={value}>
      {children}
    </AdminShellStateContext.Provider>
  );
}

export function useAdminShellState() {
  const context = useContext(AdminShellStateContext);

  if (!context) {
    throw new Error(
      "useAdminShellState must be used inside AdminShellStateProvider.",
    );
  }

  return context;
}
