"use client";

import { getLocalTimeZone, parseDate } from "@internationalized/date";
import { ChevronDown, ChevronRight, ListTodo, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { AdminShell } from "@/components/admin-shell";
import {
  ActivityTargetAvatars,
  type DashboardActivityItem,
  formatTimeLabel,
  getActivityIcon,
  getActivityIconTone,
  getAvatarSource,
  getInitials,
  resolveActionCopy,
  resolveTargetLabel,
} from "@/components/dashboard/DailyActivityPanel";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PeriodPreset = "7d" | "14d" | "custom";

type DashboardBootstrapResponse = {
  initialData: {
    dailyActivity?: DashboardActivityItem[];
  };
};

export type ActivityPageInitialData = {
  items: DashboardActivityItem[];
};

function localize(locale: "ru" | "en", ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

function formatDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const result = new Date(year, (month ?? 1) - 1, day ?? 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function buildPresetRange(preset: Exclude<PeriodPreset, "custom">) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const days = preset === "7d" ? 7 : 14;
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  return {
    dateFrom: formatDateKey(start),
    dateTo: formatDateKey(end),
  };
}

function parseCalendarDateRangeInput(startValue: string, endValue: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startValue) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endValue)
  ) {
    return null;
  }

  try {
    const start = parseDate(startValue);
    const end = parseDate(endValue);

    return {
      start: start.compare(end) <= 0 ? start : end,
      end: start.compare(end) <= 0 ? end : start,
    };
  } catch {
    return null;
  }
}

function formatDayHeader(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return {
      key: value,
      weekday: "DAY",
      dateLabel: "—",
    };
  }

  const monthLabel = parsed
    .toLocaleDateString("en-US", { month: "long" })
    .toUpperCase();

  return {
    key: formatDateKey(parsed),
    weekday: parsed
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase(),
    dateLabel: `${parsed.getDate()} ${monthLabel}`,
  };
}

async function fetchActivitySnapshot(
  token: string,
): Promise<ActivityPageInitialData> {
  try {
    return await apiRequest<ActivityPageInitialData>("/bootstrap/activity", {
      token,
    });
  } catch {
    const snapshot = await apiRequest<DashboardBootstrapResponse>(
      "/bootstrap/dashboard",
      { token },
    );

    return {
      items: snapshot.initialData.dailyActivity ?? [],
    };
  }
}

