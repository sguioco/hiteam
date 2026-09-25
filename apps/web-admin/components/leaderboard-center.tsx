"use client";

import {
  type LeaderboardBootstrapResponse,
  type LeaderboardOverviewResponse,
} from "@smart/types";
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
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Table } from "@/components/application/table/table";
import { Avatar } from "@/components/base/avatar/avatar";
import { AppSelectField } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { WorkspaceLoading } from "@/components/workspace-loading";
import { WorkspaceFeedback, WorkspacePageHeader } from "@/components/ui/workspace-patterns";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { createAttendanceLiveSocket } from "@/lib/attendance-socket";
import { clearClientCache, readClientCache, writeClientCache } from "@/lib/client-cache";
import { type Locale, useI18n } from "@/lib/i18n";
import { useWorkspaceAutoRefresh } from "@/lib/use-workspace-auto-refresh";

export type LeaderboardCenterInitialData = LeaderboardOverviewResponse;

type LeaderboardCenterTab = "table" | "progress";
type MonthTransitionDirection = "previous" | "next" | null;

const LEADERBOARD_CACHE_TTL_MS = 10 * 60_000;
const leaderboardOverviewRequests = new Map<
  string,
  Promise<LeaderboardOverviewResponse>
>();

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

function normalizeSelectableMonthKey(
  value: string | null | undefined,
  currentMonthKey: string,
) {
  const parsed = value ? parseMonthKey(value) : null;
  if (!parsed) {
    return null;
  }

  const monthKey = formatMonthKey(parsed);
  return monthKey <= currentMonthKey ? monthKey : currentMonthKey;
}

