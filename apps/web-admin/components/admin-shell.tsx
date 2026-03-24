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
  Home,
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
  clearSession,
  hasDesktopAdminAccess,
  isEmployeeOnlyRole,
  isManagerOnlyRole,
  SESSION_EXPIRED_EVENT,
  SESSION_UPDATED_EVENT,
  getSession,
  redirectToLogin,
  resolveHomeRoute,
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

type OrganizationHeaderState = {
  company: {
    logoUrl?: string | null;
    name: string;
  } | null;
  configured: boolean;
};

type AccountProfile = {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
};

const ORGANIZATION_UPDATED_EVENT = "smart:organization-updated";

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
  onCreateAction,
  showTopbar = true,
  mode = "admin",
}: {
  createDialogActions?: CreateDialogAction[];
  children: ReactNode;
  onCreateAction?: () => void;
  showTopbar?: boolean;
  mode?: "admin" | "employee";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationItems, setNotificationItems] = useState<
    NotificationItem[]
  >([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [organization, setOrganization] =
    useState<OrganizationHeaderState | null>(null);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const languageOptions: Array<{
    value: Locale;
    label: string;
    icon: string;
  }> = [
    { value: "ru", label: "Русский", icon: "/ru.png" },
    { value: "en", label: "English", icon: "/en.png" },
  ];

  async function loadNotificationItems(accessToken: string) {
    const items = await apiRequest<NotificationItem[]>("/notifications/me", {
      token: accessToken,
    });
    setNotificationItems(items);
  }

  useEffect(() => {
    const currentSession = getSession();

    if (!currentSession) {
      redirectToLogin();
      return;
    }

    const resolvedHomeRoute = resolveHomeRoute(currentSession.user.roleCodes);

    if (mode === "employee") {
      router.replace(resolvedHomeRoute);
      return;
    }

    setSession(currentSession);
    setReady(true);
    void Promise.allSettled([
      apiRequest<NotificationUnreadResponse>("/notifications/me/unread-count", {
        token: currentSession.accessToken,
      }),
      apiRequest<NotificationItem[]>("/notifications/me", {
        token: currentSession.accessToken,
      }),
      apiRequest<Array<{ id: string }>>("/employees", {
        token: currentSession.accessToken,
      }),
      apiRequest<OrganizationHeaderState>("/org/setup", {
        token: currentSession.accessToken,
      }),
      apiRequest<AccountProfile | null>("/employees/me", {
        token: currentSession.accessToken,
      }),
    ]).then((results) => {
      setUnreadCount(
        results[0].status === "fulfilled" ? results[0].value.unreadCount : 0,
      );
      setNotificationItems(
        results[1].status === "fulfilled" ? results[1].value : [],
      );
      setEmployeeCount(
        results[2].status === "fulfilled" ? results[2].value.length : 0,
      );
      setOrganization(
        results[3].status === "fulfilled" ? results[3].value : null,
      );
      setAccountProfile(
        results[4].status === "fulfilled" ? results[4].value : null,
      );
    });
  }, [mode, router]);

  useEffect(() => {
    if (!session) return;

    const socket = createNotificationsSocket(session.accessToken);
    socket.on("notifications:new", (payload: NotificationItem) => {
      setNotificationItems((current) => [
        payload,
        ...current.filter((item) => item.id !== payload.id),
      ]);
      if (!payload.isRead) {
        setUnreadCount((current) => current + 1);
      }
    });
    socket.on(
      "notifications:unread-count",
      (payload: NotificationUnreadResponse) => {
        setUnreadCount(payload.unreadCount);
        void loadNotificationItems(session.accessToken);
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const currentSession = session;

    function handleOrganizationUpdated(event: Event) {
      const customEvent = event as CustomEvent<OrganizationHeaderState | null>;
      const detail = customEvent.detail;

      if (detail) {
        setOrganization(detail);
        return;
      }

      void apiRequest<OrganizationHeaderState>("/org/setup", {
        token: currentSession.accessToken,
      })
        .then(setOrganization)
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
  }, [session]);

  useEffect(() => {
    setNotificationsOpen(false);
    setAccountMenuOpen(false);
    setRouteLoading(false);
  }, [pathname]);

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
      {
        href: scheduleHref,
        label: locale === "ru" ? "Календарь" : "Calendar",
        icon: BriefcaseBusiness,
      },
    ];

    if (!managerOnly) {
      items.splice(1, 0, {
        href: toAdminHref("/organization"),
        label: locale === "ru" ? "Организация" : "Organization",
        icon: Building2,
      });
      items.splice(2, 0, {
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
          {
            href: toAdminHref("/payroll"),
            label: locale === "ru" ? "Зарплата" : "Payroll",
            icon: Wallet,
          },
        ],
      });
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
  }, [employeeOnly, homeHref, locale, managerOnly, scheduleHref, t]);

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

  function handleRouteStart(href?: string | null) {
    if (!href || isActive(pathname, href)) {
      return;
    }

    setNotificationsOpen(false);
    setAccountMenuOpen(false);
    setRouteLoading(true);
  }

  async function handleMarkRead(notificationId: string) {
    if (!session) return;

    const notification = notificationItems.find((item) => item.id === notificationId);

    await apiRequest(`/notifications/${notificationId}/read`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({}),
    });

    setNotificationItems((current) =>
      current.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              isRead: true,
              readAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    if (notification && !notification.isRead) {
      setUnreadCount((current) => Math.max(0, current - 1));
    }
  }

  async function handleMarkAllRead() {
    if (!session || !unreadNotifications.length) return;

    const unreadIds = unreadNotifications.map((item) => item.id);

    await Promise.allSettled(
      unreadIds.map((notificationId) =>
        apiRequest(`/notifications/${notificationId}/read`, {
          method: "POST",
          token: session.accessToken,
          body: JSON.stringify({}),
        }),
      ),
    );

    setNotificationItems((current) =>
      current.map((item) =>
        unreadIds.includes(item.id)
          ? {
              ...item,
              isRead: true,
              readAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setUnreadCount(0);
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
                    clearSession();
                    setSession(null);
                    redirectToLogin();
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
                {accountProfile?.avatarUrl ? (
                  <img
                    alt={profileName}
                    className="h-full w-full rounded-full object-cover"
                    src={accountProfile.avatarUrl}
                  />
                ) : (
                  <img
                    alt={profileName}
                    className="h-full w-full rounded-full object-cover"
                    src={getMockAvatarDataUrl(profileName)}
                  />
                )}
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
                  <div className="shell-topbar-meta">
                    <span className="shell-topbar-meta-item">
                      <UsersRound className="size-3.5" />
                      {employeeCount}{" "}
                      {locale === "ru" ? "сотрудников" : "employees"}
                    </span>
                  </div>
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
