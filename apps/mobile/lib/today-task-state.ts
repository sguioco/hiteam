import type { TaskItem } from '@smart/types';
import { formatDateKeyInTimeZone, isDateKeyBefore } from './timezone';
import { isTaskMeeting, isTaskOpen, parseTaskDueAt } from './task-utils';

function normalizeTodayTaskTitle(title: string) {
  return title
    .replace(/^(Employee recurring|Повторяющаяся задача сотрудника):\s*/i, '')
    .replace(/^(Owner recurring|Повторяющаяся задача владельца):\s*/i, '')
    .trim()
    .toLowerCase();
}

function getTodayTaskAnchorDate(task: TaskItem) {
  const candidates = [task.dueAt, task.occurrenceDate, task.createdAt];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function getTodayTaskDuplicateKey(task: TaskItem, timeZone?: string | null) {
  const anchorDate = getTodayTaskAnchorDate(task);
  const anchorKey = anchorDate
    ? formatDateKeyInTimeZone(anchorDate, timeZone)
    : 'no-date';
  const kindKey = isTaskMeeting(task) ? 'meeting' : 'task';
  const photoKey = task.requiresPhoto ? 'photo' : 'plain';

  return `${kindKey}|${photoKey}|${normalizeTodayTaskTitle(task.title)}|${anchorKey}`;
}

function choosePreferredTodayTask(current: TaskItem, candidate: TaskItem) {
  const currentHasPhotos = current.photoProofs.some((proof) => !proof.deletedAt && !proof.supersededByProofId);
  const candidateHasPhotos = candidate.photoProofs.some((proof) => !proof.deletedAt && !proof.supersededByProofId);

  const currentScore =
    (current.requiresPhoto ? 100 : 0) +
    (currentHasPhotos ? 40 : 0) +
    (!current.isRecurring ? 20 : 0) +
    (current.status !== 'DONE' && current.status !== 'CANCELLED' ? 10 : 0);

  const candidateScore =
    (candidate.requiresPhoto ? 100 : 0) +
    (candidateHasPhotos ? 40 : 0) +
    (!candidate.isRecurring ? 20 : 0) +
    (candidate.status !== 'DONE' && candidate.status !== 'CANCELLED' ? 10 : 0);

  if (candidateScore !== currentScore) {
    return candidateScore > currentScore ? candidate : current;
  }

  return new Date(candidate.updatedAt).getTime() >= new Date(current.updatedAt).getTime()
    ? candidate
    : current;
}

export function taskAnchorsDateKey(
  task: TaskItem,
  dateKey: string,
  timeZone?: string | null,
) {
  const anchorDate = getTodayTaskAnchorDate(task);
  if (!anchorDate) return false;

  return formatDateKeyInTimeZone(anchorDate, timeZone) === dateKey;
}

export function collapseDuplicateTodayTasks(
  tasks: TaskItem[],
  timeZone?: string | null,
) {
  const byKey = new Map<string, TaskItem>();

  for (const task of tasks) {
    const key = getTodayTaskDuplicateKey(task, timeZone);
    const current = byKey.get(key);

    if (!current) {
      byKey.set(key, task);
      continue;
    }

    byKey.set(key, choosePreferredTodayTask(current, task));
  }

  return Array.from(byKey.values());
}

export function countOpenTodayTasks(
  tasks: TaskItem[],
  dateKey: string,
  timeZone?: string | null,
) {
  return tasks.filter(
    (task) =>
      !isTaskMeeting(task) &&
      isTaskOpen(task.status) &&
      taskAnchorsDateKey(task, dateKey, timeZone),
  ).length;
}

export function countOverdueTodayTasks(
  tasks: TaskItem[],
  dateKey: string,
  timeZone?: string | null,
) {
  return tasks.filter((task) => {
    if (!isTaskOpen(task.status)) {
      return false;
    }

    const dueAt = parseTaskDueAt(task);
    return Boolean(
      dueAt &&
        isDateKeyBefore(
          formatDateKeyInTimeZone(dueAt, timeZone),
          dateKey,
        ),
    );
  }).length;
}

export function getTodayNavBadgeState(
  tasks: TaskItem[],
  timeZone?: string | null,
  now = new Date(),
) {
  const visibleTasks = collapseDuplicateTodayTasks(tasks, timeZone);
  const todayDateKey = formatDateKeyInTimeZone(now, timeZone);
  const openTodayTaskCount = countOpenTodayTasks(visibleTasks, todayDateKey, timeZone);
  const overdueCount = countOverdueTodayTasks(visibleTasks, todayDateKey, timeZone);

  return {
    openTodayTaskCount,
    overdueCount,
    hasBadge: openTodayTaskCount > 0 || overdueCount > 0,
  };
}
