"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  AttendanceAnomalyResponse,
  AttendanceHistoryResponse,
  AttendanceLiveSession,
} from "@smart/types";
import type { EmployeeScheduleShift } from "@/lib/employee-workdays";
import { getMockAvatarDataUrl } from "@/lib/mock-avatar";
import { localizePersonName } from "@/lib/transliteration";
import { useLiveTextMap } from "@/lib/use-live-text-map";

type TodayAttendanceEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  department?: { name: string } | null;
};

type TodayAttendanceShift = EmployeeScheduleShift & {
  startsAt?: string;
  endsAt?: string;
  location?: { name: string } | null;
  template?: {
    startsAtLocal?: string | null;
    endsAtLocal?: string | null;
  } | null;
};

type TodayAttendanceShiftWithEmployee = TodayAttendanceShift & {
  employee: { id: string; firstName?: string; lastName?: string };
};

type TodayAttendancePanelProps = {
  locale: "ru" | "en";
  employees: TodayAttendanceEmployee[];
  history: AttendanceHistoryResponse | null;
  isLoading?: boolean;
  liveSessions: AttendanceLiveSession[];
  anomalies: AttendanceAnomalyResponse | null;
  scheduleShifts: TodayAttendanceShift[];
  selectedDate: string;
  canGoNext: boolean;
  canGoPrevious: boolean;
  onNextDay: () => void;
  onPreviousDay: () => void;
  onToday: () => void;
};

type AttendanceRowTone = "late" | "early" | "neutral";

