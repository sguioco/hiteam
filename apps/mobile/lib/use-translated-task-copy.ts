import type { TaskItem } from '@smart/types';
import { useMemo } from 'react';
import type { AppLanguage } from './i18n';
import { shouldHideTranslatedSourceText } from './live-translation-policy';
import { hasResolvedLiveText, primeLiveTextMap, useLiveTextMap } from './use-live-text-map';
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

export function collectTaskTranslationTexts(tasks: TaskItem[]) {
  return tasks.flatMap((task) => {
    const taskMeta = parseTaskMeta(task.description);

    return [
      ...getTitleVariants(task.title),
      taskMeta.body,
      taskMeta.meeting?.meetingLocation ?? '',
    ].filter(Boolean);
  });
}

export async function primeTaskTranslations(
  tasks: TaskItem[],
  language: AppLanguage,
) {
  await primeLiveTextMap(collectTaskTranslationTexts(tasks), language);
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
      () => collectTaskTranslationTexts(tasks),
      [tasks],
    ),
    language,
  );

  function translateText(
    text: string,
    options?: {
      hideSourceBeforeReady?: boolean;
    },
  ) {
    if (!text) {
      return text;
    }

    const normalized = text.trim();
    const translated = textMap[normalized] ?? text;
    const shouldHideSource =
      options?.hideSourceBeforeReady &&
      shouldHideTranslatedSourceText(normalized, language);

    if (shouldHideSource) {
      if (!hasResolvedLiveText(language, normalized)) {
        return '';
      }

      if (translated.trim() === normalized) {
        return '';
      }
    }

    return translated;
  }

  function getTaskMeta(task: TaskItem) {
    return taskMetaById.get(task.id) ?? parseTaskMeta(task.description);
  }

  function getTaskTitle(
    task: TaskItem,
    options?: {
      normalize?: boolean;
      stripMeetingPrefix?: boolean;
      hideSourceBeforeReady?: boolean;
    },
  ) {
    let value = options?.normalize
      ? normalizeTaskDisplayTitle(task.title)
      : task.title;

    if (options?.stripMeetingPrefix) {
      value = stripTaskMeetingPrefix(value);
    }

    return translateText(value, {
      hideSourceBeforeReady: options?.hideSourceBeforeReady,
    });
  }

  function getTaskBody(
    task: TaskItem,
    options?: {
      hideSourceBeforeReady?: boolean;
    },
  ) {
    return translateText(getTaskMeta(task).body, options);
  }

  function getTaskMeetingLocation(
    task: TaskItem,
    options?: {
      hideSourceBeforeReady?: boolean;
    },
  ) {
    return translateText(getTaskMeta(task).meeting?.meetingLocation ?? '', options);
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
