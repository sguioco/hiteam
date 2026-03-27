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

export function saveSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(SESSION_UPDATED_EVENT, { detail: session }));
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthSession;

    if (isDemoAccessToken(session.accessToken) && !isDemoModeEnabled()) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
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
