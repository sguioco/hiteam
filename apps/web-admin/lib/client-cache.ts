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
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
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

  const raw = window.sessionStorage.getItem(buildStorageKey(key));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.storedAt !== "number") {
      window.sessionStorage.removeItem(buildStorageKey(key));
      return null;
    }

    memoryCache.set(key, parsed);
    return {
      value: parsed.value,
      storedAt: parsed.storedAt,
      isStale: typeof maxAgeMs === "number" ? now - parsed.storedAt > maxAgeMs : false,
    };
  } catch {
    window.sessionStorage.removeItem(buildStorageKey(key));
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
    window.sessionStorage.setItem(buildStorageKey(key), JSON.stringify(envelope));
  } catch {
    // Ignore quota and serialization issues; memory cache is still enough for in-app navigation.
  }
}

export function clearClientCache(key: string) {
  memoryCache.delete(key);

  if (!canUseBrowserStorage()) {
    return;
  }

  window.sessionStorage.removeItem(buildStorageKey(key));
}
