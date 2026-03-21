"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AppSelectField } from "./select";

type DateOfBirthFieldProps = {
  className?: string;
  triggerClassName?: string;
  value?: string | null;
  onChange: (nextValue: string) => void;
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1).padStart(2, "0");
  return { value, label: value };
});

const YEAR_OPTIONS = Array.from({ length: 95 }, (_, index) => {
  const year = String(new Date().getFullYear() - 14 - index);
  return { value: year, label: year };
});

function parseIsoDate(value?: string | null) {
  const match = (value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return { year: "", month: "", day: "" };
  }

  return {
    year: match[1],
    month: match[2],
    day: match[3],
  };
}

function getDaysInMonth(year: string, month: string) {
  const numericYear = Number(year || "2000");
  const numericMonth = Number(month || "1");
  return new Date(numericYear, numericMonth, 0).getDate();
}

function buildIsoDate(year: string, month: string, day: string) {
  if (!year || !month || !day) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

export function DateOfBirthField({
  className,
  triggerClassName,
  value,
  onChange,
}: DateOfBirthFieldProps) {
  const [parts, setParts] = useState(() => parseIsoDate(value));
  const { year, month, day } = parts;

  useEffect(() => {
    const nextParts = parseIsoDate(value);
    const incomingIsComplete = Boolean(
      nextParts.year && nextParts.month && nextParts.day,
    );
    const incomingIsBlank = !value;
    const localIsComplete = Boolean(year && month && day);

    if (incomingIsComplete || (incomingIsBlank && localIsComplete)) {
      setParts(nextParts);
    }
  }, [day, month, value, year]);

  const dayOptions = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    return Array.from({ length: daysInMonth }, (_, index) => {
      const nextDay = String(index + 1).padStart(2, "0");
      return { value: nextDay, label: nextDay };
    });
  }, [month, year]);

  function updateValue(next: Partial<{ year: string; month: string; day: string }>) {
    const nextYear = next.year ?? year;
    const nextMonth = next.month ?? month;
    const maxDay = getDaysInMonth(nextYear, nextMonth);
    const candidateDay = next.day ?? day;
    const normalizedDay =
      candidateDay && Number(candidateDay) > maxDay
        ? String(maxDay).padStart(2, "0")
        : candidateDay;

    setParts({
      year: nextYear,
      month: nextMonth,
      day: normalizedDay,
    });
    onChange(buildIsoDate(nextYear, nextMonth, normalizedDay));
  }

  return (
    <div className={cn("grid grid-cols-[72px_84px_72px] gap-2", className)}>
      <AppSelectField
        value={day}
        emptyLabel="ДД"
        onValueChange={(nextDay) => updateValue({ day: nextDay })}
        options={dayOptions}
        triggerClassName={triggerClassName}
      />
      <AppSelectField
        value={month}
        emptyLabel="ММ"
        onValueChange={(nextMonth) => updateValue({ month: nextMonth })}
        options={MONTH_OPTIONS}
        triggerClassName={triggerClassName}
      />
      <AppSelectField
        value={year}
        emptyLabel="ГОД"
        onValueChange={(nextYear) => updateValue({ year: nextYear })}
        options={YEAR_OPTIONS}
        triggerClassName={triggerClassName}
      />
    </div>
  );
}
