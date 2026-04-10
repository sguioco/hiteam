import {
  readBrowserStorageItem,
  removeBrowserStorageItem,
  writeBrowserStorageItem,
} from "./browser-storage";

export const PROFILE_AVATAR_STORAGE_KEY = "smart-admin-profile-avatar";
export const PROFILE_AVATAR_UPDATED_EVENT = "smart-admin-profile-avatar-updated";

function resolveProfileAvatarStorageKey(scope?: string | null) {
  const normalizedScope = scope?.trim().toLowerCase();
  return normalizedScope
    ? `${PROFILE_AVATAR_STORAGE_KEY}:${normalizedScope}`
    : PROFILE_AVATAR_STORAGE_KEY;
}

export function readStoredProfileAvatar(scope?: string | null) {
  if (typeof window === "undefined") {
    return null;
  }

  return readBrowserStorageItem(resolveProfileAvatarStorageKey(scope));
}

export function writeStoredProfileAvatar(value: string | null, scope?: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = resolveProfileAvatarStorageKey(scope);

  if (value) {
    writeBrowserStorageItem(storageKey, value);
  } else {
    removeBrowserStorageItem(storageKey);
  }

  if (storageKey !== PROFILE_AVATAR_STORAGE_KEY) {
    removeBrowserStorageItem(PROFILE_AVATAR_STORAGE_KEY);
  }

  window.dispatchEvent(
    new CustomEvent(PROFILE_AVATAR_UPDATED_EVENT, {
      detail: {
        scope: scope?.trim().toLowerCase() ?? null,
        value,
      },
    }),
  );
}
