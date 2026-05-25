export const DEFAULT_API_URL = "https://api.hiteam.net";

export function normalizeApiUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export const API_URL = normalizeApiUrl(
  process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,
);

export const FALLBACK_API_URL =
  API_URL === DEFAULT_API_URL ? null : DEFAULT_API_URL;
