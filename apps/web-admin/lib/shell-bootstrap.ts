import type { NotificationItem } from "@smart/types";

export type OrganizationHeaderState = {
  company: {
    logoUrl?: string | null;
    name: string;
  } | null;
  configured: boolean;
};

export type AccountProfile = {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  company?: {
    name?: string | null;
    logoUrl?: string | null;
  } | null;
};

export type ShellHeaderCachePayload = {
  employeeCount: number;
  organization: OrganizationHeaderState | null;
  accountProfile: AccountProfile | null;
};

export type ShellNotificationsCachePayload = {
  unreadCount: number;
  notificationItems: NotificationItem[];
};

export type ShellBootstrapResponse = {
  header: ShellHeaderCachePayload | null;
  notifications: ShellNotificationsCachePayload | null;
};

export type InitialShellBootstrap = {
  header: ShellHeaderCachePayload | null;
  mode: "admin" | "employee";
  notifications: ShellNotificationsCachePayload | null;
  tenantId: string;
  userId: string;
};

declare global {
  interface Window {
    __SMART_INITIAL_SHELL__?: InitialShellBootstrap | null;
  }
}

export function readWindowInitialShellBootstrap() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.__SMART_INITIAL_SHELL__ ?? null;
}
