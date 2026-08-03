"use client";

import {
  Activity,
  BriefcaseBusiness,
  CalendarRange,
  ChevronRight,
  FileText,
  Home,
  ListTodo,
  Trophy,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { getAvatarInitials } from "@/lib/avatar-placeholder";
import { useI18n } from "@/lib/i18n";
import { BrandWordmark } from "./brand-wordmark";
import { useAdminShellState } from "./admin-shell-state-provider";

type LoadingSidebarLocale = "en" | "ru";

type LoadingNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  expandable?: boolean;
};

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
      icon: CalendarRange,
    },
  ];
}

export function AdminShellLoadingSidebar({
  activeHref = "/app",
  locale,
}: {
  activeHref?: string;
  locale?: LoadingSidebarLocale;
}) {
  const { locale: contextLocale } = useI18n();
  const persistentShellState = useAdminShellState();
  const resolvedLocale = locale ?? contextLocale;
  const rememberedHeader = persistentShellState.readLatest("admin")?.header;
  const companyName = rememberedHeader?.organization?.company?.name?.trim();
  const organizationCount =
    rememberedHeader?.organizationCount ??
    (rememberedHeader?.organization?.company ? 1 : 0);
  const profileName = resolvedLocale === "ru" ? "Алекс Петров" : "Alex Petrov";
  const profileRole = resolvedLocale === "ru" ? "Владелец" : "Owner";

  return (
    <aside className="sidebar sidebar-untitled sidebar-checking-session">
      <div className="sidebar-brand sidebar-untitled-brand">
        <div className="sidebar-untitled-brand-row">
          <span className="sidebar-full-brand-link">
            <BrandWordmark className="text-[1.8rem]" />
          </span>
          <span className="sidebar-compact-toggle sidebar-compact-toggle--static">
            <img
              alt=""
              aria-hidden="true"
              className="sidebar-compact-wave"
              src="/waving-hand-skin-1.svg"
            />
          </span>
        </div>
      </div>

      <nav className="sidebar-nav sidebar-nav-untitled">
        {getLoadingNavItems(resolvedLocale, activeHref).map((item) => {
          const Icon = item.icon;
          const active = item.href === activeHref;

          return (
            <div className="sidebar-nav-group" key={item.href}>
              <div
                className={`sidebar-link sidebar-link-untitled${active ? " is-active" : ""}`}
              >
                <Link className="sidebar-link-main" href={item.href}>
                  <span className="sidebar-nav-label-wrap">
                    <Icon className="size-4" />
                    <span className="sidebar-nav-label">{item.label}</span>
                  </span>
                </Link>
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
        {organizationCount > 1 && companyName ? (
          <div className="sidebar-organization-indicator" title={companyName}>
            <BriefcaseBusiness aria-hidden="true" className="size-4" />
            <span>{companyName}</span>
          </div>
        ) : null}
        <div className="sidebar-user-card sidebar-loading-user-card">
          <div className="sidebar-user-avatar">
            <span
              aria-label={profileName}
              className="flex h-full w-full items-center justify-center rounded-full bg-[rgba(227,231,239,0.78)] text-sm font-semibold text-[rgba(72,84,104,0.72)]"
              role="img"
            >
              {getAvatarInitials(profileName)}
            </span>
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
