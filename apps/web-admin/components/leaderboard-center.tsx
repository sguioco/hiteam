"use client";

import { type LeaderboardOverviewResponse } from "@smart/types";
import {
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Flame,
  LogIn,
  LogOut,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Table } from "@/components/application/table/table";
import { Avatar } from "@/components/base/avatar/avatar";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { createAttendanceLiveSocket } from "@/lib/attendance-socket";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import { type Locale, useI18n } from "@/lib/i18n";
import { useWorkspaceAutoRefresh } from "@/lib/use-workspace-auto-refresh";

export type LeaderboardCenterInitialData = LeaderboardOverviewResponse;

type LeaderboardCenterTab = "table" | "progress";

const LEADERBOARD_CACHE_TTL_MS = 30_000;

function localize(locale: Locale, ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

const ORGANIZATION_LABELS: Record<string, { ru: string; en: string }> = {
  operations: { ru: "Операции", en: "Operations" },
  операции: { ru: "Операции", en: "Operations" },
  support: { ru: "Поддержка", en: "Support" },
  поддержка: { ru: "Поддержка", en: "Support" },
  retail: { ru: "Розница", en: "Retail" },
  розница: { ru: "Розница", en: "Retail" },
  logistics: { ru: "Логистика", en: "Logistics" },
  логистика: { ru: "Логистика", en: "Logistics" },
  warehouse: { ru: "Склад", en: "Warehouse" },
  склад: { ru: "Склад", en: "Warehouse" },
  "shift lead": { ru: "Старший смены", en: "Shift Lead" },
  "старший смены": { ru: "Старший смены", en: "Shift Lead" },
  owner: { ru: "Владелец", en: "Owner" },
  владелец: { ru: "Владелец", en: "Owner" },
  "team lead": { ru: "Руководитель команды", en: "Team Lead" },
  "руководитель команды": { ru: "Руководитель команды", en: "Team Lead" },
  consultant: { ru: "Консультант", en: "Consultant" },
  консультант: { ru: "Консультант", en: "Consultant" },
  "senior associate": { ru: "Старший специалист", en: "Senior Associate" },
  "старший специалист": { ru: "Старший специалист", en: "Senior Associate" },
  dispatcher: { ru: "Диспетчер", en: "Dispatcher" },
  диспетчер: { ru: "Диспетчер", en: "Dispatcher" },
  coordinator: { ru: "Координатор", en: "Coordinator" },
  координатор: { ru: "Координатор", en: "Coordinator" },
  "shift coordinator": { ru: "Координатор смены", en: "Shift Coordinator" },
  "координатор смены": { ru: "Координатор смены", en: "Shift Coordinator" },
  "customer care": { ru: "Поддержка клиентов", en: "Customer Care" },
  "поддержка клиентов": { ru: "Поддержка клиентов", en: "Customer Care" },
  associate: { ru: "Специалист", en: "Associate" },
  специалист: { ru: "Специалист", en: "Associate" },
  operator: { ru: "Оператор", en: "Operator" },
  оператор: { ru: "Оператор", en: "Operator" },
};

function localizeKnownOrgLabel(
  value: string | null | undefined,
  locale: Locale,
) {
  if (!value) {
    return null;
  }

  const label = ORGANIZATION_LABELS[value.trim().toLowerCase()];
  return label ? label[locale] : value;
}

function buildLeaderboardCacheKey(
  session: ReturnType<typeof getSession>,
  monthKey: string,
) {
  return session ? `leaderboard-center:${session.user.id}:${monthKey}` : null;
}

function parseMonthKey(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1] ?? "", 10);
  const monthIndex = Number.parseInt(match[2] ?? "", 10) - 1;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return null;
  }

  return new Date(year, monthIndex, 1);
}

function formatMonthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonthKey(value: string, amount: number) {
  const parsed = parseMonthKey(value) ?? new Date();
  parsed.setMonth(parsed.getMonth() + amount);
  return formatMonthKey(parsed);
}

function getCurrentMonthKey() {
  return formatMonthKey(new Date());
}

function formatMonthLabel(value: string, locale: Locale) {
  const parsed = parseMonthKey(value);

  if (!parsed) {
    return value;
  }

  return parsed.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

function getProgressTitle(
  key: LeaderboardOverviewResponse["me"]["progress"][number]["key"],
  locale: Locale,
) {
  switch (key) {
    case "on_time_arrival":
      return localize(locale, "Пришел вовремя", "Arrived on time");
    case "on_time_departure":
      return localize(locale, "Ушел вовремя", "Left on time");
    default:
      return localize(
        locale,
        "Закрыл задачи и чек-листы",
        "Closed tasks and checklists",
      );
  }
}

function formatProgressTime(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  });
}

