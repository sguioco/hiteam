"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, Clock } from "@untitledui/icons";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

type FloatingPickerMetrics = {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
};

const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const WEEK_START_OFFSET = 1;

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
    apply: locale === "ru" ? "Готово" : "Done",
    datePlaceholder: locale === "ru" ? "Выбери дату" : "Choose date",
    monthNext: locale === "ru" ? "Следующий месяц" : "Next month",
    monthPrevious: locale === "ru" ? "Предыдущий месяц" : "Previous month",
    timePlaceholder: locale === "ru" ? "Выбери время" : "Choose time",
    today: locale === "ru" ? "Сегодня" : "Today",
  };
}

function getIntlLocale(locale: Locale) {
  return locale === "ru" ? "ru-RU" : "en-US";
}

function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const parsed = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatDatePickerLabel(value: string, locale: Locale) {
  const parsed = parseDateInput(value);

  if (!parsed) return value;

  return parsed.toLocaleDateString(getIntlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMonthTitle(value: Date, locale: Locale) {
  return value.toLocaleDateString(getIntlLocale(locale), {
    month: "long",
    year: "numeric",
  });
}

function getWeekdayLabels(locale: Locale) {
  const formatter = new Intl.DateTimeFormat(getIntlLocale(locale), {
    weekday: "short",
  });
  const monday = new Date(2024, 0, 1);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return formatter.format(day).replace(".", "");
  });
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getMonthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function isSameDate(first: Date, second: Date) {
  return formatDateInput(first) === formatDateInput(second);
}

function getCalendarDays(month: Date) {
  const monthStart = getMonthStart(month);
  const startOffset = (monthStart.getDay() - WEEK_START_OFFSET + 7) % 7;
  const firstGridDay = new Date(monthStart);
  firstGridDay.setDate(monthStart.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstGridDay);
    day.setDate(firstGridDay.getDate() + index);
    return day;
  });
}

function readTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);

  if (!match) {
    return { hour: "00", minute: "00" };
  }

  const hour = Math.min(Math.max(Number(match[1]), 0), 23);
  const minute = Math.min(Math.max(Number(match[2]), 0), 59);

  return {
    hour: String(hour).padStart(2, "0"),
    minute: String(minute).padStart(2, "0"),
  };
}

function getFloatingPickerMetrics(
  trigger: HTMLElement,
  preferredWidth: number,
  preferredHeight: number,
): FloatingPickerMetrics {
  const rect = trigger.getBoundingClientRect();
  const viewportPadding = 12;
  const gap = 8;
  const width = Math.min(preferredWidth, window.innerWidth - viewportPadding * 2);
  const left = Math.min(
    Math.max(viewportPadding, rect.left),
    window.innerWidth - viewportPadding - width,
  );
  const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
  const spaceAbove = rect.top - gap - viewportPadding;
  const shouldOpenAbove = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
  const availableHeight = shouldOpenAbove ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(188, Math.min(preferredHeight, availableHeight));

  return {
    left,
    maxHeight,
    top: shouldOpenAbove
      ? Math.max(viewportPadding, rect.top - maxHeight - gap)
      : rect.bottom + gap,
    width,
  };
}

function useFloatingPickerMetrics(
  isOpen: boolean,
  rootRef: RefObject<HTMLElement | null>,
  preferredWidth: number,
  preferredHeight: number,
) {
  const [metrics, setMetrics] = useState<FloatingPickerMetrics | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      setMetrics(null);
      return;
    }

    function updateMetrics() {
      const trigger = rootRef.current;

      if (!trigger || typeof window === "undefined") {
        return;
      }

      setMetrics(
        getFloatingPickerMetrics(trigger, preferredWidth, preferredHeight),
      );
    }

    updateMetrics();

    window.addEventListener("resize", updateMetrics);
    window.addEventListener("scroll", updateMetrics, true);

    return () => {
      window.removeEventListener("resize", updateMetrics);
      window.removeEventListener("scroll", updateMetrics, true);
    };
  }, [isOpen, preferredHeight, preferredWidth, rootRef]);

  return metrics;
}

