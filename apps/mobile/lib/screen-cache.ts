import * as FileSystem from 'expo-file-system/legacy';

type CacheEnvelope<T> = {
  storedAt: number;
  value: T;
};

const CACHE_DIR = `${FileSystem.documentDirectory ?? ''}screen-cache/`;
const memoryCache = new Map<string, CacheEnvelope<unknown>>();

function canUseFileSystem() {
  return Boolean(FileSystem.documentDirectory);
}

function sanitizeKey(key: string) {
  return key.replace(/[^a-z0-9._-]+/gi, '_').toLowerCase();
}

function getCachePath(key: string) {
  return `${CACHE_DIR}${sanitizeKey(key)}.json`;
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
  const now = Date.now();
  const fromMemory = memoryCache.get(key) as CacheEnvelope<T> | undefined;

  if (fromMemory) {
    return {
      value: fromMemory.value,
      storedAt: fromMemory.storedAt,
      isStale:
        typeof maxAgeMs === 'number'
          ? now - fromMemory.storedAt > maxAgeMs
          : false,
    };
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
    return {
      value: parsed.value,
      storedAt: parsed.storedAt,
      isStale:
        typeof maxAgeMs === 'number'
          ? now - parsed.storedAt > maxAgeMs
          : false,
    };
  } catch {
    return null;
  }
}

export async function writeScreenCache<T>(key: string, value: T) {
  const envelope: CacheEnvelope<T> = {
    storedAt: Date.now(),
    value,
  };

  memoryCache.set(key, envelope);

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

  if (!canUseFileSystem()) {
    return;
  }

  try {
    await FileSystem.deleteAsync(getCachePath(key), { idempotent: true });
  } catch {
    // Best effort cache delete.
  }
}
