import { toAdminHref } from './admin-routes';
import {
  readBrowserStorageItem,
  removeBrowserStorageItem,
  writeBrowserStorageItem,
} from './browser-storage';
import { isDemoAccessToken, isDemoModeEnabled } from './demo-mode';

export const DESKTOP_ADMIN_ROLES = [
  'tenant_owner',
  'hr_admin',
  'operations_admin',
] as const;

export const ADMIN_ROLES = [...DESKTOP_ADMIN_ROLES, 'manager'] as const;

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
    roleCodes: string[];
    workspaceAccessAllowed: boolean;
  };
};

const SESSION_KEY = 'smart-admin-session';
const TENANT_SLUG_KEY = 'smart-admin-tenant-slug';
export const SESSION_EXPIRED_EVENT = 'smart-admin-session-expired';
export const SESSION_UPDATED_EVENT = 'smart-admin-session-updated';
const AUTH_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

declare global {
  interface Window {
    __SMART_INITIAL_SESSION__?: AuthSession | null;
  }
}

function normalizeTenantSlug(value: string): string {
  return value.trim().toLowerCase();
}

function isLocalDevHost() {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function getDefaultTenantSlug(): string {
  const envSlug = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG?.trim();
  if (envSlug) return normalizeTenantSlug(envSlug);

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.trim().toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return 'demo';
    }
  }

  return '';
}

function getTenantSlugFromHostname(hostname: string): string {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized || normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1') {
    return '';
  }

  const parts = normalized.split('.').filter(Boolean);
  return parts.length >= 3 ? normalizeTenantSlug(parts[0]) : '';
}

function syncSessionCookie(session: AuthSession | null) {
  if (typeof window === 'undefined') return;

  void fetch('/api/session', {
    method: session ? 'POST' : 'DELETE',
    headers: session ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'same-origin',
    keepalive: true,
    body: session ? JSON.stringify({ session }) : undefined,
  }).catch(() => undefined);
}

function persistSessionSnapshot(session: AuthSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    removeBrowserStorageItem(SESSION_KEY, { includeSessionFallback: true });
    return;
  }

  writeBrowserStorageItem(SESSION_KEY, JSON.stringify(session), {
    includeSessionFallback: true,
  });
}

function persistTenantSlugValue(value: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    removeBrowserStorageItem(TENANT_SLUG_KEY, { includeSessionFallback: true });
    return;
  }

  writeBrowserStorageItem(TENANT_SLUG_KEY, value, {
    includeSessionFallback: true,
  });
}

function readWindowBootstrapSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const session = window.__SMART_INITIAL_SESSION__ ?? null;
  if (!session) {
    return null;
  }

  if (isDemoAccessToken(session.accessToken) && !isDemoModeEnabled() && !isLocalDevHost()) {
    return null;
  }

  return session;
}

export function saveSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  window.__SMART_INITIAL_SESSION__ = session;
  persistSessionSnapshot(session);
  syncSessionCookie(session);
  window.dispatchEvent(new CustomEvent(SESSION_UPDATED_EVENT, { detail: session }));
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const bootstrappedSession = readWindowBootstrapSession();
  const raw = readBrowserStorageItem(SESSION_KEY, { includeSessionFallback: true });
  if (!raw) {
    if (bootstrappedSession) {
      persistSessionSnapshot(bootstrappedSession);
      return bootstrappedSession;
    }

    return null;
  }

  try {
    const session = JSON.parse(raw) as AuthSession;

    if (isDemoAccessToken(session.accessToken) && !isDemoModeEnabled() && !isLocalDevHost()) {
      removeBrowserStorageItem(SESSION_KEY, { includeSessionFallback: true });
      return bootstrappedSession;
    }

    if (
      bootstrappedSession &&
      (
        session.accessToken !== bootstrappedSession.accessToken ||
        session.refreshToken !== bootstrappedSession.refreshToken ||
        session.user.id !== bootstrappedSession.user.id ||
        session.user.tenantId !== bootstrappedSession.user.tenantId
      )
    ) {
      persistSessionSnapshot(bootstrappedSession);
      return bootstrappedSession;
    }

    return session;
  } catch {
    removeBrowserStorageItem(SESSION_KEY, { includeSessionFallback: true });
  }

  if (bootstrappedSession) {
    persistSessionSnapshot(bootstrappedSession);
    return bootstrappedSession;
  }

  return null;
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.__SMART_INITIAL_SESSION__ = null;
  removeBrowserStorageItem(SESSION_KEY, { includeSessionFallback: true });
  syncSessionCookie(null);
}

