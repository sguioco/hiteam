import { Image, type ImageSourcePropType } from 'react-native';
import type { AnnouncementItem, AttendanceStatusResponse, TaskItem } from '@smart/types';
import { hasManagerAccess } from './auth-flow';
import type { AppLanguage } from './i18n';
import {
  loadAttendanceStatus,
  loadMyChats,
  loadManagerAnnouncements,
  loadManagerEmployees,
  loadManagerLiveSessions,
  loadManagerTasks,
  loadMyAnnouncements,
  loadMyProfile,
  loadMyRequestCalendar,
  loadMyRequests,
  loadMyShifts,
  loadMyTasks,
  loadMyTimeOffBalances,
} from './api';
import { resolveEmployeeAvatarSource } from './employee-avatar';
import { normalizeDemoOwnerProfile, resolveDemoOwnerTodayScreenData } from './demo-owner';
import { readScreenCache, writeScreenCache } from './screen-cache';
import { formatDateKeyInTimeZone } from './timezone';
import { primeLiveTextMap } from './use-live-text-map';
import { primeTaskTranslations } from './use-translated-task-copy';

type WorkspaceProfile = Awaited<ReturnType<typeof loadMyProfile>>;
type ShiftItem = Awaited<ReturnType<typeof loadMyShifts>>;
type TodayTasks = Awaited<ReturnType<typeof loadMyTasks>>;
type RequestsBalances = Awaited<ReturnType<typeof loadMyTimeOffBalances>>;
type RequestsItems = Awaited<ReturnType<typeof loadMyRequests>>;
type RequestsCalendar = Awaited<ReturnType<typeof loadMyRequestCalendar>>;
type ChatThreads = Awaited<ReturnType<typeof loadMyChats>>;

export type TodayScreenCacheValue = {
  attendanceStatus: AttendanceStatusResponse | null;
  profile: WorkspaceProfile | null;
  shifts: ShiftItem;
  tasks: TodayTasks;
};

export const TODAY_SCREEN_CACHE_KEY = 'today-screen:v1';
export const TODAY_SCREEN_CACHE_TTL_MS = 5 * 60_000;
export const PROFILE_SCREEN_CACHE_KEY = 'profile-screen';
export const PROFILE_SCREEN_CACHE_TTL_MS = 5 * 60_000;
export const MANAGER_SCREEN_CACHE_KEY = 'manager-screen-v4';
export const MANAGER_SCREEN_CACHE_TTL_MS = 5 * 60_000;
export const NEWS_SCREEN_CACHE_TTL_MS = 5 * 60_000;
export const REQUESTS_SCREEN_CACHE_TTL_MS = 5 * 60_000;
export const CHATS_SCREEN_CACHE_KEY = 'chats-screen:v1';
export const CHATS_SCREEN_CACHE_TTL_MS = 60_000;
export const WORKSPACE_REFRESH_INTERVAL_MS = 10_000;

export type RequestsScreenCacheValue = {
  balances: RequestsBalances;
  items: RequestsItems;
  calendar: RequestsCalendar;
  tasks: TodayTasks;
};

const WORKSPACE_WARMUP_MIN_INTERVAL_MS = WORKSPACE_REFRESH_INTERVAL_MS;

let lastWorkspaceWarmupAt = 0;
let workspaceWarmupPromise: Promise<void> | null = null;
let workspaceBackgroundWarmupPromise: Promise<void> | null = null;

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getCalendarScreenCacheKey(date = new Date()) {
  return `calendar-screen:${date.getFullYear()}-${date.getMonth()}`;
}

export function getNewsScreenCacheKey(isManager: boolean) {
  return `news-screen:${isManager ? 'manager' : 'employee'}`;
}

export function getRequestsScreenCacheKey(date = new Date()) {
  return `requests-screen:${date.getFullYear()}-${date.getMonth()}`;
}

