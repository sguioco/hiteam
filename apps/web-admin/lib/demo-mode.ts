import type { AuthSession } from "./auth";

const DEMO_MODE_STORAGE_KEY = "smart-admin-demo-mode";

export const DEMO_ADMIN_ACCESS_TOKEN = "demo-admin-access-token";
export const DEMO_ADMIN_REFRESH_TOKEN = "demo-admin-refresh-token";
export const DEMO_EMPLOYEE_ACCESS_TOKEN = "demo-employee-access-token";
export const DEMO_EMPLOYEE_REFRESH_TOKEN = "demo-employee-refresh-token";
export const DEMO_ADMIN_EMAIL = "owner@demo.smart";
export const DEMO_ADMIN_PASSWORD = "Admin12345!";
export const DEMO_EMPLOYEE_EMAIL = "employee@demo.smart";
export const DEMO_EMPLOYEE_PASSWORD = "Employee123!";

function isLocalHost() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

export function isDemoModeAvailable() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function isDemoModeEnabled() {
  if (!isDemoModeAvailable()) return false;
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    window.localStorage.getItem(DEMO_MODE_STORAGE_KEY) === "true"
  );
}

export function enableDemoMode() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, "true");
}

export function disableDemoMode() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_MODE_STORAGE_KEY);
}

export function createDemoSession(role: "admin" | "employee"): AuthSession {
  if (role === "employee") {
    return {
      accessToken: DEMO_EMPLOYEE_ACCESS_TOKEN,
      refreshToken: DEMO_EMPLOYEE_REFRESH_TOKEN,
      user: {
        id: "emp-2",
        email: DEMO_EMPLOYEE_EMAIL,
        tenantId: "demo-tenant",
        roleCodes: ["employee"],
        workspaceAccessAllowed: true,
      },
    };
  }

  return {
    accessToken: DEMO_ADMIN_ACCESS_TOKEN,
    refreshToken: DEMO_ADMIN_REFRESH_TOKEN,
    user: {
      id: "emp-1",
      email: DEMO_ADMIN_EMAIL,
      tenantId: "demo-tenant",
      roleCodes: ["tenant_owner"],
      workspaceAccessAllowed: true,
    },
  };
}

export function getDemoRoleByCredentials(identifier: string, password: string): "admin" | "employee" | null {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const normalizedPassword = password.trim();
  if (normalizedIdentifier === DEMO_ADMIN_EMAIL && normalizedPassword === DEMO_ADMIN_PASSWORD) {
    return "admin";
  }
  if (normalizedIdentifier === DEMO_EMPLOYEE_EMAIL && normalizedPassword === DEMO_EMPLOYEE_PASSWORD) {
    return "employee";
  }
  return null;
}

export function isDemoAccessToken(token?: string | null) {
  return token === DEMO_ADMIN_ACCESS_TOKEN || token === DEMO_EMPLOYEE_ACCESS_TOKEN;
}

export function isDemoRefreshToken(token?: string | null) {
  return token === DEMO_ADMIN_REFRESH_TOKEN || token === DEMO_EMPLOYEE_REFRESH_TOKEN;
}

export function getDemoRoleByToken(token?: string | null): "admin" | "employee" | null {
  if (token === DEMO_ADMIN_ACCESS_TOKEN || token === DEMO_ADMIN_REFRESH_TOKEN) {
    return "admin";
  }
  if (token === DEMO_EMPLOYEE_ACCESS_TOKEN || token === DEMO_EMPLOYEE_REFRESH_TOKEN) {
    return "employee";
  }
  return null;
}