function formatTime(value: string | Date | null | undefined, locale: "ru" | "en") {
  if (!value) {
    return "—";
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(totalMinutes: number, locale: "ru" | "en") {
  if (totalMinutes < 60) {
    return locale === "ru" ? `${totalMinutes} мин` : `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return locale === "ru" ? `${hours} ч` : `${hours}h`;
  }

  return locale === "ru" ? `${hours} ч ${minutes} мин` : `${hours}h ${minutes}min`;
}

function formatDateKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatSelectedDayLabel(value: string, locale: "ru" | "en") {
  return parseDateKey(value)
    .toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
      day: "numeric",
      month: "short",
    })
    .replace(/\.$/, "");
}

function localize(locale: "ru" | "en", ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

function buildShiftDateTime(shift: TodayAttendanceShift, localTime?: string | null) {
  if (!localTime) {
    return null;
  }

  const parsed = new Date(`${shift.shiftDate.slice(0, 10)}T${localTime}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveShiftStart(shift: TodayAttendanceShift) {
  if (shift.startsAt) {
    const parsed = new Date(shift.startsAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return buildShiftDateTime(shift, shift.template?.startsAtLocal ?? null);
}

function resolveShiftEnd(shift: TodayAttendanceShift) {
  if (shift.endsAt) {
    const parsed = new Date(shift.endsAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return buildShiftDateTime(shift, shift.template?.endsAtLocal ?? null);
}

function resolveShiftLabel(
  shift: TodayAttendanceShift | undefined,
  session: AttendanceLiveSession | undefined,
  locale: "ru" | "en",
) {
  if (shift) {
    const start = resolveShiftStart(shift);
    const end = resolveShiftEnd(shift);
    if (start && end) {
      return `${formatTime(start, locale)}-${formatTime(end, locale)}`;
    }
  }

  return session?.shiftLabel ?? "—";
}

function getArrivalState(options: {
  anomalySummary?: string | null;
  locale: "ru" | "en";
  now: Date;
  session?: AttendanceLiveSession;
  shiftStart: Date | null;
}) {
  const { anomalySummary, locale, now, session, shiftStart } = options;

  if (session && shiftStart) {
    const startedAt = new Date(session.startedAt);
    const diffMinutes = Math.round(
      (startedAt.getTime() - shiftStart.getTime()) / 60_000,
    );

    if (diffMinutes > 0) {
      return {
        note: localize(
          locale,
          `Опоздание на ${formatDuration(diffMinutes, locale)}`,
          `Late by ${formatDuration(diffMinutes, locale)}`,
        ),
        time: formatTime(startedAt, locale),
        tone: "late" as AttendanceRowTone,
      };
    }

    if (diffMinutes < 0) {
      return {
        note: localize(
          locale,
          `Раньше на ${formatDuration(Math.abs(diffMinutes), locale)}`,
          `Early by ${formatDuration(Math.abs(diffMinutes), locale)}`,
        ),
        time: formatTime(startedAt, locale),
        tone: "early" as AttendanceRowTone,
      };
    }

    return {
      note: localize(locale, "Вовремя", "On time"),
      time: formatTime(startedAt, locale),
      tone: "neutral" as AttendanceRowTone,
    };
  }

  if (session) {
    return {
      note:
        session.status === "checked_out" && session.endedAt
          ? localize(
            locale,
            `Завершил смену в ${formatTime(session.endedAt, locale)}`,
            `Checked out at ${formatTime(session.endedAt, locale)}`,
          )
          : localize(locale, "В смене", "On shift"),
      time: formatTime(session.startedAt, locale),
      tone: "neutral" as AttendanceRowTone,
    };
  }

  if (shiftStart) {
    const diffMinutes = Math.round((now.getTime() - shiftStart.getTime()) / 60_000);
    if (diffMinutes > 0) {
      return {
        note: localize(
          locale,
          `Опоздание на ${formatDuration(diffMinutes, locale)}`,
          `Late by ${formatDuration(diffMinutes, locale)}`,
        ),
        time: localize(locale, "Нет отметки", "No check-in"),
        tone: "late" as AttendanceRowTone,
      };
    }

    return {
      note: localize(
        locale,
        `Начало в ${formatTime(shiftStart, locale)}`,
        `Starts at ${formatTime(shiftStart, locale)}`,
      ),
      time: formatTime(shiftStart, locale),
      tone: "neutral" as AttendanceRowTone,
    };
  }

  return {
    note: anomalySummary ?? "No check-in",
    time: "—",
    tone: "neutral" as AttendanceRowTone,
  };
}

function getHistoryArrivalState(
  row: AttendanceHistoryResponse["rows"][number],
  locale: "ru" | "en",
) {
  if (row.lateMinutes > 0) {
    return {
      note: localize(
        locale,
        `Опоздание на ${formatDuration(row.lateMinutes, locale)}`,
        `Late by ${formatDuration(row.lateMinutes, locale)}`,
      ),
      time: formatTime(row.startedAt, locale),
      tone: "late" as AttendanceRowTone,
    };
  }

  if (row.earlyLeaveMinutes > 0) {
    return {
      note: localize(
        locale,
        `Ранний уход на ${formatDuration(row.earlyLeaveMinutes, locale)}`,
        `Left early by ${formatDuration(row.earlyLeaveMinutes, locale)}`,
      ),
      time: formatTime(row.startedAt, locale),
      tone: "early" as AttendanceRowTone,
    };
  }

  return {
    note:
      row.status === "checked_out"
        ? localize(locale, "Смена завершена", "Shift completed")
        : localize(locale, "На месте", "On site"),
    time: formatTime(row.startedAt, locale),
    tone: "neutral" as AttendanceRowTone,
  };
}

export function TodayAttendancePanel({
  locale,
  employees,
  history,
  isLoading = false,
  liveSessions,
  anomalies,
  scheduleShifts,
  selectedDate,
  canGoNext,
  canGoPrevious,
  onNextDay,
  onPreviousDay,
  onToday,
}: TodayAttendancePanelProps) {
  const now = new Date();
  const todayKey = formatDateKey(now);
  const isToday = selectedDate === todayKey;
  const sessionByEmployeeId = new Map(
    isToday ? liveSessions.map((session) => [session.employeeId, session] as const) : [],
  );
  const anomalyByEmployeeId = new Map(
    (anomalies?.items ?? []).map((item) => [item.employeeId, item] as const),
  );
  const historyByEmployeeId = new Map<
    string,
    AttendanceHistoryResponse["rows"][number]
  >();
  for (const row of history?.rows ?? []) {
    const previous = historyByEmployeeId.get(row.employeeId);
    if (
      !previous ||
      new Date(row.startedAt).getTime() < new Date(previous.startedAt).getTime()
    ) {
      historyByEmployeeId.set(row.employeeId, row);
    }
  }

  const todaysShifts = scheduleShifts.filter(
    (shift): shift is TodayAttendanceShiftWithEmployee =>
      shift.shiftDate.slice(0, 10) === selectedDate && Boolean(shift.employee?.id),
  );

  const uniqueShiftMap = new Map<string, TodayAttendanceShiftWithEmployee>();
  todaysShifts.forEach((shift) => {
    if (!uniqueShiftMap.has(shift.employee.id)) {
      uniqueShiftMap.set(shift.employee.id, shift);
    }
  });

  const employeeIds = new Set<string>([
    ...Array.from(uniqueShiftMap.keys()),
    ...Array.from(historyByEmployeeId.keys()),
    ...Array.from(sessionByEmployeeId.keys()),
  ]);

  const rows = Array.from(employeeIds)
    .filter((employeeId) => {
      const shift = uniqueShiftMap.get(employeeId);
      const session = sessionByEmployeeId.get(employeeId);
      const historyRow = historyByEmployeeId.get(employeeId);
      const shiftStart = shift ? resolveShiftStart(shift) : null;

      if (session || historyRow) {
        return true;
      }

      if (!shift) {
        return false;
      }

      if (!isToday) {
        return true;
      }

      if (!shiftStart) {
        return true;
      }

      return shiftStart.getTime() <= now.getTime();
    })
    .map((employeeId) => {
      const shift = uniqueShiftMap.get(employeeId);
      const employee = employees.find((item) => item.id === employeeId);
      const session = sessionByEmployeeId.get(employeeId);
      const historyRow = historyByEmployeeId.get(employeeId);
      const anomaly = anomalyByEmployeeId.get(employeeId);
      const shiftStart = shift ? resolveShiftStart(shift) : null;
      const arrivalState = historyRow
        ? getHistoryArrivalState(historyRow, locale)
        : getArrivalState({
            anomalySummary: anomaly?.summary ?? null,
            locale,
            now,
            session,
            shiftStart,
          });
      const arrivalDeltaMinutes =
        session && shiftStart
          ? Math.round(
              (new Date(session.startedAt).getTime() - shiftStart.getTime()) /
                60_000,
            )
          : !session && shiftStart
            ? Math.max(
                0,
                Math.round((now.getTime() - shiftStart.getTime()) / 60_000),
            )
          : 0;
      const shiftEmployeeName =
        `${shift?.employee.lastName ?? ""} ${shift?.employee.firstName ?? ""}`.trim();
      const fallbackName =
        historyRow?.employeeName ?? session?.employeeName ?? shiftEmployeeName;
      const fullName = employee
        ? `${employee.lastName} ${employee.firstName}`.trim()
        : fallbackName || localize(locale, "Сотрудник", "Employee");
      return {
        id: employeeId,
        avatarUrl:
          employee?.avatarUrl ||
          getMockAvatarDataUrl(
            employee
              ? `${employee.firstName} ${employee.lastName}`.trim()
              : fullName,
          ),
        department:
          employee?.department?.name ??
          historyRow?.department ??
          session?.department ??
          "—",
        note: arrivalState.note,
        shiftLabel:
          historyRow?.shiftLabel ??
          resolveShiftLabel(shift, session, locale) ??
          localize(locale, "Смена не назначена", "No shift assigned"),
        time: arrivalState.time,
        timeTone: arrivalState.tone,
        fullName,
        hasSession: Boolean(session || historyRow),
        arrivalDeltaMinutes,
      };
    })
    .sort(
      (left, right) =>
        Number(left.hasSession) - Number(right.hasSession) ||
        right.arrivalDeltaMinutes - left.arrivalDeltaMinutes ||
        left.fullName.localeCompare(right.fullName, locale === "ru" ? "ru-RU" : "en-US"),
    );

  const presentCount = rows.filter(
    (row) => sessionByEmployeeId.has(row.id) || historyByEmployeeId.has(row.id),
  ).length;
  const expectedCount = rows.length || (isToday ? liveSessions.length : 0);
  const translatableTexts = useMemo(
    () =>
      rows.flatMap((row) => [row.department, row.note, row.shiftLabel].filter(Boolean)),
    [rows],
  );
  const textMap = useLiveTextMap(translatableTexts, locale);
  const localizedRows = rows.map((row) => ({
    ...row,
    department:
      locale === "ru" ? row.department : (textMap[row.department] ?? row.department),
    fullName: locale === "en" ? localizePersonName(row.fullName, locale) : row.fullName,
    note: locale === "ru" ? row.note : (textMap[row.note] ?? row.note),
    shiftLabel:
      locale === "ru" ? row.shiftLabel : (textMap[row.shiftLabel] ?? row.shiftLabel),
  }));

  return (
    <div className="dashboard-card today-attendance-panel">
      <div className="today-attendance-head">
        <div className="today-attendance-date-controls">
          <button
            aria-label={localize(locale, "Предыдущий день", "Previous day")}
            className="today-attendance-nav-button"
            disabled={!canGoPrevious || isLoading}
            onClick={onPreviousDay}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label={localize(locale, "Следующий день", "Next day")}
            className="today-attendance-nav-button"
            disabled={!canGoNext || isLoading}
            onClick={onNextDay}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          className={`today-attendance-today-button${isToday ? " is-active" : ""}`}
          disabled={isLoading}
          onClick={onToday}
          type="button"
        >
          Today
        </button>
        <div className="today-attendance-title-group">
          <h2>{localize(locale, "Attendance", "Attendance")}</h2>
          <span className="today-attendance-date-label">
            {formatSelectedDayLabel(selectedDate, locale)}
          </span>
        </div>
        <span className="today-attendance-head-count">
          {isLoading ? "..." : `${presentCount}/${expectedCount}`}
        </span>
      </div>

      <div className={`today-attendance-body${rows.length === 0 ? " is-empty" : ""}`}>
        <div className="today-attendance-list">
          {localizedRows.length ? (
            localizedRows.map((row) => (
              <article className="today-attendance-row" key={row.id}>
                <div className="today-attendance-avatar">
                  <img alt={row.fullName} src={row.avatarUrl} />
                </div>

                <div className="today-attendance-row-copy">
                  <strong>{row.fullName}</strong>
                  <div className="today-attendance-row-lines">
                    <span>{row.department}</span>
                    <span>{row.shiftLabel}</span>
                  </div>
                </div>

                <div className="today-attendance-row-side">
                  <span
                    className={`today-attendance-row-arrival is-${row.timeTone}`}
                  >
                    {row.time}
                  </span>
                  <span
                    className={`today-attendance-row-note is-${row.timeTone}`}
                  >
                    {row.note}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <div className="today-attendance-empty">
              <div>
                {localize(locale, "На сегодня смен не запланировано", "No scheduled shifts for today")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
