"use client";

import { NotificationItem, NotificationUnreadResponse } from "@smart/types";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  ListTodo,
  ScanFace,
  Settings2,
  Trophy,
  UsersRound,
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
import { getAvatarInitials } from "../lib/avatar-placeholder";
import { BrandWordmark } from "./brand-wordmark";
import { AdminShellLoadingSidebar } from "./admin-shell-loading-sidebar";
import { useAdminShellState } from "./admin-shell-state-provider";
import { CreateDialog, type CreateDialogAction } from "./CreateDialog";
import { HeaderEmployeeCreateDialog } from "./header-employee-create-dialog";
import { HeaderNewsCreateDialog } from "./header-news-create-dialog";
import { HeaderShiftCreateDialog } from "./header-shift-create-dialog";
import { HeaderTaskCreateDialog } from "./header-task-create-dialog";
import { buildUserDisplayName } from "../lib/profile-display";
import { localizePersonName } from "../lib/transliteration";
import { DEMO_ADMIN_EMAIL } from "../lib/demo-mode";
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
import {
  shouldHandleRouteClick,
  type RouteClickEvent,
} from "../lib/navigation";
import { primeWorkspaceExperience } from "../lib/workspace-warmup";
import { CHUNK_PENDING_ROUTE_STORAGE_KEY } from "../lib/chunk-load-recovery";
import {
  isOrganizationSetupAllowedPath,
  ORGANIZATION_SETUP_REQUIRED_EVENT,
  ORGANIZATION_SETUP_REQUIRED_STORAGE_KEY,
} from "../lib/organization-setup";
import { WorkspaceLoading } from "./workspace-loading";

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
const DEMO_COMPANY_NAME_EN = "Beauty Saloon";
const DEMO_COMPANY_NAME_RU = "Салон Красоты";
const DEMO_HEADER_EMPLOYEE_COUNT = 16;

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

function resolveShellPageTitle(pathname: string, locale: Locale) {
  const titles = [
    {
      href: toAdminHref("/news/archive"),
      label: locale === "ru" ? "Архив новостей" : "News archive",
    },
    {
      href: toAdminHref("/employees"),
      label: locale === "ru" ? "Сотрудники" : "Employees",
    },
    {
      href: toAdminHref("/attendance"),
      label: locale === "ru" ? "Посещаемость" : "Attendance",
    },
    {
      href: toAdminHref("/biometric"),
      label: locale === "ru" ? "Биометрия" : "Biometric",
    },
    {
      href: toAdminHref("/activity"),
      label: locale === "ru" ? "Активность" : "Activity",
    },
    {
      href: toAdminHref("/analytics"),
      label: locale === "ru" ? "Аналитика" : "Analytics",
    },
    {
      href: toAdminHref("/collaboration"),
      label: locale === "ru" ? "Коллаборация" : "Collaboration",
    },
    {
      href: toAdminHref("/diagnostics"),
      label: locale === "ru" ? "Диагностика" : "Diagnostics",
    },
    {
      href: toAdminHref("/leaderboard"),
      label: locale === "ru" ? "Рейтинг" : "Leaderboard",
    },
    {
      href: toAdminHref("/news"),
      label: locale === "ru" ? "Новости" : "News",
    },
    {
      href: toAdminHref("/notifications"),
      label: locale === "ru" ? "Уведомления" : "Notifications",
    },
    {
      href: toAdminHref("/observability"),
      label: locale === "ru" ? "Наблюдаемость" : "Observability",
    },
    {
      href: toAdminHref("/billing"),
      label: "Billing",
    },
    {
      href: toAdminHref("/organization"),
      label: locale === "ru" ? "Структура" : "Organization",
    },
    {
      href: toAdminHref("/payroll"),
      label: locale === "ru" ? "Payroll" : "Payroll",
    },
    {
      href: toAdminHref("/profile"),
      label: locale === "ru" ? "Профиль" : "Profile",
    },
    {
      href: toAdminHref("/requests"),
      label: locale === "ru" ? "Заявки" : "Requests",
    },
    {
      href: toAdminHref("/schedule"),
      label: locale === "ru" ? "График" : "Calendar",
    },
    {
      href: toAdminHref("/tasks"),
      label: locale === "ru" ? "Задачи" : "Tasks",
    },
    {
      href: toAdminHref("/"),
      label: locale === "ru" ? "Главная" : "Home",
    },
  ];

  return (
    titles.find((item) => isActive(pathname, item.href))?.label ??
    (locale === "ru" ? "Главная" : "Home")
  );
}

