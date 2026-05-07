import type { NextRequest } from "next/server";

function firstHeaderValue(value: string | null): string {
  return value?.split(",")[0]?.trim() ?? "";
}

function normalizeHeaderToken(value: string): string {
  return value.trim().replace(/^"|"$/g, "");
}

function forwardedPair(headers: Headers, key: "host" | "proto"): string {
  const forwarded = firstHeaderValue(headers.get("forwarded"));
  if (!forwarded) {
    return "";
  }

  const pattern = new RegExp(`(?:^|;)\\s*${key}=([^;]+)`, "i");
  const match = forwarded.match(pattern);
  return match?.[1] ? normalizeHeaderToken(match[1]) : "";
}

function isUsableHost(value: string): boolean {
  return Boolean(value) && !value.includes("://") && !/[/?#]/.test(value);
}

export function getPublicRequestOrigin(request: NextRequest): string {
  const forwardedHost =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ||
    forwardedPair(request.headers, "host") ||
    firstHeaderValue(request.headers.get("x-original-host"));
  const host = isUsableHost(forwardedHost)
    ? forwardedHost
    : request.nextUrl.host || firstHeaderValue(request.headers.get("host"));

  const forwardedProto =
    firstHeaderValue(request.headers.get("x-forwarded-proto")) ||
    forwardedPair(request.headers, "proto");
  const proto =
    forwardedProto || request.nextUrl.protocol.replace(/:$/, "") || "http";

  return `${proto}://${host}`;
}

export function getPublicRequestUrl(
  request: NextRequest,
  path: string,
): URL {
  return new URL(path, `${getPublicRequestOrigin(request)}/`);
}

export function shouldUseSecureRequestCookies(request: NextRequest): boolean {
  return getPublicRequestOrigin(request).startsWith("https://");
}
