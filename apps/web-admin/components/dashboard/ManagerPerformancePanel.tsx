"use client";

import { AttendanceHistoryResponse, TaskItem } from "@smart/types";
import { ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";

type ManagerPerformancePanelProps = {
  history: AttendanceHistoryResponse | null;
  tasks?: TaskItem[];
};

type AttendanceRow = NonNullable<AttendanceHistoryResponse>["rows"][number];

type BucketTaskItem = {
  dayNumber: string;
  id: string;
  subtitle: string;
  title: string;
  weekdayShort: string;
};

type ChartBucket = {
  chartValue: number;
  completedCount: number;
  end: Date;
  belongsToMonth: number;
  isCurrentWeek: boolean;
  key: string;
  label: string;
  lateShifts: number;
  pendingCount: number;
  pendingTasks: BucketTaskItem[];
  completedTasks: BucketTaskItem[];
  onTimeShifts: number;
  start: Date;
  totalShifts: number;
  tooltipLabel: string;
  weekNumberInMonth: number;
};

const chartConfig = {
  totalShifts: {
    label: "Всего смен",
    color: "rgba(37, 99, 235, 0.18)",
  },
  onTimeShifts: {
    label: "Вовремя",
    color: "rgba(37, 99, 235, 1)",
  },
};

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfWeek(value: Date) {
  const next = new Date(value);
  const diff = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfWeek(value: Date) {
  const next = startOfWeek(value);
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);
  return next;
}

function isWithinRange(value: string | null | undefined, start: Date, end: Date) {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed >= start && parsed <= end;
}

function formatMonthHeading(value: Date) {
  return value
    .toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
    .replace(/\s+г\.?$/i, "")
    .toUpperCase();
}

function formatRangeLabel(start: Date, end: Date) {
  return `${start.getDate()}-${end.getDate()}`;
}

function formatRangeHeading(start: Date, end: Date) {
  return `с ${start.getDate()} по ${end.getDate()}`;
}

function formatRangeTooltip(start: Date, end: Date) {
  const monthLabel = end.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  return `${start.getDate()}-${end.getDate()} ${monthLabel}`;
}

function formatTaskSubtitle(task: TaskItem) {
  return "";
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function getMonthKey(year: number, month: number) {
  return `${year}-${month}`;
}

function getMonthDateFromKey(key: string) {
  const [yearValue, monthValue] = key.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);

  if (Number.isNaN(year) || Number.isNaN(month)) {
    return null;
  }

  return new Date(year, month, 1);
}

function getDominantWorkMonth(weekStart: Date) {
  const scores = new Map<string, { month: number; score: number; year: number }>();

  for (let index = 0; index < 5; index += 1) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    const key = getMonthKey(day.getFullYear(), day.getMonth());
    const current = scores.get(key);

    if (current) {
      current.score += 1;
    } else {
      scores.set(key, {
        month: day.getMonth(),
        score: 1,
        year: day.getFullYear(),
      });
    }
  }

  return [...scores.values()].sort((left, right) => right.score - left.score)[0];
}

function buildBucketTask(task: TaskItem): BucketTaskItem {
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const hasDueDate = dueDate && !Number.isNaN(dueDate.getTime());

  return {
    dayNumber: hasDueDate
      ? dueDate.toLocaleDateString("ru-RU", { day: "2-digit" })
      : "—",
    id: task.id,
    subtitle: formatTaskSubtitle(task),
    title: task.title.replace(/^Встреча:\s*/i, "").trim(),
    weekdayShort: hasDueDate
      ? dueDate
          .toLocaleDateString("ru-RU", { weekday: "short" })
          .replace(/\.$/, "")
      : "—",
  };
}

function getTaskSortTime(task: TaskItem) {
  const source = task.dueAt ?? task.createdAt;

  if (!source) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? Number.NEGATIVE_INFINITY : parsed.getTime();
}

