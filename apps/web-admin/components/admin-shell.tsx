"use client";

import { NotificationItem, NotificationUnreadResponse } from "@smart/types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  ListTodo,
  ScanFace,
  Settings2,
  Sparkles,
  UsersRound,
  Wallet,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AuthSession,
  destroySession,
  hasManagerAccess,
  hasDesktopAdminAccess,
  isEmployeeOnlyRole,
  isManagerOnlyRole,
  SESSION_EXPIRED_EVENT,
  SESSION_UPDATED_EVENT,
  getSession,
  redirectToLogin,
  resolveHomeRoute,
  saveSession,
} from "../lib/auth";
import { toAdminHref } from "../lib/admin-routes";
import { apiRequest } from "../lib/api";
import { createNotificationsSocket } from "../lib/notifications-socket";
import { Locale, useI18n } from "../lib/i18n";
import { BrandWordmark } from "./brand-wordmark";
import { CreateDialog, type CreateDialogAction } from "./CreateDialog";
import { SessionLoader } from "./session-loader";
import { buildUserDisplayName, getDisplayInitials } from "../lib/profile-display";
import { getMockAvatarDataUrl } from "../lib/mock-avatar";
import {
  PROFILE_AVATAR_UPDATED_EVENT,
  readStoredProfileAvatar,
} from "../lib/profile-avatar";
import { readClientCache, writeClientCache } from "../lib/client-cache";
import {
  readWindowInitialShellBootstrap,
  type AccountProfile,
  type OrganizationHeaderState,
  type ShellBootstrapResponse,
  type ShellHeaderCachePayload,
  type ShellNotificationsCachePayload,
} from "../lib/shell-bootstrap";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  items?: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }>;
};

const ORGANIZATION_UPDATED_EVENT = "smart:organization-updated";
const SHELL_HEADER_CACHE_TTL_MS = 10 * 60 * 1000;
const SHELL_NOTIFICATIONS_CACHE_TTL_MS = 45 * 1000;

function buildShellHeaderCacheKey(
  session: AuthSession,
  mode: "admin" | "employee",
) {
  return `shell:header:${mode}:${session.user.tenantId}:${session.user.id}`;
}

function buildShellNotificationsCacheKey(session: AuthSession) {
  return `shell:notifications:${session.user.tenantId}:${session.user.id}`;
}

