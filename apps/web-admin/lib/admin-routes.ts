export const ADMIN_APP_PREFIX = '/app';

export const ADMIN_ROUTE_PREFIXES = [
  '/analytics',
  '/attendance',
  '/biometric',
  '/collaboration',
  '/diagnostics',
  '/employees',
  '/news',
  '/notifications',
  '/observability',
  '/organization',
  '/payroll',
  '/profile',
  '/requests',
  '/schedule',
  '/tasks',
] as const;

export function toAdminHref(path = '/'): string {
  if (path === '/') return ADMIN_APP_PREFIX;
  return path;
}
