const STORAGE_PREFIX = "quatrotech-support-session";

export type PersistedSessionState = {
  sessionId: string;
  lastReadCount: number;
};

function storageKey(projectId: string, userId: string): string {
  return `${STORAGE_PREFIX}:${projectId}:${userId || "anonymous"}`;
}

export function loadPersistedSession(projectId: string, userId: string): PersistedSessionState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey(projectId, userId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PersistedSessionState;
    if (!parsed?.sessionId) {
      return null;
    }
    return {
      sessionId: String(parsed.sessionId),
      lastReadCount: Math.max(0, Number(parsed.lastReadCount) || 0),
    };
  } catch {
    return null;
  }
}

export function savePersistedSession(projectId: string, userId: string, state: PersistedSessionState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey(projectId, userId), JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function countUnreadMessages(messages: { role: string }[], lastReadCount: number): number {
  return messages.slice(Math.max(0, lastReadCount)).filter((message) => message.role !== "user").length;
}

export function formatUnreadBadge(count: number): string {
  if (count <= 0) {
    return "";
  }
  return count > 99 ? "99+" : String(count);
}
