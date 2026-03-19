import { TaskItem, type TaskStatus } from '@smart/types';
import { parseTaskMeta } from './task-meta';

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseTaskDueAt(task: TaskItem) {
  if (!task.dueAt) return null;

  const parsed = new Date(task.dueAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isTaskOpen(status: TaskStatus) {
  return status !== 'DONE' && status !== 'CANCELLED';
}

export function isTaskMeeting(task: TaskItem) {
  const meta = parseTaskMeta(task.description);
  return Boolean(meta.meeting) || task.title.startsWith('Встреча:') || task.title.startsWith('Meeting:');
}

export function taskDueToday(task: TaskItem, referenceDate = new Date()) {
  const dueAt = parseTaskDueAt(task);
  if (!dueAt) return false;

  const reference = startOfDay(referenceDate);
  const dueStart = startOfDay(dueAt);
  return dueStart.getTime() === reference.getTime();
}

export function taskTimeLabel(task: TaskItem) {
  if (!task.dueAt) return null;

  return new Date(task.dueAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
