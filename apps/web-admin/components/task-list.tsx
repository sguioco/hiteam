"use client";

import { useState } from "react";
import type { TaskItem, TaskStatus } from "@smart/types";

export function TaskList({ tasks, locale, locationId, query, onQueryChange, getTitle, onOpen }: {
  tasks: TaskItem[];
  locale: string;
  locationId: string;
  query: string;
  onQueryChange: (value: string) => void;
  getTitle: (task: TaskItem) => string;
  onOpen: (id: string) => void;
}) {
  const [status, setStatus] = useState<TaskStatus | "all" | "overdue">("all");
  const ru = locale === "ru";
  const text = (r: string, en: string) => ru ? r : en;
  const labels: Record<TaskStatus, string> = {
    TODO: text("К выполнению", "To do"), IN_PROGRESS: text("В работе", "In progress"),
    DONE: text("Выполнена", "Done"), CANCELLED: text("Отменена", "Cancelled"),
  };
  const overdue = (task: TaskItem) => Boolean(task.dueAt && new Date(task.dueAt).getTime() < Date.now() && task.status !== "DONE" && task.status !== "CANCELLED");
  const assignee = (task: TaskItem) => task.assigneeEmployee
    ? `${task.assigneeEmployee.firstName} ${task.assigneeEmployee.lastName}`.trim()
    : task.group?.name ?? text("Не назначен", "Unassigned");
  const location = (task: TaskItem) => task.location?.name ?? task.assigneeEmployee?.primaryLocation?.name ?? "—";
  const scoped = tasks.filter(task => !locationId || (task.locationId ?? task.location?.id ?? task.assigneeEmployee?.primaryLocation?.id) === locationId);
  const filtered = scoped.filter(task => {
    const matchesStatus = status === "all" || (status === "overdue" ? overdue(task) : task.status === status);
    const search = query.trim().toLocaleLowerCase();
    return matchesStatus && (!search || [getTitle(task), assignee(task), location(task)].join(" ").toLocaleLowerCase().includes(search));
  }).sort((a, b) => (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity) || a.id.localeCompare(b.id));
  return <section className="grid min-w-0 gap-4">
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid min-w-0 flex-1 gap-1 text-sm">{text("Поиск задачи или исполнителя", "Search task or assignee")}<input className="w-full rounded-xl border border-[color:var(--border)] bg-white p-3" value={query} onChange={event => onQueryChange(event.target.value)} /></label>
      <label className="grid gap-1 text-sm">{text("Статус задачи", "Task status")}<select className="rounded-xl border border-[color:var(--border)] bg-white p-3" value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="all">{text("Все статусы", "All statuses")}</option><option value="overdue">{text("Просрочена", "Overdue")}</option>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      {(query || status !== "all") && <button type="button" className="rounded-xl border p-3 text-sm" onClick={() => { onQueryChange(""); setStatus("all"); }}>{text("Сбросить поиск и статус", "Clear search and status")}</button>}
    </div>
    <p className="text-sm text-[color:var(--muted-foreground)]" aria-live="polite">{text("Задач", "Tasks")}: {filtered.length}</p>
    {filtered.length ? <ul className="grid gap-3">{filtered.map(task => <li key={task.id}>
      <button type="button" onClick={() => onOpen(task.id)} className="grid w-full min-w-0 gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-5 text-left transition hover:bg-[color:var(--panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <span className="grid min-w-0 gap-1"><strong className="break-words">{getTitle(task)}</strong><span className="break-words text-sm text-[color:var(--muted-foreground)]">{assignee(task)} · {location(task)}</span></span>
        <span className="grid gap-1 sm:text-right"><span className={overdue(task) ? "text-red-600" : ""}>{overdue(task) ? `${text("Просрочена", "Overdue")} · ${labels[task.status]}` : labels[task.status]}</span><span className="text-sm text-[color:var(--muted-foreground)]">{task.dueAt ? new Date(task.dueAt).toLocaleString(ru ? "ru-RU" : "en-US") : text("Без срока", "No due date")}</span></span>
      </button>
    </li>)}</ul> : <div className="rounded-2xl border border-dashed p-8 text-center text-[color:var(--muted-foreground)]">{scoped.length ? text("По выбранным фильтрам задач нет. Измените поиск или статус.", "No matching tasks. Change search or status.") : text("В выбранном периоде и локации задач пока нет.", "No tasks in the selected period and location.")}</div>}
  </section>;
}
