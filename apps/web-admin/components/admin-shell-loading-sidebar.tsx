import {
  Activity,
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  Home,
  ListTodo,
  Trophy,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";

type LoadingSidebarLocale = "en" | "ru";

type LoadingNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  expandable?: boolean;
};

const DEMO_ADMIN_AVATAR_URL =
  "https://www.untitledui.com/images/avatars/transparent/nicolas-trevino?bg=%23E0E0E0";

function getLoadingNavItems(
  locale: LoadingSidebarLocale,
  activeHref: string,
): LoadingNavItem[] {
  const isRu = locale === "ru";

  return [
    {
      href: "/app",
      label: isRu ? "Главная" : "Home",
      icon: Home,
    },
    {
      href: "/activity",
      label: isRu ? "Активность" : "Activity",
      icon: Activity,
    },
    {
      href: "/tasks",
      label: isRu ? "Задачи" : "Tasks",
      icon: ListTodo,
    },
    {
      href: "/leaderboard",
      label: isRu ? "Рейтинг" : "Leaderboard",
      icon: Trophy,
    },
    {
      href: "/news",
      label: isRu ? "Новости" : "News",
      icon: FileText,
    },
    {
      href: "/employees",
      label: isRu ? "Сотрудники" : "Employees",
      icon: UsersRound,
      expandable: true,
    },
    {
      href: "/schedule",
      label: isRu ? "Календарь" : "Calendar",
      icon: BriefcaseBusiness,
    },
  ];
}

export function AdminShellLoadingSidebar({
  activeHref = "/app",
  locale = "ru",
}: {
  activeHref?: string;
  locale?: LoadingSidebarLocale;
}) {
  const profileName = locale === "ru" ? "Алекс Петров" : "Alex Petrov";
  const profileRole = locale === "ru" ? "Владелец" : "Owner";

  return (
    <aside className="sidebar sidebar-untitled sidebar-checking-session">
      <div className="sidebar-brand sidebar-untitled-brand">
        <div className="sidebar-untitled-brand-row">
          <div className="sidebar-company-brand is-loading">
            <span className="company-brand-mark">
              <span aria-hidden="true">O</span>
            </span>
            <span className="sidebar-company-name">
              {locale === "ru" ? "Организация" : "Organization"}
            </span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav sidebar-nav-untitled">
        {getLoadingNavItems(locale, activeHref).map((item) => {
          const Icon = item.icon;
          const active = item.href === activeHref;

          return (
            <div className="sidebar-nav-group" key={item.href}>
              <div
                className={`sidebar-link sidebar-link-untitled${active ? " is-active" : ""}`}
              >
                <a className="sidebar-link-main" href={item.href}>
                  <span className="flex items-center gap-3">
                    <Icon className="size-4" />
                    {item.label}
                  </span>
                </a>
                {item.expandable ? (
                  <span className="sidebar-expand-toggle">
                    <ChevronRight className="size-4" />
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer-untitled">
        <div className="sidebar-user-card sidebar-loading-user-card">
          <div className="sidebar-user-avatar">
            <img
              alt={profileName}
              className="h-full w-full rounded-full object-cover"
              src={DEMO_ADMIN_AVATAR_URL}
            />
          </div>
          <div className="sidebar-user-copy">
            <strong>{profileName}</strong>
            <span>{profileRole}</span>
          </div>
          <span className="sidebar-expand-toggle">
            <ChevronRight className="size-4" />
          </span>
        </div>
      </div>
    </aside>
  );
}