function getScoreActionSubtitle(
  metric: LeaderboardOverviewResponse["me"]["progress"][number],
  locale: Locale,
) {
  switch (metric.key) {
    case "on_time_arrival": {
      const checkedAt = formatProgressTime(metric.details.checkedAt, locale);

      return checkedAt
        ? localize(
            locale,
            `Пришел сегодня в ${checkedAt}`,
            `Arrived today at ${checkedAt}`,
          )
        : localize(
            locale,
            "Сегодня приход еще не отмечен",
            "No arrival recorded today",
          );
    }
    case "on_time_departure": {
      const checkedAt = formatProgressTime(metric.details.checkedAt, locale);

      return checkedAt
        ? localize(
            locale,
            `Ушел сегодня в ${checkedAt}`,
            `Left today at ${checkedAt}`,
          )
        : localize(locale, "Закройте смену вовремя", "Close the shift on time");
    }
    default: {
      const completedTaskCount = metric.details.completedDueTaskCount;
      const dueTaskCount = metric.details.dueTaskCount;
      const completedChecklistCount =
        metric.details.completedDueChecklistItemCount ?? 0;
      const dueChecklistCount = metric.details.dueChecklistItemCount ?? 0;
      const remainingCount =
        Math.max(0, dueTaskCount - completedTaskCount) +
        Math.max(0, dueChecklistCount - completedChecklistCount) +
        metric.details.overdueCount;

      return localize(
        locale,
        `Задачи ${completedTaskCount}/${dueTaskCount}, чек-листы ${completedChecklistCount}/${dueChecklistCount}, осталось ${remainingCount}`,
        `Tasks ${completedTaskCount}/${dueTaskCount}, checklists ${completedChecklistCount}/${dueChecklistCount}, ${remainingCount} left`,
      );
    }
  }
}

