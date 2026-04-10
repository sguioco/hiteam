import {
  readBrowserStorageItem,
  removeBrowserStorageItem,
  writeBrowserStorageItem,
} from "./browser-storage";

export const PROFILE_AVATAR_STORAGE_KEY = "smart-admin-profile-avatar";
export const PROFILE_AVATAR_UPDATED_EVENT = "smart-admin-profile-avatar-updated";

export function readStoredProfileAvatar() {
  if (typeof window === "undefined") {
    return null;
  }

  return readBrowserStorageItem(PROFILE_AVATAR_STORAGE_KEY);
}

export function writeStoredProfileAvatar(value: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (value) {
    writeBrowserStorageItem(PROFILE_AVATAR_STORAGE_KEY, value);
  } else {
    removeBrowserStorageItem(PROFILE_AVATAR_STORAGE_KEY);
  }

  window.dispatchEvent(
    new CustomEvent(PROFILE_AVATAR_UPDATED_EVENT, {
      detail: value,
    }),
  );
}
