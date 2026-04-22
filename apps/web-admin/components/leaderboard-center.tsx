"use client";

import { type LeaderboardOverviewResponse } from "@smart/types";
import {
  CalendarRange,
  Flame,
  Medal,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import { type Locale, useI18n } from "@/lib/i18n";
import { useWorkspaceAutoRefresh } from "@/lib/use-workspace-auto-refresh";

export type LeaderboardCenterInitialData = LeaderboardOverviewResponse;

type LeaderboardCenterTab = "table" | "progress";

const LEADERBOARD_CACHE_TTL_MS = 30_000;

function localize(locale: Locale, ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

function buildLeaderboardCacheKey(session: ReturnType<typeof getSession>) {
  return session ? `leaderboard-center:${session.user.id}` : null;
}

function formatMonthLabel(value: string, locale: Locale) {
  const parsed = new Date(`${value}-01T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatMetricPoints(earnedPoints: number, maxPoints: number) {
  return `+${earnedPoints} / +${maxPoints}`;
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

function getProgressDescription(
  metric: LeaderboardOverviewResponse["me"]["progress"][number],
  locale: Locale,
) {
  if (metric.key === "on_time_arrival") {
    return metric.completed
      ? localize(
          locale,
          "Say Hi прошел вовремя. Баллы уже начислены.",
          "Your Say Hi was on time. The points are already counted.",
        )
      : localize(
          locale,
          "Сделайте своевременный Say Hi в рамках смены, чтобы забрать +5.",
          "Complete Say Hi on time during your shift to earn +5.",
        );
  }

  if (metric.key === "on_time_departure") {
    return metric.completed
      ? localize(
          locale,
          "Смена закрыта вовремя. Баллы уже начислены.",
          "Your shift closed on time. The points are already counted.",
        )
      : localize(
          locale,
          "Закройте смену вовремя, чтобы получить оставшиеся +5.",
          "Close your shift on time to earn the remaining +5.",
        );
  }

  if (metric.details.dueTaskCount === 0) {
    return metric.details.overdueCount > 0
      ? localize(
          locale,
          `Сегодня новых задач нет, но просрочек еще ${metric.details.overdueCount}.`,
          `No new tasks are due today, but ${metric.details.overdueCount} overdue items are still open.`,
        )
      : localize(
          locale,
          "На сегодня все чисто: новых задач нет и просрочек тоже нет.",
          "Today is clear: there are no new tasks and no overdue items.",
        );
  }

  return localize(
    locale,
    `Закрыто ${metric.details.completedDueTaskCount}/${metric.details.dueTaskCount}. Просрочек сейчас: ${metric.details.overdueCount}.`,
    `Closed ${metric.details.completedDueTaskCount}/${metric.details.dueTaskCount}. Current overdue tasks: ${metric.details.overdueCount}.`,
  );
}

export function LeaderboardCenter({
  initialData,
}: {
  initialData?: LeaderboardCenterInitialData | null;
}) {
  const session = getSession();
  const { locale } = useI18n();
  const cacheKey = useMemo(() => buildLeaderboardCacheKey(session), [session]);
  const didUseInitialData = useRef(Boolean(initialData));
  const [tab, setTab] = useState<LeaderboardCenterTab>("table");
  const [overview, setOverview] = useState<LeaderboardOverviewResponse | null>(
    initialData ?? null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  async function loadOverview(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
    }

    try {
      const nextOverview = await apiRequest<LeaderboardOverviewResponse>(
        "/leaderboard/overview",
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
                "Не удалось загрузить leaderboard.",
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
    if (didUseInitialData.current && initialData) {
      didUseInitialData.current = false;
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

    void loadOverview({
      silent: Boolean(cached),
    });
  }, [cacheKey, initialData, locale]);

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
      await loadOverview({ silent: true });
    },
  });

  const leaderboard = overview?.leaderboard ?? [];
  const monthLabel = overview
    ? formatMonthLabel(overview.month.key, locale)
    : localize(locale, "Текущий месяц", "Current month");

  return (
    <div className="section-stack">
      <section className="section-header">
        <span className="header-ribbon">
          <span />
          {localize(locale, "Командная мотивация", "Team motivation")}
        </span>
        <h1>{localize(locale, "Leaderboard", "Leaderboard")}</h1>
        <p>
          {localize(
            locale,
            "Очки и streak считаются поверх текущих attendance, задач и чек-листов. Рейтинг каждый месяц начинается заново с 1-го числа.",
            "Points and streaks are calculated from the current attendance, tasks, and checklists. The ranking resets on the 1st day of each month.",
          )}
        </p>
      </section>

      <section className="stats-grid">
        <article className="metric-card metric-card--accent">
          <span className="section-kicker">
            {localize(locale, "Период", "Period")}
          </span>
          <strong className="metric-value">{monthLabel}</strong>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {localize(
              locale,
              "Ежемесячный reset leaderboard.",
              "Monthly leaderboard reset.",
            )}
          </p>
        </article>
        <article className="metric-card">
          <span className="section-kicker">
            {localize(locale, "Участники", "Participants")}
          </span>
          <strong className="metric-value tabular-nums">
            {overview?.summary.participants ?? 0}
          </strong>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {localize(
              locale,
              "Все сотрудники в команде.",
              "Everyone in the team.",
            )}
          </p>
        </article>
        <article className="metric-card">
          <span className="section-kicker">
            {localize(locale, "Ваш ранг", "Your rank")}
          </span>
          <strong className="metric-value tabular-nums">
            {overview
              ? `${overview.me.rank}/${overview.summary.participants}`
              : "—"}
          </strong>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {localize(
              locale,
              "Позиция внутри текущего месяца.",
              "Your position this month.",
            )}
          </p>
        </article>
        <article className="metric-card">
          <span className="section-kicker">
            {localize(locale, "Streak", "Streak")}
          </span>
          <strong className="metric-value tabular-nums">
            {overview?.me.streak ?? 0}
          </strong>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {localize(
              locale,
              "Серия своевременных приходов.",
              "Current on-time arrival streak.",
            )}
          </p>
        </article>
      </section>

      <section className="content-grid employees-grid">
        <article className="panel">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="panel-header">
              <div>
                <span className="section-kicker">
                  {localize(locale, "Рейтинг команды", "Team ranking")}
                </span>
                <h2>{localize(locale, "Leaderboard", "Leaderboard")}</h2>
              </div>
              <p className="text-sm text-[color:var(--muted-foreground)]">
                {localize(
                  locale,
                  "Показываем очки, дневной результат и streak по каждому сотруднику.",
                  "Showing points, daily progress, and streaks for every employee.",
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setTab("table")}
                size="sm"
                variant={tab === "table" ? "default" : "outline"}
              >
                <Trophy className="size-4" />
                {localize(locale, "Таблица", "Table")}
              </Button>
              <Button
                onClick={() => setTab("progress")}
                size="sm"
                variant={tab === "progress" ? "default" : "outline"}
              >
                <Target className="size-4" />
                {localize(locale, "Мой прогресс", "My progress")}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="empty-state rounded-[18px] border border-[rgba(239,68,68,0.12)] px-4 py-3 text-sm text-[color:var(--destructive)]">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="empty-state rounded-[18px] px-4 py-6 text-sm">
              {localize(
                locale,
                "Загружаем leaderboard...",
                "Loading leaderboard...",
              )}
            </div>
          ) : !overview ? (
            <div className="empty-state rounded-[18px] px-4 py-6 text-sm">
              {localize(
                locale,
                "Пока нет данных для рейтинга.",
                "No leaderboard data yet.",
              )}
            </div>
          ) : tab === "table" ? (
            <div className="table-list">
              <div className="table-row table-row-collaboration-leaderboard table-head border-b border-[rgba(148,163,184,0.14)] px-4 py-3">
                <div>{localize(locale, "Сотрудник", "Employee")}</div>
                <div>{localize(locale, "Ранг", "Rank")}</div>
                <div>{localize(locale, "За месяц", "Month")}</div>
                <div>{localize(locale, "Сегодня", "Today")}</div>
                <div>{localize(locale, "Streak", "Streak")}</div>
              </div>
              {leaderboard.map((entry) => {
                const isMe = entry.employee.id === overview.me.employeeId;

                return (
                  <div
                    className={`table-row table-row-collaboration-leaderboard border-b border-[rgba(148,163,184,0.12)] px-4 py-4 last:border-b-0 ${
                      isMe ? "bg-[rgba(37,99,235,0.06)]" : ""
                    }`}
                    key={entry.employee.id}
                  >
                    <div className="min-w-0">
                      <strong className="block truncate">
                        {entry.employee.firstName} {entry.employee.lastName}
                      </strong>
                      <p className="truncate text-sm text-[color:var(--muted-foreground)]">
                        {entry.employee.position?.name ??
                          entry.employee.department?.name ??
                          entry.employee.employeeNumber}
                      </p>
                    </div>
                    <div>
                      <strong className="tabular-nums">{entry.rank}</strong>
                      <p className="text-sm text-[color:var(--muted-foreground)]">
                        {isMe
                          ? localize(locale, "Вы", "You")
                          : localize(locale, "Место", "Position")}
                      </p>
                    </div>
                    <div>
                      <strong className="tabular-nums">{entry.points}</strong>
                      <p className="text-sm text-[color:var(--muted-foreground)]">
                        {localize(locale, "Очки", "Points")}
                      </p>
                    </div>
                    <div>
                      <strong className="tabular-nums">
                        {entry.todayPoints}/{overview.summary.maxDailyPoints}
                      </strong>
                      <p className="text-sm text-[color:var(--muted-foreground)]">
                        {localize(locale, "Сегодня", "Today")}
                      </p>
                    </div>
                    <div>
                      <strong className="tabular-nums">{entry.streak}</strong>
                      <p className="text-sm text-[color:var(--muted-foreground)]">
                        {localize(locale, "дней", "days")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="section-stack">
              <div className="grid gap-4 md:grid-cols-4">
                <article className="rounded-[18px] border border-[rgba(37,99,235,0.12)] bg-[rgba(37,99,235,0.05)] px-4 py-4">
                  <div className="mb-3 flex items-center gap-2 text-[color:var(--accent)]">
                    <Medal className="size-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                      {localize(locale, "Ранг", "Rank")}
                    </span>
                  </div>
                  <strong className="text-3xl tabular-nums">
                    {overview.me.rank}/{overview.summary.participants}
                  </strong>
                </article>
                <article className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-4">
                  <div className="mb-3 flex items-center gap-2 text-[color:var(--muted-foreground)]">
                    <Sparkles className="size-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                      {localize(locale, "Сегодня", "Today")}
                    </span>
                  </div>
                  <strong className="text-3xl tabular-nums">
                    {overview.me.todayPoints}/{overview.me.todayMaxPoints}
                  </strong>
                </article>
                <article className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-4">
                  <div className="mb-3 flex items-center gap-2 text-[color:var(--muted-foreground)]">
                    <Trophy className="size-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                      {localize(locale, "За месяц", "Month")}
                    </span>
                  </div>
                  <strong className="text-3xl tabular-nums">
                    {overview.me.points}
                  </strong>
                </article>
                <article className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-4">
                  <div className="mb-3 flex items-center gap-2 text-[color:var(--muted-foreground)]">
                    <Flame className="size-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                      {localize(locale, "Streak", "Streak")}
                    </span>
                  </div>
                  <strong className="text-3xl tabular-nums">
                    {overview.me.streak}
                  </strong>
                </article>
              </div>

              <div className="grid gap-3">
                {overview.me.progress.map((metric) => (
                  <article
                    className={`rounded-[18px] border px-4 py-4 ${
                      metric.completed
                        ? "border-[rgba(16,185,129,0.18)] bg-[rgba(16,185,129,0.08)]"
                        : "border-[rgba(148,163,184,0.16)] bg-white"
                    }`}
                    key={metric.key}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <strong className="block">
                          {getProgressTitle(metric.key, locale)}
                        </strong>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                          {getProgressDescription(metric, locale)}
                        </p>
                      </div>
                      <div className="rounded-full bg-[rgba(15,23,42,0.06)] px-3 py-2 text-sm font-semibold tabular-nums">
                        {formatMetricPoints(
                          metric.earnedPoints,
                          metric.maxPoints,
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <article className="rounded-[18px] bg-[color:var(--foreground)] px-4 py-4 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="size-4" />
                    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                      {localize(locale, "Итого за сегодня", "Today total")}
                    </span>
                  </div>
                  <strong className="text-2xl tabular-nums">
                    {overview.me.todayPoints}/{overview.me.todayMaxPoints}
                  </strong>
                </div>
              </article>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