function buildTodayDateRange(timeZone?: string | null) {
  const now = new Date();
  return {
    previousDateKey: formatDateKeyInTimeZone(addDays(now, -1), timeZone),
    nextDateKey: formatDateKeyInTimeZone(addDays(now, 1), timeZone),
  };
}

function buildCalendarDateRange(date = new Date()) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  return {
    rangeStart: new Date(year, monthIndex - 1, 1),
    rangeEnd: new Date(year, monthIndex + 1, 0),
  };
}

function buildRequestsDateRange(date = new Date()) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const rangeStart = new Date(year, monthIndex, 1);
  const rangeEnd = new Date(year, monthIndex + 1, 0);
  return {
    rangeStart,
    rangeEnd,
    dateFrom: `${rangeStart.getFullYear()}-${`${rangeStart.getMonth() + 1}`.padStart(2, '0')}-${`${rangeStart.getDate()}`.padStart(2, '0')}`,
    dateTo: `${rangeEnd.getFullYear()}-${`${rangeEnd.getMonth() + 1}`.padStart(2, '0')}-${`${rangeEnd.getDate()}`.padStart(2, '0')}`,
  };
}

function getRemoteImageUri(source: string | ImageSourcePropType | null | undefined) {
  if (!source) {
    return null;
  }

  if (typeof source === 'string') {
    return source.trim() || null;
  }

  if (typeof source === 'object' && 'uri' in source && typeof source.uri === 'string') {
    return source.uri.trim() || null;
  }

  return null;
}

async function prefetchImageSources(sources: Array<string | ImageSourcePropType | null | undefined>) {
  const uniqueUris = Array.from(
    new Set(
      sources
        .map(getRemoteImageUri)
        .filter((uri): uri is string => Boolean(uri)),
    ),
  );

  if (!uniqueUris.length) {
    return;
  }

  await Promise.allSettled(uniqueUris.map((uri) => Image.prefetch(uri)));
}

function buildProfileAvatarSource(profile: WorkspaceProfile) {
  return resolveEmployeeAvatarSource({
    avatarUrl: profile.avatarUrl,
    email: profile.user.email,
    employeeNumber: profile.employeeNumber,
    firstName: profile.firstName,
    gender: profile.gender,
    id: profile.id,
    lastName: profile.lastName,
  });
}

function collectTaskPhotoUris(tasks: TaskItem[]) {
  return tasks.flatMap((task) =>
    task.photoProofs
      .filter((proof) => !proof.deletedAt && !proof.supersededByProofId && proof.url)
      .map((proof) => proof.url),
  );
}

function collectAnnouncementTexts(items: AnnouncementItem[]) {
  return items.flatMap((item) => [item.title, item.body]).filter(Boolean);
}

async function warmProfileScreenCache(profile?: WorkspaceProfile | null) {
  const nextProfile = normalizeDemoOwnerProfile(
    profile ?? (await loadMyProfile()),
  ) as WorkspaceProfile;

  await writeScreenCache(PROFILE_SCREEN_CACHE_KEY, nextProfile);
  await prefetchImageSources([buildProfileAvatarSource(nextProfile)]);

  return nextProfile;
}

export async function warmTodayScreenCache(profile?: WorkspaceProfile | null, language?: AppLanguage) {
  const nextProfile = normalizeDemoOwnerProfile(
    profile ?? (await loadMyProfile()),
  ) as WorkspaceProfile;
  const { previousDateKey, nextDateKey } = buildTodayDateRange(nextProfile.primaryLocation?.timezone);
  const [attendanceStatus, shifts, tasks] = await Promise.all([
    loadAttendanceStatus(),
    loadMyShifts(),
    loadMyTasks({
      dateFrom: previousDateKey,
      dateTo: nextDateKey,
    }),
  ]);

  const payload: TodayScreenCacheValue = resolveDemoOwnerTodayScreenData({
    attendanceStatus,
    profile: nextProfile,
    shifts,
    tasks,
  });

  if (language) {
    await primeTaskTranslations(payload.tasks, language);
  }

  await writeScreenCache(TODAY_SCREEN_CACHE_KEY, payload);
  await prefetchImageSources([buildProfileAvatarSource(payload.profile!), ...collectTaskPhotoUris(payload.tasks)]);

  return payload;
}

