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
];

const statusStyles: Record<string, string> = {
  present: "bg-success/10 text-success",
  late: "bg-warning/10 text-warning",
  absent: "bg-destructive/10 text-destructive",
  done: "bg-info/10 text-info",
  unmarked: "bg-muted text-muted-foreground",
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

  const filtered = activeFilter === "all"
    ? employees
    : employees.filter((e) => e.status === activeFilter);

  return (
    <div className="dashboard-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-foreground" />
          <h2 className="font-heading font-semibold text-sm text-foreground">Посещаемость</h2>
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" title="Обновляется в реальном времени" />
        </div>
        <a href="#" className="text-xs text-accent hover:underline font-heading flex items-center gap-1">
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
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/50">
              <th className="text-left py-2.5 px-3 font-heading font-medium text-muted-foreground text-xs">Сотрудник</th>
              <th className="text-left py-2.5 px-3 font-heading font-medium text-muted-foreground text-xs">Расписание</th>
              <th className="text-left py-2.5 px-3 font-heading font-medium text-muted-foreground text-xs">Приход</th>
              <th className="text-left py-2.5 px-3 font-heading font-medium text-muted-foreground text-xs">Уход</th>
              <th className="text-left py-2.5 px-3 font-heading font-medium text-muted-foreground text-xs">Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp, i) => (
              <tr
                key={emp.name}
                className="border-t border-border hover:bg-secondary/30 transition-colors animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <td className="py-2.5 px-3 font-heading font-medium text-foreground">{emp.name}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{emp.schedule}</td>
                <td className="py-2.5 px-3 text-foreground font-heading">{emp.arrival}</td>
                <td className="py-2.5 px-3 text-foreground font-heading">{emp.departure}</td>
                <td className="py-2.5 px-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-heading ${statusStyles[emp.status]}`}>
                    {statusLabels[emp.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
