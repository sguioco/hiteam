"use client";

import { useState } from "react";
import type { TaskItem, TaskStatus } from "@smart/types";
import { WorkspaceFeedback, WorkspaceFilterBar, WorkspaceStatus } from "@/components/ui/workspace-patterns";

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
    <WorkspaceFilterBar label={text("Фильтры задач", "Task filters")}>
      <label className="grid min-w-[180px] flex-1 gap-1 text-sm">{text("Поиск задачи или исполнителя", "Search task or assignee")}<input className="w-full rounded-xl border border-[color:var(--border)] bg-white p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600" value={query} onChange={event => onQueryChange(event.target.value)} /></label>
      <label className="grid gap-1 text-sm">{text("Статус задачи", "Task status")}<select className="rounded-xl border border-[color:var(--border)] bg-white p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600" value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="all">{text("Все статусы", "All statuses")}</option><option value="overdue">{text("Просрочена", "Overdue")}</option>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      {(query || status !== "all") && <button type="button" className="rounded-xl border border-border bg-white p-3 text-sm transition hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600" onClick={() => { onQueryChange(""); setStatus("all"); }}>{text("Сбросить поиск и статус", "Clear search and status")}</button>}
    </WorkspaceFilterBar>
    <p className="text-sm text-[color:var(--muted-foreground)]" aria-live="polite">{text("Задач", "Tasks")}: {filtered.length}</p>
    {filtered.length ? <ul className="grid gap-3">{filtered.map(task => <li key={task.id}>
      <button type="button" onClick={() => onOpen(task.id)} className="grid w-full min-w-0 gap-3 rounded-2xl border border-border bg-white p-5 text-left shadow-[0_14px_38px_rgba(15,23,42,0.07)] transition hover:bg-secondary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <span className="grid min-w-0 gap-1"><strong className="break-words">{getTitle(task)}</strong><span className="break-words text-sm text-[color:var(--muted-foreground)]">{assignee(task)} · {location(task)}</span></span>
        <span className="grid gap-1 sm:justify-items-end"><WorkspaceStatus tone={overdue(task) ? "danger" : task.status === "DONE" ? "success" : task.status === "CANCELLED" ? "neutral" : "warning"}>{overdue(task) ? `${text("Просрочена", "Overdue")} · ${labels[task.status]}` : labels[task.status]}</WorkspaceStatus><span className="text-sm text-[color:var(--muted-foreground)]">{task.dueAt ? new Date(task.dueAt).toLocaleString(ru ? "ru-RU" : "en-US") : text("Без срока", "No due date")}</span></span>
      </button>
    </li>)}</ul> : <WorkspaceFeedback title={scoped.length ? text("По выбранным фильтрам задач нет", "No matching tasks") : text("Задач пока нет", "No tasks yet")} description={scoped.length ? text("Измените поиск или статус.", "Change search or status.") : text("В выбранном периоде и локации задач пока нет.", "No tasks in the selected period and location.")} action={scoped.length ? <button type="button" className="rounded-xl border border-border bg-white px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600" onClick={() => { onQueryChange(""); setStatus("all"); }}>{text("Сбросить фильтры", "Clear filters")}</button> : undefined} />}
  </section>;
}
