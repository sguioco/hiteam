import type {
  LeaderboardCelebration,
  LeaderboardDailyActivity,
  LeaderboardEntry,
  LeaderboardOverviewResponse,
  LeaderboardProgressMetric,
} from "./leaderboard.types";

const DEMO_OWNER_EMAIL = "owner@demo.smart";
const DEMO_EMPLOYEE_EMAIL = "employee@demo.smart";

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}

function parseMonthKey(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  const match = /^(\d{4})-(\d{2})$/.exec(trimmed);

  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1] ?? "", 10);
  const monthIndex = Number.parseInt(match[2] ?? "", 10) - 1;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return null;
  }

  return new Date(year, monthIndex, 1);
}

function createMonthPayload(monthKey?: string | null) {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const requestedMonthStart = parseMonthKey(monthKey);
  const monthStart =
    requestedMonthStart &&
    requestedMonthStart.getTime() <= currentMonthStart.getTime()
      ? requestedMonthStart
      : currentMonthStart;
  const anchorDate =
    monthStart.getFullYear() === now.getFullYear() &&
    monthStart.getMonth() === now.getMonth()
      ? now
      : endOfMonth(monthStart);

  return {
    key: formatDateKey(monthStart).slice(0, 7),
    startsAt: monthStart.toISOString(),
    endsAt: endOfMonth(monthStart).toISOString(),
    todayKey: formatDateKey(anchorDate),
  };
}

function createProgress(input: {
  arrival: number;
  departure: number;
  tasks: number;
  dueTaskCount: number;
  completedDueTaskCount: number;
  dueChecklistItemCount: number;
  completedDueChecklistItemCount: number;
  overdueCount: number;
}): LeaderboardProgressMetric[] {
  const now = new Date();
  const shiftStart = new Date(now);
  shiftStart.setHours(9, 0, 0, 0);
  const shiftEnd = new Date(now);
  shiftEnd.setHours(18, 0, 0, 0);
  const checkInAt = new Date(now);
  checkInAt.setHours(8, 56, 0, 0);

  return [
    {
      key: "on_time_arrival",
      earnedPoints: input.arrival,
      maxPoints: 5,
      completed: input.arrival === 5,
      details: {
        checkedAt: input.arrival > 0 ? checkInAt.toISOString() : null,
        shiftBoundaryAt: shiftStart.toISOString(),
        dueTaskCount: 0,
        completedDueTaskCount: 0,
        dueChecklistItemCount: 0,
        completedDueChecklistItemCount: 0,
        overdueCount: 0,
      },
    },
    {
      key: "on_time_departure",
      earnedPoints: input.departure,
      maxPoints: 5,
      completed: input.departure === 5,
      details: {
        checkedAt: null,
        shiftBoundaryAt: shiftEnd.toISOString(),
        dueTaskCount: 0,
        completedDueTaskCount: 0,
        dueChecklistItemCount: 0,
        completedDueChecklistItemCount: 0,
        overdueCount: 0,
      },
    },
    {
      key: "tasks_and_checklists",
      earnedPoints: input.tasks,
      maxPoints: 5,
      completed: input.tasks === 5,
      details: {
        checkedAt: null,
        shiftBoundaryAt: null,
        dueTaskCount: input.dueTaskCount,
        completedDueTaskCount: input.completedDueTaskCount,
        dueChecklistItemCount: input.dueChecklistItemCount,
        completedDueChecklistItemCount: input.completedDueChecklistItemCount,
        overdueCount: input.overdueCount,
      },
    },
  ];
}

