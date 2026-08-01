"use client";

import type {
  EmployeeApiRecord,
  ManagerScheduleBootstrapResponse,
  NamedEntityOption,
  ScheduleShiftTemplateRecord,
  WorkGroupItem,
} from "@smart/types";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmployeeDropdown } from "@/components/employee-dropdown";
import { TimePicker } from "@/components/application/time-picker/time-picker";
import { TaskDatePicker } from "@/components/task-schedule-pickers";
import { AnimatedDisclosure } from "@/components/ui/animated-disclosure";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectEmptyItem,
  SelectItem,
  SelectOptionContent,
  SelectOptionDescription,
  SelectOptionText,
  SelectOptionTitle,
  SelectTrigger,
  SelectTriggerLabel,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/api";
import type { AuthSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

type HeaderShiftCreateDialogProps = {
  onCreated?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  session: AuthSession | null;
};

type HeaderShiftDraft = {
  employeeIds: string[];
  fixedBreakDurationMinutes: string;
  fixedBreakEnabled: boolean;
  fixedBreakStartsAtLocal: string;
  shiftDate: string;
  templateId: string;
};

type HeaderTemplateDraft = {
  endsAtLocal: string;
  fixedBreakDurationMinutes: string;
  fixedBreakEnabled: boolean;
  fixedBreakStartsAtLocal: string;
  name: string;
  startsAtLocal: string;
  weekDays: number[];
};

const initialTemplateDraft: HeaderTemplateDraft = {
  name: "",
  startsAtLocal: "09:00",
  endsAtLocal: "18:00",
  weekDays: [1, 2, 3, 4, 5],
  fixedBreakEnabled: false,
  fixedBreakStartsAtLocal: "13:00",
  fixedBreakDurationMinutes: "30",
};

function localize(locale: "ru" | "en", ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

function getInitialDraft(): HeaderShiftDraft {
  return {
    employeeIds: [],
    fixedBreakDurationMinutes: "30",
    fixedBreakEnabled: false,
    fixedBreakStartsAtLocal: "13:00",
    shiftDate: formatDateInput(new Date()),
    templateId: "",
  };
}

function hasValidFixedBreak(enabled: boolean, duration: string) {
  if (!enabled) {
    return true;
  }

  const parsed = Number(duration);
  return Number.isFinite(parsed) && parsed > 0;
}

function buildTemplateCode(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .toUpperCase()
    .slice(0, 24);

  return normalized || "SHIFT";
}

function parseTemplateWeekDays(weekDaysJson?: string | null) {
  if (!weekDaysJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(weekDaysJson) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    const days = parsed
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 1 && item <= 7);

    return days.length ? days : null;
  } catch {
    return null;
  }
}

function formatTemplateWeekDaysSummary(
  weekDaysJson: string | null | undefined,
  labels: string[],
  locale: "ru" | "en",
) {
  const weekDays = parseTemplateWeekDays(weekDaysJson);

  if (!weekDays) {
    return localize(locale, "Каждый день", "Every day");
  }

  return weekDays.map((day) => labels[day - 1]).filter(Boolean).join(", ");
}

export function HeaderShiftCreateDialog({
  onCreated,
  onOpenChange,
  open,
  session,
}: HeaderShiftCreateDialogProps) {
  const { locale } = useI18n();
  const [draft, setDraft] = useState<HeaderShiftDraft>(() => getInitialDraft());
  const [employees, setEmployees] = useState<EmployeeApiRecord[]>([]);
  const [groups, setGroups] = useState<WorkGroupItem[]>([]);
  const [locations, setLocations] = useState<NamedEntityOption[]>([]);
  const [positions, setPositions] = useState<NamedEntityOption[]>([]);
  const [templates, setTemplates] = useState<ScheduleShiftTemplateRecord[]>([]);
  const [templateDraft, setTemplateDraft] =
    useState<HeaderTemplateDraft>(initialTemplateDraft);
  const [templateLocationId, setTemplateLocationId] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [templateSubmitting, setTemplateSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const employeeGroupByEmployeeId = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    groups.forEach((group) => {
      group.memberships.forEach((membership) => {
        if (!map.has(membership.employeeId)) {
          map.set(membership.employeeId, {
            id: group.id,
            name: group.name,
          });
        }
      });
    });

    return map;
  }, [groups]);

  const employeeOptions = useMemo(() => {
    return employees
      .map((employee) => ({
        ...employee,
        displayName:
          buildEmployeeName(employee) ||
          employee.user?.email ||
          employee.email ||
          employee.id,
        group: employeeGroupByEmployeeId.get(employee.id) ?? null,
      }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName, locale));
  }, [employeeGroupByEmployeeId, employees, locale]);

  const selectedTemplate = templates.find((template) => template.id === draft.templateId);
  const dayHeaders =
    locale === "ru"
      ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(getInitialDraft());
    setError(null);

    if (!session?.accessToken) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    const today = formatDateInput(new Date());
    const query = new URLSearchParams({
      dateFrom: today,
      dateTo: today,
    }).toString();

    void apiRequest<ManagerScheduleBootstrapResponse>(
      `/bootstrap/schedule?${query}`,
      {
        token: session.accessToken,
        skipClientCache: true,
      },
    )
      .then((snapshot) => {
        if (cancelled) {
          return;
        }

        if (!snapshot.initialData) {
          throw new Error(
            localize(
              locale,
              "Не удалось загрузить данные расписания.",
              "Unable to load schedule data.",
            ),
          );
        }

        setEmployees(
          snapshot.initialData.employees.filter(
            (employee) => !["DISMISSED", "dismissed"].includes(employee.status ?? ""),
          ),
        );
        setGroups(snapshot.initialData.groups);
        setLocations(snapshot.initialData.locations);
        setTemplateLocationId((current) =>
          snapshot.initialData!.locations.some(({ id }) => id === current)
            ? current
            : snapshot.initialData!.locations[0]?.id ?? "",
        );
        setPositions(snapshot.initialData.positions);
        setTemplates(snapshot.initialData.templates);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : localize(
                  locale,
                  "Не удалось загрузить сотрудников или шаблоны смен.",
                  "Unable to load employees or shift templates.",
                ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locale, open, session?.accessToken]);

  function toggleTemplateWeekDay(day: number) {
    setTemplateDraft((current) => ({
      ...current,
      weekDays: current.weekDays.includes(day)
        ? current.weekDays.filter((value) => value !== day)
        : [...current.weekDays, day].sort((left, right) => left - right),
    }));
  }

  function openTemplatesDialog() {
    setError(null);
    setTemplateError(null);
    onOpenChange(false);
    setTemplatesOpen(true);
  }

  function returnToCreateShift() {
    setTemplatesOpen(false);
    setTemplateError(null);
    onOpenChange(true);
  }

  async function reloadTemplates() {
    if (!session?.accessToken) {
      return;
    }

    const nextTemplates = await apiRequest<ScheduleShiftTemplateRecord[]>(
      "/schedule/templates",
      {
        token: session.accessToken,
        skipClientCache: true,
      },
    );
    setTemplates(nextTemplates);
  }

  async function handleCreateTemplate() {
    if (!session?.accessToken) {
      return;
    }

    if (
      !templateDraft.name.trim() ||
      !templateDraft.startsAtLocal ||
      !templateDraft.endsAtLocal ||
      !templateLocationId ||
      templateDraft.weekDays.length === 0
    ) {
      setTemplateError(
        localize(
          locale,
          "Укажите название, время смены и рабочие дни.",
          "Fill in the name, shift time, and workdays.",
        ),
      );
      return;
    }

    if (
      !hasValidFixedBreak(
        templateDraft.fixedBreakEnabled,
        templateDraft.fixedBreakDurationMinutes,
      )
    ) {
      setTemplateError(
        localize(
          locale,
          "Укажите длительность фиксированного перерыва.",
          "Enter fixed break duration.",
        ),
      );
      return;
    }

    const location = locations.find(({ id }) => id === templateLocationId);
    const position = positions[0];

    if (!location || !position) {
      setTemplateError(
        localize(
          locale,
          "Сначала добавьте локацию и должность в настройках компании.",
          "Add a location and position in company settings first.",
        ),
      );
      return;
    }

    setTemplateSubmitting(true);
    setTemplateError(null);

    try {
      await apiRequest("/schedule/templates", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          name: templateDraft.name.trim(),
          code: buildTemplateCode(templateDraft.name),
          locationId: location.id,
          positionId: position.id,
          startsAtLocal: templateDraft.startsAtLocal,
          endsAtLocal: templateDraft.endsAtLocal,
          weekDays: templateDraft.weekDays,
          gracePeriodMinutes: 10,
          fixedBreakStartsAtLocal: templateDraft.fixedBreakEnabled
            ? templateDraft.fixedBreakStartsAtLocal
            : undefined,
          fixedBreakDurationMinutes: templateDraft.fixedBreakEnabled
            ? Number(templateDraft.fixedBreakDurationMinutes)
            : 0,
          fixedBreakIsPaid: false,
        }),
      });

      setTemplateDraft(initialTemplateDraft);
      await reloadTemplates();
    } catch (requestError) {
      setTemplateError(
        requestError instanceof Error
          ? requestError.message
          : localize(
              locale,
              "Не удалось создать шаблон смены.",
              "Failed to create shift template.",
            ),
      );
    } finally {
      setTemplateSubmitting(false);
    }
  }

  function getTemplateFixedBreakDefaults(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    const duration = template?.fixedBreakDurationMinutes ?? 0;

    return {
      fixedBreakEnabled: duration > 0,
      fixedBreakStartsAtLocal: template?.fixedBreakStartsAtLocal ?? "13:00",
      fixedBreakDurationMinutes: String(duration || 30),
    };
  }

  function buildShiftPayload(employeeId: string) {
    const fixedBreakDuration = Number(draft.fixedBreakDurationMinutes);

    return {
      employeeId,
      templateId: draft.templateId,
      shiftDate: draft.shiftDate,
      fixedBreakStartsAtLocal: draft.fixedBreakEnabled
        ? draft.fixedBreakStartsAtLocal
        : undefined,
      fixedBreakDurationMinutes: draft.fixedBreakEnabled
        ? fixedBreakDuration
        : 0,
      fixedBreakIsPaid: false,
    };
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }

    const selectedEmployeeIds = Array.from(new Set(draft.employeeIds.filter(Boolean)));

    if (selectedEmployeeIds.length === 0 || !draft.templateId || !draft.shiftDate) {
      setError(
        localize(
          locale,
          "Выберите сотрудника, шаблон и дату.",
          "Select an employee, template, and date.",
        ),
      );
      return;
    }

    if (!hasValidFixedBreak(draft.fixedBreakEnabled, draft.fixedBreakDurationMinutes)) {
      setError(
        localize(
          locale,
          "Укажите длительность фиксированного перерыва.",
          "Enter fixed break duration.",
        ),
      );
      return;
    }

    const shiftDate = new Date(`${draft.shiftDate}T00:00:00`);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (Number.isNaN(shiftDate.getTime()) || shiftDate < todayStart) {
      setError(
        localize(
          locale,
          "Нельзя создать смену на прошедшую дату.",
          "You cannot create a shift in the past.",
        ),
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await Promise.all(
        selectedEmployeeIds.map((employeeId) =>
          apiRequest("/schedule/shifts", {
            method: "POST",
            token: session.accessToken,
            body: JSON.stringify(buildShiftPayload(employeeId)),
          }),
        ),
      );

      onOpenChange(false);
      onCreated?.();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : localize(locale, "Не удалось создать смену.", "Failed to create shift."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="max-w-xl overflow-visible rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {localize(locale, "Создать смену", "Create shift")}
            </DialogTitle>
            <DialogDescription>
              {localize(
                locale,
                "Назначьте одного или нескольких сотрудников на дату через шаблон.",
                "Assign one or more employees to a date using a template.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {localize(locale, "Сотрудник", "Employee")}
              </label>
              <EmployeeDropdown
                allEmployeesLabel={localize(locale, "Все сотрудники", "All employees")}
                employeeLabel={localize(locale, "Сотрудник", "Employee")}
                employees={employeeOptions}
                groupBy="group"
                groupFallbackLabel={localize(locale, "Без группы", "Without group")}
                isLoading={loading}
                loadingLabel={localize(locale, "Загружаем", "Loading")}
                mode="multiple"
                noEmployeesLabel={localize(locale, "Нет доступных сотрудников", "No eligible employees")}
                onSelectedEmployeeIdsChange={(employeeIds) =>
                  setDraft((current) => ({ ...current, employeeIds }))
                }
                placeholder={localize(locale, "Выберите сотрудника", "Select employee")}
                portal={false}
                searchPlaceholder={localize(locale, "Поиск", "Search")}
                selectedEmployeeIds={draft.employeeIds}
                selectedEmployeesLabel={(count) =>
                  localize(
                    locale,
                    `${count} сотрудников выбрано`,
                    `${count} employees selected`,
                  )
                }
                showAllEmployeesOption
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {localize(locale, "Шаблон смены", "Shift template")}
              </label>
              <Select
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    templateId: value,
                    ...getTemplateFixedBreakDefaults(value),
                  }))
                }
                value={draft.templateId}
              >
                <SelectTrigger disabled={loading || templates.length === 0}>
                  <SelectTriggerLabel
                    className={selectedTemplate?.name ? undefined : "text-muted-foreground"}
                  >
                    {selectedTemplate?.name ??
                      (loading
                        ? localize(locale, "Загружаем шаблоны...", "Loading templates...")
                        : templates.length > 0
                          ? localize(locale, "Выберите шаблон", "Select template")
                          : localize(locale, "Шаблонов пока нет", "No templates yet"))}
                  </SelectTriggerLabel>
                </SelectTrigger>
                <SelectContent>
                  {templates.length > 0 ? (
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <SelectOptionContent>
                          <SelectOptionText>
                            <SelectOptionTitle>{template.name}</SelectOptionTitle>
                            <SelectOptionDescription>
                              {template.startsAtLocal}-{template.endsAtLocal} ·{" "}
                              {template.location.name}
                            </SelectOptionDescription>
                          </SelectOptionText>
                        </SelectOptionContent>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectEmptyItem>
                      {localize(locale, "Шаблонов пока нет", "No templates yet")}
                    </SelectEmptyItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {localize(locale, "Дата", "Date")}
              </label>
              <TaskDatePicker
                locale={locale}
                minToday
                onChange={(value) =>
                  setDraft((current) => ({ ...current, shiftDate: value }))
                }
                value={draft.shiftDate}
              />
            </div>

            <div className="space-y-3">
              <label className="flex min-h-10 items-center gap-3 text-sm font-semibold text-foreground">
                <input
                  checked={draft.fixedBreakEnabled}
                  className="h-4 w-4 rounded border accent-primary"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      fixedBreakEnabled: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                {localize(locale, "Фиксированный перерыв", "Fixed break")}
              </label>

              <AnimatedDisclosure show={draft.fixedBreakEnabled}>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="w-36 max-w-full space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {localize(locale, "Начало перерыва", "Break start")}
                    </span>
                    <TimePicker
                      buttonClassName="h-11 rounded-[14px]"
                      doneLabel={localize(locale, "Готово", "Done")}
                      onChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          fixedBreakStartsAtLocal: value,
                        }))
                      }
                      value={draft.fixedBreakStartsAtLocal}
                    />
                  </label>
                  <label className="w-28 max-w-full space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {localize(locale, "Длительность, мин", "Duration, min")}
                    </span>
                    <Input
                      className="h-11 rounded-[14px]"
                      min={1}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          fixedBreakDurationMinutes: event.target.value,
                        }))
                      }
                      type="number"
                      value={draft.fixedBreakDurationMinutes}
                    />
                  </label>
                </div>
              </AnimatedDisclosure>
            </div>

            {error ? <div className="error-box">{error}</div> : null}

            <div className="schedule-shift-dialog-actions">
              <Button onClick={openTemplatesDialog} type="button" variant="outline">
                {localize(locale, "Шаблоны", "Templates")}
              </Button>
              <Button
                disabled={submitting || loading || templates.length === 0}
                onClick={() => void handleSubmit()}
                type="button"
              >
                {submitting
                  ? localize(locale, "Создаём...", "Creating...")
                  : localize(locale, "Создать смену", "Create shift")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setTemplatesOpen} open={templatesOpen}>
        <DialogContent className="max-w-3xl rounded-[28px]">
          <DialogHeader>
            <div className="flex items-start gap-2">
              <button
                aria-label={localize(locale, "Назад к созданию смены", "Back to create shift")}
                className="-ml-2 flex size-10 shrink-0 items-center justify-center text-muted-foreground transition-[color,transform] duration-150 hover:text-foreground active:scale-[0.96]"
                onClick={returnToCreateShift}
                type="button"
              >
                <ChevronLeft className="size-5" />
              </button>
              <div>
                <DialogTitle className="font-heading text-2xl">
                  {localize(locale, "Шаблоны смен", "Shift templates")}
                </DialogTitle>
                <DialogDescription>
                  {localize(
                    locale,
                    "Активные шаблоны и форма создания нового.",
                    "Active templates and a form to create a new one.",
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              {templates.length > 0 ? (
                templates.map((template, index) => (
                  <div key={template.id}>
                    {index > 0 ? <Separator className="bg-border/70" /> : null}
                    <article className="py-4">
                      <h2 className="font-heading text-lg font-bold text-foreground">
                        {template.name}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {template.startsAtLocal}-{template.endsAtLocal}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatTemplateWeekDaysSummary(
                          template.weekDaysJson,
                          dayHeaders,
                          locale,
                        )}
                      </p>
                      {(template.fixedBreakDurationMinutes ?? 0) > 0 ? (
                        <p className="mt-1 text-xs font-medium text-[color:var(--accent-strong)]">
                          {localize(locale, "Фиксированный перерыв", "Fixed break")}:{" "}
                          {template.fixedBreakStartsAtLocal} ·{" "}
                          {template.fixedBreakDurationMinutes}{" "}
                          {localize(locale, "мин", "min")}
                        </p>
                      ) : null}
                    </article>
                  </div>
                ))
              ) : (
                <div className="flex min-h-[132px] items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/30 px-4 text-center text-sm font-medium text-muted-foreground">
                  {localize(locale, "Шаблонов смен пока нет.", "No shift templates yet.")}
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-2xl border border-border bg-white p-5">
              <h2 className="font-heading text-lg font-bold text-foreground">
                {localize(locale, "Новый шаблон", "New template")}
              </h2>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-foreground">
                  {localize(locale, "Локация", "Location")}
                </label>
                <Select
                  onValueChange={setTemplateLocationId}
                  value={templateLocationId}
                >
                  <SelectTrigger disabled={!locations.length}>
                    <SelectTriggerLabel
                      className={
                        templateLocationId
                          ? undefined
                          : "text-muted-foreground"
                      }
                    >
                      {locations.find(({ id }) => id === templateLocationId)
                        ?.name ??
                        localize(
                          locale,
                          "Выберите локацию",
                          "Select location",
                        )}
                    </SelectTriggerLabel>
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                className="h-12 rounded-2xl border-[color:var(--accent)]/15 bg-[color:var(--soft-accent)]/35 px-4 font-heading text-lg placeholder:font-heading placeholder:text-muted-foreground/65 focus-visible:ring-[color:var(--accent)]/20"
                onChange={(event) =>
                  setTemplateDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder={localize(locale, "Название шаблона", "Template name")}
                value={templateDraft.name}
              />

              <div className="grid grid-cols-2 gap-2.5">
                <TimePicker
                  buttonClassName="h-11 rounded-[14px] px-2 text-center font-medium tabular-nums"
                  doneLabel={localize(locale, "Готово", "Done")}
                  onChange={(value) =>
                    setTemplateDraft((current) => ({
                      ...current,
                      startsAtLocal: value,
                    }))
                  }
                  value={templateDraft.startsAtLocal}
                />
                <TimePicker
                  buttonClassName="h-11 rounded-[14px] px-2 text-center font-medium tabular-nums"
                  doneLabel={localize(locale, "Готово", "Done")}
                  onChange={(value) =>
                    setTemplateDraft((current) => ({
                      ...current,
                      endsAtLocal: value,
                    }))
                  }
                  value={templateDraft.endsAtLocal}
                />
              </div>

              <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4">
                <label className="flex items-center gap-3 text-sm font-semibold text-foreground">
                  <input
                    checked={templateDraft.fixedBreakEnabled}
                    className="h-4 w-4 rounded border accent-primary"
                    onChange={(event) =>
                      setTemplateDraft((current) => ({
                        ...current,
                        fixedBreakEnabled: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  {localize(locale, "Фиксированный перерыв", "Fixed break")}
                </label>

                <AnimatedDisclosure show={templateDraft.fixedBreakEnabled}>
                  <div className="mt-4 grid gap-3">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {localize(locale, "Начало перерыва", "Break start")}
                      </span>
                      <TimePicker
                        buttonClassName="h-11 rounded-[14px] px-2 text-center font-medium tabular-nums"
                        doneLabel={localize(locale, "Готово", "Done")}
                        onChange={(value) =>
                          setTemplateDraft((current) => ({
                            ...current,
                            fixedBreakStartsAtLocal: value,
                          }))
                        }
                        value={templateDraft.fixedBreakStartsAtLocal}
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {localize(locale, "Длительность, мин", "Duration, min")}
                      </span>
                      <Input
                        min={1}
                        onChange={(event) =>
                          setTemplateDraft((current) => ({
                            ...current,
                            fixedBreakDurationMinutes: event.target.value,
                          }))
                        }
                        type="number"
                        value={templateDraft.fixedBreakDurationMinutes}
                      />
                    </label>
                  </div>
                </AnimatedDisclosure>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {localize(locale, "Рабочие дни", "Workdays")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {localize(
                      locale,
                      "Выберите дни недели для этого шаблона.",
                      "Choose which weekdays this template should create shifts for.",
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {dayHeaders.map((label, index) => {
                    const day = index + 1;
                    const active = templateDraft.weekDays.includes(day);

                    return (
                      <button
                        className={`mx-auto flex size-8 min-w-0 items-center justify-center rounded-full border p-0 text-center text-[8px] font-semibold leading-none tracking-[-0.04em] transition-colors ${
                          active
                            ? "border-[color:var(--accent)] bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]"
                            : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                        }`}
                        key={label}
                        onClick={() => toggleTemplateWeekDay(day)}
                        type="button"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {templateError ? <div className="error-box">{templateError}</div> : null}

              <Button
                disabled={templateSubmitting}
                onClick={() => void handleCreateTemplate()}
                type="button"
              >
                {templateSubmitting
                  ? localize(locale, "Создаём...", "Creating...")
                  : localize(locale, "Создать шаблон", "Create template")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