function buildWeeklyBuckets(
  rows: AttendanceRow[],
  tasks: TaskItem[],
  monthDate: Date,
): ChartBucket[] {
  const today = startOfDay(new Date());
  const currentWeekStart = startOfWeek(today);
  const targetMonth = monthDate.getMonth();
  const targetYear = monthDate.getFullYear();
  const weekStartMap = new Map<string, Date>();

  const collectWeek = (value: string | null | undefined) => {
    if (!value) {
      return;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const weekStart = startOfWeek(date);
    const dominantMonth = getDominantWorkMonth(weekStart);

    if (
      dominantMonth.month !== targetMonth ||
      dominantMonth.year !== targetYear ||
      weekStart > currentWeekStart
    ) {
      return;
    }

    weekStartMap.set(weekStart.toISOString(), weekStart);
  };

  rows.forEach((row) => collectWeek(row.startedAt));
  tasks.forEach((task) => {
    collectWeek(task.createdAt);
    collectWeek(task.dueAt);
  });
  collectWeek(today.toISOString());

  const eligibleWeeks = [...weekStartMap.values()]
    .sort((left, right) => left.getTime() - right.getTime())
    .map((start, index) => ({
      end: endOfWeek(start),
      start,
      weekNumberInMonth: index + 1,
    }));

  return eligibleWeeks.map(({ start, end, weekNumberInMonth: bucketWeekNumber }) => {
      const bucketRows = rows.filter((row) => isWithinRange(row.startedAt, start, end));
      const weeklyTasks = tasks.filter((task) =>
        isWithinRange(task.dueAt ?? task.createdAt, start, end),
      );
      const completedTasks = weeklyTasks
        .filter((task) => task.status === "DONE")
        .sort((left, right) => getTaskSortTime(right) - getTaskSortTime(left))
        .map(buildBucketTask);
      const pendingTasks = weeklyTasks
        .filter((task) => task.status !== "DONE" && task.status !== "CANCELLED")
        .sort((left, right) => getTaskSortTime(right) - getTaskSortTime(left))
        .map(buildBucketTask);
      const lateShifts = bucketRows.filter((row) => row.lateMinutes > 0).length;
      const isCurrentWeek = today >= start && today <= end;
      const totalShifts = bucketRows.length;
      const onTimeShifts = totalShifts - lateShifts;

      return {
        chartValue: totalShifts > 0 ? totalShifts : isCurrentWeek ? 0.2 : 0,
        completedCount: completedTasks.length,
        completedTasks,
        belongsToMonth: targetMonth,
        end,
        isCurrentWeek,
        key: `${start.toISOString()}-${end.toISOString()}`,
        label: formatRangeLabel(start, end),
        lateShifts,
        onTimeShifts,
        pendingCount: pendingTasks.length,
        pendingTasks,
        start,
        totalShifts,
        tooltipLabel: formatRangeTooltip(start, end),
        weekNumberInMonth: bucketWeekNumber,
      };
    });
}

function collectAvailableMonths(rows: AttendanceRow[], tasks: TaskItem[]) {
  const monthMap = new Map<string, Date>();

  const collectMonth = (value: string | null | undefined) => {
    if (!value) {
      return;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const monthDate = startOfMonth(date);
    monthMap.set(getMonthKey(monthDate.getFullYear(), monthDate.getMonth()), monthDate);
  };

  rows.forEach((row) => collectMonth(row.startedAt));
  tasks.forEach((task) => {
    collectMonth(task.createdAt);
    collectMonth(task.dueAt);
  });

  if (!monthMap.size) {
    const fallbackMonth = startOfMonth(new Date());
    monthMap.set(
      getMonthKey(fallbackMonth.getFullYear(), fallbackMonth.getMonth()),
      fallbackMonth,
    );
  }

  return [...monthMap.values()].sort((left, right) => left.getTime() - right.getTime());
}

function roundedTopRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const nextRadius = Math.max(0, Math.min(radius, width / 2, height));
  const right = x + width;
  const bottom = y + height;

  return [
    `M ${x} ${bottom}`,
    `L ${x} ${y + nextRadius}`,
    `Q ${x} ${y} ${x + nextRadius} ${y}`,
    `L ${right - nextRadius} ${y}`,
    `Q ${right} ${y} ${right} ${y + nextRadius}`,
    `L ${right} ${bottom}`,
    "Z",
  ].join(" ");
}

function DualBarShape({
  fill,
  payload,
  selectedKey,
  width = 0,
  height = 0,
  x = 0,
  y = 0,
}: {
  fill?: string;
  payload?: ChartBucket;
  selectedKey?: string | null;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}) {
  if (!payload || width <= 0 || height <= 0) {
    return null;
  }

  const innerWidth = width;
  const innerHeight = payload.totalShifts
    ? (payload.onTimeShifts / payload.totalShifts) * height
    : 0;
  const innerX = x;
  const innerY = y + (height - innerHeight);
  const isSelected = payload.key === selectedKey;
  const outlineInset = 4;

  return (
    <g>
      <path
        d={roundedTopRectPath(x, y, width, height, 18)}
        fill={fill ?? "var(--color-totalShifts)"}
        opacity={isSelected ? 1 : 0.92}
      />
      {innerHeight > 0 ? (
        <path
          d={roundedTopRectPath(innerX, innerY, innerWidth, innerHeight, 18)}
          fill="var(--color-onTimeShifts)"
        />
      ) : null}
      {isSelected ? (
        <path
          d={roundedTopRectPath(
            x - outlineInset,
            y - outlineInset,
            width + outlineInset * 2,
            height + outlineInset * 2,
            20,
          )}
          fill="none"
          stroke="rgba(37, 99, 235, 0.95)"
          strokeDasharray="6 5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
        />
      ) : null}
    </g>
  );
}

export function ManagerPerformancePanel({
  history,
  tasks = [],
}: ManagerPerformancePanelProps) {
  const availableMonths = useMemo(
    () => collectAvailableMonths(history?.rows ?? [], tasks),
    [history?.rows, tasks],
  );
  const today = useMemo(() => new Date(), []);
  const todayMonthKey = getMonthKey(today.getFullYear(), today.getMonth());
  const defaultMonthKey = useMemo(() => {
    const currentMonth = availableMonths.find(
      (month) => getMonthKey(month.getFullYear(), month.getMonth()) === todayMonthKey,
    );
    const fallbackMonth = currentMonth ?? availableMonths[availableMonths.length - 1];

    return getMonthKey(fallbackMonth.getFullYear(), fallbackMonth.getMonth());
  }, [availableMonths, todayMonthKey]);
  const [selectedMonthKey, setSelectedMonthKey] = useState(defaultMonthKey);
  const [selectedBucketKey, setSelectedBucketKey] = useState<string | null>(null);
  const [showPendingTasks, setShowPendingTasks] = useState(false);

  useEffect(() => {
    const monthStillExists = availableMonths.some(
      (month) => getMonthKey(month.getFullYear(), month.getMonth()) === selectedMonthKey,
    );

    if (!monthStillExists) {
      setSelectedMonthKey(defaultMonthKey);
    }
  }, [availableMonths, defaultMonthKey, selectedMonthKey]);

  const selectedMonthDate =
    getMonthDateFromKey(selectedMonthKey) ??
    getMonthDateFromKey(defaultMonthKey) ??
    startOfMonth(today);
  const chartData = useMemo(
    () => buildWeeklyBuckets(history?.rows ?? [], tasks, selectedMonthDate),
    [history?.rows, selectedMonthDate, tasks],
  );
  const allBuckets = useMemo(
    () =>
      availableMonths.flatMap((monthDate) =>
        buildWeeklyBuckets(history?.rows ?? [], tasks, monthDate),
      ),
    [availableMonths, history?.rows, tasks],
  );
  const currentMonthTotal = chartData.reduce(
    (total, bucket) => total + bucket.totalShifts,
    0,
  );
  const currentMonthOnTime = chartData.reduce(
    (total, bucket) => total + bucket.onTimeShifts,
    0,
  );

  const selectedBucket = useMemo(() => {
    if (!allBuckets.length) {
      return null;
    }

    const explicit = allBuckets.find((bucket) => bucket.key === selectedBucketKey);
    if (explicit) {
      return explicit;
    }

    const currentWeekBucket = allBuckets.find(
      (bucket) => today >= bucket.start && today <= bucket.end,
    );

    return currentWeekBucket ?? allBuckets[allBuckets.length - 1] ?? allBuckets[0];
  }, [allBuckets, selectedBucketKey, today]);
  const selectedMonthIndex = availableMonths.findIndex(
    (month) => getMonthKey(month.getFullYear(), month.getMonth()) === selectedMonthKey,
  );
  const previousMonth = selectedMonthIndex > 0 ? availableMonths[selectedMonthIndex - 1] : null;
  const nextMonth =
    selectedMonthIndex >= 0 && selectedMonthIndex < availableMonths.length - 1
      ? availableMonths[selectedMonthIndex + 1]
      : null;
  const chartWidth = Math.max(chartData.length * 118, 118);
  const selectedWeekNumber = selectedBucket?.weekNumberInMonth ?? null;
  const visibleTasks = showPendingTasks
    ? selectedBucket?.pendingTasks ?? []
    : selectedBucket?.completedTasks ?? [];

  return (
    <Card className="manager-performance-panel">
      <CardContent className="manager-performance-card">
        <div className="manager-performance-body">
          <div className="manager-performance-chart-column">
            <div className="manager-performance-header">
              <div className="manager-performance-header-copy">
                <div className="manager-performance-month-nav">
                  {previousMonth ? (
                    <button
                      aria-label="Предыдущий месяц"
                      className="manager-performance-month-nav-button"
                      onClick={() => {
                        setSelectedMonthKey(
                          getMonthKey(previousMonth.getFullYear(), previousMonth.getMonth()),
                        );
                      }}
                      type="button"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  ) : null}
                  {nextMonth ? (
                    <button
                      aria-label="Следующий месяц"
                      className="manager-performance-month-nav-button"
                      onClick={() => {
                        setSelectedMonthKey(
                          getMonthKey(nextMonth.getFullYear(), nextMonth.getMonth()),
                        );
                      }}
                      type="button"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <h2>{formatMonthHeading(selectedMonthDate)}</h2>
              </div>

              <div className="manager-performance-header-metric">
                <span>Вовремя</span>
                <strong>
                  {currentMonthOnTime}/{currentMonthTotal}
                </strong>
              </div>
            </div>

            {chartData.length ? (
              <div className="manager-performance-chart-scroll">
                <ChartContainer
                  className="manager-performance-chart-wrap"
                  config={chartConfig}
                  style={{ width: `${chartWidth}px` }}
                >
                  <BarChart
                    accessibilityLayer
                    barCategoryGap="22%"
                    data={chartData}
                    margin={{ top: 14, right: 8, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="label"
                      tick={{ fontSize: 12, fontWeight: 700 }}
                      tickLine={false}
                      tickMargin={12}
                    />
                    <Bar
                      barSize={72}
                      dataKey="chartValue"
                      fill="var(--color-totalShifts)"
                      onClick={(state) => {
                        const payload = (state as { payload?: ChartBucket } | undefined)?.payload;
                        if (payload?.key) {
                          setSelectedBucketKey(payload.key);
                        }
                      }}
                      shape={(props) => (
                        <DualBarShape
                          {...props}
                          payload={props.payload as ChartBucket}
                          selectedKey={selectedBucket?.key ?? null}
                        />
                      )}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="manager-performance-empty">
                Недели появятся после первых смен или задач.
              </div>
            )}
          </div>

          <Separator
            className="manager-performance-divider"
            decorative
            orientation="vertical"
          />

          <div className="manager-performance-side">
            <div className="manager-performance-side-head">
              <span className="manager-performance-side-kicker">
                {selectedWeekNumber ? `Неделя ${selectedWeekNumber}` : "Неделя"}
              </span>
              <h3>
                {selectedBucket
                  ? formatRangeHeading(selectedBucket.start, selectedBucket.end)
                  : "Неделя"}
              </h3>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="manager-performance-task-groups"
                exit={{ opacity: 0, y: 8 }}
                initial={{ opacity: 0, y: 8 }}
                key={`${selectedBucket?.key ?? "empty"}-${showPendingTasks ? "pending" : "completed"}`}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <section className="manager-performance-task-section">
                  <div className="manager-performance-task-section-head">
                    <h4 className="manager-performance-task-section-title">
                      {showPendingTasks ? "Невыполненные задачи" : "Выполненные задачи"}
                    </h4>
                    <button
                      className="manager-performance-task-toggle"
                      onClick={() => setShowPendingTasks((current) => !current)}
                      type="button"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="manager-performance-task-list">
                    {visibleTasks.length ? (
                      visibleTasks.map((task, index) => (
                        <Fragment key={task.id}>
                          <article className="manager-performance-task-item">
                            <div className="manager-performance-task-date">
                              <strong>{task.dayNumber}</strong>
                              <span>{task.weekdayShort}</span>
                            </div>
                            <div className="manager-performance-task-copy">
                              <strong>{task.title}</strong>
                              <span>{task.subtitle}</span>
                            </div>
                          </article>
                          {index < visibleTasks.length - 1 ? (
                            <Separator className="manager-performance-task-separator" />
                          ) : null}
                        </Fragment>
                      ))
                    ) : (
                      <div className="manager-performance-task-empty">
                        {showPendingTasks
                          ? "На этой неделе нет невыполненных задач."
                          : "На этой неделе пока нет выполненных задач"}
                      </div>
                    )}
                  </div>
                </section>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