async function warmCalendarScreenCache(date = new Date(), language?: AppLanguage) {
  const { rangeStart, rangeEnd } = buildCalendarDateRange(date);
  const [shifts, tasks] = await Promise.all([
    loadMyShifts(),
    loadMyTasks({
      dateFrom: `${rangeStart.getFullYear()}-${`${rangeStart.getMonth() + 1}`.padStart(2, '0')}-${`${rangeStart.getDate()}`.padStart(2, '0')}`,
      dateTo: `${rangeEnd.getFullYear()}-${`${rangeEnd.getMonth() + 1}`.padStart(2, '0')}-${`${rangeEnd.getDate()}`.padStart(2, '0')}`,
    }),
  ]);

  const payload = {
    shifts,
    tasks,
  };

  if (language) {
    await primeTaskTranslations(tasks, language);
  }

  await Promise.all([
    writeScreenCache(getCalendarScreenCacheKey(date), payload),
    writeScreenCache(getCalendarScreenCacheKey(addDays(date, -31)), payload),
    writeScreenCache(getCalendarScreenCacheKey(addDays(date, 31)), payload),
  ]);
}

async function warmNewsScreenCache(isManager: boolean, language?: AppLanguage) {
  const items = isManager ? await loadManagerAnnouncements() : await loadMyAnnouncements();

  if (language) {
    await primeLiveTextMap(collectAnnouncementTexts(items), language);
  }

  await writeScreenCache(getNewsScreenCacheKey(isManager), items);
  await prefetchImageSources(items.map((item) => item.imageUrl));

  return items;
}

export async function warmRequestsScreenCache(date = new Date(), language?: AppLanguage) {
  const { dateFrom, dateTo } = buildRequestsDateRange(date);
  const [balances, items, calendar, tasks] = await Promise.all([
    loadMyTimeOffBalances(),
    loadMyRequests(),
    loadMyRequestCalendar(dateFrom, dateTo),
    loadMyTasks({
      dateFrom,
      dateTo,
    }),
  ]);

  const payload: RequestsScreenCacheValue = {
    balances,
    items,
    calendar,
    tasks,
  };

  if (language) {
    await primeTaskTranslations(tasks, language);
  }

  await writeScreenCache(getRequestsScreenCacheKey(date), payload);
  await prefetchImageSources(collectTaskPhotoUris(tasks));

  return payload;
}

export async function warmChatsScreenCache() {
  const threads = await loadMyChats();
  await writeScreenCache(CHATS_SCREEN_CACHE_KEY, threads);
  return threads;
}

async function warmManagerScreenCache(profile?: WorkspaceProfile | null, language?: AppLanguage) {
  const nextProfile = profile ?? (await loadMyProfile());
  const { previousDateKey, nextDateKey } = buildTodayDateRange(nextProfile.primaryLocation?.timezone);
  const [employees, liveSessions, tasks] = await Promise.all([
    loadManagerEmployees(),
    loadManagerLiveSessions(),
    loadManagerTasks({
      dateFrom: previousDateKey,
      dateTo: nextDateKey,
    }),
  ]);

  if (language) {
    await primeTaskTranslations(tasks, language);
  }

  await writeScreenCache(MANAGER_SCREEN_CACHE_KEY, {
    profile: nextProfile,
    employees,
    liveSessions,
    tasks,
  });
  await prefetchImageSources([
    buildProfileAvatarSource(nextProfile),
    ...employees.map((employee) => employee.avatar),
  ]);
}

function warmWorkspaceBackgroundCaches(
  isManager: boolean,
  language?: AppLanguage,
) {
  if (workspaceBackgroundWarmupPromise) {
    return workspaceBackgroundWarmupPromise;
  }

  workspaceBackgroundWarmupPromise = (async () => {
    await Promise.allSettled([
      warmCalendarScreenCache(new Date(), language),
      warmNewsScreenCache(isManager, language),
      warmRequestsScreenCache(new Date(), language),
    ]);
  })().finally(() => {
    workspaceBackgroundWarmupPromise = null;
  });

  return workspaceBackgroundWarmupPromise;
}

