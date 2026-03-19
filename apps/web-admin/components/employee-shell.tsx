"use client";

import { EmployeeInboxSummary } from "@smart/types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Home,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "../lib/api";
import {
  AuthSession,
  clearSession,
  getSession,
  redirectToLogin,
  resolveHomeRoute,
  SESSION_EXPIRED_EVENT,
  SESSION_UPDATED_EVENT,
} from "../lib/auth";
import { toAdminHref } from "../lib/admin-routes";
import { createCollaborationSocket } from "../lib/collaboration-socket";
import { createNotificationsSocket } from "../lib/notifications-socket";
import { Locale, useI18n } from "../lib/i18n";
import { SessionLoader } from "./session-loader";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
};

function isActive(pathname: string, href: string) {
  if (href === "/employee") return pathname === "/employee";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function EmployeeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [accessStatus, setAccessStatus] = useState<{
    workspaceAccessAllowed: boolean;
    invitationStatus: string;
    submittedAt?: string | null;
    rejectedReason?: string | null;
  } | null>(null);
  const [summary, setSummary] = useState<EmployeeInboxSummary>({
    unreadNotifications: 0,
    unreadChats: 0,
    pendingTasks: 0,
    pinnedAnnouncements: 0,
    totalAttention: 0,
  });
  const [ready, setReady] = useState(false);

  async function loadSummary(currentSession: AuthSession) {
    const nextSummary = await apiRequest<EmployeeInboxSummary>(
      "/collaboration/inbox-summary/me",
      {
        token: currentSession.accessToken,
      },
    );
    setSummary(nextSummary);
  }

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      redirectToLogin();
      return;
    }

    if (resolveHomeRoute(currentSession.user.roleCodes) !== "/employee") {
      router.replace(toAdminHref("/"));
      return;
    }

    setSession(currentSession);
    setReady(true);
    void apiRequest<{
      workspaceAccessAllowed: boolean;
      invitationStatus: string;
      submittedAt?: string | null;
      rejectedReason?: string | null;
    }>("/employees/me/access-status", {
      token: currentSession.accessToken,
    })
      .then((status) => {
        setAccessStatus(status);
        if (!status.workspaceAccessAllowed) {
          return;
        }

        return loadSummary(currentSession).catch(() =>
          setSummary({
            unreadNotifications: 0,
            unreadChats: 0,
            pendingTasks: 0,
            pinnedAnnouncements: 0,
            totalAttention: 0,
          }),
        );
      })
      .catch(() =>
        setAccessStatus({
          workspaceAccessAllowed: currentSession.user.workspaceAccessAllowed,
          invitationStatus: currentSession.user.workspaceAccessAllowed
            ? "APPROVED"
            : "PENDING_APPROVAL",
        }),
      );
  }, [router]);

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

  useEffect(() => {
    if (!session || !accessStatus?.workspaceAccessAllowed) return;

    const notificationsSocket = createNotificationsSocket(session.accessToken);
    notificationsSocket.on("notifications:unread-count", () => {
      void loadSummary(session);
    });
    const collaborationSocket = createCollaborationSocket(session.accessToken);
    collaborationSocket.on("chat:message", () => {
      void loadSummary(session);
    });
    collaborationSocket.on("chat:thread-updated", () => {
      void loadSummary(session);
    });

    return () => {
      notificationsSocket.disconnect();
      collaborationSocket.disconnect();
    };
  }, [session, accessStatus?.workspaceAccessAllowed]);

  const hasAdminRole = session?.user.roleCodes.some((role) =>
    ["tenant_owner", "hr_admin", "operations_admin", "manager"].includes(role),
  );

  const navItems = useMemo<NavItem[]>(
    () => [
      { href: "/employee", label: t("nav.dashboard"), icon: Home },
      {
        href: "/employee/calendar",
        label: "Календарь",
        icon: CalendarDays,
        count: summary.pendingTasks,
      },
    ],
    [summary.pendingTasks, t],
  );

  if (!ready || !session) {
    return <SessionLoader label={t("common.checkingSession")} />;
  }

  if (accessStatus && !accessStatus.workspaceAccessAllowed) {
    return (
      <main className="auth-gate">
        <div className="auth-gate-card max-w-[560px] text-left">
          <span className="eyebrow">Smart Access</span>
          <h2 className="mt-2 text-2xl font-heading font-bold text-[color:var(--foreground)]">
            Доступ ожидает подтверждения руководителя
          </h2>
          <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
            Вы уже вошли в систему, но рабочие разделы откроются только после подтверждения профиля руководителем.
          </p>
          {accessStatus.submittedAt ? (
            <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
              Анкета отправлена: {new Date(accessStatus.submittedAt).toLocaleString("ru-RU")}
            </p>
          ) : null}
          {accessStatus.invitationStatus === "REJECTED" && accessStatus.rejectedReason ? (
            <div className="mt-4 rounded-2xl border border-[color:var(--danger)]/20 bg-[color:var(--soft-danger)] p-4 text-sm text-[color:var(--danger)]">
              {accessStatus.rejectedReason}
            </div>
          ) : null}
          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => {
                clearSession();
                redirectToLogin();
              }}
              variant="outline"
            >
              {t("common.signOut")}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="employee-frame">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-kicker">{t("employeePortal.brand")}</span>
          <strong>{t("employeePortal.title")}</strong>
          <p>{session.user.email}</p>
        </div>

        <div className="grid gap-3">
          <div className="sidebar-badge">
            <span className="status-dot" />
            {t("employeePortal.webBadge")}
          </div>
          <div
            className="language-switch"
            role="group"
            aria-label={t("common.language")}
          >
            {(["en", "ru"] as Locale[]).map((value) => (
              <button
                className={`language-chip ${locale === value ? "is-active" : ""}`}
                key={value}
                onClick={() => setLocale(value)}
                type="button"
              >
                {value === "en" ? t("common.english") : t("common.russian")}
              </button>
            ))}
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className={`sidebar-link ${isActive(pathname, item.href) ? "is-active" : ""}`}
                href={item.href}
                key={item.href}
              >
                <span className="flex items-center gap-3">
                  <Icon className="size-4" />
                  {item.label}
                </span>
                {typeof item.count === "number" && item.count > 0 ? (
                  <Badge>{item.count}</Badge>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-meta">
          <span className="section-kicker">Веб-версия</span>
          <strong>Главная и календарь</strong>
          <p>
            В браузере оставлен короткий сценарий сотрудника: главная,
            календарь задач и профиль внизу меню.
          </p>
        </div>

        <div className="grid gap-2">
          <Link className="sidebar-user-card" href="/employee/profile">
            <div className="sidebar-user-avatar">
              {session.user.email.slice(0, 2).toUpperCase()}
            </div>
            <div className="sidebar-user-copy">
              <strong>Профиль</strong>
              <span>{session.user.email}</span>
            </div>
            <UserRound className="size-4 text-[color:var(--muted-foreground)]" />
          </Link>
          {hasAdminRole ? (
            <Button asChild variant="secondary">
              <Link href={toAdminHref("/")}>{t("employeePortal.goAdmin")}</Link>
            </Button>
          ) : null}
        </div>
      </aside>

      <section className="admin-content">
        <div className="shell-stage">
          <header className="employee-topbar">
            <div className="grid gap-1">
              <span className="eyebrow">{t("employeePortal.brand")}</span>
              <h1>{t("employeePortal.title")}</h1>
              <p>{t("employeePortal.subtitle")}</p>
            </div>

            <div className="employee-topbar-actions">
              <Badge
                variant={summary.pendingTasks > 0 ? "default" : "neutral"}
              >
                {summary.pendingTasks > 0
                  ? `${summary.pendingTasks} задач в календаре`
                  : "На сегодня пусто"}
              </Badge>
              <Button
                onClick={() => {
                  clearSession();
                  redirectToLogin();
                }}
                variant="ghost"
              >
                {t("common.signOut")}
              </Button>
            </div>
          </header>

          <main className="page-shell">{children}</main>
        </div>
      </section>
    </div>
  );
}
