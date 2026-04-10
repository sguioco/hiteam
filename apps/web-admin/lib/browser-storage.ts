const DEFAULT_QUOTA_RECOVERY_PREFIXES = [
  "smart:web-cache:",
  "smart:api-cache-namespace:",
];

const DEFAULT_QUOTA_RECOVERY_KEYS = [
  "smart-admin-live-translation-cache-v1",
  "smart-admin-profile-avatar",
];

type StorageKind = "local" | "session";

function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

function getStorage(kind: StorageKind): Storage | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function isQuotaExceededError(error: unknown) {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014
    );
  }

  return (
    error instanceof Error &&
    /quota|exceeded the quota|storage is full/i.test(error.message)
  );
}

function clearStorageEntries(
  storage: Storage,
  prefixes: string[],
  exactKeys: string[],
) {
  const keysToDelete: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) {
      continue;
    }

    if (
      exactKeys.includes(key) ||
      prefixes.some((prefix) => key.startsWith(prefix))
    ) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => {
    storage.removeItem(key);
  });
}

export function readBrowserStorageItem(
  key: string,
  options?: { includeSessionFallback?: boolean },
) {
  const primaryStorage = getStorage("local");
  let primaryValue: string | null = null;

  try {
    primaryValue = primaryStorage?.getItem(key) ?? null;
  } catch {
    primaryValue = null;
  }

  if (primaryValue !== null || !options?.includeSessionFallback) {
    return primaryValue;
  }

  try {
    return getStorage("session")?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function removeBrowserStorageItem(
  key: string,
  options?: { includeSessionFallback?: boolean },
) {
  try {
    getStorage("local")?.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }

  if (options?.includeSessionFallback) {
    try {
      getStorage("session")?.removeItem(key);
    } catch {
      // Ignore unavailable storage.
    }
  }
}

export function writeBrowserStorageItem(
  key: string,
  value: string,
  options?: {
    prefer?: StorageKind;
    includeSessionFallback?: boolean;
    quotaRecoveryPrefixes?: string[];
    quotaRecoveryKeys?: string[];
  },
) {
  const primaryKind = options?.prefer ?? "local";
  const fallbackKinds =
    options?.includeSessionFallback && primaryKind !== "session"
      ? (["session"] as const)
      : [];
  const quotaRecoveryPrefixes =
    options?.quotaRecoveryPrefixes ?? DEFAULT_QUOTA_RECOVERY_PREFIXES;
  const quotaRecoveryKeys =
    options?.quotaRecoveryKeys ?? DEFAULT_QUOTA_RECOVERY_KEYS;

  for (const kind of [primaryKind, ...fallbackKinds]) {
    const storage = getStorage(kind);
    if (!storage) {
      continue;
    }

    try {
      storage.setItem(key, value);
      return kind;
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        continue;
      }

      try {
        clearStorageEntries(storage, quotaRecoveryPrefixes, quotaRecoveryKeys);
        storage.setItem(key, value);
        return kind;
      } catch {
        continue;
      }
    }
  }

  return null;
}