export async function warmAnnouncementImages(items: AnnouncementItem[]) {
  await prefetchImageSources(items.map((item) => item.imageUrl));
}

export async function hydrateWorkspaceCaches(roleCodes: string[], language?: AppLanguage) {
  const isManager = hasManagerAccess(roleCodes);

  const results = await Promise.allSettled([
    readScreenCache(TODAY_SCREEN_CACHE_KEY, TODAY_SCREEN_CACHE_TTL_MS),
    readScreenCache(PROFILE_SCREEN_CACHE_KEY, PROFILE_SCREEN_CACHE_TTL_MS),
    readScreenCache(getCalendarScreenCacheKey(), WORKSPACE_REFRESH_INTERVAL_MS),
    readScreenCache(getNewsScreenCacheKey(isManager), NEWS_SCREEN_CACHE_TTL_MS),
    readScreenCache(getRequestsScreenCacheKey(), REQUESTS_SCREEN_CACHE_TTL_MS),
    readScreenCache(CHATS_SCREEN_CACHE_KEY, CHATS_SCREEN_CACHE_TTL_MS),
    isManager
      ? readScreenCache(MANAGER_SCREEN_CACHE_KEY, MANAGER_SCREEN_CACHE_TTL_MS)
      : Promise.resolve(null),
  ]);

  if (!language) {
    return;
  }

  const taskBuckets = results.flatMap((result) => {
    const tasks =
      result.status === 'fulfilled' &&
      result.value &&
      typeof result.value === 'object' &&
      'value' in result.value &&
      result.value.value &&
      typeof result.value.value === 'object' &&
      'tasks' in result.value.value &&
      Array.isArray(result.value.value.tasks)
        ? result.value.value.tasks
        : [];

    return tasks;
  });
  const newsItems =
    results[3]?.status === 'fulfilled' && results[3].value
      ? results[3].value.value
      : [];

  await Promise.allSettled([
    taskBuckets.length > 0
      ? primeTaskTranslations(taskBuckets, language)
      : Promise.resolve(),
    Array.isArray(newsItems) && newsItems.length > 0
      ? primeLiveTextMap(collectAnnouncementTexts(newsItems), language)
      : Promise.resolve(),
  ]);
}

export async function warmWorkspaceCaches(roleCodes: string[], options?: { force?: boolean; language?: AppLanguage }) {
  if (workspaceWarmupPromise) {
    return workspaceWarmupPromise;
  }

  if (!options?.force && Date.now() - lastWorkspaceWarmupAt < WORKSPACE_WARMUP_MIN_INTERVAL_MS) {
    return;
  }

  workspaceWarmupPromise = (async () => {
    const isManager = hasManagerAccess(roleCodes);
    const profile = await warmProfileScreenCache().catch(() => null);

    await Promise.allSettled([
      warmTodayScreenCache(profile, options?.language),
      warmChatsScreenCache(),
      isManager ? warmManagerScreenCache(profile, options?.language) : Promise.resolve(),
    ]);

    lastWorkspaceWarmupAt = Date.now();
    void warmWorkspaceBackgroundCaches(isManager, options?.language);
  })().finally(() => {
    workspaceWarmupPromise = null;
  });

  return workspaceWarmupPromise;
}

export async function warmWorkspaceCachesWithinBudget(
  roleCodes: string[],
  budgetMs = 320,
  options?: { language?: AppLanguage },
) {
  const warmup = warmWorkspaceCaches(roleCodes, {
    force: true,
    language: options?.language,
  });

  if (!warmup) {
    return;
  }

  await Promise.race([
    warmup.catch(() => undefined),
    delay(Math.max(budgetMs, 0)),
  ]);
}
