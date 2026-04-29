import type { AuthSession } from "./auth";
import { isEmployeeOnlyRole } from "./auth";
import { apiRequest } from "./api";

const WARMUP_MIN_INTERVAL_MS = 90_000;
const inFlightWarmups = new Map<string, Promise<void>>();
const lastWarmupAt = new Map<string, number>();

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthWindow() {
  const now = new Date();
  return {
    dateFrom: formatDateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
    dateTo: formatDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function buildWarmupKey(session: AuthSession) {
  return `${session.user.tenantId}:${session.user.id}`;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildWarmupPaths(session: AuthSession) {
  const { dateFrom, dateTo } = getMonthWindow();
  const sharedPaths = [
    "/auth/bootstrap",
    "/bootstrap/dashboard",
    "/bootstrap/news",
    "/bootstrap/leaderboard",
    "/notifications/me",
    "/notifications/me/unread-count",
  ];

  if (isEmployeeOnlyRole(session.user.roleCodes)) {
    return [
      ...sharedPaths,
      "/collaboration/inbox-summary/me",
      "/collaboration/chats",
      `/bootstrap/requests?dateFrom=${dateFrom}&dateTo=${dateTo}`,
    ];
  }

  return [
    ...sharedPaths,
    "/bootstrap/tasks",
    "/bootstrap/attendance",
    "/bootstrap/employees",
    "/bootstrap/schedule",
    "/bootstrap/organization",
    "/bootstrap/collaboration?days=14",
    `/bootstrap/requests?dateFrom=${dateFrom}&dateTo=${dateTo}`,
  ];
}

async function runWarmup(session: AuthSession) {
  const token = session.accessToken;
  const paths = buildWarmupPaths(session);

  await Promise.allSettled(
    paths.map((path) =>
      apiRequest<unknown>(path, {
        token,
      }),
    ),
  );
}

export function primeWorkspaceExperience(
  session: AuthSession,
  options?: { force?: boolean },
) {
  const warmupKey = buildWarmupKey(session);
  const activeWarmup = inFlightWarmups.get(warmupKey);

  if (activeWarmup) {
    return activeWarmup;
  }

  if (
    !options?.force &&
    Date.now() - (lastWarmupAt.get(warmupKey) ?? 0) < WARMUP_MIN_INTERVAL_MS
  ) {
    return Promise.resolve();
  }

  const warmupPromise = runWarmup(session)
    .catch(() => undefined)
    .finally(() => {
      lastWarmupAt.set(warmupKey, Date.now());
      inFlightWarmups.delete(warmupKey);
    });

  inFlightWarmups.set(warmupKey, warmupPromise);
  return warmupPromise;
}

export async function primeWorkspaceExperienceWithinBudget(
  session: AuthSession,
  budgetMs = 700,
) {
  const warmup = primeWorkspaceExperience(session, { force: true });

  await Promise.race([warmup, delay(Math.max(budgetMs, 0))]);
}
