"use client";

import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { TimePicker } from "@/components/application/time-picker/time-picker";
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

function parseDatePickerValue(value: string) {
  if (!value) return null;

  try {
    return parseDate(value);
  } catch {
    return null;
  }
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

  return (
    <DatePicker
      applyLabel={copy.apply}
      buttonClassName={cn(
        "h-11 min-w-0 w-full justify-between overflow-hidden rounded-[14px] px-3 text-sm font-medium tabular-nums",
        buttonClassName,
      )}
      cancelLabel={copy.cancel}
      isDisabled={isDisabled}
      minValue={minToday ? today(getLocalTimeZone()) : undefined}
      onChange={(nextValue) => onChange(nextValue ? nextValue.toString() : "")}
      placeholder={placeholder ?? copy.datePlaceholder}
      todayLabel={copy.today}
      value={parseDatePickerValue(value)}
    />
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

  return (
    <TimePicker
      buttonClassName={cn("h-11 min-w-0 overflow-hidden rounded-[14px] px-3 tabular-nums", buttonClassName)}
      doneLabel={copy.apply}
      isDisabled={isDisabled}
      onChange={onChange}
      placeholder={placeholder ?? copy.timePlaceholder}
      value={value}
    />
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