function createEntries(): LeaderboardEntry[] {
  const source = [
    [
      "emp-demo-01",
      "Mia",
      "Sokolova",
      "EMP-4101",
      "Operations",
      "Shift Lead",
      196,
      15,
      20,
    ],
    [
      "emp-demo-02",
      "Alex",
      "Petrov",
      "EMP-4102",
      "Operations",
      "Owner",
      178,
      10,
      10,
    ],
    [
      "emp-demo-03",
      "Denis",
      "Fedorov",
      "EMP-4103",
      "Support",
      "Team Lead",
      171,
      13,
      8,
    ],
    [
      "emp-demo-04",
      "Alexey",
      "Mironov",
      "EMP-4104",
      "Retail",
      "Consultant",
      149,
      8,
      5,
    ],
    [
      "emp-demo-05",
      "Sofia",
      "Orlova",
      "EMP-4105",
      "Retail",
      "Senior Associate",
      143,
      10,
      4,
    ],
    [
      "emp-demo-06",
      "Ilya",
      "Petrov",
      "EMP-4106",
      "Logistics",
      "Dispatcher",
      139,
      13,
      4,
    ],
    [
      "emp-demo-07",
      "Elena",
      "Morozova",
      "EMP-4107",
      "Operations",
      "Coordinator",
      132,
      10,
      3,
    ],
    [
      "emp-demo-08",
      "Maxim",
      "Lebedev",
      "EMP-4108",
      "Warehouse",
      "Shift Coordinator",
      129,
      5,
      3,
    ],
    [
      "emp-demo-09",
      "Alina",
      "Kuznetsova",
      "EMP-4109",
      "Support",
      "Customer Care",
      125,
      8,
      2,
    ],
    [
      "emp-demo-10",
      "Nikita",
      "Rudenko",
      "EMP-4110",
      "Retail",
      "Associate",
      118,
      5,
      2,
    ],
    [
      "emp-demo-11",
      "Yana",
      "Volkova",
      "EMP-4111",
      "Retail",
      "Associate",
      111,
      8,
      2,
    ],
    [
      "emp-demo-12",
      "Kirill",
      "Safonov",
      "EMP-4112",
      "Warehouse",
      "Operator",
      109,
      3,
      1,
    ],
    [
      "emp-demo-13",
      "Eva",
      "Romanova",
      "EMP-4113",
      "Support",
      "Operator",
      102,
      5,
      1,
    ],
    [
      "emp-demo-14",
      "Pavel",
      "Bespalov",
      "EMP-4114",
      "Operations",
      "Operator",
      95,
      5,
      1,
    ],
    [
      "emp-demo-15",
      "Lina",
      "Markina",
      "EMP-4115",
      "Retail",
      "Associate",
      89,
      3,
      0,
    ],
    [
      "emp-demo-16",
      "Timur",
      "Yakovlev",
      "EMP-4116",
      "Warehouse",
      "Operator",
      83,
      0,
      0,
    ],
    [
      "emp-demo-17",
      "Olga",
      "Belova",
      "EMP-4117",
      "Support",
      "Coordinator",
      77,
      0,
      0,
    ],
  ] as const;

  return source.map(
    (
      [
        id,
        firstName,
        lastName,
        employeeNumber,
        departmentName,
        positionName,
        points,
        todayPoints,
        streak,
      ],
      index,
    ) => ({
      rank: index + 1,
      employee: {
        id,
        firstName,
        lastName,
        employeeNumber,
        avatarUrl: null,
        department: {
          id: `department-${departmentName.toLowerCase()}`,
          name: departmentName,
        },
        position: {
          id: `position-${positionName.toLowerCase().replace(/\s+/g, "-")}`,
          name: positionName,
        },
      },
      points,
      todayPoints,
      streak,
    }),
  );
}

function createDailyActivity(
  month: LeaderboardOverviewResponse["month"],
  todayPoints: number,
): LeaderboardDailyActivity[] {
  const anchor = new Date(`${month.todayKey}T00:00:00`);
  const points = [9, 13, 8, 14, 11, 7, todayPoints];

  return points.map((earnedPoints, index) => {
    const day = new Date(anchor);
    day.setDate(anchor.getDate() - (points.length - 1 - index));

    return {
      dayKey: formatDateKey(day),
      earnedPoints,
      maxPoints: 15,
      completed: earnedPoints >= 15,
      onTimeArrival: earnedPoints >= 5,
      hadShift: true,
    };
  });
}

export function isDemoLeaderboardEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();
  return normalized === DEMO_OWNER_EMAIL || normalized === DEMO_EMPLOYEE_EMAIL;
}

export function buildDemoLeaderboardOverview(
  email?: string | null,
  monthKey?: string | null,
  canManage = false,
): LeaderboardOverviewResponse {
  const normalized = email?.trim().toLowerCase();
  const month = createMonthPayload(monthKey);
  const leaderboard = createEntries();
  const meEntry =
    leaderboard.find((entry) =>
      normalized === DEMO_OWNER_EMAIL
        ? entry.employee.firstName === "Alex" &&
          entry.employee.lastName === "Petrov"
        : entry.employee.firstName === "Alexey" &&
          entry.employee.lastName === "Mironov",
    ) ?? leaderboard[0];
  const progress =
    normalized === DEMO_OWNER_EMAIL
      ? createProgress({
          arrival: 5,
          departure: 0,
          tasks: 5,
          dueTaskCount: 4,
          completedDueTaskCount: 4,
          dueChecklistItemCount: 8,
          completedDueChecklistItemCount: 8,
          overdueCount: 0,
        })
      : createProgress({
          arrival: 5,
          departure: 0,
          tasks: 3,
          dueTaskCount: 4,
          completedDueTaskCount: 4,
          dueChecklistItemCount: 8,
          completedDueChecklistItemCount: 6,
          overdueCount: 2,
        });
  const todayPoints = progress.reduce(
    (sum, item) => sum + item.earnedPoints,
    0,
  );

  return {
    month,
    summary: {
      participants: leaderboard.length,
      maxDailyPoints: 15,
    },
    me: {
      employeeId: meEntry.employee.id,
      rank: meEntry.rank,
      points: meEntry.points,
      todayPoints,
      todayMaxPoints: 15,
      streak: meEntry.streak,
      progress,
      dailyActivity: createDailyActivity(month, todayPoints),
    },
    leaderboard,
    visibility: {
      hidePeersFromEmployees: false,
      canManage,
      peersHiddenForViewer: false,
    },
  };
}

export function buildDemoLeaderboardCelebration(
  email?: string | null,
): LeaderboardCelebration | null {
  const normalized = email?.trim().toLowerCase();
  if (normalized === DEMO_OWNER_EMAIL) {
    return {
      kind: "ARRIVAL_STREAK_BONUS",
      streakDays: 10,
      bonusPoints: 20,
      monthPoints: 178,
    };
  }

  if (normalized === DEMO_EMPLOYEE_EMAIL) {
    return {
      kind: "ARRIVAL_STREAK_BONUS",
      streakDays: 5,
      bonusPoints: 10,
      monthPoints: 149,
    };
  }

  return null;
}
