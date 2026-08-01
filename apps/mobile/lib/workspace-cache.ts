import { Image, type ImageSourcePropType } from "react-native";
import type {
  AnnouncementItem,
  AttendanceStatusResponse,
  EmployeeRequestItem,
  MyTimeOffBalancesResponse,
  RequestsCalendarResponse,
  TaskItem,
} from "@smart/types";
import { hasManagerAccess } from "./auth-flow";
import type { AppLanguage } from "./i18n";
import {
  loadLeaderboardOverview,
  loadMyChats,
  loadManagerTasksBootstrap,
  loadManagerScheduleBootstrap,
  loadMyProfile,
  loadNewsBootstrap,
  loadRequestsBootstrap,
  loadTodayBootstrap,
} from "./api";
import { getWorkspaceScope } from "./workspace-scope";
import { resolveEmployeeAvatarSource } from "./employee-avatar";
import { readScreenCache, writeScreenCache } from "./screen-cache";
import { formatDateKeyInTimeZone } from "./timezone";
import { primeLiveTextMap } from "./use-live-text-map";
import { primeTaskTranslations } from "./use-translated-task-copy";

type WorkspaceProfile = Awaited<ReturnType<typeof loadMyProfile>>;
type ShiftItem = Awaited<ReturnType<typeof loadTodayBootstrap>>["shifts"];
type TodayTasks = TaskItem[];
type RequestsBalances = MyTimeOffBalancesResponse;
type RequestsItems = EmployeeRequestItem[];
type RequestsCalendar = RequestsCalendarResponse;
type ChatThreads = Awaited<ReturnType<typeof loadMyChats>>;
type ManagerScheduleInitialData = NonNullable<
  Awaited<ReturnType<typeof loadManagerScheduleBootstrap>>["initialData"]
>;
type CalendarScreenCacheValue = {
  shifts: ManagerScheduleInitialData["shifts"];
  tasks: TaskItem[];
  managerEmployees?: ManagerScheduleInitialData["employees"];
  managerGroups?: ManagerScheduleInitialData["groups"];
  managerShifts?: ManagerScheduleInitialData["shifts"];
  shiftTemplates?: ManagerScheduleInitialData["templates"];
  managerLocations?: ManagerScheduleInitialData["locations"];
};

export type TodayScreenCacheValue = {
  attendanceStatus: AttendanceStatusResponse | null;
  attendanceTrackingEnabled: boolean;
  profile: WorkspaceProfile | null;
  shifts: ShiftItem;
  tasks: TodayTasks;
};

export const TODAY_SCREEN_CACHE_KEY = "today-screen:v2";
export const TODAY_SCREEN_CACHE_TTL_MS = 5 * 60_000;
export const PROFILE_SCREEN_CACHE_KEY = "profile-screen";
export const PROFILE_SCREEN_CACHE_TTL_MS = 5 * 60_000;
export const MANAGER_SCREEN_CACHE_KEY = "manager-screen-v6";
export const MANAGER_SCREEN_CACHE_TTL_MS = 5 * 60_000;
export const LEADERBOARD_SCREEN_CACHE_KEY = "leaderboard-screen:v1";
export const LEADERBOARD_SCREEN_CACHE_TTL_MS = 60_000;
export const LEADERBOARD_CELEBRATION_CACHE_KEY = "leaderboard-celebration:v1";
export const LEADERBOARD_CELEBRATION_CACHE_TTL_MS = 10 * 60_000;
export const NEWS_SCREEN_CACHE_TTL_MS = 5 * 60_000;
export const REQUESTS_SCREEN_CACHE_TTL_MS = 5 * 60_000;
export const CHATS_SCREEN_CACHE_KEY = "chats-screen:v1";
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
let queuedWorkspaceWarmup:
  | {
      options?: { force?: boolean; language?: AppLanguage };
      roleCodes: string[];
    }
  | null = null;

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

export function getCalendarScreenCacheKey(
  date = new Date(),
  isManager = false,
  locationId?: string | null,
) {
  const scope = isManager ? "manager" : "employee";
  const locationScope =
    isManager && locationId ? `:${locationId}` : "";
  return `calendar-screen:v3:${scope}${locationScope}:${date.getFullYear()}-${date.getMonth()}`;
}

export function getNewsScreenCacheKey(isManager: boolean) {
  return `news-screen:${isManager ? "manager" : "employee"}`;
}

export function getLeaderboardScreenCacheKey(monthKey?: string) {
  return monthKey
    ? `${LEADERBOARD_SCREEN_CACHE_KEY}:${monthKey}`
    : LEADERBOARD_SCREEN_CACHE_KEY;
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
    dateFrom: `${rangeStart.getFullYear()}-${`${rangeStart.getMonth() + 1}`.padStart(2, "0")}-${`${rangeStart.getDate()}`.padStart(2, "0")}`,
    dateTo: `${rangeEnd.getFullYear()}-${`${rangeEnd.getMonth() + 1}`.padStart(2, "0")}-${`${rangeEnd.getDate()}`.padStart(2, "0")}`,
  };
}

