"use client";

import {
  CollaborationTaskBoardResponse,
  TaskItem,
  TaskPriority,
  TaskStatus,
} from "@smart/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Camera,
  Check,
  Circle,
  CircleX,
  ExternalLink,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/api";
import { getSession, hasManagerAccess } from "@/lib/auth";
import { toAdminHref } from "@/lib/admin-routes";
import { useI18n } from "@/lib/i18n";
import { getMockAvatarDataUrl } from "@/lib/mock-avatar";
import { parseTaskMeta } from "@/lib/task-meta";

type EmployeeDirectoryItem = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  avatarUrl?: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  primaryLocation?: {
    id: string;
    name: string;
  } | null;
  position?: {
    id: string;
    name: string;
  } | null;
};

type DatePreset = "yesterday" | "today" | "tomorrow" | "custom";

type EmployeeTaskStats = {
  total: number;
  done: number;
  open: number;
  overdue: number;
  photoPending: number;
  nextDueAt: string | null;
};

type EmployeeTaskEntry = {
  employee: EmployeeDirectoryItem;
  tasks: TaskItem[];
  stats: EmployeeTaskStats;
};

function localize(locale: string, ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

function addDays(baseDate: Date, days: number) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

function endOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string, boundary: "start" | "end") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return boundary === "start" ? startOfDay(parsed) : endOfDay(parsed);
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(
    2,
    "0",
  )}-${`${date.getDate()}`.padStart(2, "0")}`;
}

function getEmployeeName(
  employee: Pick<EmployeeDirectoryItem, "firstName" | "lastName">,
  locale: string,
) {
  if (locale === "ru") {
    return `${employee.lastName} ${employee.firstName}`.trim();
  }

  return `${employee.firstName} ${employee.lastName}`.trim();
}

function normalizeTaskTitle(title: string) {
  const normalized = title
    .replace(/^Employee recurring:\s*/i, "")
    .replace(/^Owner recurring:\s*/i, "")
    .trim();

  if (!normalized) {
    return normalized;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getTaskAnchorDate(task: TaskItem) {
  const candidates = [task.dueAt, task.occurrenceDate, task.createdAt];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function getScheduledTaskDate(task: TaskItem) {
  const candidates = [task.dueAt, task.occurrenceDate];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function isTaskOpen(status: TaskStatus) {
  return status !== "DONE" && status !== "CANCELLED";
}

function isTaskOverdue(task: TaskItem, referenceDate: Date) {
  if (!isTaskOpen(task.status)) {
    return false;
  }

  const dueAt = getScheduledTaskDate(task);
  if (!dueAt) {
    return false;
  }

  return endOfDay(dueAt).getTime() < startOfDay(referenceDate).getTime();
}

function getActivePhotoProofs(task: TaskItem) {
  return task.photoProofs.filter(
    (proof) => !proof.deletedAt && !proof.supersededByProofId,
  );
}

function formatDateLabel(value: string | Date | null | undefined, locale: string) {
  if (!value) return "—";
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  const formatted = parsed.toLocaleDateString(
    locale === "ru" ? "ru-RU" : "en-US",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  if (locale === "ru") {
    return formatted.replace(/\s*г\.?$/i, "");
  }

  return formatted;
}

function formatResolvedRangeLabel(start: Date, end: Date, locale: string) {
  if (formatDateKey(start) === formatDateKey(end)) {
    return formatDateLabel(start, locale);
  }

  return `${formatDateLabel(start, locale)} - ${formatDateLabel(end, locale)}`;
}

function priorityLabel(priority: TaskPriority, _locale: string) {
  switch (priority) {
    case "LOW":
      return "EASY";
    case "MEDIUM":
      return "MEDIUM";
    case "HIGH":
    case "URGENT":
      return "HARD";
    default:
      return "MEDIUM";
  }
}

function priorityTone(priority: TaskPriority): "easy" | "medium" | "hard" {
  switch (priority) {
    case "LOW":
      return "easy";
    case "MEDIUM":
      return "medium";
    case "HIGH":
    case "URGENT":
      return "hard";
    default:
      return "medium";
  }
}

function compareTasksForDisplay(left: TaskItem, right: TaskItem) {
  const leftClosed = !isTaskOpen(left.status);
  const rightClosed = !isTaskOpen(right.status);

  if (leftClosed !== rightClosed) {
    return leftClosed ? 1 : -1;
  }

  const leftTime = getTaskAnchorDate(left)?.getTime() ?? 0;
  const rightTime = getTaskAnchorDate(right)?.getTime() ?? 0;

  return leftTime - rightTime;
}

function getPresetSummaryLabel(_preset: DatePreset, locale: string) {
  return localize(locale, "Задачи", "Tasks");
}

export function ManagerTasksPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const [accessChecked, setAccessChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeDirectoryItem[]>([]);
  const [preset, setPreset] = useState<DatePreset>("today");
  const [dateFrom, setDateFrom] = useState(() => formatDateInput(new Date()));
  const [dateTo, setDateTo] = useState(() => formatDateInput(new Date()));
  const [expandedEmployeeIds, setExpandedEmployeeIds] = useState<string[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();

    if (!session) {
      setAccessChecked(true);
      return;
    }

    if (!hasManagerAccess(session.user.roleCodes)) {
      router.replace(toAdminHref("/"));
      return;
    }

    setAccessChecked(true);
  }, [router]);

  useEffect(() => {
    if (!accessChecked) {
      return;
    }

    const session = getSession();
    if (!session) {
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    void Promise.all([
      apiRequest<CollaborationTaskBoardResponse>("/collaboration/tasks", {
        token: session.accessToken,
      }),
      apiRequest<EmployeeDirectoryItem[]>("/employees", {
        token: session.accessToken,
      }),
    ])
      .then(([taskBoard, employeeDirectory]) => {
        if (cancelled) return;
        setTasks(taskBoard.tasks);
        setEmployees(employeeDirectory);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setTasks([]);
        setEmployees([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : localize(
                locale,
                "Не удалось загрузить задачи команды.",
                "Unable to load team tasks.",
              ),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessChecked, locale]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const { rangeStart, rangeEnd } = useMemo(() => {
    let start = parseDateInput(dateFrom, "start") ?? startOfDay(today);
    let end = parseDateInput(dateTo, "end") ?? endOfDay(today);

    if (start.getTime() > end.getTime()) {
      const nextStart = startOfDay(end);
      const nextEnd = endOfDay(start);
      return { rangeStart: nextStart, rangeEnd: nextEnd };
    }

    return { rangeStart: start, rangeEnd: end };
  }, [dateFrom, dateTo, today]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const anchorDate = getTaskAnchorDate(task);
      if (!anchorDate) {
        return false;
      }

      return (
        anchorDate.getTime() >= rangeStart.getTime() &&
        anchorDate.getTime() <= rangeEnd.getTime()
      );
    });
  }, [rangeEnd, rangeStart, tasks]);

  const employeeTaskEntries = useMemo<EmployeeTaskEntry[]>(() => {
    const tasksByEmployee = new Map<string, TaskItem[]>();

    for (const task of visibleTasks) {
      if (!task.assigneeEmployeeId) continue;
      const current = tasksByEmployee.get(task.assigneeEmployeeId) ?? [];
      current.push(task);
      tasksByEmployee.set(task.assigneeEmployeeId, current);
    }

    const employeeMap = new Map(
      employees.map((employee) => [employee.id, employee]),
    );

    for (const task of visibleTasks) {
      if (
        !task.assigneeEmployee ||
        employeeMap.has(task.assigneeEmployee.id)
      ) {
        continue;
      }

      employeeMap.set(task.assigneeEmployee.id, {
        id: task.assigneeEmployee.id,
        firstName: task.assigneeEmployee.firstName,
        lastName: task.assigneeEmployee.lastName,
        employeeNumber: task.assigneeEmployee.employeeNumber,
        avatarUrl: null,
        department: task.assigneeEmployee.department ?? null,
        primaryLocation: task.assigneeEmployee.primaryLocation ?? null,
        position: null,
      });
    }

    return Array.from(employeeMap.values())
      .map((employee) => {
        const employeeTasks = (tasksByEmployee.get(employee.id) ?? [])
          .slice()
          .sort(compareTasksForDisplay);

        const stats = employeeTasks.reduce<EmployeeTaskStats>(
          (current, task) => {
            const scheduledAt = getScheduledTaskDate(task);

            current.total += 1;

            if (task.status === "DONE") {
              current.done += 1;
            }

            if (isTaskOpen(task.status)) {
              current.open += 1;
            }

            if (isTaskOverdue(task, today)) {
              current.overdue += 1;
            }

            if (
              task.requiresPhoto &&
              isTaskOpen(task.status) &&
              getActivePhotoProofs(task).length === 0
            ) {
              current.photoPending += 1;
            }

            if (
              scheduledAt &&
              (!current.nextDueAt ||
                scheduledAt.getTime() <
                  new Date(current.nextDueAt).getTime())
            ) {
              current.nextDueAt = scheduledAt.toISOString();
            }

            return current;
          },
          {
            total: 0,
            done: 0,
            open: 0,
            overdue: 0,
            photoPending: 0,
            nextDueAt: null,
          },
        );

        return {
          employee,
          tasks: employeeTasks,
          stats,
        };
      })
      .sort((left, right) => {
        if (right.stats.total !== left.stats.total) {
          return right.stats.total - left.stats.total;
        }

        if (right.stats.done !== left.stats.done) {
          return right.stats.done - left.stats.done;
        }

        return getEmployeeName(left.employee, locale).localeCompare(
          getEmployeeName(right.employee, locale),
          locale === "ru" ? "ru" : "en",
        );
      });
  }, [employees, locale, today, visibleTasks]);

  useEffect(() => {
    if (!employeeTaskEntries.length) {
      setExpandedEmployeeIds([]);
      return;
    }

    const validEmployeeIds = new Set(
      employeeTaskEntries.map((entry) => entry.employee.id),
    );

    setExpandedEmployeeIds((current) =>
      current.filter((employeeId) => validEmployeeIds.has(employeeId)),
    );
  }, [employeeTaskEntries]);

  useEffect(() => {
    if (
      expandedTaskId &&
      !visibleTasks.some((task) => task.id === expandedTaskId)
    ) {
      setExpandedTaskId(null);
    }
  }, [expandedTaskId, visibleTasks]);

  const employeesWithTasks = useMemo(
    () => employeeTaskEntries.filter((entry) => entry.stats.total > 0).length,
    [employeeTaskEntries],
  );

  const teamSummary = useMemo(() => {
    return {
      total: visibleTasks.length,
      completed: visibleTasks.filter((task) => task.status === "DONE").length,
      overdue: visibleTasks.filter((task) => isTaskOverdue(task, today)).length,
      photoPending: visibleTasks.filter(
        (task) =>
          task.requiresPhoto &&
          isTaskOpen(task.status) &&
          getActivePhotoProofs(task).length === 0,
      ).length,
    };
  }, [today, visibleTasks]);
  const isSingleDaySelection = formatDateKey(rangeStart) === formatDateKey(rangeEnd);
  const isPreviousDaySelection =
    isSingleDaySelection &&
    formatDateKey(startOfDay(rangeStart)) === formatDateKey(addDays(today, -1));

  function applyPreset(nextPreset: Exclude<DatePreset, "custom">) {
    const base = new Date();

    if (nextPreset === "yesterday") {
      const target = addDays(base, -1);
      setDateFrom(formatDateInput(target));
      setDateTo(formatDateInput(target));
    }

    if (nextPreset === "today") {
      setDateFrom(formatDateInput(base));
      setDateTo(formatDateInput(base));
    }

    if (nextPreset === "tomorrow") {
      const target = addDays(base, 1);
      setDateFrom(formatDateInput(target));
      setDateTo(formatDateInput(target));
    }

    setPreset(nextPreset);
  }

  const summaryLabel = getPresetSummaryLabel(preset, locale);
  const rangeHeroLabel = formatResolvedRangeLabel(
    rangeStart,
    rangeEnd,
    locale,
  ).toLocaleUpperCase(
    locale === "ru" ? "ru-RU" : "en-US",
  );

  function renderTaskStatusIcon(task: TaskItem) {
    const overdue = isTaskOverdue(task, today);

    if (task.status === "DONE") {
      return (
        <span className="team-tasks-status-icon is-done" aria-hidden="true">
          <Check className="size-3.5" />
        </span>
      );
    }

    if (overdue) {
      return (
        <span className="team-tasks-status-icon is-overdue" aria-hidden="true">
          <CircleX className="size-3.5" />
        </span>
      );
    }

    return (
      <span className="team-tasks-status-icon is-open" aria-hidden="true">
        <Circle className="size-3.5" />
      </span>
    );
  }

  function renderTaskPreview(
    task: TaskItem,
    options?: {
      embedded?: boolean;
    },
  ) {
    const taskMeta = parseTaskMeta(task.description);
    const photoProofs = getActivePhotoProofs(task).filter(
      (proof): proof is (typeof task.photoProofs)[number] & { url: string } =>
        Boolean(proof.url),
    );
    const embedded = options?.embedded ?? false;
    const isExpanded = expandedTaskId === task.id;
    const canExpand =
      photoProofs.length > 0 || Boolean(taskMeta.meeting?.meetingLink);
    const title = normalizeTaskTitle(task.title);
    const overdue = isTaskOverdue(task, today);
    const done = task.status === "DONE";

    const taskRow = (
      <>
        <div className="team-tasks-task-line-main">
          {renderTaskStatusIcon(task)}
          <span
            className={`team-tasks-task-line-title ${
              done ? "is-done" : overdue ? "is-overdue" : ""
            }`}
          >
            {title}
          </span>
        </div>
        <div className="team-tasks-task-line-side">
          <span
            className={`team-tasks-task-priority is-${priorityTone(
              task.priority,
            )}`}
          >
            {priorityLabel(task.priority, locale)}
          </span>
          {photoProofs.length ? (
            <span className="team-tasks-task-camera-mark" aria-hidden="true">
              <Camera className="size-3.5" />
            </span>
          ) : null}
        </div>
      </>
    );

    return (
      <article
        className={`team-tasks-task-line ${
          done ? "is-done" : overdue ? "is-overdue" : ""
        } ${canExpand ? "is-expandable" : ""} ${embedded ? "is-embedded" : ""}`}
        key={task.id}
      >
        {canExpand ? (
          <button
            className="team-tasks-task-line-button"
            onClick={() =>
              setExpandedTaskId((current) => (current === task.id ? null : task.id))
            }
            type="button"
          >
            {taskRow}
          </button>
        ) : (
          <div className="team-tasks-task-line-static">{taskRow}</div>
        )}

        {isExpanded ? (
          <div className="team-tasks-task-preview">
            {photoProofs.length ? (
              <div className="team-tasks-photo-grid">
                {photoProofs.map((proof) => (
                  <a
                    className="team-tasks-photo-card"
                    href={proof.url ?? "#"}
                    key={proof.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <img
                      alt={localize(locale, "Фотоотчёт по задаче", "Task photo proof")}
                      className="team-tasks-photo-image"
                      src={proof.url ?? ""}
                    />
                  </a>
                ))}
              </div>
            ) : null}

            {taskMeta.meeting?.meetingLink ? (
              <a
                className="team-tasks-inline-link"
                href={taskMeta.meeting.meetingLink}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="size-3.5" />
                {localize(locale, "Открыть встречу", "Open meeting")}
              </a>
            ) : null}
          </div>
        ) : null}
      </article>
    );
  }

  function renderTaskCollection(
    tasks: TaskItem[],
    options?: {
      embedded?: boolean;
    },
  ) {
    return tasks.map((task, index) => (
      <div className="team-tasks-task-entry" key={task.id}>
        {index > 0 ? <Separator className="team-tasks-task-separator" /> : null}
        {renderTaskPreview(task, options)}
      </div>
    ));
  }

  return (
    <AdminShell>
      <main className="page-shell section-stack team-tasks-page">
        <section className="team-tasks-toolbar">
          <div className="team-tasks-heading">
            <p className="team-tasks-focus-label">{rangeHeroLabel}</p>
          </div>

          <div className="team-tasks-period-controls">
            <div className="team-tasks-period-toggle" role="tablist">
              {(
                [
                  {
                    key: "yesterday",
                    label: localize(locale, "Вчера", "Yesterday"),
                  },
                  {
                    key: "today",
                    label: localize(locale, "Сегодня", "Today"),
                  },
                  {
                    key: "tomorrow",
                    label: localize(locale, "Завтра", "Tomorrow"),
                  },
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

            {preset === "custom" ? (
              <div className="team-tasks-custom-range">
                <label className="team-tasks-custom-field">
                  <Input
                    aria-label={localize(locale, "Дата от", "Date from")}
                    onChange={(event) => setDateFrom(event.target.value)}
                    type="date"
                    value={dateFrom}
                  />
                </label>
                <label className="team-tasks-custom-field">
                  <Input
                    aria-label={localize(locale, "Дата до", "Date to")}
                    onChange={(event) => setDateTo(event.target.value)}
                    type="date"
                    value={dateTo}
                  />
                </label>
              </div>
            ) : null}
          </div>
        </section>

        <section className="team-tasks-summary">
          <dl className="team-tasks-summary-line">
            <div className="team-tasks-summary-item is-total">
              <dt className="team-tasks-summary-label">{summaryLabel}</dt>
              <dd className="team-tasks-summary-total">{teamSummary.total}</dd>
            </div>

            <div className="team-tasks-summary-item is-progress">
              <dt className="team-tasks-summary-label">
                {localize(locale, "Выполнено", "Completed")}
              </dt>
              <dd className="team-tasks-summary-progress">
                <span className="team-tasks-positive">{teamSummary.completed}</span>
              </dd>
            </div>

            <div className="team-tasks-summary-item">
              <dt className="team-tasks-summary-label">
                {localize(locale, "Сотрудников", "Employees")}
              </dt>
              <dd>{employeeTaskEntries.length}</dd>
            </div>

            <div className="team-tasks-summary-item">
              <dt className="team-tasks-summary-label">
                {localize(locale, "С задачами", "With tasks")}
              </dt>
              <dd>{employeesWithTasks}</dd>
            </div>

            {isPreviousDaySelection ? (
              <div className="team-tasks-summary-item">
                <dt className="team-tasks-summary-label">
                  {localize(locale, "Просрочено", "Overdue")}
                </dt>
                <dd>{teamSummary.overdue}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {error ? (
          <div className="warning-banner">
            <AlertCircle className="size-4" />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <section className="team-tasks-loading-panel" aria-live="polite">
            <CalendarDays className="size-4" />
            <span>
              {localize(
                locale,
                "Собираем задачи команды...",
                "Loading team tasks...",
              )}
            </span>
          </section>
        ) : (
          <section className="team-tasks-list">
            {employeeTaskEntries.length ? (
              <Accordion
                className="team-tasks-accordion"
                onValueChange={setExpandedEmployeeIds}
                type="multiple"
                value={expandedEmployeeIds}
              >
                {employeeTaskEntries.map((entry) => {
                  const recurringTasks = entry.tasks.filter(
                    (task) => task.isRecurring,
                  );
                  const regularTasks = entry.tasks.filter(
                    (task) => !task.isRecurring,
                  );
                  const employeeName = getEmployeeName(entry.employee, locale);

                  return (
                    <AccordionItem
                      className="team-tasks-employee-item"
                      key={entry.employee.id}
                      value={entry.employee.id}
                    >
                      <AccordionTrigger className="team-tasks-employee-trigger">
                        <div className="team-tasks-employee-head">
                          <div className="team-tasks-avatar">
                            <img
                              alt={employeeName}
                              className="h-full w-full object-cover"
                              src={
                                entry.employee.avatarUrl ??
                                getMockAvatarDataUrl(employeeName)
                              }
                            />
                          </div>

                          <div className="team-tasks-employee-copy">
                            <strong>{employeeName}</strong>
                          </div>
                        </div>

                        <div className="team-tasks-employee-progress">
                          <strong className="team-tasks-positive">
                            {entry.stats.done}
                          </strong>
                          <span>/</span>
                          <strong>{entry.stats.total}</strong>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="team-tasks-employee-content data-[state=closed]:animate-none data-[state=open]:animate-none">
                          <div className="team-tasks-compact-list">
                          {renderTaskCollection(regularTasks)}

                          {recurringTasks.length ? (
                            <section className="team-tasks-routine-box">
                              <div className="team-tasks-routine-label">
                                {localize(
                                  locale,
                                  "Повседневные задачи",
                                  "Routine tasks",
                                )}
                              </div>
                              <div className="team-tasks-routine-list">
                                {renderTaskCollection(recurringTasks, {
                                  embedded: true,
                                })}
                              </div>
                            </section>
                          ) : null}

                          {!entry.tasks.length ? (
                            <div className="team-tasks-group-empty">
                              {localize(
                                locale,
                                "На выбранный день задач нет.",
                                "No tasks for the selected day.",
                              )}
                            </div>
                          ) : null}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <div className="team-tasks-empty-note">
                {localize(
                  locale,
                  "В выбранном периоде задач пока нет.",
                  "No tasks were found in this range.",
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </AdminShell>
  );
}
