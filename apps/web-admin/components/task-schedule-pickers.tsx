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
        "h-11 w-full justify-between rounded-[14px] px-4 text-sm font-medium tabular-nums",
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
      buttonClassName={cn("h-11 rounded-[14px] tabular-nums", buttonClassName)}
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
    <div className={cn("grid gap-2 sm:grid-cols-[minmax(0,1fr)_132px]", className)}>
      <TaskDatePicker
        isDisabled={isDisabled}
        locale={locale}
        minToday={minToday}
        onChange={(date) => onChange(date ? buildDateTimeInput(value, { date }) : "")}
        value={parts.date}
      />
      <TaskTimePicker
        isDisabled={isDisabled}
        locale={locale}
        onChange={(time) => onChange(buildDateTimeInput(value, { time }))}
        value={parts.time}
      />
    </div>
  );
}
