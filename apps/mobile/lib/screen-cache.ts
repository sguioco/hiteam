import * as FileSystem from 'expo-file-system/legacy';

type CacheEnvelope<T> = {
  storedAt: number;
  value: T;
};

type CacheSnapshot<T> = {
  value: T;
  storedAt: number;
  isStale: boolean;
};

const CACHE_DIR = `${FileSystem.documentDirectory ?? ''}screen-cache/`;
const memoryCache = new Map<string, CacheEnvelope<unknown>>();
const cacheListeners = new Map<string, Set<(entry: CacheEnvelope<unknown> | null) => void>>();

function canUseFileSystem() {
  return Boolean(FileSystem.documentDirectory);
}

function sanitizeKey(key: string) {
  return key.replace(/[^a-z0-9._-]+/gi, '_').toLowerCase();
}

function getCachePath(key: string) {
  return `${CACHE_DIR}${sanitizeKey(key)}.json`;
}

function buildSnapshot<T>(entry: CacheEnvelope<T>, maxAgeMs?: number): CacheSnapshot<T> {
  const now = Date.now();

  return {
    value: entry.value,
    storedAt: entry.storedAt,
    isStale:
      typeof maxAgeMs === 'number'
        ? now - entry.storedAt > maxAgeMs
        : false,
  };
}

function notifyCacheListeners(key: string, entry: CacheEnvelope<unknown> | null) {
  const listeners = cacheListeners.get(key);

  if (!listeners?.size) {
    return;
  }

  listeners.forEach((listener) => {
    listener(entry);
  });
}

async function ensureCacheDir() {
  if (!canUseFileSystem()) {
    return;
  }

  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

export async function readScreenCache<T>(key: string, maxAgeMs?: number) {
  const fromMemory = memoryCache.get(key) as CacheEnvelope<T> | undefined;

  if (fromMemory) {
    return buildSnapshot(fromMemory, maxAgeMs);
  }

  if (!canUseFileSystem()) {
    return null;
  }

  const path = getCachePath(key);

  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      return null;
    }

    const raw = await FileSystem.readAsStringAsync(path);
    if (!raw.trim()) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.storedAt !== 'number') {
      await FileSystem.deleteAsync(path, { idempotent: true });
      return null;
    }

    memoryCache.set(key, parsed);
    notifyCacheListeners(key, parsed);
    return buildSnapshot(parsed, maxAgeMs);
  } catch {
    return null;
  }
}

export function peekScreenCache<T>(key: string, maxAgeMs?: number) {
  const fromMemory = memoryCache.get(key) as CacheEnvelope<T> | undefined;

  if (!fromMemory) {
    return null;
  }

  return buildSnapshot(fromMemory, maxAgeMs);
}

export function subscribeScreenCache<T>(
  key: string,
  listener: (entry: CacheSnapshot<T> | null) => void,
) {
  const wrappedListener = (entry: CacheEnvelope<unknown> | null) => {
    if (!entry) {
      listener(null);
      return;
    }

    listener(buildSnapshot(entry as CacheEnvelope<T>));
  };

  const listeners = cacheListeners.get(key) ?? new Set<(entry: CacheEnvelope<unknown> | null) => void>();
  listeners.add(wrappedListener);
  cacheListeners.set(key, listeners);

  return () => {
    const currentListeners = cacheListeners.get(key);

    if (!currentListeners) {
      return;
    }

    currentListeners.delete(wrappedListener);

    if (currentListeners.size === 0) {
      cacheListeners.delete(key);
    }
  };
}

export async function writeScreenCache<T>(key: string, value: T) {
  const envelope: CacheEnvelope<T> = {
    storedAt: Date.now(),
    value,
  };

  memoryCache.set(key, envelope);
  notifyCacheListeners(key, envelope);

  if (!canUseFileSystem()) {
    return;
  }

  try {
    await ensureCacheDir();
    await FileSystem.writeAsStringAsync(
      getCachePath(key),
      JSON.stringify(envelope),
    );
  } catch {
    // Best effort cache write.
  }
}

export async function clearScreenCache(key: string) {
  memoryCache.delete(key);
  notifyCacheListeners(key, null);

  if (!canUseFileSystem()) {
    return;
  }

  try {
    await FileSystem.deleteAsync(getCachePath(key), { idempotent: true });
  } catch {
    // Best effort cache delete.
  }
}
