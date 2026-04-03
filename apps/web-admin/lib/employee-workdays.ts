"use client";

export type EmployeeScheduleShift = {
  shiftDate: string;
  employee: {
    id: string;
  };
};

export function getDayKeyFromDateTimeInput(value: string) {
  const [dayKey] = value.split("T");
  return /^\d{4}-\d{2}-\d{2}$/.test(dayKey ?? "") ? dayKey : null;
}

export function buildEmployeeWorkdayLookup(shifts: EmployeeScheduleShift[]) {
  const lookup = new Map<string, Set<string>>();

  shifts.forEach((shift) => {
    const dayKey = shift.shiftDate.slice(0, 10);
    if (!shift.employee?.id || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
      return;
    }

    const employeeDays = lookup.get(shift.employee.id) ?? new Set<string>();
    employeeDays.add(dayKey);
    lookup.set(shift.employee.id, employeeDays);
  });

  return lookup;
}

export function getEmployeeWorkdayStatus(
  lookup: Map<string, Set<string>>,
  employeeId: string,
  dueAt: string,
) {
  const dayKey = getDayKeyFromDateTimeInput(dueAt);
  if (!dayKey) return null;

  return {
    dayKey,
    isWorkday: lookup.get(employeeId)?.has(dayKey) ?? false,
  };
}

export function formatWorkdayDateLabel(dayKey: string, locale: "ru" | "en" = "ru") {
  return new Date(`${dayKey}T00:00:00`).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
