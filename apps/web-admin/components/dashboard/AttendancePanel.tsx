"use client";

import { useState } from "react";
import { ArrowRight, Clock } from "lucide-react";

type FilterType = "all" | "present" | "absent" | "late" | "done" | "unmarked";

const filters: { key: FilterType; label: string; count: number }[] = [
  { key: "all", label: "Все", count: 48 },
  { key: "present", label: "Пришли", count: 32 },
  { key: "absent", label: "Отсутствуют", count: 5 },
  { key: "late", label: "Опоздание", count: 4 },
  { key: "done", label: "Завершили", count: 3 },
  { key: "unmarked", label: "Без отметки", count: 4 },
];

const employees = [
  { name: "Иванов А.С.", schedule: "09:00–18:00", arrival: "09:00", departure: "—", status: "present" as const },
  { name: "Петрова М.В.", schedule: "09:00–18:00", arrival: "09:23", departure: "—", status: "late" as const },
  { name: "Козлов Д.И.", schedule: "09:00–18:00", arrival: "—", departure: "—", status: "absent" as const },
  { name: "Сидоров К.Л.", schedule: "09:00–18:00", arrival: "09:45", departure: "—", status: "late" as const },
  { name: "Андреева Е.П.", schedule: "10:00–19:00", arrival: "09:55", departure: "—", status: "present" as const },
  { name: "Морозов И.В.", schedule: "09:00–18:00", arrival: "08:50", departure: "17:45", status: "done" as const },
  { name: "Волкова О.А.", schedule: "09:00–18:00", arrival: "09:02", departure: "—", status: "present" as const },
  { name: "Никитин П.Р.", schedule: "09:00–18:00", arrival: "—", departure: "—", status: "unmarked" as const },
  { name: "Григорьев В.Н.", schedule: "09:00–18:00", arrival: "08:55", departure: "—", status: "present" as const },
  { name: "Кузнецова Л.А.", schedule: "09:00–18:00", arrival: "—", departure: "—", status: "absent" as const },
  { name: "Белов С.М.", schedule: "10:00–19:00", arrival: "10:05", departure: "—", status: "present" as const },
  { name: "Тарасова Н.К.", schedule: "09:00–18:00", arrival: "09:10", departure: "—", status: "present" as const },
  { name: "Федоров А.Г.", schedule: "09:00–18:00", arrival: "09:30", departure: "—", status: "late" as const },
  { name: "Соколова Д.В.", schedule: "09:00–18:00", arrival: "08:45", departure: "17:30", status: "done" as const },
  { name: "Лебедев Р.О.", schedule: "09:00–18:00", arrival: "—", departure: "—", status: "unmarked" as const },
  { name: "Романова А.И.", schedule: "09:00–18:00", arrival: "08:58", departure: "—", status: "present" as const },
  { name: "Захаров М.Д.", schedule: "09:00–18:00", arrival: "09:05", departure: "—", status: "present" as const },
  { name: "Орлова В.С.", schedule: "10:00–19:00", arrival: "10:00", departure: "—", status: "present" as const },
  { name: "Миронов К.А.", schedule: "09:00–18:00", arrival: "—", departure: "—", status: "absent" as const },
  { name: "Павлова Е.Н.", schedule: "09:00–18:00", arrival: "09:12", departure: "—", status: "present" as const },
];

const statusStyles: Record<string, string> = {
  present: "bg-[var(--soft-success)] text-[var(--success)]",
  late: "bg-[var(--soft-warning)] text-[var(--warning)]",
  absent: "bg-[var(--soft-danger)] text-[var(--danger)]",
  done: "bg-[var(--soft-accent)] text-[var(--accent)]",
  unmarked: "bg-[var(--panel-muted)] text-[var(--muted-foreground)]",
};

const statusLabels: Record<string, string> = {
  present: "На месте",
  late: "Опоздал",
  absent: "Отсутствует",
  done: "Ушёл",
  unmarked: "Нет отметки",
};

export const AttendancePanel = () => {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const filtered =
    activeFilter === "all"
      ? employees
      : employees.filter((e) => e.status === activeFilter);

  return (
    <div className="dashboard-card h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <h2 className="font-semibold text-sm">Посещаемость</h2>
          <span
            className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse"
            title="Обновляется в реальном времени"
          />
        </div>
        <a
          href="#"
          className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
        >
          Подробнее <ArrowRight className="w-3 h-3" />
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`filter-chip ${activeFilter === f.key ? "filter-chip-active" : "filter-chip-inactive"}`}
          >
            {f.label} <span className="ml-1 opacity-60">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden rounded-xl border border-[var(--border)] flex flex-col min-h-0">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: "28%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "24%" }} />
          </colgroup>
          <thead>
            <tr className="bg-[var(--panel-muted)]">
              <th className="text-left py-2.5 px-3 font-medium text-[var(--muted-foreground)] text-xs">
                Сотрудник
              </th>
              <th className="text-left py-2.5 px-3 font-medium text-[var(--muted-foreground)] text-xs">
                Расписание
              </th>
              <th className="text-left py-2.5 px-3 font-medium text-[var(--muted-foreground)] text-xs">
                Приход
              </th>
              <th className="text-left py-2.5 px-3 font-medium text-[var(--muted-foreground)] text-xs">
                Уход
              </th>
              <th className="text-left py-2.5 px-3 font-medium text-[var(--muted-foreground)] text-xs">
                Статус
              </th>
            </tr>
          </thead>
        </table>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: "28%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "24%" }} />
            </colgroup>
            <tbody>
              {filtered.map((emp, i) => (
                <tr
                  key={emp.name}
                  className="border-t border-[var(--border)] hover:bg-[var(--panel-muted)] transition-colors animate-fade-in"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="py-2.5 px-3 font-medium">{emp.name}</td>
                  <td className="py-2.5 px-3 text-[var(--muted-foreground)]">
                    {emp.schedule}
                  </td>
                  <td className="py-2.5 px-3">{emp.arrival}</td>
                  <td className="py-2.5 px-3">{emp.departure}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyles[emp.status]}`}
                    >
                      {statusLabels[emp.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
