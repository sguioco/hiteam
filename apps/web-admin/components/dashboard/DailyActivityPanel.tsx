"use client";

import {
  CalendarRange,
  CheckCircle2,
  Coffee,
  FileText,
  ListTodo,
  LogIn,
  LogOut,
  UserRoundCheck,
} from "lucide-react";
import { getMockAvatarDataUrl } from "@/lib/mock-avatar";
import { localizePersonName } from "@/lib/transliteration";
import { cn } from "@/lib/utils";

export type DashboardActivityPerson = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  avatarUrl: string | null;
};

export type DashboardActivityItem = {
  id: string;
  kind: "attendance" | "announcement" | "task" | "shift" | "employee" | "request";
  action:
    | "check_in"
    | "check_out"
    | "break_started"
    | "break_ended"
    | "published"
    | "created"
    | "approved"
    | "submitted";
  createdAt: string;
  actor: DashboardActivityPerson | null;
  title: string | null;
  context: string | null;
  targetLabel: string | null;
  targetEmployees: DashboardActivityPerson[];
};

type DailyActivityPanelProps = {
  items: DashboardActivityItem[];
  locale: "ru" | "en";
};

function localize(locale: "ru" | "en", ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

export function formatTimeLabel(value: string, locale: "ru" | "en") {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolvePersonName(
  person: DashboardActivityPerson | null,
  locale: "ru" | "en",
) {
  if (!person) {
    return localize(locale, "Система", "System");
  }

  if (person.firstName || person.lastName) {
    const fullName = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();

    if (fullName) {
      return locale === "en" ? localizePersonName(fullName, locale) : fullName;
    }
  }

  return person.displayName;
}

export function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function getAvatarSource(person: DashboardActivityPerson, locale: "ru" | "en") {
  const displayName = resolvePersonName(person, locale);
  return person.avatarUrl || getMockAvatarDataUrl(displayName);
}

export function getActivityIcon(item: DashboardActivityItem) {
  if (item.kind === "announcement") {
    return FileText;
  }

  if (item.kind === "task") {
    return ListTodo;
  }

  if (item.kind === "shift") {
    return CalendarRange;
  }

  if (item.kind === "employee") {
    return item.action === "approved" ? UserRoundCheck : CheckCircle2;
  }

  if (item.kind === "attendance") {
    if (item.action === "check_in") return LogIn;
    if (item.action === "check_out") return LogOut;
    return Coffee;
  }

  return CheckCircle2;
}

export function getActivityIconTone(item: DashboardActivityItem) {
  if (item.kind === "announcement") return "is-news";
  if (item.kind === "task") return "is-task";
  if (item.kind === "shift") return "is-shift";
  if (item.kind === "employee") return "is-employee";
  if (item.action === "check_out") return "is-checkout";
  return "is-checkin";
}

export function resolveActionCopy(item: DashboardActivityItem, locale: "ru" | "en") {
  const actorName = resolvePersonName(item.actor, locale);

  switch (item.kind) {
    case "attendance":
      if (item.action === "check_in") {
        return {
          actorName,
          actionLabel: localize(locale, "отметился на смене", "checked in"),
        };
      }

      if (item.action === "check_out") {
        return {
          actorName,
          actionLabel: localize(locale, "завершил смену", "checked out"),
        };
      }

      if (item.action === "break_started") {
        return {
          actorName,
          actionLabel: localize(locale, "ушёл на перерыв", "started a break"),
        };
      }

      return {
        actorName,
        actionLabel: localize(locale, "закончил перерыв", "ended the break"),
      };
    case "announcement":
      return {
        actorName,
        actionLabel: localize(locale, "опубликовал новость", "published news"),
      };
    case "task":
      return {
        actorName,
        actionLabel: localize(locale, "создал задачу", "created a task"),
      };
    case "shift":
      return {
        actorName,
        actionLabel: localize(locale, "создал смену", "created a shift"),
      };
    case "employee":
      return {
        actorName,
        actionLabel:
          item.action === "approved"
            ? localize(locale, "подтвердил профиль", "approved profile")
            : localize(locale, "отправил профиль", "submitted profile"),
      };
    case "request":
      return {
        actorName,
        actionLabel: localize(locale, "создал запрос", "created a request"),
      };
    default:
      return {
        actorName,
        actionLabel: localize(locale, "обновил рабочее пространство", "updated the workspace"),
      };
  }
}

export function resolveTargetLabel(item: DashboardActivityItem, locale: "ru" | "en") {
  if (!item.targetLabel) {
    return null;
  }

  if (item.targetLabel === "all-company") {
    return localize(locale, "для всей компании", "for the whole company");
  }

  return localize(locale, `для ${item.targetLabel}`, `for ${item.targetLabel}`);
}

export function ActivityTargetAvatars({
  locale,
  people,
}: {
  locale: "ru" | "en";
  people: DashboardActivityPerson[];
}) {
  if (!people.length) {
    return null;
  }

  const visiblePeople = people.length > 5 ? people.slice(0, 4) : people.slice(0, 5);
  const overflowCount = people.length > 5 ? people.length - 4 : 0;

  return (
    <div className="daily-activity-targets">
      {visiblePeople.map((person) => {
        const displayName = resolvePersonName(person, locale);
        return (
          <div
            className="daily-activity-target-avatar"
            key={person.id}
            title={displayName}
          >
            <img alt={displayName} src={getAvatarSource(person, locale)} />
          </div>
        );
      })}
      {overflowCount > 0 ? (
        <div
          className="daily-activity-target-avatar daily-activity-target-avatar--overflow"
          title={localize(locale, `Ещё ${overflowCount}`, `${overflowCount} more`)}
        >
          +{overflowCount}
        </div>
      ) : null}
    </div>
  );
}

export function DailyActivityPanel({
  items,
  locale,
}: DailyActivityPanelProps) {
  return (
    <div className="dashboard-card daily-activity-panel">
      <div className="daily-activity-head">
        <h2>Daily Activity</h2>
      </div>

      <div
        className={cn(
          "daily-activity-body scrollbar-hide",
          items.length === 0 && "is-empty",
        )}
      >
        {items.length ? (
          <div className="daily-activity-group-list">
            {items.map((item, index) => {
              const Icon = getActivityIcon(item);
              const { actorName, actionLabel } = resolveActionCopy(item, locale);
              const itemTitle = item.title?.trim() || null;
              const targetLabel = resolveTargetLabel(item, locale);

              return (
                <article className="daily-activity-item" key={item.id}>
                  <div className="daily-activity-rail" aria-hidden="true">
                    <span className="daily-activity-rail-dot" />
                    {index < items.length - 1 ? (
                      <span className="daily-activity-rail-line" />
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      "daily-activity-kind",
                      getActivityIconTone(item),
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="daily-activity-item-main">
                    <div className="daily-activity-item-copy">
                      {item.actor ? (
                        <div className="daily-activity-actor-avatar">
                          <img
                            alt={actorName}
                            src={getAvatarSource(item.actor, locale)}
                          />
                        </div>
                      ) : (
                        <div className="daily-activity-actor-avatar daily-activity-actor-avatar--fallback">
                          {getInitials(actorName)}
                        </div>
                      )}

                      <div className="daily-activity-text">
                        <p>
                          <strong>{actorName}</strong>{" "}
                          <span>{actionLabel}</span>{" "}
                          {itemTitle ? (
                            <strong>{itemTitle}</strong>
                          ) : null}
                          {targetLabel ? (
                            <>
                              {" "}
                              <span>{targetLabel}</span>
                            </>
                          ) : null}
                        </p>
                        <div className="daily-activity-meta">
                          <time dateTime={item.createdAt}>
                            {formatTimeLabel(item.createdAt, locale)}
                          </time>
                          {item.context ? <span>{item.context}</span> : null}
                        </div>
                      </div>
                    </div>

                    <ActivityTargetAvatars
                      locale={locale}
                      people={item.targetEmployees}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="daily-activity-empty">
            <div className="daily-activity-empty-icon" aria-hidden="true">
              <ListTodo className="size-7" />
            </div>
            <p className="daily-activity-empty-title">No activity to display</p>
            <p className="daily-activity-empty-copy">
              Once your users will interact with the app
              <br />
              you'll see it here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
