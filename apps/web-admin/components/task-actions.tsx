"use client";

import { useEffect, useRef, useState } from "react";
import type { TaskItem, TaskStatus, WorkGroupItem } from "@smart/types";
import { apiRequest } from "@/lib/api";
import { taskActionAvailability } from "@/lib/task-actions";
import { TaskDetailsEditor } from "@/components/task-details-editor";

export function TaskActions({ task, token, groups, locale, onUpdated, onDeleted }: {
  task: TaskItem; token: string; groups: WorkGroupItem[]; locale: string;
  onUpdated: (previousId: string, task: TaskItem) => void;
  onDeleted: (taskId: string) => void;
}) {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [identityLoaded, setIdentityLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const text = (ru: string, en: string) => locale === "ru" ? ru : en;
  useEffect(() => {
    let active = true;
    setIdentityLoaded(false);
    setEmployeeId(null);
    apiRequest<{ id: string } | null>("/employees/me", { token }).then(employee => {
      if (active) { setEmployeeId(employee?.id ?? null); setIdentityLoaded(true); }
    }).catch((cause: unknown) => {
      if (active) { setError(cause instanceof Error ? cause.message : text("Не удалось проверить права", "Could not check permissions")); setIdentityLoaded(true); }
    });
    return () => { active = false; };
  }, [token]);
  const available = taskActionAvailability(task, employeeId, groups);
  async function submit(action: "status" | "reschedule" | "comments" | `checklist/${string}/toggle`, body: object) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setError(null); setNotice("");
    try {
      const result = await apiRequest<TaskItem | { task: TaskItem; replacedTaskId: string | null }>(
        `/collaboration/tasks/${encodeURIComponent(task.id)}/${action}`,
        { token, method: "POST", body: JSON.stringify(body) },
      );
      onUpdated(task.id, "task" in result ? result.task : result);
      if (action === "comments") setComment("");
      if (action === "reschedule") setDueAt("");
      setNotice(text("Сохранено", "Saved"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text("Не удалось сохранить изменения", "Could not save changes"));
    } finally { lock.current = false; setBusy(false); }
  }
  const statuses: Array<[TaskStatus, string]> = [
    ["TODO", text("К выполнению", "To do")], ["IN_PROGRESS", text("В работу", "Start")],
    ["DONE", text("Завершить", "Complete")], ["CANCELLED", text("Отменить задачу", "Cancel task")],
  ];
  const button = "rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm disabled:opacity-40";
  return <section className="grid gap-3 border-t border-[color:var(--border)] pt-4" aria-busy={busy}>
    <h3 className="font-semibold">{text("Действия", "Actions")}</h3>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {task.checklistItems.length > 0 && <fieldset className="grid gap-2" disabled={busy || !identityLoaded || !available.checklist}>
      <legend className="mb-2 font-semibold">{text("Чек-лист", "Checklist")}</legend>
      {[...task.checklistItems].sort((a, b) => a.sortOrder - b.sortOrder).map(item => <label key={item.id} className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] p-3">
        <input type="checkbox" className="mt-1 size-4" checked={item.isCompleted} onChange={() => void submit(`checklist/${encodeURIComponent(item.id)}/toggle`, {})} />
        <span className={item.isCompleted ? "line-through text-[color:var(--muted-foreground)]" : ""}>{item.title}</span>
      </label>)}
    </fieldset>}
    {!identityLoaded ? <p>{text("Проверяем права…", "Checking permissions…")}</p> : !available.allowed ? <p>{text("Для этой задачи доступен только просмотр. Изменения доступны автору, исполнителю или участнику команды; повторяющуюся задачу меняет её исполнитель.", "This task is read-only. Changes are available to its creator, assignee or team member; recurring tasks can only be changed by their assignee.")}</p> : <>
      {available.edit && <TaskDetailsEditor task={task} token={token} locale={locale} onUpdated={onUpdated} onDeleted={onDeleted} />}
      <div className="flex flex-wrap gap-2">{statuses.map(([status, label]) => <button key={status} type="button" className={button} disabled={busy || task.status === status || (status === "DONE" && !available.complete)} onClick={() => void submit("status", { status })}>{label}</button>)}</div>
      {!available.complete && <p className="text-sm">{text("Для завершения нужен фотоотчёт. Добавьте его из приложения сотрудника.", "Completion requires a photo proof. Upload it from the employee app.")}</p>}
      {available.reschedule && <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
        event.preventDefault();
        const value = new Date(dueAt);
        if (!Number.isFinite(value.getTime()) || value.getTime() <= Date.now()) { setError(text("Выберите будущую дату и время", "Choose a future date and time")); return; }
        void submit("reschedule", { dueAt: value.toISOString() });
      }}><label className="grid gap-1 text-sm">{text("Новый срок (часовой пояс устройства)", "New due date (device time zone)")}<input className="rounded-xl border p-2" type="datetime-local" required value={dueAt} disabled={busy} onChange={event => setDueAt(event.target.value)} /></label><button className={button} disabled={busy || !dueAt}>{text("Перенести", "Reschedule")}</button></form>}
      {available.comment ? <form className="grid gap-2" onSubmit={event => { event.preventDefault(); if (comment.trim()) void submit("comments", { body: comment.trim() }); }}><label className="grid gap-1 text-sm">{text("Комментарий", "Comment")}<textarea className="rounded-xl border p-2" maxLength={1000} rows={3} value={comment} disabled={busy} onChange={event => setComment(event.target.value)} /></label><button className={button} disabled={busy || !comment.trim()}>{text("Добавить комментарий", "Add comment")}</button></form> : <p className="text-sm">{text("Комментарии к виртуальным повторяющимся задачам пока не поддерживаются.", "Comments on virtual recurring tasks are not supported yet.")}</p>}
    </>}
  </section>;
}
