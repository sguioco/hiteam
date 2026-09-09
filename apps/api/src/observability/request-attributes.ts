import type { IncomingHttpHeaders } from 'node:http';

const ALLOWED_CLIENTS = new Set(['mobile', 'web', 'web-admin-server']);
const PLATFORM_PATTERN = /^[a-z0-9._-]{1,32}$/;
const VERSION_PATTERN = /^[a-z0-9._-]{1,64}$/;

function headerValue(headers: IncomingHttpHeaders, name: string): string {
  const value = headers[name];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function normalizeClient(value: string): string {
  const normalized = value.trim().toLowerCase();
  return ALLOWED_CLIENTS.has(normalized) ? normalized : 'unknown';
}

function normalize(value: string, pattern: RegExp): string {
  const normalized = value.trim().toLowerCase();
  return pattern.test(normalized) ? normalized : 'unknown';
}

/**
 * Maps the existing, bounded client headers onto the active HTTP span.
 * Never add tenant, user, email, device, authorization or location values here.
 */
export function requestTelemetryAttributes(headers: IncomingHttpHeaders): Record<string, string> {
  return {
    'hiteam.client.type': normalizeClient(headerValue(headers, 'x-hiteam-client')),
    'hiteam.client.platform': normalize(
      headerValue(headers, 'x-hiteam-client-platform'),
      PLATFORM_PATTERN,
    ),
    'hiteam.client.version': normalize(
      headerValue(headers, 'x-hiteam-client-version'),
      VERSION_PATTERN,
    ),
  };
}