function isActive(pathname: string, href: string) {
  if (href === toAdminHref("/")) return pathname === toAdminHref("/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolveSidebarRoleLabel(roleCodes: string[], locale: Locale) {
  if (
    roleCodes.includes("tenant_owner") ||
    roleCodes.includes("operations_admin")
  ) {
    return locale === "ru" ? "Администратор" : "Administrator";
  }
  if (roleCodes.includes("hr_admin")) {
    return locale === "ru" ? "HR администратор" : "HR administrator";
  }
  if (roleCodes.includes("manager")) {
    return locale === "ru" ? "Менеджер" : "Manager";
  }
  if (roleCodes.includes("employee")) {
    return locale === "ru" ? "Сотрудник" : "Employee";
  }
  return locale === "ru" ? "Пользователь" : "User";
}

function formatNotificationTimestamp(value: string, locale: Locale) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hasStudioBackground(pathname: string) {
  return Boolean(pathname);
}

export function AdminShell({
  createDialogActions,
  children,
  initialSession = null,
  onCreateAction,
  showTopbar = true,
  mode = "admin",
}: {
  createDialogActions?: CreateDialogAction[];
  children: ReactNode;
  initialSession?: AuthSession | null;
  onCreateAction?: () => void;
  showTopbar?: boolean;
  mode?: "admin" | "employee";
}) {
  const initialShellBootstrap =
    initialSession &&
    (() => {
      const bootstrap = readWindowInitialShellBootstrap();
      if (!bootstrap) return null;
      if (bootstrap.userId !== initialSession.user.id) return null;
      if (bootstrap.tenantId !== initialSession.user.tenantId) return null;
      if (bootstrap.mode !== mode) return null;
      return bootstrap;
    })();
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const [session, setSession] = useState<AuthSession | null>(initialSession);
  const [unreadCount, setUnreadCount] = useState(
    initialShellBootstrap?.notifications?.unreadCount ?? 0,
  );
  const [notificationItems, setNotificationItems] = useState<
    NotificationItem[]
  >(initialShellBootstrap?.notifications?.notificationItems ?? []);
  const [employeeCount, setEmployeeCount] = useState(
    initialShellBootstrap?.header?.employeeCount ?? 0,
  );
  const [organization, setOrganization] =
    useState<OrganizationHeaderState | null>(
      initialShellBootstrap?.header?.organization ?? null,
    );
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(
    initialShellBootstrap?.header?.accountProfile ?? null,
  );
  const [storedAvatarUrl, setStoredAvatarUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(Boolean(initialSession));
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const routeLoadingTimerRef = useRef<number | null>(null);
  const shellHeaderCacheKey = useMemo(
    () => (session ? buildShellHeaderCacheKey(session, mode) : null),
    [mode, session],
  );
  const shellNotificationsCacheKey = useMemo(
    () => (session ? buildShellNotificationsCacheKey(session) : null),
    [session],
  );
  const languageOptions: Array<{
    value: Locale;
    label: string;
    icon: string;
  }> = [
    { value: "ru", label: "Русский", icon: "/ru.png" },
    { value: "en", label: "English", icon: "/en.png" },
  ];

  function applyHeaderSnapshot(
    snapshot: ShellHeaderCachePayload,
    cacheKey?: string | null,
  ) {
    setEmployeeCount(snapshot.employeeCount);
    setOrganization(snapshot.organization);
    setAccountProfile(snapshot.accountProfile);

    if (cacheKey) {
      writeClientCache(cacheKey, snapshot);
    }
  }

  function applyNotificationsSnapshot(
    snapshot: ShellNotificationsCachePayload,
    cacheKey?: string | null,
  ) {
    setUnreadCount(snapshot.unreadCount);
    setNotificationItems(snapshot.notificationItems);

    if (cacheKey) {
      writeClientCache(cacheKey, snapshot);
    }
  }

  async function loadNotificationItems(accessToken: string) {
    const items = await apiRequest<NotificationItem[]>("/notifications/me", {
      token: accessToken,
    });
    setNotificationItems(items);
    return items;
  }

  useEffect(() => {
    const currentSession = getSession() ?? initialSession;

    if (!currentSession) {
      redirectToLogin();
      return;
    }

    if (!getSession()) {
      saveSession(currentSession);
    }

    const resolvedHomeRoute = resolveHomeRoute(currentSession.user.roleCodes);
    const employeeOnlySession = isEmployeeOnlyRole(currentSession.user.roleCodes);
    const headerCacheKey = buildShellHeaderCacheKey(currentSession, mode);
    const notificationsCacheKey =
      buildShellNotificationsCacheKey(currentSession);
    const cachedHeader = readClientCache<ShellHeaderCachePayload>(
      headerCacheKey,
      SHELL_HEADER_CACHE_TTL_MS,
    );
    const cachedNotifications =
      readClientCache<ShellNotificationsCachePayload>(
        notificationsCacheKey,
        SHELL_NOTIFICATIONS_CACHE_TTL_MS,
      );
    const effectiveHeader =
      cachedHeader ??
      (initialShellBootstrap?.header
        ? {
            value: initialShellBootstrap.header,
            storedAt: Date.now(),
            isStale: false,
          }
        : null);
    const effectiveNotifications =
      cachedNotifications ??
      (initialShellBootstrap?.notifications
        ? {
            value: initialShellBootstrap.notifications,
            storedAt: Date.now(),
            isStale: false,
          }
        : null);
    const shouldRefreshHeader = !effectiveHeader || effectiveHeader.isStale;
    const shouldRefreshNotifications =
      !effectiveNotifications || effectiveNotifications.isStale;

    if (effectiveHeader) {
      applyHeaderSnapshot(effectiveHeader.value, headerCacheKey);
    }

    if (effectiveNotifications) {
      applyNotificationsSnapshot(
        effectiveNotifications.value,
        notificationsCacheKey,
      );
    }

    setStoredAvatarUrl(readStoredProfileAvatar());

    if (mode === "employee") {
      if (!employeeOnlySession) {
        router.replace(resolvedHomeRoute);
        return;
      }

      setSession(currentSession);
      setReady(true);

      if (shouldRefreshHeader || shouldRefreshNotifications) {
        void apiRequest<ShellBootstrapResponse>("/auth/bootstrap", {
          token: currentSession.accessToken,
        })
          .then((snapshot) => {
            if (snapshot.header) {
              applyHeaderSnapshot(snapshot.header, headerCacheKey);
            }

            if (snapshot.notifications) {
              applyNotificationsSnapshot(
                snapshot.notifications,
                notificationsCacheKey,
              );
            }
          })
          .catch(() => undefined);
      }
      return;
    }

    if (employeeOnlySession) {
      router.replace(resolvedHomeRoute);
      return;
    }

    setSession(currentSession);
    setReady(true);

    if (shouldRefreshHeader || shouldRefreshNotifications) {
      void apiRequest<ShellBootstrapResponse>("/auth/bootstrap", {
        token: currentSession.accessToken,
      })
        .then((snapshot) => {
          if (snapshot.header) {
            applyHeaderSnapshot(snapshot.header, headerCacheKey);
          }

          if (snapshot.notifications) {
            applyNotificationsSnapshot(
              snapshot.notifications,
              notificationsCacheKey,
            );
          }
        })
        .catch(() => undefined);
    }
  }, [initialSession, initialShellBootstrap, mode, router]);

  useEffect(() => {
    setStoredAvatarUrl(readStoredProfileAvatar());

    function handleAvatarUpdated(event: Event) {
      const customEvent = event as CustomEvent<string | null>;
      setStoredAvatarUrl(customEvent.detail ?? readStoredProfileAvatar());
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === null || event.key === "smart-admin-profile-avatar") {
        setStoredAvatarUrl(readStoredProfileAvatar());
      }
    }

    window.addEventListener(
      PROFILE_AVATAR_UPDATED_EVENT,
      handleAvatarUpdated as EventListener,
    );
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        PROFILE_AVATAR_UPDATED_EVENT,
        handleAvatarUpdated as EventListener,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    const socket = createNotificationsSocket(session.accessToken);
    socket.on("notifications:new", (payload: NotificationItem) => {
      setNotificationItems((current) => {
        const nextItems = [
          payload,
          ...current.filter((item) => item.id !== payload.id),
        ];
        setUnreadCount((currentUnread) => {
          const nextUnread = payload.isRead ? currentUnread : currentUnread + 1;
          writeClientCache(buildShellNotificationsCacheKey(session), {
            unreadCount: nextUnread,
            notificationItems: nextItems,
          });
          return nextUnread;
        });
        return nextItems;
      });
    });
    socket.on(
      "notifications:unread-count",
      (payload: NotificationUnreadResponse) => {
        void loadNotificationItems(session.accessToken).then((items) => {
          applyNotificationsSnapshot(
            {
              unreadCount: payload.unreadCount,
              notificationItems: items,
            },
            buildShellNotificationsCacheKey(session),
          );
        });
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [session]);

  useEffect(() => {
    if (!session || isEmployeeOnlyRole(session.user.roleCodes)) return;
    const currentSession = session;

    function handleOrganizationUpdated(event: Event) {
      const customEvent = event as CustomEvent<OrganizationHeaderState | null>;
      const detail = customEvent.detail;

      if (detail) {
        applyHeaderSnapshot(
          {
            employeeCount,
            organization: detail,
            accountProfile,
          },
          shellHeaderCacheKey,
        );
        return;
      }

      void apiRequest<OrganizationHeaderState>("/org/setup", {
        token: currentSession.accessToken,
      })
        .then((nextOrganization) => {
          applyHeaderSnapshot(
            {
              employeeCount,
              organization: nextOrganization,
              accountProfile,
            },
            shellHeaderCacheKey,
          );
        })
        .catch(() => undefined);
    }

    window.addEventListener(
      ORGANIZATION_UPDATED_EVENT,
      handleOrganizationUpdated as EventListener,
    );

    return () => {
      window.removeEventListener(
        ORGANIZATION_UPDATED_EVENT,
        handleOrganizationUpdated as EventListener,
      );
    };
  }, [accountProfile, employeeCount, session, shellHeaderCacheKey]);

  useEffect(() => {
    clearRouteLoadingTimer();
    setNotificationsOpen(false);
    setAccountMenuOpen(false);
    setRouteLoading(false);
  }, [pathname]);

  useEffect(() => {
    return () => {
      clearRouteLoadingTimer();
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen && !accountMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        notificationsOpen &&
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }

      if (
        accountMenuOpen &&
        accountMenuRef.current &&
        !accountMenuRef.current.contains(target)
      ) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [notificationsOpen, accountMenuOpen]);

  useEffect(() => {
    function handleSessionUpdated(event: Event) {
      const customEvent = event as CustomEvent<AuthSession | null>;
      const nextSession = customEvent.detail ?? getSession();
      if (nextSession) {
        setSession(nextSession);
      }
    }

    function handleSessionExpired() {
      setSession(null);
      setReady(false);
      redirectToLogin();
    }

    window.addEventListener(SESSION_UPDATED_EVENT, handleSessionUpdated as EventListener);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(SESSION_UPDATED_EVENT, handleSessionUpdated as EventListener);
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [router]);

  const managerOnly = session
    ? isManagerOnlyRole(session.user.roleCodes)
    : false;
  const employeeOnly = session
    ? isEmployeeOnlyRole(session.user.roleCodes)
    : false;
  const canUseDesktopAdminTools = session
    ? hasDesktopAdminAccess(session.user.roleCodes)
    : false;
  const homeHref = toAdminHref("/");
  const scheduleHref = toAdminHref("/schedule");
  const tasksHref = toAdminHref("/tasks");
  const newsHref = toAdminHref("/news");
  const profileHref = toAdminHref("/profile");
  const notificationsHref = toAdminHref("/notifications");
  const contentHasStudioBackground = hasStudioBackground(pathname);

  const navItems = useMemo<NavItem[]>(() => {
    if (employeeOnly) {
      return [
        {
          href: homeHref,
          label: locale === "ru" ? "Главная" : "Home",
          icon: Home,
        },
        {
          href: newsHref,
          label: locale === "ru" ? "Новости" : "News",
          icon: FileText,
        },
        {
          href: scheduleHref,
          label: locale === "ru" ? "Календарь" : "Calendar",
          icon: BriefcaseBusiness,
        },
      ];
    }

    const items: NavItem[] = [
      {
        href: homeHref,
        label: locale === "ru" ? "Главная" : "Home",
        icon: Home,
      },
    ];

    if (hasManagerAccess(session?.user.roleCodes ?? [])) {
      items.push({
        href: tasksHref,
        label: locale === "ru" ? "Задачи" : "Tasks",
        icon: ListTodo,
      });
    }

    items.push({
      href: newsHref,
      label: locale === "ru" ? "Новости" : "News",
      icon: FileText,
    });

    if (!managerOnly) {
      items.push({
        href: toAdminHref("/employees"),
        label: t("nav.employees"),
        icon: UsersRound,
        items: [
          {
            href: toAdminHref("/attendance"),
            label: locale === "ru" ? "Посещаемость" : "Attendance",
            icon: CalendarRange,
          },
          {
            href: toAdminHref("/biometric"),
            label: locale === "ru" ? "Биометрия" : "Biometric",
            icon: ScanFace,
          },
        ],
      });
    }

    items.push({
      href: scheduleHref,
      label: locale === "ru" ? "Календарь" : "Calendar",
      icon: BriefcaseBusiness,
    });

    if (!managerOnly) {
      items.push(
        {
          href: toAdminHref("/requests"),
          label: locale === "ru" ? "Запросы" : "Requests",
          icon: Sparkles,
        },
        {
          href: toAdminHref("/analytics"),
          label: locale === "ru" ? "Аналитика" : "Analytics",
          icon: BarChart3,
        },
      );
    }

    return items;
  }, [employeeOnly, homeHref, locale, managerOnly, newsHref, scheduleHref, session?.user.roleCodes, t, tasksHref]);

  useEffect(() => {
    const nextExpanded = Object.fromEntries(
      navItems.map((item) => [
        item.href,
        isActive(pathname, item.href) ||
          item.items?.some((subItem) => isActive(pathname, subItem.href)) ||
          false,
      ]),
    );
    setExpandedItems((current) => ({ ...nextExpanded, ...current }));
  }, [navItems, pathname]);

  const profileName = session
    ? buildUserDisplayName(
        accountProfile?.firstName,
        accountProfile?.lastName,
        session.user.email
          .split("@")[0]
          .replace(/[._-]+/g, " ")
          .trim(),
      )
    : "";
  const profileRole = session
    ? resolveSidebarRoleLabel(session.user.roleCodes, locale)
    : "";
  const companyName =
    organization?.company?.name?.trim() ||
    (locale === "ru" ? "Организация" : "Organization");
  const companyLogoUrl = organization?.company?.logoUrl ?? null;
  const resolvedProfileAvatarUrl = accountProfile?.avatarUrl || storedAvatarUrl;
  const [profileAvatarFailed, setProfileAvatarFailed] = useState(false);
  const unreadNotifications = notificationItems.filter((item) => !item.isRead);
  const readNotifications = notificationItems.filter((item) => item.isRead);
  const accountMenuItems = employeeOnly
    ? [
      {
        href: profileHref,
        label: locale === "ru" ? "Профиль" : "Profile",
      },
    ]
    : [
        {
          href: toAdminHref("/organization"),
          label: locale === "ru" ? "Организация" : "Organization",
        },
        {
          href: profileHref,
          label: locale === "ru" ? "Профиль" : "Profile",
        },
        ...(canUseDesktopAdminTools
          ? [
              {
                href: toAdminHref("/organization"),
                label: locale === "ru" ? "Настройки" : "Settings",
              },
              {
                href: toAdminHref("/diagnostics"),
                label: locale === "ru" ? "Диагностика" : "Diagnostics",
              },
            ]
          : []),
      ];
  const prefetchRoutes = useMemo(() => {
    const routes = new Set<string>();

    for (const item of navItems) {
      routes.add(item.href);
      for (const subItem of item.items ?? []) {
        routes.add(subItem.href);
      }
    }

    for (const item of accountMenuItems) {
      routes.add(item.href);
    }

    routes.add(profileHref);
    routes.add(notificationsHref);

    return Array.from(routes).filter((href) => !isActive(pathname, href));
  }, [accountMenuItems, navItems, notificationsHref, pathname, profileHref]);

  useEffect(() => {
    if (!prefetchRoutes.length) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

    const prefetch = () => {
      if (cancelled) {
        return;
      }

      for (const href of prefetchRoutes.slice(0, 8)) {
        void router.prefetch(href);
      }
    };

    if ("requestIdleCallback" in window) {
      const idleWindow = window as Window &
        typeof globalThis & {
          cancelIdleCallback: (handle: number) => void;
          requestIdleCallback: (
            callback: IdleRequestCallback,
            options?: IdleRequestOptions,
          ) => number;
        };
      const idleCallback = idleWindow.requestIdleCallback(prefetch, {
        timeout: 1500,
      });

      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback(idleCallback);
      };
    }

    timeoutId = globalThis.setTimeout(prefetch, 450);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [prefetchRoutes, router]);

  useEffect(() => {
    setProfileAvatarFailed(false);
  }, [resolvedProfileAvatarUrl]);

  const sidebarAvatarSrc =
    resolvedProfileAvatarUrl && !profileAvatarFailed
      ? resolvedProfileAvatarUrl
      : getMockAvatarDataUrl(profileName);

  function resolveNotificationHref(actionUrl: string | null) {
    if (!actionUrl) return notificationsHref;
    if (
      actionUrl.startsWith("/app") ||
      actionUrl.startsWith("/employee") ||
      actionUrl.startsWith("/login")
    ) {
      return actionUrl;
    }
    if (actionUrl.startsWith("/")) {
      return toAdminHref(actionUrl);
    }
    return notificationsHref;
  }

  function clearRouteLoadingTimer() {
    if (routeLoadingTimerRef.current !== null) {
      window.clearTimeout(routeLoadingTimerRef.current);
      routeLoadingTimerRef.current = null;
    }
  }

  function handleRouteStart(href?: string | null) {
    if (!href || isActive(pathname, href)) {
      return;
    }

    void router.prefetch(href);
    setNotificationsOpen(false);
    setAccountMenuOpen(false);
    clearRouteLoadingTimer();
    routeLoadingTimerRef.current = window.setTimeout(() => {
      setRouteLoading(true);
      routeLoadingTimerRef.current = null;
    }, 180);
  }

  async function handleMarkRead(notificationId: string) {
    if (!session) return;

    const notification = notificationItems.find((item) => item.id === notificationId);
    const nextReadAt = new Date().toISOString();
    const nextItems = notificationItems.map((item) =>
      item.id === notificationId
        ? {
            ...item,
            isRead: true,
            readAt: nextReadAt,
          }
        : item,
    );

    await apiRequest(`/notifications/${notificationId}/read`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({}),
    });

    setNotificationItems(nextItems);

    if (notification && !notification.isRead) {
      const nextUnread = Math.max(0, unreadCount - 1);
      setUnreadCount(nextUnread);
      if (shellNotificationsCacheKey) {
        writeClientCache(shellNotificationsCacheKey, {
          unreadCount: nextUnread,
          notificationItems: nextItems,
        });
      }
      return;
    }

    if (shellNotificationsCacheKey) {
      writeClientCache(shellNotificationsCacheKey, {
        unreadCount,
        notificationItems: nextItems,
      });
    }
  }

  async function handleMarkAllRead() {
    if (!session || !unreadNotifications.length) return;

    const unreadIds = unreadNotifications.map((item) => item.id);
    const nextReadAt = new Date().toISOString();
    const nextItems = notificationItems.map((item) =>
      unreadIds.includes(item.id)
        ? {
            ...item,
            isRead: true,
            readAt: nextReadAt,
          }
        : item,
    );

    await Promise.allSettled(
      unreadIds.map((notificationId) =>
        apiRequest(`/notifications/${notificationId}/read`, {
          method: "POST",
          token: session.accessToken,
          body: JSON.stringify({}),
        }),
      ),
    );

    setNotificationItems(nextItems);
    setUnreadCount(0);
    if (shellNotificationsCacheKey) {
      writeClientCache(shellNotificationsCacheKey, {
        unreadCount: 0,
        notificationItems: nextItems,
      });
    }
  }

  if (!ready || !session) {
    return <SessionLoader label={t("common.checkingSession")} />;
  }

  return (
    <div className="admin-frame">
      <CreateDialog
        actions={createDialogActions}
        onOpenChange={setCreateOpen}
        open={createOpen}
      />

      <aside className="sidebar sidebar-untitled">
        <div className="sidebar-brand sidebar-untitled-brand">
          <img alt="" className="sidebar-brand-icon" src="/waving.png" />
          <div className="sidebar-untitled-brand-row">
            <BrandWordmark className="text-[1.5rem]" />
            <div
              className="sidebar-flag-switch"
              role="group"
              aria-label={t("common.language")}
            >
              {languageOptions.map((option) => (
                <button
                  aria-label={option.label}
                  className={`sidebar-flag-button ${locale === option.value ? "is-active" : ""}`}
                  key={option.value}
                  onClick={() => setLocale(option.value)}
                  title={option.label}
                  type="button"
                >
                  <img
                    alt={option.label}
                    className="sidebar-flag-icon"
                    src={option.icon}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav sidebar-nav-untitled">
          {navItems.map((item) => {
            const Icon = item.icon;
            const hasChildren = Boolean(item.items?.length);
            const isOpen = expandedItems[item.href];
            const parentActive =
              isActive(pathname, item.href) ||
              item.items?.some((subItem) => isActive(pathname, subItem.href));

            return (
              <div className="sidebar-nav-group" key={item.href}>
                <div
                  className={`sidebar-link sidebar-link-untitled ${parentActive ? "is-active" : ""}`}
                >
                  {item.href === notificationsHref ? (
                    <button
                      className="sidebar-link-main"
                      onClick={() => setNotificationsOpen(true)}
                      type="button"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="size-4" />
                        {item.label}
                      </span>
                      {typeof item.count === "number" && item.count > 0 ? (
                        <span className="sidebar-count-pill">{item.count}</span>
                      ) : null}
                    </button>
                  ) : (
                    <Link
                      className="sidebar-link-main"
                      href={item.href}
                      onClick={() => handleRouteStart(item.href)}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="size-4" />
                        {item.label}
                      </span>
                      {typeof item.count === "number" && item.count > 0 ? (
                        <span className="sidebar-count-pill">{item.count}</span>
                      ) : null}
                    </Link>
                  )}

                  {hasChildren ? (
                    <button
                      className="sidebar-expand-toggle"
                      onClick={() =>
                        setExpandedItems((current) => ({
                          ...current,
                          [item.href]: !current[item.href],
                        }))
                      }
                      type="button"
                    >
                      {isOpen ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                  ) : null}
                </div>

                {hasChildren && isOpen ? (
                  <div className="sidebar-subnav">
                    {item.items!.map((subItem) => {
                      const SubIcon = subItem.icon;
                      return subItem.href === notificationsHref ? (
                        <button
                          className={`sidebar-sublink ${isActive(pathname, subItem.href) ? "is-active" : ""}`}
                          key={subItem.href}
                          onClick={() => setNotificationsOpen(true)}
                          type="button"
                        >
                          <span className="flex items-center gap-3">
                            <SubIcon className="size-4" />
                            {subItem.label}
                          </span>
                          {typeof subItem.count === "number" &&
                          subItem.count > 0 ? (
                            <span className="sidebar-count-pill">
                              {subItem.count}
                            </span>
                          ) : null}
                        </button>
                      ) : (
                        <Link
                          className={`sidebar-sublink ${isActive(pathname, subItem.href) ? "is-active" : ""}`}
                          href={subItem.href}
                          key={subItem.href}
                          onClick={() => handleRouteStart(subItem.href)}
                        >
                          <span className="flex items-center gap-3">
                            <SubIcon className="size-4" />
                            {subItem.label}
                          </span>
                          {typeof subItem.count === "number" &&
                          subItem.count > 0 ? (
                            <span className="sidebar-count-pill">
                              {subItem.count}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer-untitled">
          <div className="sidebar-user-wrap" ref={accountMenuRef}>
            {accountMenuOpen ? (
              <div className="sidebar-user-menu">
                {accountMenuItems.map((item) => (
                  <Link
                    className="sidebar-user-menu-item"
                    href={item.href}
                    key={item.href}
                    onClick={() => {
                      setAccountMenuOpen(false);
                      handleRouteStart(item.href);
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  className="sidebar-user-menu-item is-danger"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    void destroySession().finally(() => {
                      setSession(null);
                      redirectToLogin();
                    });
                  }}
                  type="button"
                >
                  {locale === "ru" ? "Выйти" : "Sign out"}
                </button>
              </div>
            ) : null}

            <button
              className="sidebar-user-card"
              onClick={() => setAccountMenuOpen((current) => !current)}
              type="button"
            >
              <div className="sidebar-user-avatar">
                <img
                  alt={profileName}
                  className="h-full w-full rounded-full object-cover"
                  onError={() => setProfileAvatarFailed(true)}
                  src={sidebarAvatarSrc}
                />
              </div>
              <div className="sidebar-user-copy">
                <strong>{profileName}</strong>
                <span>{profileRole}</span>
              </div>
              <span className="sidebar-expand-toggle">
                {accountMenuOpen ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </span>
            </button>
          </div>
        </div>
      </aside>

      <section
        className={`admin-content${contentHasStudioBackground ? " has-studio-background" : ""}`}
      >
        <div className={`shell-stage${routeLoading ? " is-route-loading" : ""}`}>
          {showTopbar ? (
            <header className="shell-topbar">
              <div className="shell-topbar-main">
                <div className="shell-topbar-brandmark">
                  {companyLogoUrl ? (
                    <img alt={companyName} src={companyLogoUrl} />
                  ) : (
                    <Building2 className="size-5" />
                  )}
                </div>
                <div className="shell-topbar-copy">
                  <strong>{companyName}</strong>
                  {!employeeOnly ? (
                    <div className="shell-topbar-meta">
                      <span className="shell-topbar-meta-item">
                        <UsersRound className="size-3.5" />
                        {employeeCount}{" "}
                        {locale === "ru" ? "сотрудников" : "employees"}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="shell-topbar-actions">
                {canUseDesktopAdminTools ? (
                  <Button
                    asChild
                    className="rounded-2xl"
                    size="sm"
                    variant="ghost"
                  >
                    <Link
                      href={toAdminHref("/organization")}
                      onClick={() => handleRouteStart(toAdminHref("/organization"))}
                    >
                      <Settings2 className="size-4" />
                      {locale === "ru"
                        ? "Управление компанией"
                        : "Company settings"}
                    </Link>
                  </Button>
                ) : null}
                <div className="relative" ref={notificationsRef}>
                  <Button
                    aria-label={
                      locale === "ru" ? "Уведомления" : "Notifications"
                    }
                    className="relative rounded-2xl"
                    onClick={() => setNotificationsOpen((current) => !current)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Bell className="size-4" />
                    {unreadCount > 0 ? (
                      <span className="shell-topbar-notice">{unreadCount}</span>
                    ) : null}
                  </Button>

                  {notificationsOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 grid w-[min(380px,calc(100vw-2rem))] gap-4 rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.98)] p-4 shadow-[0_26px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid gap-1">
                          <strong className="text-sm text-[color:var(--foreground)]">
                            {locale === "ru"
                              ? "Уведомления"
                              : "Notifications"}
                          </strong>
                          <span className="text-xs text-[color:var(--muted-foreground)]">
                            {locale === "ru"
                              ? `${unreadCount} новых`
                              : `${unreadCount} unread`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {unreadNotifications.length ? (
                            <button
                              className="text-xs font-medium text-[color:var(--accent)]"
                              onClick={() => void handleMarkAllRead()}
                              type="button"
                            >
                              {locale === "ru" ? "Прочитать все" : "Dismiss all"}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid max-h-[min(70vh,560px)] gap-3 overflow-y-auto scrollbar-hide pr-1">
                        {unreadNotifications.length ? (
                          <div className="grid gap-1">
                            {unreadNotifications.map((item, index) => (
                              <div className="grid gap-3 px-2 py-2" key={item.id}>
                                <div className="flex items-start justify-between gap-3">
                                  <Link
                                    className="grid min-w-0 flex-1 gap-1"
                                    href={resolveNotificationHref(item.actionUrl)}
                                    onClick={() => {
                                      setNotificationsOpen(false);
                                      handleRouteStart(resolveNotificationHref(item.actionUrl));
                                    }}
                                  >
                                    <strong className="text-sm leading-5 text-[color:var(--foreground)]">
                                      {item.title}
                                    </strong>
                                    {item.body ? (
                                      <p className="text-sm leading-5 text-[color:var(--muted-foreground)]">
                                        {item.body}
                                      </p>
                                    ) : null}
                                    <span className="text-xs text-[color:var(--muted-foreground)]">
                                      {formatNotificationTimestamp(
                                        item.createdAt,
                                        locale,
                                      )}
                                    </span>
                                  </Link>

                                  <button
                                    aria-label={
                                      locale === "ru"
                                        ? "Отметить прочитанным"
                                        : "Mark as read"
                                    }
                                    className="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium text-[color:var(--accent)] transition hover:bg-[rgba(40,75,255,0.08)]"
                                    onClick={() =>
                                      void handleMarkRead(item.id)
                                    }
                                    type="button"
                                  >
                                    {locale === "ru" ? "Убрать" : "Dismiss"}
                                  </button>
                                </div>
                                {index < unreadNotifications.length - 1 ? (
                                  <Separator />
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {readNotifications.length ? (
                          <>
                            {unreadNotifications.length ? <Separator /> : null}
                            <div className="grid gap-1 opacity-45">
                              {readNotifications.map((item, index) => (
                                <div className="grid gap-3 px-2 py-2" key={item.id}>
                                  <Link
                                    className="grid min-w-0 gap-1"
                                    href={resolveNotificationHref(item.actionUrl)}
                                    onClick={() => {
                                      setNotificationsOpen(false);
                                      handleRouteStart(resolveNotificationHref(item.actionUrl));
                                    }}
                                  >
                                    <strong className="text-sm leading-5 text-[color:var(--foreground)]">
                                      {item.title}
                                    </strong>
                                    {item.body ? (
                                      <p className="text-sm leading-5 text-[color:var(--muted-foreground)]">
                                        {item.body}
                                      </p>
                                    ) : null}
                                    <span className="text-xs text-[color:var(--muted-foreground)]">
                                      {formatNotificationTimestamp(
                                        item.createdAt,
                                        locale,
                                      )}
                                    </span>
                                  </Link>
                                  {index < readNotifications.length - 1 ? (
                                    <Separator />
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </>
                        ) : null}

                        {!unreadNotifications.length && !readNotifications.length ? (
                          <div className="rounded-[18px] border border-dashed border-[color:var(--border)] bg-[rgba(246,248,252,0.72)] px-4 py-6 text-sm text-[color:var(--muted-foreground)]">
                            {locale === "ru"
                              ? "Уведомлений нет."
                              : "No notifications yet."}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
                {createDialogActions?.length || onCreateAction ? (
                  <Button
                    className="rounded-2xl px-5"
                    onClick={() => {
                      if (onCreateAction) {
                        onCreateAction();
                        return;
                      }
                      setCreateOpen(true);
                    }}
                    type="button"
                  >
                    <Plus className="size-4" />
                    {locale === "ru" ? "Создать" : "Create"}
                  </Button>
                ) : null}
              </div>
            </header>
          ) : null}

          {children}
          {routeLoading ? (
            <div className="shell-route-loader" aria-live="polite" role="status">
              <div className="session-loader">
                <span aria-hidden="true" className="session-loader-glow" />
                <span
                  aria-hidden="true"
                  className="session-loader-ring session-loader-ring-primary"
                />
                <span
                  aria-hidden="true"
                  className="session-loader-ring session-loader-ring-secondary"
                />
                <span aria-hidden="true" className="session-loader-core" />
                <span className="sr-only">
                  {locale === "ru" ? "Открываю страницу" : "Opening page"}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
