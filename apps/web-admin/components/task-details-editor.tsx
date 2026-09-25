"use client";

import { useState } from "react";
import type { TaskItem, TaskPriority } from "@smart/types";
import { apiRequest } from "@/lib/api";
import { parseTaskMeta } from "@/lib/task-meta";

const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function TaskDetailsEditor({ task, token, locale, onUpdated, onDeleted }: {
  task: TaskItem;
  token: string;
  locale: string;
  onUpdated: (previousId: string, updated: TaskItem) => void;
  onDeleted: (taskId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [description, setDescription] = useState(parseTaskMeta(task.description).body);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = (ru: string, en: string) => locale === "ru" ? ru : en;

  if (!editing) return <div className="flex flex-wrap gap-2">
    <button className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" onClick={() => setEditing(true)} type="button">{text("Редактировать задачу", "Edit task")}</button>
    <button className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700" onClick={() => setConfirmDelete(true)} type="button">{text("Удалить", "Delete")}</button>
    {confirmDelete && <div className="w-full rounded-xl border border-red-200 p-3 text-sm"><p>{text("Удалить задачу из рабочих списков? История и фото сохранятся для аудита.", "Remove this task from working lists? History and photos will be kept for audit.")}</p><div className="mt-2 flex gap-2"><button className="rounded-xl bg-red-600 px-3 py-2 text-white disabled:opacity-50" disabled={saving} onClick={async () => { setSaving(true); setError(null); try { await apiRequest(`/collaboration/tasks/${encodeURIComponent(task.id)}`, { token, method: "DELETE" }); onDeleted(task.id); } catch (cause) { setError(cause instanceof Error ? cause.message : text("Не удалось удалить задачу", "Could not delete task")); } finally { setSaving(false); } }} type="button">{text("Да, удалить", "Yes, delete")}</button><button className="rounded-xl border px-3 py-2" disabled={saving} onClick={() => setConfirmDelete(false)} type="button">{text("Отмена", "Cancel")}</button></div></div>}
    {error && <p className="w-full text-sm text-red-600" role="alert">{error}</p>}
  </div>;

  return <form className="grid gap-3 rounded-xl border border-[color:var(--border)] p-3" onSubmit={async (event) => {
    event.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<TaskItem>(`/collaboration/tasks/${encodeURIComponent(task.id)}`, {
        token, method: "PATCH", body: JSON.stringify({ title: title.trim(), description, priority }),
      });
      onUpdated(task.id, updated);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text("Не удалось сохранить изменения", "Could not save changes"));
    } finally {
      setSaving(false);
    }
  }}>
    <label className="grid gap-1 text-sm">{text("Название", "Title")}<input className="rounded-xl border border-[color:var(--border)] p-2" maxLength={160} required value={title} disabled={saving} onChange={event => setTitle(event.target.value)} /></label>
    <label className="grid gap-1 text-sm">{text("Описание", "Description")}<textarea className="rounded-xl border border-[color:var(--border)] p-2" maxLength={3000} rows={3} value={description} disabled={saving} onChange={event => setDescription(event.target.value)} /></label>
    <label className="grid gap-1 text-sm">{text("Приоритет", "Priority")}<select className="rounded-xl border border-[color:var(--border)] p-2" value={priority} disabled={saving} onChange={event => setPriority(event.target.value as TaskPriority)}>{priorities.map(value => <option key={value} value={value}>{({ LOW: text("Низкий", "Low"), MEDIUM: text("Средний", "Medium"), HIGH: text("Высокий", "High"), URGENT: text("Срочный", "Urgent") })[value]}</option>)}</select></label>
    {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    <div className="flex gap-2"><button className="rounded-xl bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50" disabled={saving || !title.trim()} type="submit">{text("Сохранить", "Save")}</button><button className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" disabled={saving} onClick={() => { setTitle(task.title); setPriority(task.priority); setDescription(parseTaskMeta(task.description).body); setEditing(false); setError(null); }} type="button">{text("Отмена", "Cancel")}</button></div>
  </form>;
}