export function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== '/login') {
    window.location.replace('/login?force=1');
  }
}

export function saveTenantSlug(tenantSlug: string): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeTenantSlug(tenantSlug);

  if (!normalized) {
    persistTenantSlugValue(null);
    return;
  }

  persistTenantSlugValue(normalized);
}

export function getTenantSlug(): string {
  if (typeof window === 'undefined') {
    return getDefaultTenantSlug();
  }

  const searchTenant = new URLSearchParams(window.location.search).get('tenant');
  if (searchTenant?.trim()) {
    return normalizeTenantSlug(searchTenant);
  }

  const hostnameTenant = getTenantSlugFromHostname(window.location.hostname);
  if (hostnameTenant) {
    return hostnameTenant;
  }

  const storedTenant = readBrowserStorageItem(TENANT_SLUG_KEY, {
    includeSessionFallback: true,
  });
  if (storedTenant?.trim()) {
    return normalizeTenantSlug(storedTenant);
  }

  return getDefaultTenantSlug();
}

export function expireSession(): void {
  if (typeof window === 'undefined') return;
  clearSession();
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  redirectToLogin();
}

export async function persistSession(session: AuthSession): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  window.__SMART_INITIAL_SESSION__ = session;
  persistSessionSnapshot(session);

  const response = await fetch('/api/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    credentials: 'same-origin',
    body: JSON.stringify({ session }),
  });

  if (!response.ok) {
    throw new Error('Unable to persist session.');
  }

  window.dispatchEvent(new CustomEvent(SESSION_UPDATED_EVENT, { detail: session }));
}

export async function destroySession(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  window.__SMART_INITIAL_SESSION__ = null;
  removeBrowserStorageItem(SESSION_KEY, { includeSessionFallback: true });
  await fetch('/api/session', {
    method: 'DELETE',
    credentials: 'same-origin',
  }).catch(() => undefined);
}

export function resolveHomeRoute(roleCodes: string[]): string {
  return toAdminHref('/');
}

export async function resolvePostLoginRoute(session: AuthSession): Promise<string> {
  const fallbackRoute = resolveHomeRoute(session.user.roleCodes);

  if (
    typeof window === 'undefined' ||
    isEmployeeOnlyRole(session.user.roleCodes) ||
    isDemoAccessToken(session.accessToken)
  ) {
    return fallbackRoute;
  }

  try {
    const response = await fetch(`${AUTH_API_URL}/api/v1/bootstrap/organization`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return fallbackRoute;
    }

    const payload = (await response.json()) as {
      setup?: {
        configured?: boolean;
      } | null;
    };

    return payload.setup?.configured === false
      ? toAdminHref('/organization')
      : fallbackRoute;
  } catch {
    return fallbackRoute;
  }
}

export function isEmployeeOnlyRole(roleCodes: string[]): boolean {
  return !roleCodes.some((role) =>
    ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]),
  );
}

export function hasDesktopAdminAccess(roleCodes: string[]): boolean {
  return roleCodes.some((role) =>
    DESKTOP_ADMIN_ROLES.includes(role as (typeof DESKTOP_ADMIN_ROLES)[number]),
  );
}

export function hasManagerAccess(roleCodes: string[]): boolean {
  return roleCodes.includes('manager') || hasDesktopAdminAccess(roleCodes);
}

export function isManagerOnlyRole(roleCodes: string[]): boolean {
  return roleCodes.includes('manager') && !hasDesktopAdminAccess(roleCodes);
}