function formatActivityDayLabel(dayKey: string, locale: Locale) {
  const parsed = new Date(`${dayKey}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return dayKey;
  }

  const label = parsed.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
    weekday: "short",
  });

  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

function getEmployeeFullName(
  entry: LeaderboardOverviewResponse["leaderboard"][number],
) {
  return `${entry.employee.firstName} ${entry.employee.lastName}`.trim();
}

function getEmployeeInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getEmployeeSubtitle(
  entry: LeaderboardOverviewResponse["leaderboard"][number],
  locale: Locale,
) {
  const rawSubtitle =
    entry.employee.position?.name ??
    entry.employee.department?.name ??
    entry.employee.employeeNumber;

  return localizeKnownOrgLabel(rawSubtitle, locale) ?? rawSubtitle;
}

function getEmployeeAvatarSrc(
  entry: LeaderboardOverviewResponse["leaderboard"][number],
) {
  return entry.employee.avatarUrl ?? null;
}

function getProgressDayLabel(locale: Locale, isCurrentMonth: boolean) {
  return localize(
    locale,
    isCurrentMonth ? "Сегодня" : "Последний день",
    isCurrentMonth ? "Today" : "Last day",
  );
}

function getProgressTotalLabel(locale: Locale, isCurrentMonth: boolean) {
  return localize(
    locale,
    isCurrentMonth ? "Итого за сегодня" : "Итог последнего дня",
    isCurrentMonth ? "Today total" : "Last day total",
  );
}

function getTopLeaderFrameClass(rank: number) {
  if (rank === 1) {
    return "min-h-[122px] border-amber-300 bg-amber-50/70 py-3 shadow-[0_18px_42px_rgba(245,158,11,0.12)] md:-mt-3 md:min-h-[124px]";
  }

  if (rank === 2) {
    return "border-blue-100 bg-white/90 shadow-[0_16px_34px_rgba(37,99,235,0.08)]";
  }

  return "border-orange-200 bg-white/90 shadow-[0_16px_34px_rgba(234,88,12,0.08)]";
}

function getTopLeaderOrderClass(rank: number) {
  if (rank === 1) {
    return "md:order-2";
  }

  if (rank === 2) {
    return "md:order-1";
  }

  return "md:order-3";
}

function getTopLeaderLayoutClass(rank: number) {
  return rank === 1
    ? "flex flex-col items-center justify-start text-center"
    : "flex items-center justify-center gap-5";
}

function getTopLeaderMedalSrc(rank: number) {
  if (rank === 1) {
    return "/1st.webp";
  }

  if (rank === 2) {
    return "/2nd.webp";
  }

  return "/3rd.webp";
}

function getTopLeaderAwardSrc(rank: number) {
  return rank === 1 ? "/cup.webp" : getTopLeaderMedalSrc(rank);
}

function getTopLeaderAwardClass(isFirstPlace: boolean, isPastMonth: boolean) {
  if (isFirstPlace) {
    return "absolute left-12 top-1/2 z-10 h-24 w-auto -translate-y-1/2";
  }

  return isFirstPlace
    ? "absolute left-[3.5rem] top-0 z-10 h-[7.5rem] w-auto -translate-y-px"
    : "absolute left-12 top-0 z-10 h-20 w-auto -translate-y-px";
}

function getTopLeaderPointsClass(rank: number) {
  if (rank === 1) {
    return "text-amber-600";
  }

  if (rank === 2) {
    return "text-blue-600";
  }

  return "text-orange-600";
}

function getProgressBarClass(todayPoints: number, maxDailyPoints: number) {
  return todayPoints >= maxDailyPoints ? "bg-emerald-400" : "bg-blue-400";
}

export function LeaderboardCenter({
  initialData,
}: {
  initialData?: LeaderboardCenterInitialData | null;
}) {
  const session = getSession();
  const { locale } = useI18n();
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);
  const initialMonthKey = initialData?.month.key ?? currentMonthKey;
  const initialDataMonthKey = useRef(initialData?.month.key ?? null);
  const [selectedMonthKey, setSelectedMonthKey] = useState(initialMonthKey);
  const [tab, setTab] = useState<LeaderboardCenterTab>("table");
  const [overview, setOverview] = useState<LeaderboardOverviewResponse | null>(
    initialData ?? null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const cacheKey = useMemo(
    () => buildLeaderboardCacheKey(session, selectedMonthKey),
    [selectedMonthKey, session],
  );

  async function loadOverview(
    monthKey: string,
    options?: { silent?: boolean },
  ) {
    if (!options?.silent) {
      setLoading(true);
    }

    try {
      const nextOverview = await apiRequest<LeaderboardOverviewResponse>(
        `/leaderboard/overview?month=${encodeURIComponent(monthKey)}`,
        {
          token: session?.accessToken,
        },
      );
      setOverview(nextOverview);
      setError(null);
    } catch (loadError) {
      if (!options?.silent) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : localize(
                locale,
                "Не удалось загрузить рейтинг.",
                "Unable to load the leaderboard.",
              ),
        );
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const canUseInitialData =
      initialData &&
      initialDataMonthKey.current === selectedMonthKey &&
      initialData.month.key === selectedMonthKey;

    if (canUseInitialData) {
      initialDataMonthKey.current = null;
      setOverview(initialData);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = cacheKey
      ? readClientCache<LeaderboardOverviewResponse>(
          cacheKey,
          LEADERBOARD_CACHE_TTL_MS,
        )
      : null;

    if (cached) {
      setOverview(cached.value);
      setLoading(false);
      if (!cached.isStale) {
        return;
      }
    }

    if (!cached) {
      setOverview(null);
    }

    void loadOverview(selectedMonthKey, {
      silent: Boolean(cached),
    });
  }, [cacheKey, initialData, locale, selectedMonthKey]);

  useEffect(() => {
    if (!cacheKey || !overview || loading) {
      return;
    }

    writeClientCache(cacheKey, overview);
  }, [cacheKey, loading, overview]);

  useWorkspaceAutoRefresh({
    session,
    enabled: Boolean(session),
    onRefresh: async () => {
      await loadOverview(selectedMonthKey, { silent: true });
    },
  });

  useEffect(() => {
    if (!session) {
      return;
    }

    const attendanceSocket = createAttendanceLiveSocket(session.accessToken);

    attendanceSocket.on("attendance:team-live", () => {
      void loadOverview(selectedMonthKey, { silent: true });
    });

    return () => {
      attendanceSocket.disconnect();
    };
  }, [locale, selectedMonthKey, session?.accessToken]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);

    if (selectedMonthKey === currentMonthKey) {
      url.searchParams.delete("month");
    } else {
      url.searchParams.set("month", selectedMonthKey);
    }

    window.history.replaceState(window.history.state, "", url.toString());
  }, [currentMonthKey, selectedMonthKey]);

  const isCurrentMonth = selectedMonthKey === currentMonthKey;
  const isPastMonth = selectedMonthKey < currentMonthKey;
  const canGoForward = selectedMonthKey < currentMonthKey;
  const leaderboard = overview?.leaderboard ?? [];
  const topLeaders = leaderboard.slice(0, 3);
  const monthLabel = formatMonthLabel(
    overview?.month.key ?? selectedMonthKey,
    locale,
  );
  const progressDayLabel = getProgressDayLabel(locale, isCurrentMonth);
  const progressTotalLabel = getProgressTotalLabel(locale, isCurrentMonth);
  const safeTodayMaxPoints = Math.max(
    overview?.me.todayMaxPoints ?? overview?.summary.maxDailyPoints ?? 1,
    1,
  );
  const todayCompletionPercent = overview
    ? Math.min(
        100,
        Math.round((overview.me.todayPoints / safeTodayMaxPoints) * 100),
      )
    : 0;
  const completedDaySteps = Math.min(
    9,
    Math.max(0, Math.round((todayCompletionPercent / 100) * 9)),
  );
  const firstPlacePoints = leaderboard[0]?.points ?? overview?.me.points ?? 0;
  const pointsToFirst = overview
    ? Math.max(0, firstPlacePoints - overview.me.points)
    : 0;
  const recentDailyActivity = overview?.me.dailyActivity?.slice(-7) ?? [];

  return (
    <div className="flex min-h-0 flex-col gap-5">
      {topLeaders.length > 0 ? (
        <section className="px-1">
          <div className="grid gap-3 md:grid-cols-3 md:items-end">
            {topLeaders.map((entry) => {
              const fullName = getEmployeeFullName(entry);
              const isFirstPlace = entry.rank === 1;
              const awardSrc = getTopLeaderAwardSrc(entry.rank);
              const awardClassName = getTopLeaderAwardClass(
                isFirstPlace,
                isPastMonth,
              );

              return (
                <article
                  className={`relative min-h-[104px] rounded-2xl border px-5 ${
                    isFirstPlace && !isPastMonth
                      ? "overflow-visible"
                      : "overflow-hidden py-4"
                  } ${getTopLeaderFrameClass(entry.rank)} ${getTopLeaderOrderClass(entry.rank)} ${getTopLeaderLayoutClass(
                    entry.rank,
                  )}`}
                  key={entry.employee.id}
                >
                  <img
                    alt=""
                    aria-hidden="true"
                    className={awardClassName}
                    src={awardSrc}
                  />
                  <span className="pointer-events-none absolute right-8 top-4 h-1.5 w-1.5 rounded-full bg-blue-300/70" />
                  <span className="pointer-events-none absolute right-20 top-8 h-1.5 w-1.5 rounded-full bg-rose-300/70" />
                  <span className="pointer-events-none absolute left-24 top-6 h-1.5 w-1.5 rounded-full bg-emerald-300/70" />
                  <Avatar
                    alt={fullName}
                    className={`shrink-0 ring-2 ${
                      isFirstPlace && !isPastMonth
                        ? "mt-6 ring-amber-200"
                        : isFirstPlace
                          ? "ring-amber-200"
                          : "ring-white"
                    }`}
                    initials={getEmployeeInitials(fullName)}
                    size={isFirstPlace ? "2xl" : "xl"}
                    src={getEmployeeAvatarSrc(entry)}
                  />
                  <div
                    className={
                      isFirstPlace ? "mt-1 min-w-0" : "min-w-0 text-left"
                    }
                  >
                    <div
                      className={`flex items-center gap-2 ${
                        isFirstPlace ? "justify-center" : ""
                      }`}
                    >
                      <p className="truncate text-base font-semibold leading-[1.15] text-[color:var(--foreground)]">
                        {fullName}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-xs leading-4 text-[color:var(--muted-foreground)]">
                      {getEmployeeSubtitle(entry, locale)}
                    </p>
                    <p
                      className={`text-xl font-semibold leading-none tracking-[-0.04em] tabular-nums ${
                        isFirstPlace ? "mt-1.5" : "mt-1"
                      } ${getTopLeaderPointsClass(entry.rank)}`}
                    >
                      {entry.points}{" "}
                      <span className="text-sm tracking-normal">
                        {localize(locale, "очков", "points")}
                      </span>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-[82px] flex-col items-center text-center">
            <strong className="block text-2xl font-normal leading-none tracking-[-0.04em] tabular-nums text-[color:var(--foreground)]">
              {overview
                ? `${overview.me.rank}/${overview.summary.participants}`
                : "—"}
            </strong>
            <span className="section-kicker mt-1 block">
              {localize(locale, "Ваш ранг", "Your rank")}
            </span>
          </div>
          <Separator
            className="h-10 bg-[rgba(15,23,42,0.12)]"
            orientation="vertical"
          />
          <div className="flex min-w-[70px] flex-col items-center text-center">
            <strong className="block text-2xl font-normal leading-none tracking-[-0.04em] tabular-nums text-[color:var(--foreground)]">
              {overview?.me.streak ?? 0}
            </strong>
            <span className="section-kicker mt-1 block">
              {localize(locale, "Серия", "Streak")}
            </span>
          </div>
          <Separator
            className="h-10 bg-[rgba(15,23,42,0.12)]"
            orientation="vertical"
          />
          <div className="flex min-w-[70px] flex-col items-center text-center">
            <strong className="block text-2xl font-normal leading-none tracking-[-0.04em] tabular-nums text-[color:var(--foreground)]">
              {overview?.me.points ?? 0}
            </strong>
            <span className="section-kicker mt-1 block">
              {localize(locale, "Очки", "Points")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex h-12 overflow-hidden rounded-xl border border-border bg-white">
            <button
              className={`flex h-full items-center gap-2 px-4 text-sm font-heading font-medium transition-colors ${
                tab === "table"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab("table")}
              type="button"
            >
              <Trophy className="h-4 w-4" />
              {localize(locale, "Таблица", "Table")}
            </button>
            <button
              className={`flex h-full items-center gap-2 px-4 text-sm font-heading font-medium transition-colors ${
                tab === "progress"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab("progress")}
              type="button"
            >
              <Target className="h-4 w-4" />
              {localize(locale, "Мой прогресс", "My progress")}
            </button>
          </div>

          <div className="flex h-12 items-center gap-2 rounded-xl border border-[rgba(15,23,42,0.08)] bg-white/90 px-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <button
              className="schedule-calendar-nav-button"
              onClick={() =>
                setSelectedMonthKey((current) => shiftMonthKey(current, -1))
              }
              type="button"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="min-w-[220px] px-2 text-center text-base font-medium tracking-[-0.03em] text-[color:var(--foreground)]">
              {monthLabel}
            </div>
            <button
              className="schedule-calendar-nav-button"
              disabled={!canGoForward}
              onClick={() => {
                if (!canGoForward) {
                  return;
                }

                setSelectedMonthKey((current) => shiftMonthKey(current, 1));
              }}
              type="button"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {tab === "table" ? (
        <div className="team-tasks-table-card h-[min(62vh,640px)]">
          {loading ? (
            <div className="flex h-full items-center justify-center px-5 text-center text-sm font-heading text-muted-foreground">
              {localize(
                locale,
                "Загружаем рейтинг...",
                "Loading leaderboard...",
              )}
            </div>
          ) : !overview || leaderboard.length === 0 ? (
            <div className="flex h-full items-center justify-center px-5 text-center text-sm font-heading text-muted-foreground">
              {localize(
                locale,
                "Пока нет данных для рейтинга.",
                "No leaderboard data yet.",
              )}
            </div>
          ) : (
            <div className="team-tasks-table-shell">
              <Table
                aria-label={localize(
                  locale,
                  "Таблица рейтинга",
                  "Leaderboard table",
                )}
                size="sm"
              >
                <Table.Header>
                  <Table.Head
                    className="w-[44%] min-w-[360px]"
                    id="employee"
                    isRowHeader
                    label={localize(locale, "Сотрудник", "Employee")}
                  />
                  <Table.Head
                    className="w-[18%] min-w-[150px] team-tasks-head-center"
                    id="today"
                    label={progressDayLabel}
                  />
                  <Table.Head
                    className="w-[14%] min-w-[120px] team-tasks-head-center"
                    id="streak"
                    label={localize(locale, "Серия", "Streak")}
                  />
                  <Table.Head
                    className="w-[24%] min-w-[160px] team-tasks-head-center"
                    id="points"
                    label={localize(locale, "Очки", "Points")}
                  />
                </Table.Header>

                <Table.Body items={leaderboard}>
                  {(entry) => {
                    const isMe = entry.employee.id === overview.me.employeeId;
                    const fullName = getEmployeeFullName(entry);
                    const todayMaxPoints = overview.summary.maxDailyPoints || 1;
                    const todayProgressPercent = Math.min(
                      100,
                      Math.round((entry.todayPoints / todayMaxPoints) * 100),
                    );

                    return (
                      <Table.Row
                        className={`team-tasks-table-row !cursor-default ${
                          isMe ? "is-open is-current-user" : ""
                        }`}
                        id={entry.employee.id}
                      >
                        <Table.Cell className="align-middle">
                          <div className="flex items-center gap-4">
                            <div className="flex w-7 shrink-0 items-center justify-center text-sm font-semibold tabular-nums text-[color:var(--muted-foreground)]">
                              {entry.rank}
                            </div>
                            <Avatar
                              alt={fullName}
                              className="shrink-0"
                              initials={getEmployeeInitials(fullName)}
                              size="sm"
                              src={getEmployeeAvatarSrc(entry)}
                            />
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center">
                                <p className="truncate text-base font-medium text-[color:var(--foreground)]">
                                  {fullName}
                                </p>
                              </div>
                              <p className="truncate text-sm text-[color:var(--muted-foreground)]">
                                {getEmployeeSubtitle(entry, locale)}
                              </p>
                            </div>
                          </div>
                        </Table.Cell>

                        <Table.Cell className="align-middle whitespace-nowrap">
                          <div className="min-w-[150px]">
                            <strong className="block text-sm font-semibold tabular-nums text-[color:var(--foreground)]">
                              {entry.todayPoints}/
                              {overview.summary.maxDailyPoints}
                            </strong>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(148,163,184,0.2)]">
                              <div
                                className={`h-full rounded-full ${getProgressBarClass(
                                  entry.todayPoints,
                                  todayMaxPoints,
                                )}`}
                                style={{ width: `${todayProgressPercent}%` }}
                              />
                            </div>
                          </div>
                        </Table.Cell>

                        <Table.Cell className="align-middle whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5 text-sm text-[color:var(--muted-foreground)]">
                            {entry.streak > 5 ? (
                              <Flame
                                className="size-4 shrink-0 text-orange-500"
                                fill="currentColor"
                                strokeWidth={1.8}
                              />
                            ) : null}
                            <strong className="font-medium tabular-nums text-[color:var(--foreground)]">
                              {entry.streak}
                            </strong>
                            <span>{localize(locale, "дней", "days")}</span>
                          </div>
                        </Table.Cell>

                        <Table.Cell className="align-middle whitespace-nowrap">
                          <div className="team-tasks-row-button team-tasks-row-button--center">
                            <strong className="text-[clamp(1.7rem,2.6vw,2.15rem)] font-semibold leading-none tracking-[-0.05em] tabular-nums text-[color:var(--foreground)]">
                              {entry.points}
                            </strong>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  }}
                </Table.Body>
              </Table>
            </div>
          )}
        </div>
      ) : (
        <article className="h-[min(72vh,800px)] overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center rounded-2xl bg-white px-5 text-center text-sm font-heading text-muted-foreground">
              {localize(
                locale,
                "Загружаем рейтинг...",
                "Loading leaderboard...",
              )}
            </div>
          ) : !overview ? (
            <div className="flex h-full items-center justify-center rounded-2xl bg-white px-5 text-center text-sm font-heading text-muted-foreground">
              {localize(
                locale,
                "Пока нет данных для рейтинга.",
                "No leaderboard data yet.",
              )}
            </div>
          ) : (
            <div className="h-full overflow-y-auto pr-1">
              <div className="grid gap-3">
                <article className="rounded-2xl bg-blue-600 px-5 py-4 text-white shadow-[0_18px_42px_rgba(37,99,235,0.28)]">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(120px,0.5fr)_minmax(120px,0.5fr)_auto] md:items-center">
                    <div className="flex items-center gap-4">
                      <Trophy className="size-9 shrink-0" />
                      <div>
                        <strong className="block text-xl font-semibold tracking-[-0.03em]">
                          {progressTotalLabel}
                        </strong>
                        <p className="mt-1 text-sm text-white/75">
                          {localize(
                            locale,
                            "Вы на шаг ближе к лидерству",
                            "You are one step closer to the lead",
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="border-white/20 md:border-l md:pl-6">
                      <strong className="block text-3xl font-semibold leading-none tracking-[-0.05em] tabular-nums">
                        {overview.me.todayPoints}/{overview.me.todayMaxPoints}
                      </strong>
                      <span className="mt-1 block text-xs font-medium text-white/75">
                        {localize(locale, "выполнено сегодня", "done today")}
                      </span>
                    </div>
                    <div className="border-white/20 md:border-l md:pl-6">
                      <strong className="block text-3xl font-semibold leading-none tracking-[-0.05em] tabular-nums">
                        {safeTodayMaxPoints}
                      </strong>
                      <span className="mt-1 block text-xs font-medium text-white/75">
                        {localize(locale, "максимум за день", "daily maximum")}
                      </span>
                    </div>
                    <button
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/18 active:translate-y-px"
                      onClick={() => setTab("table")}
                      type="button"
                    >
                      {localize(locale, "Посмотреть таблицу", "View table")}
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </article>

                <div className="grid gap-3 xl:grid-cols-[minmax(340px,0.95fr)_minmax(460px,1.45fr)]">
                  <article className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
                    <h2 className="text-base font-semibold tracking-[-0.02em] text-[color:var(--foreground)]">
                      {localize(
                        locale,
                        "Прогресс за сегодня",
                        "Today progress",
                      )}
                    </h2>
                    <div className="mt-5 grid gap-5 md:grid-cols-[128px_minmax(0,1fr)] md:items-center">
                      <div className="relative size-32">
                        <svg
                          className="size-32 -rotate-90"
                          viewBox="0 0 120 120"
                        >
                          <circle
                            cx="60"
                            cy="60"
                            fill="none"
                            r="50"
                            stroke="rgba(37,99,235,0.08)"
                            strokeWidth="10"
                          />
                          <circle
                            cx="60"
                            cy="60"
                            fill="none"
                            pathLength={100}
                            r="50"
                            stroke="rgb(40,75,255)"
                            strokeDasharray={`${todayCompletionPercent} 100`}
                            strokeLinecap="round"
                            strokeWidth="10"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <strong className="text-3xl font-semibold leading-none tracking-[-0.05em] tabular-nums text-[color:var(--foreground)]">
                            {overview.me.todayPoints}/
                            {overview.me.todayMaxPoints}
                          </strong>
                          <span className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                            {localize(locale, "выполнено", "done")}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <strong className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--foreground)]">
                          {localize(locale, "Отличный темп", "Great pace")}
                        </strong>
                        <p className="mt-3 max-w-[34ch] text-sm leading-6 text-[color:var(--muted-foreground)]">
                          {localize(
                            locale,
                            "Вы на правильном пути к победе. Осталось выполнить 5 действий до максимума за сегодня.",
                            "You are on track to win. Complete 5 more actions to reach today's maximum.",
                          )}
                        </p>
                        <div className="mt-4 flex items-center gap-2">
                          {Array.from({ length: 9 }).map((_, index) => (
                            <span
                              className={`flex size-5 items-center justify-center rounded-full border text-[10px] ${
                                index < Math.max(1, completedDaySteps)
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-[rgba(148,163,184,0.28)] bg-white text-transparent"
                              }`}
                              key={index}
                            >
                              {index < Math.max(1, completedDaySteps)
                                ? "✓"
                                : ""}
                            </span>
                          ))}
                        </div>
                        <button
                          className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 active:translate-y-px"
                          onClick={() => setTab("table")}
                          type="button"
                        >
                          {localize(
                            locale,
                            "Продолжить работу",
                            "Continue work",
                          )}
                          <Zap className="size-4" />
                        </button>
                      </div>
                    </div>
                  </article>

                  <article className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
                    <h2 className="text-base font-semibold tracking-[-0.02em] text-[color:var(--foreground)]">
                      {localize(
                        locale,
                        "Как получить очки",
                        "How to earn points",
                      )}
                    </h2>
                    <div className="mt-4 grid gap-2">
                      {overview.me.progress.map((metric) => (
                        <div
                          className={`grid grid-cols-[40px_minmax(0,1fr)_auto_24px] items-center gap-3 rounded-xl border px-3 py-2.5 ${
                            metric.completed
                              ? "border-emerald-100 bg-emerald-50/70"
                              : "border-[rgba(148,163,184,0.18)] bg-white"
                          }`}
                          key={metric.key}
                        >
                          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
                            {metric.key === "on_time_arrival" ? (
                              <LogIn className="size-4" />
                            ) : metric.key === "on_time_departure" ? (
                              <LogOut className="size-4" />
                            ) : (
                              <ClipboardCheck className="size-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <strong className="block truncate text-sm font-semibold leading-5 text-[color:var(--foreground)]">
                              {getProgressTitle(metric.key, locale)}
                            </strong>
                            <p className="truncate text-xs text-[color:var(--muted-foreground)]">
                              {getScoreActionSubtitle(metric, locale)}
                            </p>
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-emerald-600">
                            {localize(
                              locale,
                              `+${metric.maxPoints} очков`,
                              `+${metric.maxPoints} points`,
                            )}
                          </span>
                          {metric.completed ? (
                            <CheckCircle2 className="size-5 text-emerald-600" />
                          ) : (
                            <Circle className="size-5 text-[rgba(148,163,184,0.5)]" />
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(320px,1.05fr)_minmax(260px,0.75fr)_minmax(300px,0.95fr)]">
                  <article className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <Flame className="size-5 text-orange-500" />
                      <h2 className="text-base font-semibold tracking-[-0.02em] text-[color:var(--foreground)]">
                        {localize(locale, "Ваша серия", "Your streak")}
                      </h2>
                      <strong className="text-base font-semibold tabular-nums text-orange-500">
                        {overview.me.streak} {localize(locale, "дней", "days")}
                      </strong>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-[color:var(--muted-foreground)]">
                      {localize(
                        locale,
                        "Сохраняйте серию и получайте дополнительные бонусы.",
                        "Keep your streak and earn extra bonuses.",
                      )}
                    </p>
                    <div className="mt-4">
                      <div className="grid grid-cols-7 gap-2">
                        {recentDailyActivity.map((day, index) => {
                          const isHot =
                            day.onTimeArrival &&
                            index === recentDailyActivity.length - 1;

                          return (
                            <div
                              className="flex flex-col items-center gap-2"
                              key={day.dayKey}
                            >
                              <span className="text-xs text-[color:var(--muted-foreground)]">
                                {formatActivityDayLabel(day.dayKey, locale)}
                              </span>
                              <span
                                className={`flex size-7 items-center justify-center rounded-full text-white ${
                                  day.onTimeArrival
                                    ? isHot
                                      ? "bg-orange-500"
                                      : "bg-emerald-600"
                                    : "bg-slate-200 text-slate-400"
                                }`}
                              >
                                {day.onTimeArrival && isHot ? (
                                  <Flame
                                    className="size-4"
                                    fill="currentColor"
                                  />
                                ) : day.onTimeArrival ? (
                                  <CheckCircle2 className="size-4" />
                                ) : (
                                  <Circle className="size-4" />
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </article>

                  <article className="rounded-2xl border border-[rgba(124,58,237,0.08)] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
                    <div className="flex items-center gap-2">
                      <Star className="size-5 text-violet-600" />
                      <h2 className="text-base font-semibold tracking-[-0.02em] text-[color:var(--foreground)]">
                        {localize(
                          locale,
                          "Что поможет подняться выше",
                          "What helps you climb",
                        )}
                      </h2>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-[color:var(--muted-foreground)]">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-violet-600" />
                        {localize(
                          locale,
                          "Закройте смену вовремя",
                          "Close the shift on time",
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Flame className="size-4 text-orange-500" />
                        {localize(
                          locale,
                          "Сохраняйте серию",
                          "Keep the streak",
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="size-4 text-blue-600" />
                        {localize(
                          locale,
                          `До 1 места осталось ${pointsToFirst} очков`,
                          `${pointsToFirst} points to 1st place`,
                        )}
                      </div>
                    </div>
                  </article>

                  <article className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-base font-semibold tracking-[-0.02em] text-[color:var(--foreground)]">
                        {localize(
                          locale,
                          "Активность по дням",
                          "Activity by day",
                        )}
                      </h2>
                    </div>
                    <div className="mt-4 grid h-24 grid-cols-7 items-end gap-4">
                      {recentDailyActivity.map((day) => {
                        const maxPoints = Math.max(day.maxPoints, 1);
                        const ratio = Math.min(1, day.earnedPoints / maxPoints);
                        const tooltip = localize(
                          locale,
                          `${day.earnedPoints}/${day.maxPoints} очков`,
                          `${day.earnedPoints}/${day.maxPoints} points`,
                        );

                        return (
                          <div
                            aria-label={tooltip}
                            className="group relative flex flex-col items-center gap-2"
                            key={day.dayKey}
                          >
                            <div className="relative flex h-16 items-end">
                              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[color:var(--foreground)] px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition-opacity group-hover:opacity-100">
                                {tooltip}
                              </span>
                              <span
                                className="block w-5 rounded-t-sm bg-blue-500/70"
                                style={{
                                  height: `${Math.round(ratio * 64)}px`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-[color:var(--muted-foreground)]">
                              {formatActivityDayLabel(day.dayKey, locale)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
                      <span className="size-2 rounded-full bg-blue-600" />
                      {localize(locale, "Выполнено задач", "Completed tasks")}
                    </div>
                  </article>
                </div>
              </div>
            </div>
          )}
        </article>
      )}
    </div>
  );
}
