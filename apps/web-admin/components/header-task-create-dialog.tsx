"use client";

import type { EmployeeApiRecord, TaskItem } from "@smart/types";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AppSelectField } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TaskDatePicker,
  TaskDateTimePicker,
  TaskTimePicker,
} from "@/components/task-schedule-pickers";
import { WorkspaceLoading } from "@/components/workspace-loading";
import { apiRequest } from "@/lib/api";
import type { AuthSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getMockAvatarDataUrl } from "@/lib/mock-avatar";
import {
  getWebAdminTaskPriorityLabel,
  normalizeWebAdminTaskPriority,
} from "@/lib/task-priority";

type HeaderTaskDraft = {
  title: string;
  description: string;
  priority: TaskItem["priority"];
  dueAt: string;
  dueTimeLocal: string;
  hasDueTime: boolean;
  requiresPhoto: boolean;
  isRecurring: boolean;
  weekDays: number[];
  startDate: string;
};

type HeaderTaskCreateDialogProps = {
  onCreated?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  session: AuthSession | null;
};

const TASK_WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 0];

function getInitialTaskDraft(): HeaderTaskDraft {
  return {
    title: "",
    description: "",
    priority: "MEDIUM",
    dueAt: "",
    dueTimeLocal: "18:00",
    hasDueTime: false,
    requiresPhoto: false,
    isRecurring: false,
    weekDays: [1, 2, 3, 4, 5],
    startDate: new Date().toISOString().split("T")[0] ?? "",
  };
}

