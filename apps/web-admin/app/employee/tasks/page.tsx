"use client";

import { useEffect, useMemo, useState } from "react";
import { TaskItem } from "@smart/types";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { EmployeeShell } from "@/components/employee-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskPresenceStrip } from "@/components/task-presence-strip";
import { getSession } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { parseTaskMeta } from "@/lib/task-meta";

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isTaskOpen(status: TaskItem["status"]) {
  return status !== "DONE" && status !== "CANCELLED";
}

function parseTaskDueAt(task: TaskItem) {
  if (!task.dueAt) return null;
  const parsed = new Date(task.dueAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function EmployeeTasksPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<TaskItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDayKey, setSelectedDayKey] = useState(() =>
    formatDateKey(new Date()),
  );

  async function loadData() {
    const session = getSession();
    if (!session) return;

    const monthStart = new Date(
      calendarCursor.getFullYear(),
      calendarCursor.getMonth(),
      1,
    );
    const monthEnd = new Date(
      calendarCursor.getFullYear(),
      calendarCursor.getMonth() + 1,
      0,
    );
    const search = new URLSearchParams({
      dateFrom: formatDateKey(monthStart),
      dateTo: formatDateKey(monthEnd),
    });

    const data = await apiRequest<TaskItem[]>(
      `/collaboration/tasks/me?${search.toString()}`,
      {
      token: session.accessToken,
      },
    );
    setItems(data);
  }

  useEffect(() => {
    void loadData();
  }, [calendarCursor]);

  async function updateStatus(taskId: string, status: TaskItem["status"]) {
    const session = getSession();
    if (!session) return;

    await apiRequest(`/collaboration/tasks/${taskId}/status`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ status }),
    });

    setMessage(t("collaboration.statusUpdated"));
    await loadData();
  }

  async function toggleChecklist(taskId: string, itemId: string) {
    const session = getSession();
    if (!session) return;

    await apiRequest(
      `/collaboration/tasks/${taskId}/checklist/${itemId}/toggle`,
      {
        method: "POST",
        token: session.accessToken,
      },
    );

    setMessage(t("collaboration.checklistUpdated"));
    await loadData();
  }

  function renderTaskBody(task: TaskItem) {
    const details = parseTaskMeta(task.description);

    return (
      <div className="task-meta-block">
        {details.body ? (
          <p className="m-0 text-sm text-[color:var(--muted-foreground)]">
            {details.body}
          </p>
        ) : null}
        {details.meeting ? (
          <div className="task-meeting-card">
            <div className="task-meeting-row">
              <strong>Формат:</strong>
              <span>
                {details.meeting.meetingMode === "online"
                  ? "Онлайн"
                  : "Оффлайн"}
              </span>
            </div>
            {details.meeting.meetingLink ? (
              <div className="task-meeting-row">
                <strong>Подключение:</strong>
                <a
                  href={details.meeting.meetingLink}
                  rel="noreferrer"
                  target="_blank"
                >
                  Открыть встречу
                </a>
              </div>
            ) : null}
            {details.meeting.meetingLocation ? (
              <div className="task-meeting-row">
                <strong>Место:</strong>
                <span>{details.meeting.meetingLocation}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const todayStart = useMemo(() => startOfDay(new Date()), []);

  const taskCalendar = useMemo(() => {
    const scheduledByDay = new Map<string, TaskItem[]>();
    const unscheduled: TaskItem[] = [];

    for (const task of items) {
      const dueAt = parseTaskDueAt(task);
      if (!dueAt) {
        unscheduled.push(task);
        continue;
      }

      const key = formatDateKey(dueAt);
      const list = scheduledByDay.get(key) ?? [];
      list.push(task);
      scheduledByDay.set(key, list);
    }

    for (const list of scheduledByDay.values()) {
      list.sort((left, right) => {
        const leftTime = parseTaskDueAt(left)?.getTime() ?? 0;
        const rightTime = parseTaskDueAt(right)?.getTime() ?? 0;
        return leftTime - rightTime;
      });
    }

    unscheduled.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
    return { scheduledByDay, unscheduled };
  }, [items]);

  const activeOpenCount = items.filter((task) =>
    isTaskOpen(task.status),
  ).length;
  const dueTodayCount = items.filter((task) => {
    if (!isTaskOpen(task.status)) return false;
    const dueAt = parseTaskDueAt(task);
    return dueAt ? formatDateKey(dueAt) === formatDateKey(todayStart) : false;
  }).length;
  const overdueCount = items.filter((task) => {
    if (!isTaskOpen(task.status)) return false;
    const dueAt = parseTaskDueAt(task);
    return dueAt ? startOfDay(dueAt) < todayStart : false;
  }).length;

  const monthStart = new Date(
    calendarCursor.getFullYear(),
    calendarCursor.getMonth(),
    1,
  );
  const monthEnd = new Date(
    calendarCursor.getFullYear(),
    calendarCursor.getMonth() + 1,
    0,
  );
  const leadingEmptyDays = (monthStart.getDay() + 6) % 7;
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
      new Date(2026, 0, 5 + index),
    ),
  );
  const calendarCells = Array.from(
    { length: leadingEmptyDays + monthEnd.getDate() },
    (_, index) => {
      if (index < leadingEmptyDays) return null;
      return new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        index - leadingEmptyDays + 1,
      );
    },
  );
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const selectedDayTasks =
    taskCalendar.scheduledByDay.get(selectedDayKey) ?? [];
  const selectedDateLabel = new Date(
    `${selectedDayKey}T00:00:00`,
  ).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const presenceItems = useMemo(() => {
    const counts = new Map<
      string,
      { name: string; tasks: number; done: boolean }
    >();
    for (const task of selectedDayTasks) {
      const name = `${task.managerEmployee.firstName} ${task.managerEmployee.lastName}`;
      const current = counts.get(task.managerEmployee.id) ?? {
        name,
        tasks: 0,
        done: true,
      };
      current.tasks += 1;
      current.done = current.done && task.status === "DONE";
      counts.set(task.managerEmployee.id, current);
    }
    return Array.from(counts.entries()).map(([id, value]) => ({
      id,
      ...value,
    }));
  }, [selectedDayTasks]);

  function shiftCalendarMonth(delta: number) {
    const nextCursor = new Date(
      calendarCursor.getFullYear(),
      calendarCursor.getMonth() + delta,
      1,
    );
    setCalendarCursor(nextCursor);
    setSelectedDayKey(formatDateKey(nextCursor));
  }

  function renderTaskCard(task: TaskItem) {
    return (
      <article className="timeline-card" key={task.id}>
        <div className="timeline-card-header">
          <div>
            <span className="section-kicker">{task.priority}</span>
            <strong>{task.title}</strong>
            <p>
              {task.managerEmployee.firstName} {task.managerEmployee.lastName}
              {task.dueAt ? ` · ${new Date(task.dueAt).toLocaleString()}` : ""}
            </p>
          </div>
          <Badge
            variant={
              task.status === "DONE"
                ? "success"
                : task.priority === "URGENT"
                  ? "warning"
                  : "neutral"
            }
          >
            {task.status}
          </Badge>
        </div>

        {renderTaskBody(task)}

        <div className="task-checklist">
          {task.checklistItems.length ? (
            task.checklistItems.map((item) => (
              <label className="task-checklist-row" key={item.id}>
                <Checkbox
                  checked={item.isCompleted}
                  onCheckedChange={() => void toggleChecklist(task.id, item.id)}
                />
                <div className="grid gap-1">
                  <strong className="text-sm">{item.title}</strong>
                  <span className="text-xs text-[color:var(--muted-foreground)]">
                    {item.completedAt
                      ? `Completed by ${item.completedByEmployee?.firstName ?? ""}`
                      : "Pending"}
                  </span>
                </div>
              </label>
            ))
          ) : (
            <div className="empty-state">No checklist attached.</div>
          )}
        </div>

        <div className="task-card-footer">
          <label className="task-complete-toggle" htmlFor={`task-${task.id}`}>
            <Checkbox
              checked={task.status === "DONE"}
              id={`task-${task.id}`}
              onCheckedChange={(checked) =>
                void updateStatus(task.id, checked === true ? "DONE" : "TODO")
              }
            />
            <span>
              {task.status === "DONE"
                ? t("collaboration.reopenTask")
                : t("collaboration.markDone")}
            </span>
          </label>
          <Button
            onClick={() => void updateStatus(task.id, "IN_PROGRESS")}
            size="sm"
            variant="secondary"
          >
            <CheckCircle2 className="size-4" />
            {t("collaboration.markInProgress")}
          </Button>
        </div>
      </article>
    );
  }

  return (
    <EmployeeShell>
      <section className="section-stack">
        <section className="section-header">
          <span className="eyebrow">Календарь</span>
          <h1>Календарь задач и встреч.</h1>
          <p>
            Месячный обзор задач, встреч и чек-листов по дням без лишних
            разделов в веб-версии сотрудника.
          </p>
        </section>

        {message ? <div className="inline-note">{message}</div> : null}

        <section className="stats-grid">
          <article className="metric-card">
            <span className="metric-label">Open</span>
            <strong className="metric-value">{activeOpenCount}</strong>
            <p className="metric-detail">
              {t("collaboration.activeOpenTasks")}
            </p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Today</span>
            <strong className="metric-value">{dueTodayCount}</strong>
            <p className="metric-detail">{t("collaboration.dueToday")}</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Overdue</span>
            <strong className="metric-value">{overdueCount}</strong>
            <p className="metric-detail">{t("collaboration.overdueTasks")}</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">No date</span>
            <strong className="metric-value">
              {taskCalendar.unscheduled.length}
            </strong>
            <p className="metric-detail">
              {t("collaboration.unscheduledTasks")}
            </p>
          </article>
        </section>

        <section className="hero-banner">
          <div className="hero-banner-copy">
            <Badge className="w-fit" variant="neutral">
              День в фокусе
            </Badge>
            <h2>Все задачи и встречи собраны в одном календарном дне.</h2>
            <p className="hero-copy">
              Можно открыть конкретную дату, посмотреть загрузку и сразу
              отметить прогресс по чек-листам.
            </p>
            <TaskPresenceStrip
              emptyLabel="На выбранный день событий нет."
              items={presenceItems}
            />
          </div>
          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">
                  {t("collaboration.workloadCalendar")}
                </span>
                <h2>
                  {monthStart.toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => shiftCalendarMonth(-1)}
                  size="icon"
                  variant="secondary"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  onClick={() => shiftCalendarMonth(1)}
                  size="icon"
                  variant="secondary"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            <div className="calendar-grid">
              {weekdayLabels.map((label) => (
                <div className="table-head" key={label}>
                  {label}
                </div>
              ))}
              {calendarCells.map((cell, index) => {
                if (!cell) return <div key={`empty-${index}`} />;
                const key = formatDateKey(cell);
                const scheduledItems =
                  taskCalendar.scheduledByDay.get(key) ?? [];
                const isSelected = key === selectedDayKey;
                const isToday = key === formatDateKey(todayStart);
                return (
                  <button
                    className={`calendar-day ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
                    key={key}
                    onClick={() => setSelectedDayKey(key)}
                    type="button"
                  >
                    <strong>{cell.getDate()}</strong>
                    <div className="mt-4 grid gap-1 text-left text-xs text-[color:var(--muted-foreground)]">
                      <span>{scheduledItems.length} tasks</span>
                      <span>
                        {
                          scheduledItems.filter(
                            (task) => task.status === "DONE",
                          ).length
                        }{" "}
                        done
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="content-grid">
          <article className="panel panel-large">
            <div className="panel-header">
              <div>
                <span className="section-kicker">
                  {t("collaboration.selectedDayTasks")}
                </span>
                <h2>{selectedDateLabel}</h2>
              </div>
            </div>
            {selectedDayTasks.length ? (
              <div className="section-stack">
                {selectedDayTasks.map((task) => renderTaskCard(task))}
              </div>
            ) : (
              <div className="empty-state">
                {t("collaboration.noTasksForDay")}
              </div>
            )}
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">
                  {t("collaboration.unscheduledTasks")}
                </span>
                <h2>{t("collaboration.unscheduledTasks")}</h2>
              </div>
            </div>
            {taskCalendar.unscheduled.length ? (
              <div className="session-stack">
                {taskCalendar.unscheduled.map((task) => renderTaskCard(task))}
              </div>
            ) : (
              <div className="empty-state">
                {t("collaboration.noUnscheduledTasks")}
              </div>
            )}
          </article>
        </section>
      </section>
    </EmployeeShell>
  );
}
