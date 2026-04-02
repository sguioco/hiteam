import { toAdminHref } from './admin-routes';
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

declare global {
  interface Window {
    __SMART_INITIAL_SESSION__?: AuthSession | null;
  }
}

function normalizeTenantSlug(value: string): string {
  return value.trim().toLowerCase();
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

function readWindowBootstrapSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const session = window.__SMART_INITIAL_SESSION__ ?? null;
  if (!session) {
    return null;
  }

  if (isDemoAccessToken(session.accessToken) && !isDemoModeEnabled()) {
    return null;
  }

  return session;
}

export function saveSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  window.__SMART_INITIAL_SESSION__ = session;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  syncSessionCookie(session);
  window.dispatchEvent(new CustomEvent(SESSION_UPDATED_EVENT, { detail: session }));
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const bootstrappedSession = readWindowBootstrapSession();
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    if (bootstrappedSession) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(bootstrappedSession));
      return bootstrappedSession;
    }

    return null;
  }

  try {
    const session = JSON.parse(raw) as AuthSession;

    if (isDemoAccessToken(session.accessToken) && !isDemoModeEnabled()) {
      window.localStorage.removeItem(SESSION_KEY);
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
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(bootstrappedSession));
      return bootstrappedSession;
    }

    return session;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
  }

  if (bootstrappedSession) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(bootstrappedSession));
    return bootstrappedSession;
  }

  return null;
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.__SMART_INITIAL_SESSION__ = null;
  window.localStorage.removeItem(SESSION_KEY);
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
    window.localStorage.removeItem(TENANT_SLUG_KEY);
    return;
  }

  window.localStorage.setItem(TENANT_SLUG_KEY, normalized);
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

  const storedTenant = window.localStorage.getItem(TENANT_SLUG_KEY);
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
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));

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
  window.localStorage.removeItem(SESSION_KEY);
  await fetch('/api/session', {
    method: 'DELETE',
    credentials: 'same-origin',
  }).catch(() => undefined);
}

export function resolveHomeRoute(roleCodes: string[]): string {
  return toAdminHref('/');
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