function localize(locale: "ru" | "en", ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

function buildEmployeeName(employee: {
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
}) {
  return [employee.lastName, employee.firstName, employee.middleName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getEmployeeAvatarSrc(employee: Pick<EmployeeApiRecord, "avatarUrl" | "firstName" | "lastName" | "middleName">) {
  const name = buildEmployeeName(employee) || employee.lastName || employee.firstName || "employee";
  return employee.avatarUrl ?? getMockAvatarDataUrl(name);
}

function getWeekdayShortLabel(day: number, locale: "ru" | "en") {
  const normalizedDay = day === 7 ? 0 : day;

  if (locale === "en") {
    return normalizedDay === 0
      ? "Su"
      : normalizedDay === 1
        ? "Mo"
        : normalizedDay === 2
          ? "Tu"
          : normalizedDay === 3
            ? "We"
            : normalizedDay === 4
              ? "Th"
              : normalizedDay === 5
                ? "Fr"
                : "Sa";
  }

  return normalizedDay === 0
    ? "Вс"
    : normalizedDay === 1
      ? "Пн"
      : normalizedDay === 2
        ? "Вт"
        : normalizedDay === 3
          ? "Ср"
          : normalizedDay === 4
            ? "Чт"
            : normalizedDay === 5
              ? "Пт"
              : "Сб";
}

export function HeaderTaskCreateDialog({
  onCreated,
  onOpenChange,
  open,
  session,
}: HeaderTaskCreateDialogProps) {
  const { locale } = useI18n();
  const [employees, setEmployees] = useState<EmployeeApiRecord[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [draft, setDraft] = useState<HeaderTaskDraft>(() => getInitialTaskDraft());
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const employeeOptions = useMemo(() => {
    return employees
      .map((employee) => ({
        ...employee,
        displayName: buildEmployeeName(employee) || employee.user?.email || employee.id,
      }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName, locale));
  }, [employees, locale]);

  const selectedEmployee = employeeOptions.find(
    (employee) => employee.id === selectedEmployeeId,
  );

  const priorityOptions = useMemo(
    () =>
      (["LOW", "MEDIUM", "HIGH"] as TaskItem["priority"][]).map((priority) => ({
        value: priority,
        label: getWebAdminTaskPriorityLabel(priority),
      })),
    [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(getInitialTaskDraft());
    setError(null);
    setSelectedEmployeeId("");

    if (!session?.accessToken) {
      return;
    }

    let cancelled = false;
    setLoadingEmployees(true);

    void apiRequest<EmployeeApiRecord[]>("/employees", {
      token: session.accessToken,
    })
      .then((items) => {
        if (cancelled) {
          return;
        }

        const activeItems = items.filter(
          (employee) => !["DISMISSED", "dismissed"].includes(employee.status ?? ""),
        );
        setEmployees(activeItems);
        setSelectedEmployeeId((current) => current || activeItems[0]?.id || "");
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : localize(locale, "Не удалось загрузить сотрудников.", "Unable to load employees."),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingEmployees(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locale, open, session?.accessToken]);

  async function handleSubmit() {
    if (!session?.accessToken || !selectedEmployeeId) {
      return;
    }

    setError(null);

    if (draft.isRecurring && draft.weekDays.length === 0) {
      setError(localize(locale, "Выберите хотя бы один день повтора.", "Select at least one recurring day."));
      return;
    }

    if (draft.hasDueTime) {
      if (draft.isRecurring && !draft.dueTimeLocal) {
        setError(localize(locale, "Выберите точное время.", "Select an exact time."));
        return;
      }

      if (!draft.isRecurring) {
        const dueDate = draft.dueAt ? new Date(draft.dueAt) : null;
        if (!dueDate || Number.isNaN(dueDate.getTime()) || dueDate < new Date()) {
          setError(
            localize(
              locale,
              "Выберите будущую дату и время выполнения.",
              "Select a future due date and time.",
            ),
          );
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      if (draft.isRecurring) {
        await apiRequest("/collaboration/task-templates", {
          method: "POST",
          token: session.accessToken,
          body: JSON.stringify({
            title: draft.title.trim(),
            description: draft.description.trim() || undefined,
            priority: draft.priority,
            requiresPhoto: draft.requiresPhoto || undefined,
            expandOnDemand: true,
            frequency: "WEEKLY",
            weekDays: draft.weekDays,
            startDate: draft.startDate || new Date().toISOString().split("T")[0],
            dueAfterDays: 0,
            dueTimeLocal: draft.hasDueTime ? draft.dueTimeLocal || undefined : undefined,
            assigneeEmployeeId: selectedEmployeeId,
          }),
        });
      } else {
        await apiRequest<TaskItem[]>("/collaboration/tasks", {
          method: "POST",
          token: session.accessToken,
          body: JSON.stringify({
            title: draft.title.trim(),
            description: draft.description.trim() || undefined,
            priority: draft.priority,
            requiresPhoto: draft.requiresPhoto || undefined,
            dueAt: draft.hasDueTime ? draft.dueAt || undefined : undefined,
            assigneeEmployeeId: selectedEmployeeId,
          }),
        });
      }

      setDraft(getInitialTaskDraft());
      onOpenChange(false);
      onCreated?.();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : localize(locale, "Не удалось создать задачу.", "Failed to create task."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    Boolean(draft.title.trim()) &&
    Boolean(selectedEmployeeId) &&
    (!draft.isRecurring || draft.weekDays.length > 0) &&
    (!draft.hasDueTime || (draft.isRecurring ? Boolean(draft.dueTimeLocal) : Boolean(draft.dueAt)));

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[min(680px,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            {localize(locale, "Назначить задачу", "Assign task")}
          </DialogTitle>
          <DialogDescription className="font-heading">
            {selectedEmployee
              ? `${localize(locale, "Получатель", "Recipient")}: ${selectedEmployee.displayName}`
              : localize(locale, "Выберите сотрудника и заполните задачу.", "Choose an employee and fill in the task.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 text-sm font-heading">
            <span>{localize(locale, "Получатель", "Recipient")}</span>
            <div className="max-h-[168px] overflow-y-auto rounded-2xl border border-border/70 bg-secondary/10 p-2">
              {loadingEmployees ? (
                <WorkspaceLoading
                  className="min-h-[120px]"
                  iconClassName="size-8"
                  label={localize(locale, "Загружаем сотрудников", "Loading employees")}
                />
              ) : employeeOptions.length ? (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {employeeOptions.map((employee) => {
                    const selected = employee.id === selectedEmployeeId;

                    return (
                      <button
                        className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-left transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.96] ${
                          selected
                            ? "bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)] ring-1 ring-[rgba(40,75,255,0.22)]"
                            : "hover:bg-white/80"
                        }`}
                        key={employee.id}
                        onClick={() => setSelectedEmployeeId(employee.id)}
                        type="button"
                      >
                        <Avatar
                          alt={employee.displayName}
                          className="shrink-0"
                          size="sm"
                          src={getEmployeeAvatarSrc(employee)}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[color:var(--foreground)]">
                            {employee.displayName}
                          </span>
                          <span className="block truncate text-xs font-normal text-[color:var(--muted-foreground)]">
                            {employee.user?.email || employee.employeeNumber}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-6 text-center text-sm text-[color:var(--muted-foreground)]">
                  {localize(locale, "Сотрудники не найдены.", "No employees found.")}
                </div>
              )}
            </div>
          </div>

          <label className="grid gap-2 text-sm font-heading">
            <span>{localize(locale, "Название", "Title")}</span>
            <Input
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder={localize(locale, "Например, Подготовить отчёт", "For example, Prepare the report")}
              value={draft.title}
            />
          </label>

          <label className="grid gap-2 text-sm font-heading">
            <span>{localize(locale, "Описание", "Description")}</span>
            <Textarea
              className="min-h-[110px]"
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              placeholder={localize(locale, "Кратко опишите задачу", "Briefly describe the task")}
              value={draft.description}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-heading">
              <span>{localize(locale, "Приоритет", "Priority")}</span>
              <AppSelectField
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    priority: value as TaskItem["priority"],
                  }))
                }
                options={priorityOptions}
                triggerClassName="h-11 rounded-xl bg-secondary/30"
                value={normalizeWebAdminTaskPriority(draft.priority)}
              />
            </label>

            {!draft.isRecurring ? (
              <div className="grid gap-2 text-sm font-heading">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-secondary/20 px-3 py-2">
                  <Checkbox
                    checked={draft.hasDueTime}
                    onCheckedChange={(checked) =>
                      setDraft((current) => ({
                        ...current,
                        hasDueTime: checked === true,
                        dueAt: checked === true ? current.dueAt : "",
                      }))
                    }
                  />
                  <span className="leading-snug">
                    {localize(locale, "Сделать до времени", "Set deadline time")}
                  </span>
                </label>
                <TaskDateTimePicker
                  className="sm:grid-cols-[minmax(0,1fr)_118px]"
                  isDisabled={!draft.hasDueTime}
                  locale={locale}
                  minToday
                  onChange={(value) => setDraft((current) => ({ ...current, dueAt: value }))}
                  value={draft.dueAt}
                />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="inline-flex cursor-pointer items-center gap-3 justify-self-start">
              <Checkbox
                checked={draft.isRecurring}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    isRecurring: checked === true,
                    dueAt: checked === true ? "" : current.dueAt,
                    hasDueTime: checked === true ? false : current.hasDueTime,
                  }))
                }
              />
              <span className="whitespace-nowrap text-sm font-heading leading-none">
                {localize(locale, "Сделать регулярной задачей", "Make recurring")}
              </span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-3 justify-self-start">
              <Checkbox
                checked={draft.requiresPhoto}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({ ...current, requiresPhoto: checked === true }))
                }
              />
              <span className="whitespace-nowrap text-sm font-heading leading-none">
                {localize(locale, "Требуется фото-подтверждение", "Photo confirmation required")}
              </span>
            </label>
          </div>

          {draft.isRecurring ? (
            <div className="grid gap-4 rounded-2xl border border-dashed border-border bg-secondary/10 p-4">
              <label className="grid gap-2 text-sm font-heading">
                <span>{localize(locale, "Дни повтора", "Recurring days")}</span>
                <div className="grid grid-cols-7 justify-items-center gap-1.5 sm:gap-2">
                  {TASK_WEEKDAY_VALUES.map((day) => {
                    const isSelected = draft.weekDays.includes(day);

                    return (
                      <button
                        className={`flex size-10 min-w-10 items-center justify-center rounded-full text-[11px] font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.96] sm:size-11 sm:min-w-11 sm:text-xs ${
                          isSelected
                            ? "bg-[color:var(--primary)] text-white shadow-[0_6px_14px_rgba(37,99,235,0.2)]"
                            : "border border-border/70 bg-white text-foreground hover:bg-secondary/50"
                        }`}
                        key={day}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            weekDays: isSelected
                              ? current.weekDays.filter((item) => item !== day)
                              : [...current.weekDays, day].sort((left, right) => left - right),
                          }))
                        }
                        type="button"
                      >
                        {getWeekdayShortLabel(day, locale)}
                      </button>
                    );
                  })}
                </div>
              </label>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,220px)]">
                <label className="grid gap-2 text-sm font-heading">
                  <span>{localize(locale, "Начало", "Start date")}</span>
                  <TaskDatePicker
                    locale={locale}
                    onChange={(value) => setDraft((current) => ({ ...current, startDate: value }))}
                    value={draft.startDate}
                  />
                </label>
                <div className="grid gap-2 text-sm font-heading">
                  <label className="inline-flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-white px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                    <Checkbox
                      checked={draft.hasDueTime}
                      onCheckedChange={(checked) =>
                        setDraft((current) => ({
                          ...current,
                          hasDueTime: checked === true,
                          dueTimeLocal:
                            checked === true
                              ? current.dueTimeLocal || "18:00"
                              : current.dueTimeLocal,
                        }))
                      }
                    />
                    <span>{localize(locale, "Точное время", "Exact time")}</span>
                  </label>
                  <TaskTimePicker
                    isDisabled={!draft.hasDueTime}
                    locale={locale}
                    onChange={(value) => setDraft((current) => ({ ...current, dueTimeLocal: value }))}
                    value={draft.hasDueTime ? draft.dueTimeLocal : ""}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {error ? <div className="error-box">{error}</div> : null}

          <div className="flex justify-end gap-2">
            <Button
              className="rounded-xl font-heading"
              onClick={() => onOpenChange(false)}
              variant="outline"
            >
              {localize(locale, "Отмена", "Cancel")}
            </Button>
            <Button
              className="rounded-xl font-heading"
              disabled={submitting || !canSubmit}
              onClick={() => void handleSubmit()}
            >
              {submitting
                ? localize(locale, "Создаём...", "Creating...")
                : localize(locale, "Создать задачу", "Create task")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