function getRemoteImageUri(
  source: string | ImageSourcePropType | null | undefined,
) {
  if (!source) {
    return null;
  }

  if (typeof source === "string") {
    return source.trim() || null;
  }

  if (
    typeof source === "object" &&
    "uri" in source &&
    typeof source.uri === "string"
  ) {
    return source.uri.trim() || null;
  }

  return null;
}

async function prefetchImageSources(
  sources: Array<string | ImageSourcePropType | null | undefined>,
) {
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
      .filter(
        (proof) => !proof.deletedAt && !proof.supersededByProofId && proof.url,
      )
      .map((proof) => proof.url),
  );
}

function collectAnnouncementTexts(items: AnnouncementItem[]) {
  return items.flatMap((item) => [item.title, item.body]).filter(Boolean);
}

async function warmProfileScreenCache(profile?: WorkspaceProfile | null) {
  const nextProfile = profile ?? (await loadMyProfile());

  await writeScreenCache(PROFILE_SCREEN_CACHE_KEY, nextProfile);
  await prefetchImageSources([buildProfileAvatarSource(nextProfile)]);

  return nextProfile;
}

export async function warmTodayScreenCache(
  profile?: WorkspaceProfile | null,
  language?: AppLanguage,
) {
  const nextProfile = profile ?? (await loadMyProfile());
  const { previousDateKey, nextDateKey } = buildTodayDateRange(
    nextProfile.primaryLocation?.timezone,
  );
  const todayBootstrap = await loadTodayBootstrap({
    dateFrom: previousDateKey,
    dateTo: nextDateKey,
  });

  const payload: TodayScreenCacheValue = {
    attendanceStatus: todayBootstrap.attendanceStatus,
    attendanceTrackingEnabled: todayBootstrap.attendanceTrackingEnabled,
    profile: todayBootstrap.profile ?? nextProfile,
    shifts: todayBootstrap.shifts,
    tasks: todayBootstrap.tasks,
  };

  if (language) {
    await primeTaskTranslations(payload.tasks, language);
  }

  await writeScreenCache(TODAY_SCREEN_CACHE_KEY, payload);
  await prefetchImageSources([
    buildProfileAvatarSource(payload.profile!),
    ...collectTaskPhotoUris(payload.tasks),
  ]);

  return payload;
}

async function warmCalendarScreenCache(
  date = new Date(),
  isManager = false,
  language?: AppLanguage,
) {
  const workspaceScope = isManager ? getWorkspaceScope() : null;
  const { rangeStart, rangeEnd } = buildCalendarDateRange(date);
  const scheduleBootstrap = await loadManagerScheduleBootstrap({
    dateFrom: `${rangeStart.getFullYear()}-${`${rangeStart.getMonth() + 1}`.padStart(2, "0")}-${`${rangeStart.getDate()}`.padStart(2, "0")}`,
    dateTo: `${rangeEnd.getFullYear()}-${`${rangeEnd.getMonth() + 1}`.padStart(2, "0")}-${`${rangeEnd.getDate()}`.padStart(2, "0")}`,
    ...(workspaceScope?.locationId
      ? { locationId: workspaceScope.locationId }
      : {}),
  });
  const scheduleData = scheduleBootstrap.initialData;
  const scheduleShifts = scheduleData?.shifts ?? [];
  const tasks = scheduleData?.taskBoard?.tasks ?? [];

  const payload: CalendarScreenCacheValue = isManager
    ? {
        shifts: [],
        tasks,
        managerEmployees: scheduleData?.employees ?? [],
        managerGroups: scheduleData?.groups ?? [],
        managerShifts: scheduleShifts,
        shiftTemplates: scheduleData?.templates ?? [],
        managerLocations: scheduleData?.locations ?? [],
      }
    : {
        shifts: scheduleShifts,
        tasks,
      };

  if (language) {
    await primeTaskTranslations(tasks, language);
  }

  await writeScreenCache(
    getCalendarScreenCacheKey(
      date,
      isManager,
      workspaceScope?.locationId,
    ),
    payload,
  );
}

async function warmNewsScreenCache(isManager: boolean, language?: AppLanguage) {
  const bootstrap = await loadNewsBootstrap();
  const items = bootstrap.initialData.items;

  if (language) {
    await primeLiveTextMap(collectAnnouncementTexts(items), language);
  }

  await writeScreenCache(getNewsScreenCacheKey(isManager), items);
  await prefetchImageSources(items.map((item) => item.imageUrl));

  return items;
}

