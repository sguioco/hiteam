type CacheEnvelope<T> = {
  storedAt: number;
  value: T;
};

const CACHE_PREFIX = "smart:web-cache:";
const memoryCache = new Map<string, CacheEnvelope<unknown>>();

function buildStorageKey(key: string) {
  return `${CACHE_PREFIX}${key}`;
}

function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

function getPreferredStorage(): Storage | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  if (typeof window.localStorage !== "undefined") {
    return window.localStorage;
  }

  if (typeof window.sessionStorage !== "undefined") {
    return window.sessionStorage;
  }

  return null;
}

export function readClientCache<T>(key: string, maxAgeMs?: number) {
  const now = Date.now();
  const fromMemory = memoryCache.get(key) as CacheEnvelope<T> | undefined;

  if (fromMemory) {
    return {
      value: fromMemory.value,
      storedAt: fromMemory.storedAt,
      isStale: typeof maxAgeMs === "number" ? now - fromMemory.storedAt > maxAgeMs : false,
    };
  }

  if (!canUseBrowserStorage()) {
    return null;
  }

  const storage = getPreferredStorage();
  const raw = storage?.getItem(buildStorageKey(key)) ?? null;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.storedAt !== "number") {
      storage?.removeItem(buildStorageKey(key));
      return null;
    }

    memoryCache.set(key, parsed);
    return {
      value: parsed.value,
      storedAt: parsed.storedAt,
      isStale: typeof maxAgeMs === "number" ? now - parsed.storedAt > maxAgeMs : false,
    };
  } catch {
    storage?.removeItem(buildStorageKey(key));
    return null;
  }
}

export function writeClientCache<T>(key: string, value: T) {
  const envelope: CacheEnvelope<T> = {
    storedAt: Date.now(),
    value,
  };

  memoryCache.set(key, envelope);

  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    getPreferredStorage()?.setItem(buildStorageKey(key), JSON.stringify(envelope));
  } catch {
    // Ignore quota and serialization issues; memory cache is still enough for in-app navigation.
  }
}

export function clearClientCache(key: string) {
  memoryCache.delete(key);

  if (!canUseBrowserStorage()) {
    return;
  }

  getPreferredStorage()?.removeItem(buildStorageKey(key));
}