function ActivityFeedItem({
  item,
  locale,
  showLine,
}: {
  item: DashboardActivityItem;
  locale: "ru" | "en";
  showLine: boolean;
}) {
  const Icon = getActivityIcon(item);
  const { actorName, actionLabel } = resolveActionCopy(item, locale);
  const itemTitle = item.title?.trim() || null;
  const targetLabel = resolveTargetLabel(item, locale);

  return (
    <article className="daily-activity-item" key={item.id}>
      <div className="daily-activity-rail" aria-hidden="true">
        <span className="daily-activity-rail-dot" />
        {showLine ? <span className="daily-activity-rail-line" /> : null}
      </div>

      <div
        className={cn("daily-activity-kind", getActivityIconTone(item))}
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
              <strong>{actorName}</strong> <span>{actionLabel}</span>{" "}
              {itemTitle ? <strong>{itemTitle}</strong> : null}
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
}

export default function ActivityPageClient({
  initialData,
}: {
  initialData?: ActivityPageInitialData | null;
}) {
  const { locale } = useI18n();
  const initialRange = useMemo(() => buildPresetRange("14d"), []);
  const [preset, setPreset] = useState<PeriodPreset>("14d");
  const [dateFrom, setDateFrom] = useState(initialRange.dateFrom);
  const [dateTo, setDateTo] = useState(initialRange.dateTo);
  const [items, setItems] = useState<DashboardActivityItem[]>(
    initialData?.items ?? [],
  );
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const didUseInitialData = useRef(Boolean(initialData));

  useEffect(() => {
    if (didUseInitialData.current && initialData) {
      didUseInitialData.current = false;
      setLoading(false);
      return;
    }

    const session = getSession();

    if (!session) {
      setItems([]);
      setLoading(false);
      setError(
        localize(
          locale,
          "Сессия не найдена. Войдите заново.",
          "Session not found. Please sign in again.",
        ),
      );
      return;
    }

    setLoading(true);
    setError(null);

    void fetchActivitySnapshot(session.accessToken)
      .then((snapshot) => {
        setItems(snapshot.items ?? []);
      })
      .catch((loadError) => {
        setItems([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : localize(
                locale,
                "Не удалось загрузить activity.",
                "Unable to load activity.",
              ),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [initialData, locale]);

  const groupedItems = useMemo(() => {
    const rangeStart = parseDateKey(dateFrom);
    const rangeEnd = parseDateKey(dateTo);
    rangeEnd.setHours(23, 59, 59, 999);

    const groups = new Map<
      string,
      {
        key: string;
        weekday: string;
        dateLabel: string;
        items: DashboardActivityItem[];
      }
    >();

    [...items]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .forEach((item) => {
        const parsed = new Date(item.createdAt);
        if (Number.isNaN(parsed.getTime())) {
          return;
        }

        if (
          parsed.getTime() < rangeStart.getTime() ||
          parsed.getTime() > rangeEnd.getTime()
        ) {
          return;
        }

        const header = formatDayHeader(item.createdAt);
        const currentGroup = groups.get(header.key);

        if (currentGroup) {
          currentGroup.items.push(item);
          return;
        }

        groups.set(header.key, {
          ...header,
          items: [item],
        });
      });

    return Array.from(groups.values());
  }, [dateFrom, dateTo, items]);

  function applyPreset(nextPreset: Exclude<PeriodPreset, "custom">) {
    const range = buildPresetRange(nextPreset);
    setPreset(nextPreset);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
  }

  function toggleDay(dayKey: string) {
    setCollapsedDays((current) => {
      const next = new Set(current);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  }

  return (
    <AdminShell>
      <main className="page-shell section-stack activity-page">
        <section
          className={`team-tasks-toolbar activity-page-toolbar${
            preset === "custom" ? " is-custom-open" : ""
          }`}
        >
          <div className="team-tasks-period-controls">
            {preset === "custom" ? (
              <div className="team-tasks-custom-range">
                <div className="team-tasks-custom-field">
                  <DateRangePicker
                    aria-label={localize(locale, "Период дат", "Date range")}
                    buttonClassName="justify-start whitespace-nowrap"
                    onChange={(value) => {
                      if (!value?.start || !value?.end) {
                        return;
                      }

                      const startDate = value.start.toDate(getLocalTimeZone());
                      const endDate = value.end.toDate(getLocalTimeZone());
                      const orderedStart =
                        startDate <= endDate ? startDate : endDate;
                      const orderedEnd =
                        startDate <= endDate ? endDate : startDate;

                      setDateFrom(formatDateKey(orderedStart));
                      setDateTo(formatDateKey(orderedEnd));
                    }}
                    placeholder={localize(
                      locale,
                      "Выберите даты",
                      "Select dates",
                    )}
                    size="md"
                    value={parseCalendarDateRangeInput(dateFrom, dateTo)}
                  />
                </div>
              </div>
            ) : null}

            <div className="team-tasks-period-toggle" role="tablist">
              {(
                [
                  { key: "7d", label: localize(locale, "7 дней", "7 days") },
                  { key: "14d", label: localize(locale, "14 дней", "14 days") },
                  {
                    key: "custom",
                    label: localize(locale, "Свой период", "Custom"),
                  },
                ] as const
              ).map((item) => (
                <button
                  aria-pressed={preset === item.key}
                  className={`team-tasks-period-button ${
                    preset === item.key ? "is-active" : ""
                  }`}
                  key={item.key}
                  onClick={() => {
                    if (item.key === "custom") {
                      setPreset("custom");
                      return;
                    }

                    applyPreset(item.key);
                  }}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error ? (
          <section className="dashboard-card activity-page-message activity-page-message--error">
            {error}
          </section>
        ) : null}

        <section className="dashboard-card activity-feed-card">
          <div className="activity-feed-shell scrollbar-hide">
            {loading ? (
              <div className="activity-page-loading">
                <LoaderCircle className="size-4 animate-spin" />
                <span>{localize(locale, "Загружаем activity…", "Loading activity…")}</span>
              </div>
            ) : groupedItems.length ? (
              <div className="activity-feed-groups">
                {groupedItems.map((group) => (
                  <section className="activity-day-group" key={group.key}>
                    <header>
                      <button
                        aria-expanded={!collapsedDays.has(group.key)}
                        className={`activity-day-header${
                          collapsedDays.has(group.key) ? " is-collapsed" : ""
                        }`}
                        onClick={() => toggleDay(group.key)}
                        type="button"
                      >
                        <span className="activity-day-header-copy">
                          <span className="activity-day-weekday">{group.weekday}</span>
                          <strong className="activity-day-date">{group.dateLabel}</strong>
                        </span>
                        {collapsedDays.has(group.key) ? (
                          <ChevronRight className="activity-day-header-icon" />
                        ) : (
                          <ChevronDown className="activity-day-header-icon" />
                        )}
                      </button>
                    </header>

                    {!collapsedDays.has(group.key) ? (
                      <div className="activity-day-list">
                        {group.items.map((item, index) => (
                          <ActivityFeedItem
                            item={item}
                            key={item.id}
                            locale={locale}
                            showLine={index < group.items.length - 1}
                          />
                        ))}
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>
            ) : (
              <div className="daily-activity-empty">
                <div className="daily-activity-empty-icon" aria-hidden="true">
                  <ListTodo className="size-7" />
                </div>
                <p className="daily-activity-empty-title">
                  {localize(
                    locale,
                    "Нет активности за выбранный период",
                    "No activity for selected period",
                  )}
                </p>
                <p className="daily-activity-empty-copy">
                  {localize(
                    locale,
                    "Попробуй изменить диапазон дат.",
                    "Try a different date range.",
                  )}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </AdminShell>
  );
}