export async function warmLeaderboardScreenCache() {
  const overview = await loadLeaderboardOverview();
  await writeScreenCache(getLeaderboardScreenCacheKey(overview.month.key), overview);
  return overview;
}

export async function warmRequestsScreenCache(
  date = new Date(),
  language?: AppLanguage,
) {
  const { dateFrom, dateTo } = buildRequestsDateRange(date);
  const snapshot = await loadRequestsBootstrap({ dateFrom, dateTo });
  const { balances, items, calendar, tasks } = snapshot.initialData;

  if (!balances || !calendar) {
    throw new Error("Requests bootstrap is missing employee data.");
  }

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

async function warmManagerScreenCache(
  profile?: WorkspaceProfile | null,
  language?: AppLanguage,
) {
  const nextProfile = profile ?? (await loadMyProfile());
  const { previousDateKey, nextDateKey } = buildTodayDateRange(
    nextProfile.primaryLocation?.timezone,
  );
  const bootstrap = await loadManagerTasksBootstrap({
    dateFrom: previousDateKey,
    dateTo: nextDateKey,
  });
  const employees = bootstrap.employees;
  const liveSessions = bootstrap.liveSessions;
  const tasks = bootstrap.tasks;

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
  attendanceTrackingEnabled: boolean,
  language?: AppLanguage,
) {
  if (workspaceBackgroundWarmupPromise) {
    return workspaceBackgroundWarmupPromise;
  }

  workspaceBackgroundWarmupPromise = (async () => {
    await Promise.allSettled([
      warmCalendarScreenCache(new Date(), isManager, language),
      attendanceTrackingEnabled
        ? warmLeaderboardScreenCache()
        : Promise.resolve(),
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

export async function hydrateWorkspaceCaches(
  roleCodes: string[],
  language?: AppLanguage,
) {
  const isManager = hasManagerAccess(roleCodes);

  const results = await Promise.allSettled([
    readScreenCache(TODAY_SCREEN_CACHE_KEY, TODAY_SCREEN_CACHE_TTL_MS),
    readScreenCache(PROFILE_SCREEN_CACHE_KEY, PROFILE_SCREEN_CACHE_TTL_MS),
    readScreenCache(
      getCalendarScreenCacheKey(new Date(), isManager),
      WORKSPACE_REFRESH_INTERVAL_MS,
    ),
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
      result.status === "fulfilled" &&
      result.value &&
      typeof result.value === "object" &&
      "value" in result.value &&
      result.value.value &&
      typeof result.value.value === "object" &&
      "tasks" in result.value.value &&
      Array.isArray(result.value.value.tasks)
        ? result.value.value.tasks
        : [];

    return tasks;
  });
  const newsItems =
    results[3]?.status === "fulfilled" && results[3].value
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

export async function warmWorkspaceCaches(
  roleCodes: string[],
  options?: { force?: boolean; language?: AppLanguage },
) {
  if (workspaceWarmupPromise) {
    if (options?.force) {
      queuedWorkspaceWarmup = {
        roleCodes: [...roleCodes],
        options: { ...options, force: true },
      };
    }

    return workspaceWarmupPromise;
  }

  if (
    !options?.force &&
    Date.now() - lastWorkspaceWarmupAt < WORKSPACE_WARMUP_MIN_INTERVAL_MS
  ) {
    return;
  }

  workspaceWarmupPromise = (async () => {
    const isManager = hasManagerAccess(roleCodes);
    const profile = await warmProfileScreenCache().catch(() => null);
    const todayResult = await warmTodayScreenCache(
      profile,
      options?.language,
    ).catch(() => null);
    const attendanceTrackingEnabled =
      todayResult?.attendanceTrackingEnabled ?? true;
    const effectiveIsManager = isManager || !attendanceTrackingEnabled;

    await Promise.allSettled([
      warmChatsScreenCache(),
      options?.force
        ? warmCalendarScreenCache(
            new Date(),
            effectiveIsManager,
            options.language,
          )
        : Promise.resolve(),
      effectiveIsManager
        ? warmManagerScreenCache(profile, options?.language)
        : Promise.resolve(),
    ]);

    lastWorkspaceWarmupAt = Date.now();
    void warmWorkspaceBackgroundCaches(
      effectiveIsManager,
      attendanceTrackingEnabled,
      options?.language,
    );
  })().finally(() => {
    workspaceWarmupPromise = null;
    const nextWarmup = queuedWorkspaceWarmup;
    queuedWorkspaceWarmup = null;
    if (nextWarmup) {
      void warmWorkspaceCaches(nextWarmup.roleCodes, nextWarmup.options);
    }
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
