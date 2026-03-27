export const PROFILE_AVATAR_STORAGE_KEY = "smart-admin-profile-avatar";
export const PROFILE_AVATAR_UPDATED_EVENT = "smart-admin-profile-avatar-updated";

export function readStoredProfileAvatar() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(PROFILE_AVATAR_STORAGE_KEY);
}

export function writeStoredProfileAvatar(value: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (value) {
    window.localStorage.setItem(PROFILE_AVATAR_STORAGE_KEY, value);
  } else {
    window.localStorage.removeItem(PROFILE_AVATAR_STORAGE_KEY);
  }

  window.dispatchEvent(
    new CustomEvent(PROFILE_AVATAR_UPDATED_EVENT, {
      detail: value,
    }),
  );
}
