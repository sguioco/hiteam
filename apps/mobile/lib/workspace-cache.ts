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
  loadWorkspaceBootstrap,
} from "./api";
import { getWorkspaceScope, hydrateWorkspaceScope } from "./workspace-scope";
import { resolveEmployeeAvatarSource } from "./employee-avatar";
import {
  getScreenCacheScope,
  readScreenCache,
  writeScreenCache,
} from "./screen-cache";
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
  organizationStartDate?: string | null;
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
export const WORKSPACE_REFRESH_INTERVAL_MS = 60_000;

export type RequestsScreenCacheValue = {
  balances: RequestsBalances;
  items: RequestsItems;
  calendar: RequestsCalendar;
  tasks: TodayTasks;
};

const WORKSPACE_WARMUP_MIN_INTERVAL_MS = WORKSPACE_REFRESH_INTERVAL_MS;

let lastWorkspaceWarmupAt = 0;
let lastWorkspaceWarmupScope = "";
let workspaceWarmupPromise: Promise<void> | null = null;
let workspaceWarmupScope = "";
let queuedWorkspaceWarmup:
  | {
      cacheScope: string;
      options?: { force?: boolean; language?: AppLanguage };
      roleCodes: string[];
    }
  | null = null;

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function getCalendarScreenCacheKey(
  date = new Date(),
  isManager = false,
  locationId?: string | null,
) {
  const scope = isManager ? "manager" : "employee";
  const locationScope =
    isManager && locationId ? `:${locationId}` : "";
  return `calendar-screen:v4:${scope}${locationScope}:${date.getFullYear()}-${date.getMonth()}`;
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

function formatLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(
    2,
    "0",
  )}-${`${date.getDate()}`.padStart(2, "0")}`;
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

async function fetchAndCommitWorkspaceSnapshot(
  roleCodes: string[],
  language?: AppLanguage,
) {
  const cacheScope = getScreenCacheScope();
  const now = new Date();
  const workspaceScope = await hydrateWorkspaceScope();
  const { previousDateKey, nextDateKey } = buildTodayDateRange();
  const calendarRange = buildCalendarDateRange(now);
  const requestsRange = buildRequestsDateRange(now);
  const snapshot = await loadWorkspaceBootstrap({
    todayDateFrom: previousDateKey,
    todayDateTo: nextDateKey,
    calendarDateFrom: formatLocalDateKey(calendarRange.rangeStart),
    calendarDateTo: formatLocalDateKey(calendarRange.rangeEnd),
    requestsDateFrom: requestsRange.dateFrom,
    requestsDateTo: requestsRange.dateTo,
    ...(workspaceScope?.locationId
      ? { locationId: workspaceScope.locationId }
      : {}),
  });

  if (cacheScope !== getScreenCacheScope()) {
    return;
  }

  const dashboard = snapshot.dashboard.initialData;
  const schedule = snapshot.schedule.initialData;
  const profile = dashboard.profile;
  const todayTasks = dashboard.taskBoard?.tasks ?? [];
  const attendanceTrackingEnabled =
    dashboard.organizationSetup?.attendanceTrackingEnabled ?? true;
  const isManager =
    hasManagerAccess(roleCodes) || !attendanceTrackingEnabled;
  const scheduleTasks = schedule?.taskBoard?.tasks ?? [];
  const organizationCreatedAt = schedule?.organizationSetup?.company?.createdAt;
  const calendarPayload: CalendarScreenCacheValue = isManager
    ? {
        organizationStartDate:
          typeof organizationCreatedAt === "string"
            ? organizationCreatedAt
            : organizationCreatedAt?.toISOString() ?? null,
        shifts: [],
        tasks: scheduleTasks,
        managerEmployees: schedule?.employees ?? [],
        managerGroups: schedule?.groups ?? [],
        managerShifts: schedule?.shifts ?? [],
        shiftTemplates: schedule?.templates ?? [],
        managerLocations: schedule?.locations ?? [],
      }
    : {
        organizationStartDate:
          typeof organizationCreatedAt === "string"
            ? organizationCreatedAt
            : organizationCreatedAt?.toISOString() ?? null,
        shifts: schedule?.shifts ?? [],
        tasks: scheduleTasks,
      };
  const todayPayload: TodayScreenCacheValue = {
    attendanceStatus: dashboard.attendanceStatus,
    attendanceTrackingEnabled,
    profile,
    shifts: dashboard.scheduleShifts,
    tasks: todayTasks,
  };
  const newsItems = snapshot.news.initialData.items;
  const requestData = snapshot.requests.initialData;

  const cacheWrites: Array<Promise<void>> = [
    writeScreenCache(TODAY_SCREEN_CACHE_KEY, todayPayload),
    writeScreenCache(
      getCalendarScreenCacheKey(
        now,
        isManager,
        workspaceScope?.locationId,
      ),
      calendarPayload,
    ),
    writeScreenCache(getNewsScreenCacheKey(isManager), newsItems),
    writeScreenCache(
      getLeaderboardScreenCacheKey(snapshot.leaderboard.initialData.month.key),
      snapshot.leaderboard.initialData,
    ),
    writeScreenCache(CHATS_SCREEN_CACHE_KEY, snapshot.chats),
  ];

  if (profile) {
    cacheWrites.push(writeScreenCache(PROFILE_SCREEN_CACHE_KEY, profile));
  }

  if (isManager) {
    cacheWrites.push(
      writeScreenCache(MANAGER_SCREEN_CACHE_KEY, {
        profile,
        employees: dashboard.employees,
        liveSessions: dashboard.liveSessions,
        tasks: todayTasks,
      }),
    );
  }

  if (requestData.balances && requestData.calendar) {
    cacheWrites.push(
      writeScreenCache(getRequestsScreenCacheKey(now), {
        balances: requestData.balances,
        items: requestData.items,
        calendar: requestData.calendar,
        tasks: requestData.tasks,
      }),
    );
  }

  await Promise.all(cacheWrites);

  if (language) {
    void Promise.allSettled([
      primeTaskTranslations(
        [...todayTasks, ...scheduleTasks, ...requestData.tasks],
        language,
      ),
      primeLiveTextMap(collectAnnouncementTexts(newsItems), language),
    ]);
  }

  void Promise.allSettled([
    prefetchImageSources([
      profile ? buildProfileAvatarSource(profile) : null,
      ...dashboard.employees.map((employee) => employee.avatar),
    ]),
    prefetchImageSources([
      ...collectTaskPhotoUris(todayTasks),
      ...collectTaskPhotoUris(scheduleTasks),
      ...collectTaskPhotoUris(requestData.tasks),
    ]),
    prefetchImageSources(newsItems.map((item) => item.imageUrl)),
  ]);
}

export async function warmAnnouncementImages(items: AnnouncementItem[]) {
  await prefetchImageSources(items.map((item) => item.imageUrl));
}

export async function hydrateWorkspaceCaches(
  roleCodes: string[],
  language?: AppLanguage,
) {
  await hydrateWorkspaceScope();
  const todaySnapshot = await readScreenCache<TodayScreenCacheValue>(
    TODAY_SCREEN_CACHE_KEY,
    TODAY_SCREEN_CACHE_TTL_MS,
  );
  const isManager =
    hasManagerAccess(roleCodes) ||
    todaySnapshot?.value.attendanceTrackingEnabled === false;
  const workspaceScope = getWorkspaceScope();
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(
    2,
    "0",
  )}`;

  const results = await Promise.allSettled([
    Promise.resolve(todaySnapshot),
    readScreenCache(PROFILE_SCREEN_CACHE_KEY, PROFILE_SCREEN_CACHE_TTL_MS),
    readScreenCache(
      getCalendarScreenCacheKey(
        new Date(),
        isManager,
        workspaceScope?.locationId,
      ),
      WORKSPACE_REFRESH_INTERVAL_MS,
    ),
    readScreenCache(getNewsScreenCacheKey(isManager), NEWS_SCREEN_CACHE_TTL_MS),
    readScreenCache(getRequestsScreenCacheKey(), REQUESTS_SCREEN_CACHE_TTL_MS),
    readScreenCache(CHATS_SCREEN_CACHE_KEY, CHATS_SCREEN_CACHE_TTL_MS),
    isManager
      ? readScreenCache(MANAGER_SCREEN_CACHE_KEY, MANAGER_SCREEN_CACHE_TTL_MS)
      : Promise.resolve(null),
    readScreenCache(
      getLeaderboardScreenCacheKey(currentMonthKey),
      LEADERBOARD_SCREEN_CACHE_TTL_MS,
    ),
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

  void Promise.allSettled([
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
  const cacheScope = getScreenCacheScope();

  if (workspaceWarmupPromise) {
    if (workspaceWarmupScope !== cacheScope) {
      await workspaceWarmupPromise.catch(() => undefined);
      return warmWorkspaceCaches(roleCodes, options);
    }

    if (options?.force) {
      queuedWorkspaceWarmup = {
        cacheScope,
        roleCodes: [...roleCodes],
        options: { ...options, force: true },
      };
    }

    return workspaceWarmupPromise;
  }

  if (
    !options?.force &&
    lastWorkspaceWarmupScope === cacheScope &&
    Date.now() - lastWorkspaceWarmupAt < WORKSPACE_WARMUP_MIN_INTERVAL_MS
  ) {
    return;
  }

  workspaceWarmupScope = cacheScope;
  workspaceWarmupPromise = (async () => {
    await fetchAndCommitWorkspaceSnapshot(roleCodes, options?.language);
    lastWorkspaceWarmupAt = Date.now();
    lastWorkspaceWarmupScope = cacheScope;
  })().finally(() => {
    workspaceWarmupPromise = null;
    workspaceWarmupScope = "";
    const nextWarmup = queuedWorkspaceWarmup;
    queuedWorkspaceWarmup = null;
    if (nextWarmup?.cacheScope === getScreenCacheScope()) {
      void warmWorkspaceCaches(nextWarmup.roleCodes, nextWarmup.options);
    }
  });

  return workspaceWarmupPromise;
}