function useOutsideClose(
  isOpen: boolean,
  rootRef: RefObject<HTMLElement | null>,
  popoverRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        (rootRef.current?.contains(target) || popoverRef.current?.contains(target))
      ) {
        return;
      }

      onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isOpen, onClose, popoverRef, rootRef]);
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
  const selectedDate = parseDateInput(value);
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    getMonthStart(selectedDate ?? new Date()),
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const metrics = useFloatingPickerMetrics(isOpen, rootRef, 328, 398);
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);
  const calendarDays = useMemo(() => getCalendarDays(viewMonth), [viewMonth]);
  const displayValue = value ? formatDatePickerLabel(value, locale) : "";
  const minimumDate = minToday ? startOfDay(new Date()) : null;
  const todayDate = startOfDay(new Date());

  useEffect(() => {
    if (isOpen) {
      setViewMonth(getMonthStart(selectedDate ?? new Date()));
    }
  }, [isOpen, selectedDate?.getTime()]);

  useEffect(() => {
    if (isDisabled) {
      setIsOpen(false);
    }
  }, [isDisabled]);

  useOutsideClose(isOpen, rootRef, popoverRef, () => setIsOpen(false));

  const popover =
    isOpen && metrics && typeof document !== "undefined" ? (
      <div
        className="pointer-events-auto fixed z-[1000] overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.1)] bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        ref={popoverRef}
        role="dialog"
        style={{
          left: metrics.left,
          maxHeight: metrics.maxHeight,
          top: metrics.top,
          width: metrics.width,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            aria-label={copy.monthPrevious}
            className="flex size-9 items-center justify-center rounded-full text-[rgba(15,23,42,0.72)] transition-[background-color,transform] duration-150 hover:bg-[rgba(15,23,42,0.06)] active:scale-[0.96]"
            onClick={() => setViewMonth((current) => addMonths(current, -1))}
            type="button"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="text-sm font-semibold capitalize text-[color:var(--foreground)]">
            {formatMonthTitle(viewMonth, locale)}
          </div>
          <button
            aria-label={copy.monthNext}
            className="flex size-9 items-center justify-center rounded-full text-[rgba(15,23,42,0.72)] transition-[background-color,transform] duration-150 hover:bg-[rgba(15,23,42,0.06)] active:scale-[0.96]"
            onClick={() => setViewMonth((current) => addMonths(current, 1))}
            type="button"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-[rgba(15,23,42,0.44)]">
          {weekdayLabels.map((label) => (
            <div className="flex h-7 items-center justify-center" key={label}>
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dateKey = formatDateInput(day);
            const isSelected = selectedDate ? isSameDate(day, selectedDate) : false;
            const isCurrentMonth = day.getMonth() === viewMonth.getMonth();
            const isPast = minimumDate ? startOfDay(day) < minimumDate : false;
            const isToday = isSameDate(day, todayDate);

            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-[background-color,color,transform] duration-150 active:scale-[0.96]",
                  isSelected
                    ? "bg-[color:var(--accent)] text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)]"
                    : "text-[color:var(--foreground)] hover:bg-[rgba(15,23,42,0.06)]",
                  !isCurrentMonth && !isSelected && "text-[rgba(15,23,42,0.3)]",
                  isToday &&
                    !isSelected &&
                    "text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/25",
                  isPast && "cursor-not-allowed opacity-35 hover:bg-transparent",
                )}
                disabled={isPast}
                key={dateKey}
                onClick={() => {
                  onChange(dateKey);
                  setIsOpen(false);
                }}
                type="button"
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <div
      aria-disabled={isDisabled}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-label={placeholder ?? copy.datePlaceholder}
      className={cn(
        "relative flex h-11 min-w-0 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-[14px] border border-[rgba(15,23,42,0.12)] bg-white px-3 text-sm font-medium text-[color:var(--foreground)] shadow-none ring-0 transition-[background-color,border-color,box-shadow] duration-150 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]",
        isOpen && "border-[color:var(--accent)] ring-2 ring-[color:var(--ring)]",
        isDisabled && "cursor-not-allowed opacity-50",
        buttonClassName,
      )}
      onClick={() => {
        if (!isDisabled) setIsOpen((current) => !current);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        if (!isDisabled) setIsOpen((current) => !current);
      }}
      ref={rootRef}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
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
      {popover ? createPortal(popover, document.body) : null}
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
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const hourListRef = useRef<HTMLDivElement | null>(null);
  const minuteListRef = useRef<HTMLDivElement | null>(null);
  const selectedHourRef = useRef<HTMLButtonElement | null>(null);
  const selectedMinuteRef = useRef<HTMLButtonElement | null>(null);
  const didCenterSelectionRef = useRef(false);
  const metrics = useFloatingPickerMetrics(isOpen, rootRef, 206, 322);
  const selectedTime = readTime(value);
  const displayValue = value || placeholder || copy.timePlaceholder;
  const listMaxHeight = metrics ? Math.max(120, metrics.maxHeight - 58) : 120;

  useLayoutEffect(() => {
    if (!isOpen) {
      didCenterSelectionRef.current = false;
      return;
    }

    if (!metrics || didCenterSelectionRef.current) {
      return;
    }

    didCenterSelectionRef.current = true;

    const centerSelection = (
      list: HTMLDivElement | null,
      selectedOption: HTMLButtonElement | null,
    ) => {
      if (!list || !selectedOption) {
        return;
      }

      list.scrollTop = Math.max(
        0,
        selectedOption.offsetTop -
          (list.clientHeight - selectedOption.offsetHeight) / 2,
      );
    };

    centerSelection(hourListRef.current, selectedHourRef.current);
    centerSelection(minuteListRef.current, selectedMinuteRef.current);
  }, [isOpen, metrics]);

  useEffect(() => {
    if (isDisabled) {
      setIsOpen(false);
    }
  }, [isDisabled]);

  useOutsideClose(isOpen, rootRef, popoverRef, () => setIsOpen(false));

  function updateTime(next: Partial<typeof selectedTime>) {
    const hour = next.hour ?? selectedTime.hour;
    const minute = next.minute ?? selectedTime.minute;
    onChange(`${hour}:${minute}`);
  }

  const popover =
    isOpen && metrics && typeof document !== "undefined" ? (
      <div
        className="pointer-events-auto fixed z-[1000] overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        ref={popoverRef}
        role="dialog"
        style={{
          left: metrics.left,
          top: metrics.top,
          width: metrics.width,
        }}
      >
        <div className="grid grid-cols-2 gap-2 p-2">
          <div
            className="overscroll-y-contain overflow-y-auto pr-1"
            ref={hourListRef}
            style={{ maxHeight: listMaxHeight }}
          >
            <div className="grid gap-1">
              {HOURS.map((hour) => {
                const isSelected = hour === selectedTime.hour;

                return (
                  <button
                    aria-label={`Hour ${hour}`}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition-[background-color,color,transform] duration-150 active:scale-[0.96]",
                      isSelected
                        ? "bg-[color:var(--accent)] text-white"
                        : "text-[color:var(--foreground)] hover:bg-[rgba(15,23,42,0.05)]",
                    )}
                    key={hour}
                    onClick={() => updateTime({ hour })}
                    ref={isSelected ? selectedHourRef : undefined}
                    type="button"
                  >
                    {hour}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="overscroll-y-contain overflow-y-auto pl-1"
            ref={minuteListRef}
            style={{ maxHeight: listMaxHeight }}
          >
            <div className="grid gap-1">
              {MINUTES.map((minute) => {
                const isSelected = minute === selectedTime.minute;

                return (
                  <button
                    aria-label={`Minute ${minute}`}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition-[background-color,color,transform] duration-150 active:scale-[0.96]",
                      isSelected
                        ? "bg-[color:var(--accent)] text-white"
                        : "text-[color:var(--foreground)] hover:bg-[rgba(15,23,42,0.05)]",
                    )}
                    key={minute}
                    onClick={() => updateTime({ minute })}
                    ref={isSelected ? selectedMinuteRef : undefined}
                    type="button"
                  >
                    {minute}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="border-t border-[rgba(15,23,42,0.08)] bg-white p-2">
          <button
            className="flex h-10 w-full items-center justify-center rounded-xl bg-[color:var(--accent)] text-sm font-semibold text-white transition-[background-color,transform] duration-150 active:scale-[0.96]"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            {copy.apply}
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div
      aria-disabled={isDisabled}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-label={placeholder ?? copy.timePlaceholder}
      className={cn(
        "relative flex h-11 min-w-0 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-[14px] border border-[rgba(15,23,42,0.12)] bg-white px-3 text-sm font-medium text-[color:var(--foreground)] shadow-none ring-0 transition-[background-color,border-color,box-shadow] duration-150 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]",
        isOpen && "border-[color:var(--accent)] ring-2 ring-[color:var(--ring)]",
        isDisabled && "cursor-not-allowed opacity-50",
        buttonClassName,
      )}
      onClick={() => {
        if (!isDisabled) setIsOpen((current) => !current);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        if (!isDisabled) setIsOpen((current) => !current);
      }}
      ref={rootRef}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
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
      {popover ? createPortal(popover, document.body) : null}
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
