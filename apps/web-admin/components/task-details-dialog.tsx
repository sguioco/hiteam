"use client";

import type { TaskItem, TaskStatus } from "@smart/types";
import { useRef, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseTaskMeta } from "@/lib/task-meta";

const statuses: Record<TaskStatus, [string, string]> = {
  TODO: ["К выполнению", "To do"],
  IN_PROGRESS: ["В работе", "In progress"],
  DONE: ["Выполнена", "Done"],
  CANCELLED: ["Отменена", "Cancelled"],
};

export function TaskDetailsDialog({ task, title, locale, onClose, actions }: {
  task: TaskItem | null;
  title: string;
  locale: string;
  onClose: () => void;
  actions?: ReactNode;
}) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const ru = locale === "ru";
  const label = (r: string, en: string) => ru ? r : en;
  const date = (value: string) => new Date(value).toLocaleString(ru ? "ru-RU" : "en-US");
  const person = (value: { firstName: string; lastName: string }) => `${value.firstName} ${value.lastName}`.trim();
  const meta = parseTaskMeta(task?.description ?? null);
  const proofs = task?.photoProofs.filter(p => !p.deletedAt && !p.supersededByProofId) ?? [];
  return (
    <Dialog open={Boolean(task)} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        className="max-h-[85dvh] overflow-y-auto break-words"
        onOpenAutoFocus={() => {
          returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          if (returnFocusRef.current?.isConnected) {
            event.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
      >
        <DialogHeader className="pr-10">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{label("Информация о задаче", "Task details")}</DialogDescription>
        </DialogHeader>
        {task && <>
          <dl className="grid gap-3 rounded-2xl bg-[color:var(--panel)] p-4 sm:grid-cols-2">
            <div><dt className="text-sm text-[color:var(--muted-foreground)]">{label("Статус", "Status")}</dt><dd>{statuses[task.status][ru ? 0 : 1]}</dd></div>
            <div><dt className="text-sm text-[color:var(--muted-foreground)]">{label("Срок", "Due date")}</dt><dd>{task.dueAt ? date(task.dueAt) : label("Без срока", "No due date")}</dd></div>
            <div><dt className="text-sm text-[color:var(--muted-foreground)]">{label("Исполнитель / команда", "Assignee / team")}</dt><dd>{task.assigneeEmployee ? person(task.assigneeEmployee) : task.group?.name ?? label("Не назначен", "Unassigned")}</dd></div>
            <div><dt className="text-sm text-[color:var(--muted-foreground)]">{label("Создал", "Created by")}</dt><dd>{person(task.managerEmployee)}</dd></div>
          </dl>
          <section className="grid gap-2"><h3 className="font-semibold">{label("Описание", "Description")}</h3><p className="whitespace-pre-wrap">{meta.body || label("Описание не добавлено", "No description")}</p>
            {meta.meeting?.meetingLocation && <p>{meta.meeting.meetingLocation}</p>}
            {meta.meeting?.meetingLink && /^https?:\/\//i.test(meta.meeting.meetingLink) && <a className="text-blue-600 underline" href={meta.meeting.meetingLink} target="_blank" rel="noopener noreferrer">{label("Открыть встречу", "Open meeting")}</a>}
          </section>
          {!actions && task.checklistItems.length > 0 && <section className="grid gap-2"><h3 className="font-semibold">{label("Чек-лист", "Checklist")}</h3><ul className="grid gap-2">{[...task.checklistItems].sort((a,b) => a.sortOrder - b.sortOrder).map(item => <li key={item.id} className="flex gap-2"><span aria-label={item.isCompleted ? label("Выполнено", "Completed") : label("Не выполнено", "Not completed")}>{item.isCompleted ? "✓" : "○"}</span><span>{item.title}</span></li>)}</ul></section>}
          <section className="grid gap-2"><h3 className="font-semibold">{label("Фотоотчёты", "Photo proofs")}</h3>
            {!proofs.length && <p className="text-[color:var(--muted-foreground)]">{task.requiresPhoto ? label("Фото обязательно, но ещё не добавлено", "Photo required, not uploaded yet") : label("Нет фотографий", "No photos")}</p>}
            <div className="grid grid-cols-2 gap-3">{proofs.map(proof => proof.url ? <a href={proof.url} key={proof.id} target="_blank" rel="noopener noreferrer"><img className="aspect-square w-full rounded-xl object-cover" src={proof.url} alt={label("Фотоотчёт", "Photo proof")} /></a> : <p key={proof.id}>{label("Фотография недоступна", "Photo unavailable")}</p>)}</div>
          </section>
          {actions}
          <section className="grid gap-2"><h3 className="font-semibold">{label("История и комментарии", "History and comments")}</h3>
            {!task.activities.length && <p>{label("Пока нет событий", "No activity yet")}</p>}
            <ol className="grid gap-3">{[...task.activities].sort((a,b) => a.createdAt.localeCompare(b.createdAt)).map(activity => <li key={activity.id} className="rounded-xl border border-[color:var(--border)] p-3"><div className="text-sm text-[color:var(--muted-foreground)]">{person(activity.actorEmployee)} · {date(activity.createdAt)}</div><p className="whitespace-pre-wrap">{activity.body || ({ CREATED: label("Задача создана", "Task created"), COMMENT: label("Комментарий", "Comment"), STATUS_CHANGED: label("Статус изменён", "Status changed"), CHECKLIST_TOGGLED: label("Чек-лист обновлён", "Checklist updated") }[activity.kind])}</p></li>)}</ol>
          </section>
        </>}
      </DialogContent>
    </Dialog>
  );
}
