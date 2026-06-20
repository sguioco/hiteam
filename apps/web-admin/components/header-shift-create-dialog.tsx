"use client";

import type { EmployeeApiRecord, ScheduleShiftTemplateRecord } from "@smart/types";
import { CalendarRange } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmployeeDropdown } from "@/components/employee-dropdown";
import { TimePicker } from "@/components/application/time-picker/time-picker";
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

export function HeaderShiftCreateDialog({
  onCreated,
  onOpenChange,
  open,
  session,
}: HeaderShiftCreateDialogProps) {
  const { locale } = useI18n();
  const [draft, setDraft] = useState<HeaderShiftDraft>(() => getInitialDraft());
  const [employees, setEmployees] = useState<EmployeeApiRecord[]>([]);
  const [templates, setTemplates] = useState<ScheduleShiftTemplateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const employeeOptions = useMemo(() => {
    return employees
      .map((employee) => ({
        ...employee,
        displayName:
          buildEmployeeName(employee) ||
          employee.user?.email ||
          employee.email ||
          employee.id,
      }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName, locale));
  }, [employees, locale]);

  const selectedTemplate = templates.find((template) => template.id === draft.templateId);

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

    void Promise.all([
      apiRequest<EmployeeApiRecord[]>("/employees", {
        token: session.accessToken,
        skipClientCache: true,
      }),
      apiRequest<ScheduleShiftTemplateRecord[]>("/schedule/templates", {
        token: session.accessToken,
        skipClientCache: true,
      }),
    ])
      .then(([employeeItems, templateItems]) => {
        if (cancelled) {
          return;
        }

        setEmployees(
          employeeItems.filter(
            (employee) => !["DISMISSED", "dismissed"].includes(employee.status ?? ""),
          ),
        );
        setTemplates(templateItems);
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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-xl overflow-visible rounded-[28px]">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(37,99,235,0.1)] text-[color:var(--accent)]">
            <CalendarRange className="h-5 w-5" />
          </div>
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
              groupFallbackLabel={localize(locale, "Без бригады", "Without group")}
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
            <Input
              min={formatDateInput(new Date())}
              onChange={(event) =>
                setDraft((current) => ({ ...current, shiftDate: event.target.value }))
              }
              type="date"
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

          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              {localize(locale, "Отмена", "Cancel")}
            </Button>
            <Button
              disabled={submitting || loading || templates.length === 0}
              onClick={() => void handleSubmit()}
              type="button"
            >
              {submitting
                ? localize(locale, "Сохраняем...", "Saving...")
                : localize(locale, "Сохранить смену", "Save shift")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