function resolveSidebarRoleLabel(roleCodes: string[], locale: Locale) {
  if (roleCodes.includes("tenant_owner")) {
    return locale === "ru" ? "Владелец" : "Owner";
  }
  if (roleCodes.includes("operations_admin")) {
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

function LocaleFlagIcon({ locale }: { locale: Locale }) {
  if (locale === "ru") {
    return (
      <svg
        aria-hidden="true"
        className="sidebar-flag-icon"
        focusable="false"
        viewBox="0 0 24 24"
      >
        <defs>
          <clipPath id="sidebar-flag-ru-clip">
            <circle cx="12" cy="12" r="12" />
          </clipPath>
        </defs>
        <g clipPath="url(#sidebar-flag-ru-clip)">
          <rect fill="#fff" height="8" width="24" x="0" y="0" />
          <rect fill="#1451b8" height="8" width="24" x="0" y="8" />
          <rect fill="#d52b1e" height="8" width="24" x="0" y="16" />
        </g>
        <circle
          cx="12"
          cy="12"
          fill="none"
          r="11.5"
          stroke="rgba(0,0,0,0.12)"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="sidebar-flag-icon"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <defs>
        <clipPath id="sidebar-flag-en-clip">
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath="url(#sidebar-flag-en-clip)">
        <rect fill="#012169" height="24" width="24" />
        <path
          d="M0 0 24 24M24 0 0 24"
          fill="none"
          stroke="#fff"
          strokeWidth="5.5"
        />
        <path
          d="M0 0 24 24M24 0 0 24"
          fill="none"
          stroke="#c8102e"
          strokeWidth="2.2"
        />
        <path d="M12 0v24M0 12h24" fill="none" stroke="#fff" strokeWidth="7" />
        <path
          d="M12 0v24M0 12h24"
          fill="none"
          stroke="#c8102e"
          strokeWidth="4"
        />
      </g>
      <circle cx="12" cy="12" fill="none" r="11.5" stroke="rgba(0,0,0,0.12)" />
    </svg>
  );
}

function resolveDemoHeaderBrand(
  email: string | undefined,
  locale: Locale,
): { companyName: string; employeeCount: number } | null {
  const normalizedEmail = email?.trim().toLowerCase();

  if (normalizedEmail !== DEMO_ADMIN_EMAIL) {
    return null;
  }

  return {
    companyName: locale === "ru" ? DEMO_COMPANY_NAME_RU : DEMO_COMPANY_NAME_EN,
    employeeCount: DEMO_HEADER_EMPLOYEE_COUNT,
  };
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

function rememberPendingRoute(href: string) {
  try {
    window.sessionStorage.setItem(CHUNK_PENDING_ROUTE_STORAGE_KEY, href);
  } catch {
    // Ignore storage failures; the global chunk handler can still reload.
  }
}

function clearPendingRoute() {
  try {
    window.sessionStorage.removeItem(CHUNK_PENDING_ROUTE_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function resolveDemoSidebarProfile(
  email: string | null | undefined,
  locale: Locale,
) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail === DEMO_ADMIN_EMAIL) {
    return {
      name: locale === "ru" ? "Алекс Петров" : "Alex Petrov",
      avatarUrl: null,
    };
  }
  return null;
}

export function AdminShell({
  createDialogActions,
  children,
  initialSession = null,
  onCreateAction,
  onCreateShift,
  showTopbar = true,
  mode = "admin",
}: {
  createDialogActions?: CreateDialogAction[];
  children: ReactNode;
  initialSession?: AuthSession | null;
  onCreateAction?: () => void;
  onCreateShift?: () => void;
  showTopbar?: boolean;
  mode?: "admin" | "employee";
}) {
  const persistentShellState = useAdminShellState();
  const initialPersistentShellRef = useRef<{
    browserSession: AuthSession | null;
    rememberedShell: ReturnType<typeof persistentShellState.read>;
  } | null>(null);

  if (!initialPersistentShellRef.current) {
    const browserSession = initialSession ?? getSession();
    initialPersistentShellRef.current = {
      browserSession,
      rememberedShell: browserSession
        ? persistentShellState.read(browserSession, mode)
        : null,
    };
  }

  const { browserSession, rememberedShell } =
    initialPersistentShellRef.current;
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
  const initialHeaderSnapshot =
    initialShellBootstrap?.header ?? rememberedShell?.header ?? null;
  const initialNotificationsSnapshot =
    initialShellBootstrap?.notifications ??
    rememberedShell?.notifications ??
    null;
  const canResumePersistentShell = Boolean(
    !initialSession && browserSession && rememberedShell?.header,
  );
  const resolvedInitialSession =
    initialSession ?? (canResumePersistentShell ? browserSession : null);
  const hasValidatedServerSession = Boolean(resolvedInitialSession);
  const hasValidatedInitialShell = Boolean(
    resolvedInitialSession && initialHeaderSnapshot,
  );
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const [session, setSession] = useState<AuthSession | null>(
    hasValidatedServerSession ? resolvedInitialSession : null,
  );
  const [unreadCount, setUnreadCount] = useState(
    initialNotificationsSnapshot?.unreadCount ?? 0,
  );
  const [notificationItems, setNotificationItems] = useState<
    NotificationItem[]
  >(initialNotificationsSnapshot?.notificationItems ?? []);
  const [employeeCount, setEmployeeCount] = useState(
    initialHeaderSnapshot?.employeeCount ?? 0,
  );
  const [organizationCount, setOrganizationCount] = useState(
    initialHeaderSnapshot?.organizationCount ?? 0,
  );
  const [organization, setOrganization] =
    useState<OrganizationHeaderState | null>(
      initialHeaderSnapshot?.organization ?? null,
    );
  const [organizationGuardReady, setOrganizationGuardReady] = useState(
    Boolean(initialHeaderSnapshot),
  );
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(
    initialHeaderSnapshot?.accountProfile ?? null,
  );
  const [storedAvatarUrl, setStoredAvatarUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(hasValidatedServerSession);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [employeeCreateOpen, setEmployeeCreateOpen] = useState(false);
  const [newsCreateOpen, setNewsCreateOpen] = useState(false);
  const [shiftCreateOpen, setShiftCreateOpen] = useState(false);
  const [taskCreateOpen, setTaskCreateOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [compactSidebarOpen, setCompactSidebarOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [pendingReadIds, setPendingReadIds] = useState<string[]>([]);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const routeLoadingTimerRef = useRef<number | null>(null);
  const routeLoadingFallbackRef = useRef<number | null>(null);
  const pendingRouteHrefRef = useRef<string | null>(null);
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
  }> = [
    { value: "ru", label: "Русский" },
    { value: "en", label: "English" },
  ];
  const profileAvatarScope =
    session?.user.email ?? initialSession?.user.email ?? null;

  useEffect(() => {
    if (
      mode !== "admin" ||
      !ready ||
      !session ||
      !organizationGuardReady ||
      organization?.configured !== false ||
      isOrganizationSetupAllowedPath(pathname)
    ) {
      return;
    }

    window.sessionStorage.setItem(
      ORGANIZATION_SETUP_REQUIRED_STORAGE_KEY,
      "1",
    );
    router.replace(toAdminHref("/organization"));
  }, [
    mode,
    organization,
    organizationGuardReady,
    pathname,
    ready,
    router,
    session,
  ]);

  function applyHeaderSnapshot(
    snapshot: ShellHeaderCachePayload,
    cacheKey?: string | null,
  ) {
    setEmployeeCount(snapshot.employeeCount);
    setOrganizationCount(
      snapshot.organizationCount ?? (snapshot.organization?.company ? 1 : 0),
    );
    setOrganization(snapshot.organization);
    setAccountProfile(snapshot.accountProfile);

    if (cacheKey) {
      writeClientCache(cacheKey, snapshot);
    }

    const snapshotSession = session ?? initialSession ?? getSession();
    if (snapshotSession) {
      persistentShellState.write(snapshotSession, mode, { header: snapshot });
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

    const snapshotSession = session ?? initialSession ?? getSession();
    if (snapshotSession) {
      persistentShellState.write(snapshotSession, mode, {
        notifications: snapshot,
      });
    }
  }

  function persistNotificationsState(
    nextUnreadCount: number,
    nextItems: NotificationItem[],
  ) {
    setUnreadCount(nextUnreadCount);
    setNotificationItems(nextItems);

    if (shellNotificationsCacheKey) {
      writeClientCache(shellNotificationsCacheKey, {
        unreadCount: nextUnreadCount,
        notificationItems: nextItems,
      });
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
    let cancelled = false;

    async function bootstrapShell() {
      const currentSession = initialSession ?? getSession();

      if (!currentSession) {
        redirectToLogin();
        return;
      }

      if (!getSession()) {
        saveSession(currentSession);
      }

      const resolvedHomeRoute = resolveHomeRoute(currentSession.user.roleCodes);
      const employeeOnlySession = isEmployeeOnlyRole(
        currentSession.user.roleCodes,
      );
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
      // Server bootstrap is authoritative. A cached `configured: false` must
      // never override a newer server response after organization setup.
      const effectiveHeader = initialShellBootstrap?.header
        ? {
            value: initialShellBootstrap.header,
            storedAt: Date.now(),
            isStale: false,
          }
        : rememberedShell?.header
          ? {
              value: rememberedShell.header,
              storedAt: Date.now(),
              isStale: false,
            }
          : cachedHeader;
      const effectiveNotifications = rememberedShell?.notifications
        ? {
            value: rememberedShell.notifications,
            storedAt: Date.now(),
            isStale: false,
          }
        : (cachedNotifications ??
          (initialShellBootstrap?.notifications
            ? {
                value: initialShellBootstrap.notifications,
                storedAt: Date.now(),
                isStale: false,
              }
            : null));
      const shouldRefreshHeader = !effectiveHeader || effectiveHeader.isStale;
      const shouldRefreshNotifications =
        !effectiveNotifications || effectiveNotifications.isStale;

      const finalizeSuccess = () => {
        if (cancelled) {
          return;
        }

        setStoredAvatarUrl(readStoredProfileAvatar(currentSession.user.email));

        if (mode === "employee") {
          if (!employeeOnlySession) {
            router.replace(resolvedHomeRoute);
            return;
          }
        } else if (employeeOnlySession) {
          router.replace(resolvedHomeRoute);
          return;
        }

        setSession(currentSession);
        setReady(true);
        void primeWorkspaceExperience(currentSession).catch(() => undefined);
      };

      if (effectiveHeader) {
        applyHeaderSnapshot(effectiveHeader.value, headerCacheKey);
      }

      if (initialShellBootstrap?.header) {
        setOrganizationGuardReady(true);
      }

      if (effectiveNotifications) {
        applyNotificationsSnapshot(
          effectiveNotifications.value,
          notificationsCacheKey,
        );
      }

      if (initialShellBootstrap) {
        finalizeSuccess();

        if (shouldRefreshHeader || shouldRefreshNotifications) {
          void apiRequest<ShellBootstrapResponse>("/auth/bootstrap", {
            token: currentSession.accessToken,
          })
            .then((snapshot) => {
              if (snapshot.header) {
                applyHeaderSnapshot(snapshot.header, headerCacheKey);
                setOrganizationGuardReady(true);
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

      finalizeSuccess();

      void apiRequest<ShellBootstrapResponse>("/auth/bootstrap", {
        token: currentSession.accessToken,
        skipClientCache: true,
      })
        .then((snapshot) => {
          if (cancelled) {
            return;
          }

          if (snapshot.header) {
            applyHeaderSnapshot(snapshot.header, headerCacheKey);
            setOrganizationGuardReady(true);
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

    void bootstrapShell();

    return () => {
      cancelled = true;
    };
  }, [initialSession, initialShellBootstrap, mode, rememberedShell, router]);

  useEffect(() => {
    setStoredAvatarUrl(readStoredProfileAvatar(profileAvatarScope));

    function handleAvatarUpdated(event: Event) {
      const customEvent = event as CustomEvent<{
        scope?: string | null;
        value?: string | null;
      }>;
      const nextScope = customEvent.detail?.scope ?? null;
      if (
        nextScope !== null &&
        profileAvatarScope !== null &&
        nextScope !== profileAvatarScope.trim().toLowerCase()
      ) {
        return;
      }
      setStoredAvatarUrl(readStoredProfileAvatar(profileAvatarScope));
    }

    function handleStorage(event: StorageEvent) {
      const scopedKey = profileAvatarScope
        ? `smart-admin-profile-avatar:${profileAvatarScope.trim().toLowerCase()}`
        : "smart-admin-profile-avatar";
      if (
        event.key === null ||
        event.key === "smart-admin-profile-avatar" ||
        event.key === scopedKey
      ) {
        setStoredAvatarUrl(readStoredProfileAvatar(profileAvatarScope));
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
  }, [profileAvatarScope]);

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
        setOrganizationGuardReady(true);
        applyHeaderSnapshot(
          {
            employeeCount,
            organizationCount,
            organization: detail,
            accountProfile,
          },
          shellHeaderCacheKey,
        );
      }

      void apiRequest<ShellBootstrapResponse>("/auth/bootstrap", {
        token: currentSession.accessToken,
        skipClientCache: true,
      })
        .then((snapshot) => {
          setOrganizationGuardReady(true);
          if (snapshot.header) {
            applyHeaderSnapshot(snapshot.header, shellHeaderCacheKey);
          }
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
  }, [
    accountProfile,
    employeeCount,
    organizationCount,
    session,
    shellHeaderCacheKey,
  ]);

  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    resetRouteLoadingState();
    setNotificationsOpen(false);
    setAccountMenuOpen(false);
  }, [pathname, searchParamsKey]);

  useEffect(() => {
    return () => {
      resetRouteLoadingState();
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
        setReady(true);
      }
    }

    function handleSessionExpired() {
      persistentShellState.clear();
      setSession(null);
      setReady(false);
      redirectToLogin();
    }

    window.addEventListener(
      SESSION_UPDATED_EVENT,
      handleSessionUpdated as EventListener,
    );
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(
        SESSION_UPDATED_EVENT,
        handleSessionUpdated as EventListener,
      );
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [persistentShellState, router]);

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
  const activityHref = toAdminHref("/activity");
  const scheduleHref = toAdminHref("/schedule");
  const tasksHref = toAdminHref("/tasks");
  const leaderboardHref = toAdminHref("/leaderboard");
  const newsHref = toAdminHref("/news");
  const profileHref = toAdminHref("/profile");
  const notificationsHref = toAdminHref("/notifications");
  const contentHasStudioBackground = hasStudioBackground(pathname);
  const attendanceTrackingEnabled =
    organization?.attendanceTrackingEnabled ?? true;

  useEffect(() => {
    if (!ready || !session || attendanceTrackingEnabled) {
      return;
    }

    const attendanceDisabledHrefs = [
      activityHref,
      leaderboardHref,
      scheduleHref,
      toAdminHref("/attendance"),
      toAdminHref("/biometric"),
    ];

    if (attendanceDisabledHrefs.some((href) => isActive(pathname, href))) {
      router.replace(tasksHref);
    }
  }, [
    activityHref,
    attendanceTrackingEnabled,
    leaderboardHref,
    pathname,
    ready,
    router,
    scheduleHref,
    session,
    tasksHref,
  ]);

  const navItems = useMemo<NavItem[]>(() => {
    if (employeeOnly) {
      const items: NavItem[] = [
        {
          href: homeHref,
          label: locale === "ru" ? "Главная" : "Home",
          icon: Home,
        },
      ];

      if (attendanceTrackingEnabled) {
        items.push({
          href: activityHref,
          label: t("nav.activity"),
          icon: Activity,
        });
        items.push({
          href: leaderboardHref,
          label: t("nav.leaderboard"),
          icon: Trophy,
        });
      }

      items.push({
        href: newsHref,
        label: locale === "ru" ? "Новости" : "News",
        icon: FileText,
      });

      if (attendanceTrackingEnabled) {
        items.push({
          href: scheduleHref,
          label: locale === "ru" ? "Календарь" : "Calendar",
          icon: CalendarRange,
        });
      }

      return items;
    }

    const items: NavItem[] = [
      {
        href: homeHref,
        label: locale === "ru" ? "Главная" : "Home",
        icon: Home,
      },
    ];

    if (attendanceTrackingEnabled) {
      items.push({
        href: activityHref,
        label: t("nav.activity"),
        icon: Activity,
      });
    }

    if (hasManagerAccess(session?.user.roleCodes ?? [])) {
      items.push({
        href: tasksHref,
        label: locale === "ru" ? "Задачи" : "Tasks",
        icon: ListTodo,
      });
    }

    if (attendanceTrackingEnabled) {
      items.push({
        href: leaderboardHref,
        label: t("nav.leaderboard"),
        icon: Trophy,
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
        items: attendanceTrackingEnabled
          ? [
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
            ]
          : [],
      });
    }

    if (attendanceTrackingEnabled) {
      items.push({
        href: scheduleHref,
        label: locale === "ru" ? "Календарь" : "Calendar",
        icon: CalendarRange,
      });
    }

    return items;
  }, [
    activityHref,
    attendanceTrackingEnabled,
    employeeOnly,
    homeHref,
    leaderboardHref,
    locale,
    managerOnly,
    newsHref,
    scheduleHref,
    session?.user.roleCodes,
    t,
    tasksHref,
  ]);

  useEffect(() => {
    const nextExpanded = Object.fromEntries(
      navItems.map((item) => [
        item.href,
        isActive(pathname, item.href) ||
          item.items?.some((subItem) => isActive(pathname, subItem.href)) ||
          false,
      ]),
    );
    setExpandedItems((current) => {
      const merged = { ...nextExpanded, ...current };
      const currentKeys = Object.keys(current);
      const mergedKeys = Object.keys(merged);

      if (
        currentKeys.length === mergedKeys.length &&
        mergedKeys.every((key) => current[key] === merged[key])
      ) {
        return current;
      }

      return merged;
    });
  }, [navItems, pathname]);

  const demoSidebarProfile = resolveDemoSidebarProfile(
    session?.user.email,
    locale,
  );
  const demoHeaderBrand = resolveDemoHeaderBrand(session?.user.email, locale);
  const profileName = session
    ? (demoSidebarProfile?.name ??
      buildUserDisplayName(
        accountProfile?.firstName,
        accountProfile?.lastName,
        session.user.email
          .split("@")[0]
          .replace(/[._-]+/g, " ")
          .trim(),
      ))
    : "";
  const displayProfileName = localizePersonName(profileName, locale);
  const profileRole = session
    ? resolveSidebarRoleLabel(session.user.roleCodes, locale)
    : "";
  const companyName =
    demoHeaderBrand?.companyName ||
    organization?.company?.name?.trim() ||
    (locale === "ru" ? "Организация" : "Organization");
  const shellPageTitle = resolveShellPageTitle(pathname, locale);
  const resolvedProfileAvatarUrl =
    accountProfile?.avatarUrl ||
    storedAvatarUrl ||
    demoSidebarProfile?.avatarUrl;
  const [profileAvatarFailed, setProfileAvatarFailed] = useState(false);
  const unreadNotifications = notificationItems.filter((item) => !item.isRead);
  const readNotifications = notificationItems.filter((item) => item.isRead);
  const accountMenuItems = useMemo(
    () =>
      employeeOnly
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
              href: toAdminHref("/billing"),
              label: "Billing",
            },
            {
              href: profileHref,
              label: locale === "ru" ? "Профиль" : "Profile",
            },
          ],
    [employeeOnly, locale, profileHref],
  );
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
        try {
          router.prefetch(href);
        } catch {
          // Navigation will load the route directly if prefetch fails.
        }
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

  useEffect(() => {
    setCompactSidebarOpen(false);
  }, [pathname]);

  const sidebarAvatarSrc =
    resolvedProfileAvatarUrl && !profileAvatarFailed
      ? resolvedProfileAvatarUrl
      : null;
  const sidebarAvatarInitials = getAvatarInitials(
    displayProfileName || session?.user.email || companyName,
  );

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

  function clearRouteLoadingFallback() {
    if (routeLoadingFallbackRef.current !== null) {
      window.clearTimeout(routeLoadingFallbackRef.current);
      routeLoadingFallbackRef.current = null;
    }
  }

  function resetRouteLoadingState() {
    clearRouteLoadingTimer();
    clearRouteLoadingFallback();
    pendingRouteHrefRef.current = null;
    clearPendingRoute();
    setRouteLoading(false);
  }

  function handleRouteStart(
    href?: string | null,
    event?: RouteClickEvent | null,
  ) {
    if (!href || isActive(pathname, href) || !shouldHandleRouteClick(event)) {
      return;
    }

    if (
      mode === "admin" &&
      organizationGuardReady &&
      organization?.configured === false &&
      !isOrganizationSetupAllowedPath(href)
    ) {
      event?.preventDefault();
      resetRouteLoadingState();

      if (pathname === toAdminHref("/organization")) {
        window.dispatchEvent(new Event(ORGANIZATION_SETUP_REQUIRED_EVENT));
      } else {
        window.sessionStorage.setItem(
          ORGANIZATION_SETUP_REQUIRED_STORAGE_KEY,
          "1",
        );
        router.replace(toAdminHref("/organization"));
      }
      return;
    }

    try {
      router.prefetch(href);
    } catch {
      // Keep the click flow alive; the route can still be loaded directly.
    }
    setNotificationsOpen(false);
    setAccountMenuOpen(false);
    resetRouteLoadingState();
    pendingRouteHrefRef.current = href;
    rememberPendingRoute(href);
    routeLoadingTimerRef.current = window.setTimeout(() => {
      setRouteLoading(true);
      routeLoadingTimerRef.current = null;
    }, 180);
    routeLoadingFallbackRef.current = window.setTimeout(() => {
      const pendingHref = pendingRouteHrefRef.current;

      resetRouteLoadingState();

      if (!pendingHref || typeof window === "undefined") {
        return;
      }

      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl !== pendingHref) {
        router.push(pendingHref);
      }
    }, 8000);
  }

  async function handleMarkRead(notificationId: string) {
    if (!session) return;

    const notification = notificationItems.find(
      (item) => item.id === notificationId,
    );
    if (!notification || notification.isRead) {
      return;
    }

    const previousItems = notificationItems;
    const previousUnreadCount = unreadCount;
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

    setPendingReadIds((current) =>
      current.includes(notificationId) ? current : [...current, notificationId],
    );
    persistNotificationsState(Math.max(0, unreadCount - 1), nextItems);

    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({}),
      });
    } catch {
      persistNotificationsState(previousUnreadCount, previousItems);
    } finally {
      setPendingReadIds((current) =>
        current.filter((itemId) => itemId !== notificationId),
      );
    }
  }

  async function handleMarkAllRead() {
    if (!session || !unreadNotifications.length || isMarkingAllRead) return;

    const unreadIds = unreadNotifications.map((item) => item.id);
    const previousItems = notificationItems;
    const previousUnreadCount = unreadCount;
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

    setIsMarkingAllRead(true);
    setPendingReadIds(unreadIds);
    persistNotificationsState(0, nextItems);

    try {
      await apiRequest("/notifications/read-all", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({}),
      });
    } catch {
      persistNotificationsState(previousUnreadCount, previousItems);
    } finally {
      setIsMarkingAllRead(false);
      setPendingReadIds([]);
    }
  }

  if (!ready || !session) {
    return (
      <div className="admin-frame admin-frame-checking-session">
        <AdminShellLoadingSidebar activeHref={pathname} locale={locale} />

        <section
          className={`admin-content admin-content-session-check${
            contentHasStudioBackground ? " has-studio-background" : ""
          }`}
        >
          <div className="shell-stage session-check-stage">
            <WorkspaceLoading
              className="admin-session-check-status"
              label={t("common.checkingSession")}
            />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-frame">
      <CreateDialog
        actions={createDialogActions}
        onCreateEmployee={() => setEmployeeCreateOpen(true)}
        onCreateNews={() => setNewsCreateOpen(true)}
        onCreateShift={onCreateShift ?? (() => setShiftCreateOpen(true))}
        onCreateTask={() => setTaskCreateOpen(true)}
        onOpenChange={setCreateOpen}
        open={createOpen}
      />
      <HeaderEmployeeCreateDialog
        onCreated={() => router.refresh()}
        onOpenChange={setEmployeeCreateOpen}
        open={employeeCreateOpen}
        session={session}
      />
      <HeaderShiftCreateDialog
        onCreated={() => router.refresh()}
        onOpenChange={setShiftCreateOpen}
        open={shiftCreateOpen}
        session={session}
      />
      <HeaderNewsCreateDialog
        onCreated={() => router.refresh()}
        onOpenChange={setNewsCreateOpen}
        open={newsCreateOpen}
        session={session}
      />
      <HeaderTaskCreateDialog
        onCreated={() => router.refresh()}
        onOpenChange={setTaskCreateOpen}
        open={taskCreateOpen}
        session={session}
      />

      <aside
        className={`sidebar sidebar-untitled${compactSidebarOpen ? " is-mobile-open" : ""}`}
      >
        <div className="sidebar-brand sidebar-untitled-brand">
          <div className="sidebar-untitled-brand-row">
            <Link
              className="sidebar-full-brand-link"
              href={homeHref}
              onClick={(event) => handleRouteStart(homeHref, event)}
            >
              <BrandWordmark className="text-[1.8rem]" />
            </Link>
            <button
              aria-label={
                compactSidebarOpen
                  ? locale === "ru"
                    ? "Свернуть меню"
                    : "Collapse menu"
                  : locale === "ru"
                    ? "Открыть меню"
                    : "Open menu"
              }
              className="sidebar-compact-toggle"
              onClick={() => setCompactSidebarOpen((current) => !current)}
              title={
                compactSidebarOpen
                  ? locale === "ru"
                    ? "Свернуть меню"
                    : "Collapse menu"
                  : locale === "ru"
                    ? "Открыть меню"
                    : "Open menu"
              }
              type="button"
            >
              <img
                alt=""
                aria-hidden="true"
                className="sidebar-compact-wave"
                src="/waving-hand-skin-1.svg"
              />
            </button>
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
                      <span className="sidebar-nav-label-wrap">
                        <Icon className="size-4" />
                        <span className="sidebar-nav-label">{item.label}</span>
                      </span>
                      {typeof item.count === "number" && item.count > 0 ? (
                        <span className="sidebar-count-pill">{item.count}</span>
                      ) : null}
                    </button>
                  ) : (
                    <Link
                      className="sidebar-link-main"
                      href={item.href}
                      onClick={(event) => handleRouteStart(item.href, event)}
                    >
                      <span className="sidebar-nav-label-wrap">
                        <Icon className="size-4" />
                        <span className="sidebar-nav-label">{item.label}</span>
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
                          <span className="sidebar-nav-label-wrap">
                            <SubIcon className="size-4" />
                            <span className="sidebar-nav-label">
                              {subItem.label}
                            </span>
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
                          onClick={(event) =>
                            handleRouteStart(subItem.href, event)
                          }
                        >
                          <span className="sidebar-nav-label-wrap">
                            <SubIcon className="size-4" />
                            <span className="sidebar-nav-label">
                              {subItem.label}
                            </span>
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
          {organizationCount > 1 ? (
            <div className="sidebar-organization-indicator" title={companyName}>
              <BriefcaseBusiness aria-hidden="true" className="size-4" />
              <span>{companyName}</span>
            </div>
          ) : null}
          <div className="sidebar-user-wrap" ref={accountMenuRef}>
            {accountMenuOpen ? (
              <div className="sidebar-user-menu">
                <div className="sidebar-user-menu-locale">
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
                        <LocaleFlagIcon locale={option.value} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sidebar-user-menu-separator" />
                {accountMenuItems.map((item) => (
                  <Link
                    className="sidebar-user-menu-item"
                    href={item.href}
                    key={item.href}
                    onClick={(event) => {
                      if (!shouldHandleRouteClick(event)) {
                        return;
                      }

                      setAccountMenuOpen(false);
                      handleRouteStart(item.href, event);
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  className="sidebar-user-menu-item is-danger"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    persistentShellState.clear();
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
                {sidebarAvatarSrc ? (
                  <img
                    alt={displayProfileName}
                    className="h-full w-full rounded-full object-cover"
                    onError={() => setProfileAvatarFailed(true)}
                    src={sidebarAvatarSrc}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-[rgba(227,231,239,0.78)] text-xs font-semibold text-[rgba(72,84,104,0.72)]">
                    {sidebarAvatarInitials}
                  </span>
                )}
              </div>
              <div className="sidebar-user-copy">
                <strong>{displayProfileName}</strong>
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
        <div
          className={`shell-stage${routeLoading ? " is-route-loading" : ""}`}
        >
          {showTopbar ? (
            <header className="shell-topbar">
              <div className="shell-topbar-main">
                <div className="shell-topbar-copy">
                  <h1>{shellPageTitle}</h1>
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
                      onClick={(event) =>
                        handleRouteStart(toAdminHref("/organization"), event)
                      }
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
                            {locale === "ru" ? "Уведомления" : "Notifications"}
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
                              className="text-xs font-medium text-[color:var(--accent)] disabled:cursor-default disabled:opacity-60"
                              disabled={isMarkingAllRead}
                              onClick={() => void handleMarkAllRead()}
                              type="button"
                            >
                              {isMarkingAllRead
                                ? locale === "ru"
                                  ? "Готово"
                                  : "Done"
                                : locale === "ru"
                                  ? "Прочитать все"
                                  : "Dismiss all"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <Separator className="bg-[rgba(15,23,42,0.08)]" />

                      <div className="grid max-h-[min(70vh,560px)] gap-3 overflow-y-auto scrollbar-hide pr-1">
                        {unreadNotifications.length ? (
                          <div className="grid gap-1">
                            {unreadNotifications.map((item, index) => (
                              <div
                                className="grid gap-3 px-2 py-2"
                                key={item.id}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <Link
                                    className="grid min-w-0 flex-1 gap-1"
                                    href={resolveNotificationHref(
                                      item.actionUrl,
                                    )}
                                    onClick={(event) => {
                                      if (!shouldHandleRouteClick(event)) {
                                        return;
                                      }

                                      setNotificationsOpen(false);
                                      handleRouteStart(
                                        resolveNotificationHref(item.actionUrl),
                                        event,
                                      );
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
                                    className="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium text-[color:var(--accent)] transition hover:bg-[rgba(40,75,255,0.08)] disabled:cursor-default disabled:opacity-60"
                                    disabled={
                                      isMarkingAllRead ||
                                      pendingReadIds.includes(item.id)
                                    }
                                    onClick={() => void handleMarkRead(item.id)}
                                    type="button"
                                  >
                                    {pendingReadIds.includes(item.id)
                                      ? locale === "ru"
                                        ? "Готово"
                                        : "Done"
                                      : locale === "ru"
                                        ? "Убрать"
                                        : "Dismiss"}
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
                                <div
                                  className="grid gap-3 px-2 py-2"
                                  key={item.id}
                                >
                                  <Link
                                    className="grid min-w-0 gap-1"
                                    href={resolveNotificationHref(
                                      item.actionUrl,
                                    )}
                                    onClick={(event) => {
                                      if (!shouldHandleRouteClick(event)) {
                                        return;
                                      }

                                      setNotificationsOpen(false);
                                      handleRouteStart(
                                        resolveNotificationHref(item.actionUrl),
                                        event,
                                      );
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

                        {!unreadNotifications.length &&
                        !readNotifications.length ? (
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
                {canUseDesktopAdminTools ? (
                  <Button
                    className="rounded-2xl px-5"
                    onClick={() => {
                      setNotificationsOpen(false);
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
            <div className="shell-route-loader">
              <WorkspaceLoading
                className="min-h-0"
                label={locale === "ru" ? "Открываю страницу" : "Opening page"}
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