async function requestLeaderboardOverview(params: {
  accessToken?: string;
  cacheKey: string | null;
  monthKey: string;
}) {
  if (!params.accessToken) {
    return null;
  }

  const requestKey = params.cacheKey ?? `leaderboard-center:${params.monthKey}`;
  const existingRequest = leaderboardOverviewRequests.get(requestKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = apiRequest<LeaderboardBootstrapResponse>(
    `/bootstrap/leaderboard?month=${encodeURIComponent(params.monthKey)}`,
    {
      token: params.accessToken,
      cacheTtlMs: LEADERBOARD_CACHE_TTL_MS,
    },
  )
    .then((snapshot) => {
      const nextOverview = snapshot.initialData;

      if (params.cacheKey && nextOverview.month.key === params.monthKey) {
        writeClientCache(params.cacheKey, nextOverview);
      }

      return nextOverview;
    })
    .finally(() => {
      leaderboardOverviewRequests.delete(requestKey);
    });

  leaderboardOverviewRequests.set(requestKey, request);
  return request;
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
  return `${entry.employee.lastName} ${entry.employee.firstName}`.trim();
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
  requestedMonthKey,
}: {
  initialData?: LeaderboardCenterInitialData | null;
  requestedMonthKey?: string | null;
}) {
  const session = getSession();
  const { locale } = useI18n();
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);
  const requestedInitialMonthKey = useMemo(
    () => normalizeSelectableMonthKey(requestedMonthKey, currentMonthKey),
    [currentMonthKey, requestedMonthKey],
  );
  const initialMonthKey =
    initialData?.month.key ?? requestedInitialMonthKey ?? currentMonthKey;
  const initialDataMonthKey = useRef(initialData?.month.key ?? null);
  const [selectedMonthKey, setSelectedMonthKey] = useState(initialMonthKey);
  const selectedMonthKeyRef = useRef(initialMonthKey);
  const [monthTransitionDirection, setMonthTransitionDirection] =
    useState<MonthTransitionDirection>(null);
  const [tab, setTab] = useState<LeaderboardCenterTab>("table");
  const [locationFilter, setLocationFilter] = useState("");
  const [overview, setOverview] = useState<LeaderboardOverviewResponse | null>(
    initialData ?? null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [visibilityFeedback, setVisibilityFeedback] = useState<"saved" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cacheKey = useMemo(
    () => buildLeaderboardCacheKey(session, selectedMonthKey),
    [selectedMonthKey, session],
  );

  function readCachedOverview(monthKey: string) {
    const nextCacheKey = buildLeaderboardCacheKey(session, monthKey);
    return nextCacheKey
      ? readClientCache<LeaderboardOverviewResponse>(
          nextCacheKey,
          LEADERBOARD_CACHE_TTL_MS,
        )
      : null;
  }

  async function loadOverview(
    monthKey: string,
    options?: { silent?: boolean },
  ) {
    if (!options?.silent) {
      setLoading(true);
    }

    try {
      const nextOverview = await requestLeaderboardOverview({
        accessToken: session?.accessToken,
        cacheKey: buildLeaderboardCacheKey(session, monthKey),
        monthKey,
      });

      if (nextOverview && selectedMonthKeyRef.current === monthKey) {
        if (nextOverview.month.key !== monthKey) {
          selectedMonthKeyRef.current = nextOverview.month.key;
          setSelectedMonthKey(nextOverview.month.key);
          const normalizedCacheKey = buildLeaderboardCacheKey(
            session,
            nextOverview.month.key,
          );

          if (normalizedCacheKey) {
            writeClientCache(normalizedCacheKey, nextOverview);
          }
        }
        setOverview(nextOverview);
        setError(null);
      }
    } catch (loadError) {
      if (!options?.silent && selectedMonthKeyRef.current === monthKey) {
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
      if (!options?.silent && selectedMonthKeyRef.current === monthKey) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    selectedMonthKeyRef.current = selectedMonthKey;

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
  }, [cacheKey, initialData, locale, selectedMonthKey, session?.accessToken]);

  useEffect(() => {
    if (!cacheKey || !overview || loading || overview.month.key !== selectedMonthKey) {
      return;
    }

    writeClientCache(cacheKey, overview);
  }, [cacheKey, loading, overview, selectedMonthKey]);

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
    const minimumMonthKey =
      overview?.earliestMonthKey ?? initialData?.earliestMonthKey ?? currentMonthKey;

    if (selectedMonthKey < minimumMonthKey) {
      selectedMonthKeyRef.current = minimumMonthKey;
      setMonthTransitionDirection("next");
      setSelectedMonthKey(minimumMonthKey);
    }
  }, [currentMonthKey, initialData?.earliestMonthKey, overview?.earliestMonthKey, selectedMonthKey]);

  async function handleLeaderboardPrivacyChange(checked: boolean) {
    if (!overview?.visibility?.canManage || savingVisibility) {
      return;
    }

    setSavingVisibility(true);
    setVisibilityFeedback(null);
    setError(null);

    try {
      const saved = await apiRequest<{ hidePeersFromEmployees: boolean }>("/leaderboard/settings", {
        method: "PATCH",
        token: session?.accessToken,
        body: JSON.stringify({ hidePeersFromEmployees: checked }),
      });
      const firstMonth = overview.earliestMonthKey ?? currentMonthKey;
      for (let monthKey = firstMonth; monthKey <= currentMonthKey; monthKey = shiftMonthKey(monthKey, 1)) {
        const monthCacheKey = buildLeaderboardCacheKey(session, monthKey);
        if (monthCacheKey) clearClientCache(monthCacheKey);
      }
      setOverview((current) => current ? {
        ...current,
        visibility: {
          ...current.visibility,
          hidePeersFromEmployees: saved.hidePeersFromEmployees,
        },
      } : current);
      setVisibilityFeedback("saved");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : localize(
              locale,
              "Не удалось сохранить настройку рейтинга.",
              "Unable to save leaderboard setting.",
            ),
      );
    } finally {
      setSavingVisibility(false);
    }
  }

  function handleMonthShift(delta: -1 | 1) {
    const earliestMonthKey =
      overview?.earliestMonthKey ?? initialData?.earliestMonthKey ?? currentMonthKey;
    const nextMonthKey = shiftMonthKey(selectedMonthKey, delta);

    if (
      (delta < 0 && nextMonthKey < earliestMonthKey) ||
      (delta > 0 && nextMonthKey > currentMonthKey)
    ) {
      return;
    }

    const cached = readCachedOverview(nextMonthKey);

    selectedMonthKeyRef.current = nextMonthKey;
    setMonthTransitionDirection(delta < 0 ? "previous" : "next");

    if (cached) {
      setOverview(cached.value);
      setLoading(false);
      setError(null);
    } else {
      setOverview(null);
      setLoading(true);
    }

    setSelectedMonthKey(nextMonthKey);
  }

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
  const earliestMonthKey =
    overview?.earliestMonthKey ?? initialData?.earliestMonthKey ?? currentMonthKey;
  const canGoBack = selectedMonthKey > earliestMonthKey;
  const canGoForward = selectedMonthKey < currentMonthKey;
  const availableLocations = overview?.locations ?? [];
  const leaderboard = useMemo(() => {
    const entries = overview?.leaderboard ?? [];
    const filtered = locationFilter
      ? entries.filter((entry) =>
          (entry.employee.locations ?? []).some(
            (location) => location.id === locationFilter,
          ),
        )
      : entries;

    return filtered.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }, [locationFilter, overview?.leaderboard]);
  const filteredMeRank = overview
    ? leaderboard.find(
        (entry) => entry.employee.id === overview.me.employeeId,
      )?.rank ?? null
    : null;

  useEffect(() => {
    if (
      overview &&
      locationFilter &&
      !availableLocations.some((location) => location.id === locationFilter)
    ) {
      setLocationFilter("");
    }
  }, [availableLocations, locationFilter, overview]);
  const peersHiddenForViewer =
    overview?.visibility?.peersHiddenForViewer ?? false;
  const topLeaders = peersHiddenForViewer ? [] : leaderboard.slice(0, 3);
  const monthLabel = formatMonthLabel(
    overview?.month.key ?? selectedMonthKey,
    locale,
  );
  const progressDayLabel = getProgressDayLabel(locale, isCurrentMonth);
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
  const firstPlacePoints = peersHiddenForViewer
    ? (overview?.me.points ?? 0)
    : (leaderboard[0]?.points ?? overview?.me.points ?? 0);
  const pointsToFirst = overview
    ? Math.max(0, firstPlacePoints - overview.me.points)
    : 0;
  const recentDailyActivity = overview?.me.dailyActivity?.slice(-7) ?? [];
  const monthTransitionClass = monthTransitionDirection
    ? `is-${monthTransitionDirection}`
    : "";

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-5">
      <WorkspacePageHeader
        description={localize(locale, "Результаты команды и ваш прогресс за выбранный месяц", "Team results and your progress for the selected month")}
      />
      {topLeaders.length > 0 ? (
        <section
          className={`leaderboard-month-surface px-1 ${monthTransitionClass}`}
          key={`leaders-${selectedMonthKey}`}
        >
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
                    initials={fullName}
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
        <div
          className={`leaderboard-month-surface flex flex-wrap items-center gap-4 ${monthTransitionClass}`}
          key={`summary-${selectedMonthKey}`}
        >
          <div className="flex min-w-[82px] flex-col items-center text-center">
            <strong className="block text-2xl font-normal leading-none tracking-[-0.04em] tabular-nums text-[color:var(--foreground)]">
              {overview
                ? `${filteredMeRank ?? "—"}/${leaderboard.length}`
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
          {overview?.visibility?.canManage ? (
            <div className="max-w-[340px] px-1 text-sm">
              <button
                aria-checked={overview.visibility.hidePeersFromEmployees}
                aria-describedby="leaderboard-visibility-description"
                className="flex min-h-12 w-full items-center gap-3 rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] disabled:cursor-wait disabled:opacity-60"
                disabled={savingVisibility}
                onClick={() => void handleLeaderboardPrivacyChange(!overview.visibility.hidePeersFromEmployees)}
                role="switch"
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                    overview.visibility.hidePeersFromEmployees
                      ? "bg-[color:var(--accent)]"
                      : "bg-slate-300"
                  }`}
                >
                  <span className={`size-5 rounded-full bg-white shadow-sm transition-transform ${overview.visibility.hidePeersFromEmployees ? "translate-x-5" : ""}`} />
                </span>
                <span className="font-heading font-medium text-[color:var(--foreground)]">
                  {localize(
                    locale,
                    "Скрыть результаты коллег от сотрудников",
                    "Hide coworkers’ results from employees",
                  )}
                </span>
              </button>
              <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]" id="leaderboard-visibility-description">
                {localize(
                  locale,
                  "Для всей компании, включая все локации и месяцы. Сотрудники видят своё место и очки; результаты коллег скрыты. Руководители видят полный рейтинг.",
                  "Applies to the whole company across locations and months. Employees see their own rank and points, while coworkers’ results are hidden. Managers see the full leaderboard.",
                )}
              </p>
              <p aria-live="polite" className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                {savingVisibility
                  ? localize(locale, "Сохраняем…", "Saving…")
                  : visibilityFeedback === "saved"
                    ? localize(locale, "Настройка сохранена", "Setting saved")
                    : null}
              </p>
            </div>
          ) : null}

          <div className="leaderboard-location-control">
            <AppSelectField
              className="leaderboard-location-select"
              emptyLabel={localize(locale, "Все локации", "All locations")}
              emptyOptionsLabel={localize(
                locale,
                "Локаций пока нет",
                "No locations yet",
              )}
              onValueChange={setLocationFilter}
              options={availableLocations.map((location) => ({
                value: location.id,
                label: location.name,
              }))}
              placeholder={localize(locale, "Локация", "Location")}
              value={locationFilter}
            />
          </div>

          <div className="flex h-12 overflow-hidden rounded-xl border border-border bg-white">
            <button
              aria-pressed={tab === "table"}
              className={`flex h-full items-center gap-2 px-4 text-sm font-heading font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${
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
              aria-pressed={tab === "progress"}
              className={`flex h-full items-center gap-2 px-4 text-sm font-heading font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${
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
              aria-label={localize(locale, "Предыдущий месяц", "Previous month")}
              className={`schedule-calendar-nav-button ${canGoBack ? "" : "opacity-40"}`}
              disabled={!canGoBack}
              onClick={() => handleMonthShift(-1)}
              type="button"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="leaderboard-month-label-frame min-w-[220px] px-2 text-center text-base font-medium tracking-[-0.03em] text-[color:var(--foreground)]">
              <span
                className={`leaderboard-month-label ${monthTransitionClass}`}
                key={monthLabel}
              >
                {monthLabel}
              </span>
            </div>
            <button
              aria-label={localize(locale, "Следующий месяц", "Next month")}
              className="schedule-calendar-nav-button"
              disabled={!canGoForward}
              onClick={() => {
                if (!canGoForward) {
                  return;
                }

                handleMonthShift(1);
              }}
              type="button"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`leaderboard-month-content ${monthTransitionClass}`}
        key={selectedMonthKey}
      >
        {error ? (
          <WorkspaceFeedback title={error} tone="error" />
        ) : null}

        {tab === "table" ? (
          <div className="team-tasks-table-card leaderboard-table-card">
            {loading ? (
              <WorkspaceLoading
                className="min-h-[360px]"
                label={localize(locale, "Загружаем рейтинг", "Loading leaderboard")}
              />
            ) : !overview || leaderboard.length === 0 ? (
              <WorkspaceFeedback className="m-5 min-h-[220px] content-center" title={locationFilter ? localize(locale, "По выбранной локации результатов нет", "No results for this location") : localize(locale, "Пока нет данных для рейтинга", "No leaderboard data yet")} action={locationFilter ? <button className="rounded-xl border border-border bg-white px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600" onClick={() => setLocationFilter("")} type="button">{localize(locale, "Все локации", "All locations")}</button> : undefined} />
            ) : (
              <div className="team-tasks-table-shell leaderboard-table-shell">
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
                    const isPrivate = Boolean(entry.isPrivate);
                    const fullName = isPrivate
                      ? localize(locale, "Скрытый сотрудник", "Hidden employee")
                      : getEmployeeFullName(entry);
                    const todayMaxPoints = overview.summary.maxDailyPoints || 1;
                    const todayProgressPercent = Math.min(
                      100,
                      isPrivate
                        ? 0
                        : Math.round((entry.todayPoints / todayMaxPoints) * 100),
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
                            {isPrivate ? (
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <ShieldCheck className="size-4" />
                              </div>
                            ) : (
                              <Avatar
                                alt={fullName}
                                className="shrink-0"
                                initials={fullName}
                                size="sm"
                                src={getEmployeeAvatarSrc(entry)}
                              />
                            )}
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center">
                                <p className="truncate text-base font-medium text-[color:var(--foreground)]">
                                  {fullName}
                                </p>
                              </div>
                              <p className="truncate text-sm text-[color:var(--muted-foreground)]">
                                {isPrivate
                                  ? localize(
                                      locale,
                                      "Данные видны менеджерам",
                                      "Visible to managers",
                                    )
                                  : getEmployeeSubtitle(entry, locale)}
                              </p>
                            </div>
                          </div>
                        </Table.Cell>

                        <Table.Cell className="align-middle whitespace-nowrap">
                          <div className="min-w-[150px]">
                            <strong className="block text-sm font-semibold tabular-nums text-[color:var(--foreground)]">
                              {isPrivate
                                ? "—"
                                : `${entry.todayPoints}/${overview.summary.maxDailyPoints}`}
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
                            {!isPrivate && entry.streak > 5 ? (
                              <Flame
                                className="size-4 shrink-0 text-orange-500"
                                fill="currentColor"
                                strokeWidth={1.8}
                              />
                            ) : null}
                            <strong className="font-medium tabular-nums text-[color:var(--foreground)]">
                              {isPrivate ? "—" : entry.streak}
                            </strong>
                            {!isPrivate ? (
                              <span>{localize(locale, "дней", "days")}</span>
                            ) : null}
                          </div>
                        </Table.Cell>

                        <Table.Cell className="align-middle whitespace-nowrap">
                          <div className="team-tasks-row-button team-tasks-row-button--center">
                            <strong className="text-[clamp(1.7rem,2.6vw,2.15rem)] font-semibold leading-none tracking-[-0.05em] tabular-nums text-[color:var(--foreground)]">
                              {isPrivate ? "—" : entry.points}
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
          <article>
            {loading ? (
              <WorkspaceLoading
                className="min-h-64 rounded-2xl bg-white"
                label={localize(locale, "Загружаем рейтинг", "Loading leaderboard")}
              />
            ) : !overview ? (
              <WorkspaceFeedback className="min-h-64 content-center" title={localize(locale, "Пока нет данных для рейтинга", "No leaderboard data yet")} />
            ) : (
            <div>
              <div className="grid gap-3">
                <div className="grid gap-3 xl:grid-cols-[minmax(340px,0.95fr)_minmax(460px,1.45fr)]">
                  <article className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
                    <h2 className="text-base font-semibold tracking-[-0.02em] text-[color:var(--foreground)]">
                      {localize(
                        locale,
                        isCurrentMonth ? "Прогресс сегодня" : "Прогресс последнего дня",
                        isCurrentMonth ? "Today progress" : "Last day progress",
                      )}
                    </h2>
                    <div className="mt-5">
                      <div className="flex items-end gap-3">
                        <strong className="text-4xl font-semibold leading-none tracking-[-0.05em] tabular-nums text-blue-600">
                          {overview.me.todayPoints}
                        </strong>
                        <span className="text-sm text-[color:var(--muted-foreground)]">
                          {localize(locale, `из ${safeTodayMaxPoints} возможных очков`, `of ${safeTodayMaxPoints} possible points`)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[color:var(--muted-foreground)]">
                        {localize(locale, "За своевременный приход, уход и задачи. Бонусы за серию входят в общий счёт месяца.", "For on-time arrival, departure and tasks. Streak bonuses count toward the monthly total.")}
                      </p>
                      <div
                        aria-label={localize(locale, "Дневной прогресс", "Daily progress")}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={todayCompletionPercent}
                        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
                        role="progressbar"
                      >
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${todayCompletionPercent}%` }} />
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
                          className={`grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2.5 ${
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
                          <span className="text-right text-sm font-semibold tabular-nums text-emerald-600">
                            {metric.earnedPoints}/{metric.maxPoints}
                            <span className="block text-xs font-normal text-[color:var(--muted-foreground)]">
                              {localize(locale, "очков", "points")}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[color:var(--muted-foreground)]">
                      {localize(locale, "Приход и уход вовремя — по 5 очков. Задачи дня — 5 очков без просрочек или 3, если есть просроченные задачи; незавершённые задачи дня — 0.", "On-time arrival and departure earn 5 points each. Daily tasks earn 5 with no overdue tasks, 3 with overdue tasks, or 0 if today's tasks are incomplete.")}
                    </p>
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
                        "За 5, 10 и 20 своевременных приходов подряд начисляется 10, 20 и 30 очков соответственно.",
                        "Earn 10, 20 and 30 bonus points for 5, 10 and 20 consecutive on-time arrivals, respectively.",
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
                          peersHiddenForViewer
                            ? "Результаты коллег скрыты настройкой компании"
                            : pointsToFirst === 0
                              ? "Вы делите первое место или лидируете"
                              : `До лидера ${pointsToFirst} очков`,
                          peersHiddenForViewer
                            ? "Peer results are hidden by company settings"
                            : pointsToFirst === 0
                              ? "You are leading or tied for first"
                              : `${pointsToFirst} points behind the leader`,
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
                      {localize(locale, "Очки за день (без бонуса серии)", "Daily points (excluding streak bonus)")}
                    </div>
                  </article>
                </div>
              </div>
            </div>
          )}
          </article>
        )}
      </div>
    </div>
  );
}
