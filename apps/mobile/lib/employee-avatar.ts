import type { ImageSourcePropType } from "react-native";
import { API_URL } from "./api-config";

type AvatarCandidate = {
  avatar?: unknown;
  avatarUrl?: unknown;
  [key: string]: unknown;
};

function remoteAvatarSource(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return {
    uri: normalizeRemoteAvatarUrl(trimmed),
  } satisfies ImageSourcePropType;
}

function isLocalAvatarHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized === "host.docker.internal"
  );
}

function normalizeRemoteAvatarUrl(value: string) {
  try {
    const avatarUrl = new URL(value);

    if (!isLocalAvatarHost(avatarUrl.hostname) || !API_URL.trim()) {
      return avatarUrl.toString();
    }

    const apiUrl = new URL(API_URL);
    avatarUrl.protocol = apiUrl.protocol;
    avatarUrl.hostname = apiUrl.hostname;

    if (!avatarUrl.port && apiUrl.port) {
      avatarUrl.port = apiUrl.port;
    }

    return avatarUrl.toString();
  } catch {
    return value;
  }
}

export function resolveEmployeeAvatarSource(
  candidate: AvatarCandidate,
): ImageSourcePropType | undefined {
  if (
    candidate.avatar &&
    typeof candidate.avatar === "object" &&
    "uri" in candidate.avatar &&
    typeof (candidate.avatar as { uri?: unknown }).uri === "string"
  ) {
    return candidate.avatar as ImageSourcePropType;
  }

  if (typeof candidate.avatar === "string") {
    const source = remoteAvatarSource(candidate.avatar);
    if (source) {
      return source;
    }
  }

  if (typeof candidate.avatarUrl === "string") {
    const source = remoteAvatarSource(candidate.avatarUrl);
    if (source) {
      return source;
    }
  }

  return undefined;
}
