import type { TaskItem } from '@smart/types';
import { useMemo } from 'react';
import type { AppLanguage } from './i18n';
import { useLiveTextMap } from './use-live-text-map';
import { parseTaskMeta } from './task-meta';

export function stripTaskMeetingPrefix(title: string) {
  return title.replace(/^(Встреча|Meeting):\s*/i, '').trim();
}

export function normalizeTaskDisplayTitle(title: string) {
  const normalized = title
    .replace(/^(Employee recurring|Повторяющаяся задача сотрудника):\s*/i, '')
    .replace(/^(Owner recurring|Повторяющаяся задача владельца):\s*/i, '')
    .trim();

  if (!normalized) {
    return normalized;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getTitleVariants(title: string) {
  const variants = new Set<string>();
  const normalized = normalizeTaskDisplayTitle(title);
  const meetingStripped = stripTaskMeetingPrefix(title);
  const normalizedMeetingStripped = stripTaskMeetingPrefix(normalized);

  for (const value of [
    title.trim(),
    normalized,
    meetingStripped,
    normalizedMeetingStripped,
  ]) {
    if (value) {
      variants.add(value);
    }
  }

  return Array.from(variants);
}

export function useTranslatedTaskCopy(tasks: TaskItem[], language: AppLanguage) {
  const taskMetaById = useMemo(
    () =>
      new Map(
        tasks.map((task) => [task.id, parseTaskMeta(task.description)] as const),
      ),
    [tasks],
  );

  const textMap = useLiveTextMap(
    useMemo(
      () =>
        tasks.flatMap((task) => {
          const taskMeta = taskMetaById.get(task.id);

          return [
            ...getTitleVariants(task.title),
            taskMeta?.body ?? '',
            taskMeta?.meeting?.meetingLocation ?? '',
          ].filter(Boolean);
        }),
      [taskMetaById, tasks],
    ),
    language,
  );

  function translateText(text: string) {
    if (!text) {
      return text;
    }

    return textMap[text.trim()] ?? text;
  }

  function getTaskMeta(task: TaskItem) {
    return taskMetaById.get(task.id) ?? parseTaskMeta(task.description);
  }

  function getTaskTitle(
    task: TaskItem,
    options?: {
      normalize?: boolean;
      stripMeetingPrefix?: boolean;
    },
  ) {
    let value = options?.normalize
      ? normalizeTaskDisplayTitle(task.title)
      : task.title;

    if (options?.stripMeetingPrefix) {
      value = stripTaskMeetingPrefix(value);
    }

    return translateText(value);
  }

  function getTaskBody(task: TaskItem) {
    return translateText(getTaskMeta(task).body);
  }

  function getTaskMeetingLocation(task: TaskItem) {
    return translateText(getTaskMeta(task).meeting?.meetingLocation ?? '');
  }

  return {
    getTaskBody,
    getTaskMeetingLocation,
    getTaskMeta,
    getTaskTitle,
    textMap,
    translateText,
  };
}
