"use client";

import { Calendar as CalendarIcon, Clock } from "@untitledui/icons";
import { getLocalTimeZone, today } from "@internationalized/date";
import { cn } from "@/lib/utils";

type Locale = "ru" | "en";

type TaskDatePickerProps = {
  buttonClassName?: string;
  isDisabled?: boolean;
  locale: Locale;
  minToday?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

type TaskTimePickerProps = {
  buttonClassName?: string;
  isDisabled?: boolean;
  locale: Locale;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

type TaskDateTimePickerProps = {
  className?: string;
  isDisabled?: boolean;
  locale: Locale;
  minToday?: boolean;
  onChange: (value: string) => void;
  value: string;
};

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function splitDateTimeInput(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);

  return {
    date: match?.[1] ?? "",
    time: match?.[2] ?? "",
  };
}

function buildDateTimeInput(
  currentValue: string,
  nextValue: Partial<{ date: string; time: string }>,
) {
  const current = splitDateTimeInput(currentValue);
  const date = nextValue.date ?? current.date;
  const time = nextValue.time ?? current.time;

  if (!date && !time) return "";

  return `${date || formatDateInput(new Date())}T${time || "18:00"}`;
}

function formatTimeInput(value: Date) {
  return `${`${value.getHours()}`.padStart(2, "0")}:${`${value.getMinutes()}`.padStart(2, "0")}`;
}

function getNextSelectableDateTimeInput() {
  const next = new Date();
  next.setMinutes(next.getMinutes() + 1, 0, 0);
  return `${formatDateInput(next)}T${formatTimeInput(next)}`;
}

function normalizeFutureDateTimeInput(value: string, minToday: boolean) {
  if (!minToday || !value) {
    return value;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime()) || parsed.getTime() >= Date.now()) {
    return value;
  }

  return getNextSelectableDateTimeInput();
}

function getPickerCopy(locale: Locale) {
  return {
    apply: locale === "ru" ? "Готово" : "Apply",
    cancel: locale === "ru" ? "Отмена" : "Cancel",
    datePlaceholder: locale === "ru" ? "Выбери дату" : "Choose date",
    timePlaceholder: locale === "ru" ? "Выбери время" : "Choose time",
    today: locale === "ru" ? "Сегодня" : "Today",
  };
}

function getIntlLocale(locale: Locale) {
  return locale === "ru" ? "ru-RU" : "en-US";
}

function formatDatePickerLabel(value: string, locale: Locale) {
  if (!value) return "";

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(getIntlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TaskDatePicker({
  buttonClassName,
  isDisabled = false,
  locale,
  minToday = false,
  onChange,
  placeholder,
  value,
}: TaskDatePickerProps) {
  const copy = getPickerCopy(locale);
  const displayValue = formatDatePickerLabel(value, locale);

  return (
    <div
      className={cn(
        "relative flex h-11 min-w-0 w-full items-center gap-2 overflow-hidden rounded-[14px] border border-[rgba(15,23,42,0.12)] bg-white px-3 text-sm font-medium text-[color:var(--foreground)] shadow-none ring-0 transition-colors hover:bg-white",
        isDisabled && "cursor-not-allowed opacity-50",
        buttonClassName,
      )}
    >
      <CalendarIcon className="pointer-events-none size-5 shrink-0 text-fg-quaternary" />
      <span
        className={cn(
          "pointer-events-none min-w-0 truncate tabular-nums",
          !displayValue && "text-[rgba(15,23,42,0.58)]",
        )}
      >
        {displayValue || placeholder || copy.datePlaceholder}
      </span>
      <input
        aria-label={placeholder ?? copy.datePlaceholder}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        disabled={isDisabled}
        min={minToday ? today(getLocalTimeZone()).toString() : undefined}
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </div>
  );
}

export function TaskTimePicker({
  buttonClassName,
  isDisabled = false,
  locale,
  onChange,
  placeholder,
  value,
}: TaskTimePickerProps) {
  const copy = getPickerCopy(locale);
  const displayValue = value || placeholder || copy.timePlaceholder;

  return (
    <div
      className={cn(
        "relative flex h-11 min-w-0 w-full items-center gap-2 overflow-hidden rounded-[14px] border border-[rgba(15,23,42,0.12)] bg-white px-3 text-sm font-medium text-[color:var(--foreground)] shadow-none ring-0 transition-colors hover:bg-white",
        isDisabled && "cursor-not-allowed opacity-50",
        buttonClassName,
      )}
    >
      <Clock className="pointer-events-none size-5 shrink-0 text-fg-quaternary" />
      <span
        className={cn(
          "pointer-events-none min-w-0 truncate tabular-nums",
          !value && "text-[rgba(15,23,42,0.58)]",
        )}
      >
        {displayValue}
      </span>
      <input
        aria-label={placeholder ?? copy.timePlaceholder}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        disabled={isDisabled}
        onChange={(event) => onChange(event.target.value)}
        step={60}
        type="time"
        value={value}
      />
    </div>
  );
}

export function TaskDateTimePicker({
  className,
  isDisabled = false,
  locale,
  minToday = false,
  onChange,
  value,
}: TaskDateTimePickerProps) {
  const parts = splitDateTimeInput(value);

  return (
    <div className={cn("grid min-w-0 gap-2 min-[420px]:grid-cols-2", className)}>
      <TaskDatePicker
        isDisabled={isDisabled}
        locale={locale}
        minToday={minToday}
        onChange={(date) =>
          onChange(
            date
              ? normalizeFutureDateTimeInput(
                  buildDateTimeInput(value, { date }),
                  minToday,
                )
              : "",
          )
        }
        value={parts.date}
      />
      <TaskTimePicker
        isDisabled={isDisabled}
        locale={locale}
        onChange={(time) =>
          onChange(
            normalizeFutureDateTimeInput(
              buildDateTimeInput(value, { time }),
              minToday,
            ),
          )
        }
        value={parts.time}
      />
    </div>
  );
}
