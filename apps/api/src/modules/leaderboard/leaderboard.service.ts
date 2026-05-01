import { Injectable } from "@nestjs/common";
import {
  EmployeeStatus,
  Prisma,
  RequestStatus,
  RequestType,
  ShiftStatus,
  TaskStatus,
} from "@prisma/client";
import { CollaborationService } from "../collaboration/collaboration.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  buildDemoLeaderboardCelebration,
  buildDemoLeaderboardOverview,
  isDemoLeaderboardEmail,
} from "./leaderboard.mock";
import type { UpdateLeaderboardSettingsDto } from "./dto/update-leaderboard-settings.dto";
import type {
  LeaderboardCelebration,
  LeaderboardDailyActivity,
  LeaderboardEntry,
  LeaderboardOverviewResponse,
  LeaderboardProgressMetric,
} from "./leaderboard.types";

const TASK_META_MARKER = "[smart-task-meta]";
const LEADERBOARD_CHECK_IN_POINTS = 5;
const LEADERBOARD_CHECK_OUT_POINTS = 5;
const LEADERBOARD_TASK_FULL_POINTS = 5;
const LEADERBOARD_TASK_PARTIAL_POINTS = 3;
const LEADERBOARD_DAILY_MAX_POINTS = 15;
const LEADERBOARD_CHECK_OUT_TOLERANCE_MINUTES = 5;
const LEADERBOARD_TASK_LOOKBACK_DAYS = 31;
const LEADERBOARD_STREAK_LOOKBACK_DAYS = 120;
const STREAK_BONUSES = new Map<number, 10 | 20 | 30>([
  [5, 10],
  [10, 20],
  [20, 30],
]);
const MANAGER_ROLE_CODES = new Set([
  "tenant_owner",
  "hr_admin",
  "operations_admin",
  "manager",
]);

const NAMED_ENTITY_SELECT = {
  id: true,
  name: true,
} satisfies Prisma.DepartmentSelect;

const LOCATION_SELECT = {
  id: true,
  name: true,
  timezone: true,
} satisfies Prisma.LocationSelect;

const VIEWER_EMPLOYEE_SELECT = {
  id: true,
  tenantId: true,
  firstName: true,
  lastName: true,
  employeeNumber: true,
  avatarUrl: true,
  user: {
    select: {
      email: true,
      roles: {
        include: {
          role: true,
        },
      },
    },
  },
  department: {
    select: NAMED_ENTITY_SELECT,
  },
  position: {
    select: NAMED_ENTITY_SELECT,
  },
  primaryLocation: {
    select: LOCATION_SELECT,
  },
} satisfies Prisma.EmployeeSelect;

const TEAM_EMPLOYEE_SELECT = {
  ...VIEWER_EMPLOYEE_SELECT,
  user: {
    select: {
      email: true,
    },
  },
} satisfies Prisma.EmployeeSelect;

type NamedEntity = {
  id: string;
  name: string;
};

type ViewerEmployee = {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  avatarUrl: string | null;
  user: {
    email: string;
    roles: Array<{
      role: {
        code: string;
      };
    }>;
  };
  department: NamedEntity | null;
  position: NamedEntity | null;
  primaryLocation: (NamedEntity & { timezone: string }) | null;
};

type TeamEmployee = Omit<ViewerEmployee, "user"> & {
  user: {
    email: string;
  };
};
type EmployeeShift = Prisma.ShiftGetPayload<{
  include: {
    template: true;
  };
}>;
type EmployeeSession = Prisma.AttendanceSessionGetPayload<{
  include: {
    shift: {
      include: {
        template: true;
      };
    };
    checkInEvent: true;
    checkOutEvent: true;
  };
}>;
type ApprovedLeave = Prisma.EmployeeRequestGetPayload<{}>;
type EmployeeTask = Awaited<
  ReturnType<CollaborationService["listEmployeeTasksForRange"]>
>[number];

type MonthContext = {
  monthKey: string;
  monthStart: Date;
  monthEnd: Date;
  taskLookbackStart: Date;
  streakLookbackStart: Date;
  todayKey: string;
  monthKeys: string[];
};

type TaskDayEvaluation = {
  earnedPoints: number;
  dueTaskCount: number;
  completedDueTaskCount: number;
  dueChecklistItemCount: number;
  completedDueChecklistItemCount: number;
  overdueCount: number;
};

type StreakState = {
  currentStreak: number;
  arrivalByDayKey: Map<string, boolean>;
  bonusByDayKey: Map<string, number>;
};

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collaborationService: CollaborationService,
  ) {}

  async getOverview(
    userId: string,
    requestedMonthKey?: string | null,
  ): Promise<LeaderboardOverviewResponse> {
    const viewer = await this.loadViewerEmployee(userId);
    const canManageLeaderboard = this.hasManagerAccess(viewer);

    if (isDemoLeaderboardEmail(viewer.user.email)) {
      return buildDemoLeaderboardOverview(
        viewer.user.email,
        requestedMonthKey,
        canManageLeaderboard,
      );
    }

    const context = this.createMonthContext(requestedMonthKey);
    const [employees, tenantSettings] = await Promise.all([
      this.loadTeamEmployees(viewer.tenantId, viewer.id),
      this.prisma.tenant.findUnique({
        where: { id: viewer.tenantId },
        select: { hideLeaderboardPeersFromEmployees: true },
      }).catch(() => null),
    ]);
    const employeeIds = employees.map((employee) => employee.id);
    const hidePeersFromEmployees =
      tenantSettings?.hideLeaderboardPeersFromEmployees ?? false;
    const peersHiddenForViewer =
      hidePeersFromEmployees && !canManageLeaderboard;

    const [shifts, sessions, approvedLeaves, taskBuckets] = await Promise.all([
      this.loadShifts(
        viewer.tenantId,
        employeeIds,
        context.streakLookbackStart,
        context.monthEnd,
      ),
      this.loadSessions(
        viewer.tenantId,
        employeeIds,
        context.streakLookbackStart,
        context.monthEnd,
      ),
      this.loadApprovedLeaves(
        viewer.tenantId,
        employeeIds,
        context.streakLookbackStart,
        context.monthEnd,
      ),
      Promise.all(
        employees.map(async (employee) => {
          try {
            const tasks =
              await this.collaborationService.listEmployeeTasksForRange(
                employee.id,
                {
                  dateFrom: this.formatDateKey(context.taskLookbackStart),
                  dateTo: context.todayKey,
                },
              );
            return {
              employeeId: employee.id,
              tasks,
            };
          } catch {
            return {
              employeeId: employee.id,
              tasks: [] as EmployeeTask[],
            };
          }
        }),
      ),
    ]);

    const shiftsByEmployee = this.groupBy(shifts, (item) => item.employeeId);
    const sessionsByEmployee = this.groupBy(
      sessions,
      (item) => item.employeeId,
    );
    const leavesByEmployee = this.groupBy(
      approvedLeaves,
      (item) => item.employeeId,
    );
    const tasksByEmployee = new Map<string, EmployeeTask[]>();
    taskBuckets.forEach((bucket) => {
      tasksByEmployee.set(bucket.employeeId, bucket.tasks);
    });

    const computed = employees.map((employee) =>
      this.buildEmployeeSnapshot(
        employee,
        context,
        shiftsByEmployee.get(employee.id) ?? [],
        sessionsByEmployee.get(employee.id) ?? [],
        leavesByEmployee.get(employee.id) ?? [],
        tasksByEmployee.get(employee.id) ?? [],
      ),
    );

    const ranked = computed
      .sort((left, right) => this.compareEntries(left.entry, right.entry))
      .map((item, index) => ({
        ...item,
        entry: {
          ...item.entry,
          rank: index + 1,
        },
      }));

    const me = ranked.find((item) => item.entry.employee.id === viewer.id) ??
      ranked[0] ?? {
        entry: {
          rank: 1,
          employee: {
            id: viewer.id,
            firstName: viewer.firstName,
            lastName: viewer.lastName,
            employeeNumber: viewer.employeeNumber,
            avatarUrl: viewer.avatarUrl ?? null,
            department: viewer.department
              ? {
                  id: viewer.department.id,
                  name: viewer.department.name,
                }
              : null,
            position: viewer.position
              ? {
                  id: viewer.position.id,
                  name: viewer.position.name,
                }
              : null,
          },
          points: 0,
          todayPoints: 0,
          streak: 0,
        },
        progress: this.createEmptyProgress(),
        dailyActivity: [],
      };

    return {
      month: {
        key: context.monthKey,
        startsAt: context.monthStart.toISOString(),
        endsAt: context.monthEnd.toISOString(),
        todayKey: context.todayKey,
      },
      summary: {
        participants: ranked.length,
        maxDailyPoints: LEADERBOARD_DAILY_MAX_POINTS,
      },
      me: {
        employeeId: me.entry.employee.id,
        rank: me.entry.rank,
        points: me.entry.points,
        todayPoints: me.entry.todayPoints,
        todayMaxPoints: LEADERBOARD_DAILY_MAX_POINTS,
        streak: me.entry.streak,
        progress: me.progress,
        dailyActivity: me.dailyActivity,
      },
      leaderboard: this.applyLeaderboardVisibility(
        ranked.map((item) => item.entry),
        viewer.id,
        peersHiddenForViewer,
      ),
      visibility: {
        hidePeersFromEmployees,
        canManage: canManageLeaderboard,
        peersHiddenForViewer,
      },
    };
  }

  async updateSettings(userId: string, dto: UpdateLeaderboardSettingsDto) {
    const viewer = await this.loadViewerEmployee(userId);
    const tenant = await this.prisma.tenant.update({
      where: { id: viewer.tenantId },
      data: {
        hideLeaderboardPeersFromEmployees: dto.hidePeersFromEmployees,
      },
      select: {
        hideLeaderboardPeersFromEmployees: true,
      },
    });

    return {
      hidePeersFromEmployees: tenant.hideLeaderboardPeersFromEmployees,
    };
  }

  async getCheckInCelebration(
    userId: string,
  ): Promise<LeaderboardCelebration | null> {
    const viewer = await this.loadViewerEmployee(userId);

    if (isDemoLeaderboardEmail(viewer.user.email)) {
      return buildDemoLeaderboardCelebration(viewer.user.email);
    }

    const context = this.createMonthContext();
    const [shifts, sessions, approvedLeaves] = await Promise.all([
      this.loadShifts(
        viewer.tenantId,
        [viewer.id],
        context.streakLookbackStart,
        context.monthEnd,
      ),
      this.loadSessions(
        viewer.tenantId,
        [viewer.id],
        context.streakLookbackStart,
        context.monthEnd,
      ),
      this.loadApprovedLeaves(
        viewer.tenantId,
        [viewer.id],
        context.streakLookbackStart,
        context.monthEnd,
      ),
    ]);

    const streakState = this.buildArrivalStreakState(
      viewer.primaryLocation?.timezone ?? null,
      context,
      shifts,
      sessions,
      approvedLeaves,
    );
    const streakDays = streakState.currentStreak as 5 | 10 | 20;
    const bonusPoints = STREAK_BONUSES.get(streakState.currentStreak);

    if (
      !bonusPoints ||
      streakState.arrivalByDayKey.get(context.todayKey) !== true
    ) {
      return null;
    }

    const overview = await this.getOverview(userId);
    return {
      kind: "ARRIVAL_STREAK_BONUS",
      streakDays,
      bonusPoints,
      monthPoints: overview.me.points,
    };
  }

  private async loadViewerEmployee(userId: string) {
    return this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      select: VIEWER_EMPLOYEE_SELECT,
    });
  }

  private async loadTeamEmployees(tenantId: string, viewerEmployeeId: string) {
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        status: EmployeeStatus.ACTIVE,
      },
      select: TEAM_EMPLOYEE_SELECT,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    if (employees.some((employee) => employee.id === viewerEmployeeId)) {
      return employees;
    }

    const viewer = await this.prisma.employee.findUnique({
      where: { id: viewerEmployeeId },
      select: TEAM_EMPLOYEE_SELECT,
    });

    return viewer ? [...employees, viewer] : employees;
  }

  private hasManagerAccess(viewer: ViewerEmployee) {
    return viewer.user.roles.some((assignment) =>
      MANAGER_ROLE_CODES.has(assignment.role.code),
    );
  }

  private applyLeaderboardVisibility(
    entries: LeaderboardEntry[],
    viewerEmployeeId: string,
    peersHiddenForViewer: boolean,
  ) {
    if (!peersHiddenForViewer) {
      return entries;
    }

    return entries.map((entry) => {
      if (entry.employee.id === viewerEmployeeId) {
        return entry;
      }

      return {
        rank: entry.rank,
        isPrivate: true,
        employee: {
          id: `private-rank-${entry.rank}`,
          firstName: "",
          lastName: "",
          employeeNumber: "",
          avatarUrl: null,
          department: null,
          position: null,
        },
        points: 0,
        todayPoints: 0,
        streak: 0,
      } satisfies LeaderboardEntry;
    });
  }

  private async loadShifts(
    tenantId: string,
    employeeIds: string[],
    start: Date,
    end: Date,
  ) {
    return this.prisma.shift.findMany({
      where: {
        tenantId,
        employeeId: { in: employeeIds },
        status: ShiftStatus.PUBLISHED,
        shiftDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        template: true,
      },
      orderBy: [{ shiftDate: "asc" }, { startsAt: "asc" }],
    });
  }

  private async loadSessions(
    tenantId: string,
    employeeIds: string[],
    start: Date,
    end: Date,
  ) {
    return this.prisma.attendanceSession.findMany({
      where: {
        tenantId,
        employeeId: { in: employeeIds },
        startedAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        shift: {
          include: {
            template: true,
          },
        },
        checkInEvent: true,
        checkOutEvent: true,
      },
      orderBy: [{ startedAt: "asc" }],
    });
  }

  private async loadApprovedLeaves(
    tenantId: string,
    employeeIds: string[],
    start: Date,
    end: Date,
  ) {
    return this.prisma.employeeRequest.findMany({
      where: {
        tenantId,
        employeeId: { in: employeeIds },
        status: RequestStatus.APPROVED,
        requestType: {
          in: [
            RequestType.LEAVE,
            RequestType.SICK_LEAVE,
            RequestType.UNPAID_LEAVE,
          ],
        },
        startsOn: {
          lte: end,
        },
        endsOn: {
          gte: start,
        },
      },
      orderBy: [{ startsOn: "asc" }],
    });
  }

  private buildEmployeeSnapshot(
    employee: TeamEmployee,
    context: MonthContext,
    shifts: EmployeeShift[],
    sessions: EmployeeSession[],
    approvedLeaves: ApprovedLeave[],
    tasks: EmployeeTask[],
  ) {
    const timeZone = employee.primaryLocation?.timezone ?? null;
    const shiftByDayKey = this.buildShiftByDayKey(shifts, timeZone);
    const sessionByShiftId = new Map(
      sessions
        .filter((session) => session.shiftId)
        .map((session) => [session.shiftId as string, session] as const),
    );
    const streakState = this.buildArrivalStreakState(
      timeZone,
      context,
      shifts,
      sessions,
      approvedLeaves,
    );

    let points = 0;
    const dailyActivity: LeaderboardDailyActivity[] = [];

    for (const dayKey of context.monthKeys) {
      const shift = shiftByDayKey.get(dayKey) ?? null;
      const session = shift ? (sessionByShiftId.get(shift.id) ?? null) : null;
      const taskDay = this.evaluateTaskDay(tasks, dayKey, timeZone);
      const onTimeArrival = this.isOnTimeArrival(session, shift);
      const onTimeDeparture = this.isOnTimeDeparture(session, shift);
      const dailyPoints =
        (onTimeArrival ? LEADERBOARD_CHECK_IN_POINTS : 0) +
        (onTimeDeparture ? LEADERBOARD_CHECK_OUT_POINTS : 0) +
        taskDay.earnedPoints;

      points += dailyPoints + (streakState.bonusByDayKey.get(dayKey) ?? 0);
      dailyActivity.push({
        dayKey,
        earnedPoints: dailyPoints,
        maxPoints: LEADERBOARD_DAILY_MAX_POINTS,
        completed: dailyPoints >= LEADERBOARD_DAILY_MAX_POINTS,
        onTimeArrival,
        hadShift: Boolean(shift),
      });
    }

    const todayShift = shiftByDayKey.get(context.todayKey) ?? null;
    const todaySession = todayShift
      ? (sessionByShiftId.get(todayShift.id) ?? null)
      : null;
    const todayTask = this.evaluateTaskDay(tasks, context.todayKey, timeZone);
    const progress = this.buildTodayProgress(
      todayShift,
      todaySession,
      todayTask,
    );
    const todayPoints = progress.reduce(
      (sum, item) => sum + item.earnedPoints,
      0,
    );

    return {
      entry: {
        rank: 0,
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeNumber: employee.employeeNumber,
          avatarUrl: employee.avatarUrl ?? null,
          department: employee.department
            ? {
                id: employee.department.id,
                name: employee.department.name,
              }
            : null,
          position: employee.position
            ? {
                id: employee.position.id,
                name: employee.position.name,
              }
            : null,
        },
        points,
        todayPoints,
        streak: streakState.currentStreak,
      } satisfies LeaderboardEntry,
      progress,
      dailyActivity,
    };
  }

  private buildTodayProgress(
    shift: EmployeeShift | null,
    session: EmployeeSession | null,
    taskDay: TaskDayEvaluation,
  ): LeaderboardProgressMetric[] {
    return [
      {
        key: "on_time_arrival",
        earnedPoints: this.isOnTimeArrival(session, shift)
          ? LEADERBOARD_CHECK_IN_POINTS
          : 0,
        maxPoints: LEADERBOARD_CHECK_IN_POINTS,
        completed: this.isOnTimeArrival(session, shift),
        details: {
          checkedAt: session?.checkInEvent?.occurredAt.toISOString() ?? null,
          shiftBoundaryAt: shift?.startsAt.toISOString() ?? null,
          dueTaskCount: 0,
          completedDueTaskCount: 0,
          dueChecklistItemCount: 0,
          completedDueChecklistItemCount: 0,
          overdueCount: 0,
        },
      },
      {
        key: "on_time_departure",
        earnedPoints: this.isOnTimeDeparture(session, shift)
          ? LEADERBOARD_CHECK_OUT_POINTS
          : 0,
        maxPoints: LEADERBOARD_CHECK_OUT_POINTS,
        completed: this.isOnTimeDeparture(session, shift),
        details: {
          checkedAt: session?.checkOutEvent?.occurredAt.toISOString() ?? null,
          shiftBoundaryAt: shift?.endsAt.toISOString() ?? null,
          dueTaskCount: 0,
          completedDueTaskCount: 0,
          dueChecklistItemCount: 0,
          completedDueChecklistItemCount: 0,
          overdueCount: 0,
        },
      },
      {
        key: "tasks_and_checklists",
        earnedPoints: taskDay.earnedPoints,
        maxPoints: LEADERBOARD_TASK_FULL_POINTS,
        completed: taskDay.earnedPoints === LEADERBOARD_TASK_FULL_POINTS,
        details: {
          checkedAt: null,
          shiftBoundaryAt: null,
          dueTaskCount: taskDay.dueTaskCount,
          completedDueTaskCount: taskDay.completedDueTaskCount,
          dueChecklistItemCount: taskDay.dueChecklistItemCount,
          completedDueChecklistItemCount:
            taskDay.completedDueChecklistItemCount,
          overdueCount: taskDay.overdueCount,
        },
      },
    ];
  }

  private buildArrivalStreakState(
    timeZone: string | null,
    context: MonthContext,
    shifts: EmployeeShift[],
    sessions: EmployeeSession[],
    approvedLeaves: ApprovedLeave[],
  ): StreakState {
    const shiftByDayKey = this.buildShiftByDayKey(shifts, timeZone);
    const ordered = Array.from(shiftByDayKey.entries())
      .filter(([dayKey]) => dayKey <= context.todayKey)
      .sort((left, right) => left[0].localeCompare(right[0]));
    const sessionByShiftId = new Map(
      sessions
        .filter((session) => session.shiftId)
        .map((session) => [session.shiftId as string, session] as const),
    );
    const arrivalByDayKey = new Map<string, boolean>();
    const bonusByDayKey = new Map<string, number>();
    let streak = 0;

    for (const [dayKey, shift] of ordered) {
      if (this.isApprovedLeaveDay(dayKey, approvedLeaves, timeZone)) {
        continue;
      }

      const session = sessionByShiftId.get(shift.id) ?? null;
      const onTimeArrival = this.isOnTimeArrival(session, shift);
      arrivalByDayKey.set(dayKey, onTimeArrival);

      if (!onTimeArrival) {
        streak = 0;
        continue;
      }

      streak += 1;
      const bonus = STREAK_BONUSES.get(streak);
      if (bonus && dayKey >= context.monthKeys[0]) {
        bonusByDayKey.set(dayKey, bonus);
      }
    }

    return {
      currentStreak: streak,
      arrivalByDayKey,
      bonusByDayKey,
    };
  }

  private buildShiftByDayKey(shifts: EmployeeShift[], timeZone: string | null) {
    const map = new Map<string, EmployeeShift>();

    for (const shift of shifts) {
      const dayKey = this.formatDateKeyInTimeZone(shift.shiftDate, timeZone);
      const current = map.get(dayKey);

      if (!current || current.startsAt.getTime() > shift.startsAt.getTime()) {
        map.set(dayKey, shift);
      }
    }

    return map;
  }

  private evaluateTaskDay(
    tasks: EmployeeTask[],
    dayKey: string,
    timeZone: string | null,
  ): TaskDayEvaluation {
    const relevantTasks = tasks.filter((task) => !this.isMeetingTask(task));
    const dueTodayTasks = relevantTasks.filter(
      (task) => this.getTaskAnchorDayKey(task, timeZone) === dayKey,
    );
    const completedDueTaskCount = dueTodayTasks.filter((task) =>
      this.isTaskCompletedByDayKey(task, dayKey, timeZone),
    ).length;
    const dueChecklistItemCount = dueTodayTasks.reduce(
      (total, task) => total + task.checklistItems.length,
      0,
    );
    const completedDueChecklistItemCount = dueTodayTasks.reduce(
      (total, task) =>
        total + task.checklistItems.filter((item) => item.isCompleted).length,
      0,
    );
    const overdueCount = relevantTasks.filter((task) =>
      this.isTaskOverdueOnDayKey(task, dayKey, timeZone),
    ).length;
    const allDueTasksCompleted = dueTodayTasks.every((task) =>
      this.isTaskCompletedByDayKey(task, dayKey, timeZone),
    );

    return {
      earnedPoints: allDueTasksCompleted
        ? overdueCount > 0
          ? LEADERBOARD_TASK_PARTIAL_POINTS
          : LEADERBOARD_TASK_FULL_POINTS
        : 0,
      dueTaskCount: dueTodayTasks.length,
      completedDueTaskCount,
      dueChecklistItemCount,
      completedDueChecklistItemCount,
      overdueCount,
    };
  }

  private isMeetingTask(task: Pick<EmployeeTask, "description" | "title">) {
    const description = task.description?.trim() ?? "";
    const markerIndex = description.lastIndexOf(TASK_META_MARKER);
    if (markerIndex === -1) {
      return false;
    }

    const metaRaw = description
      .slice(markerIndex + TASK_META_MARKER.length)
      .trim();
    if (!metaRaw) {
      return false;
    }

    try {
      const parsed = JSON.parse(metaRaw) as { kind?: string };
      return parsed.kind === "meeting";
    } catch {
      return false;
    }
  }

  private isTaskCompletedByDayKey(
    task: Pick<EmployeeTask, "status" | "completedAt">,
    dayKey: string,
    timeZone: string | null,
  ) {
    if (task.status !== TaskStatus.DONE) {
      return false;
    }

    if (!task.completedAt) {
      return true;
    }

    return (
      this.formatDateKeyInTimeZone(new Date(task.completedAt), timeZone) <=
      dayKey
    );
  }

  private isTaskOverdueOnDayKey(
    task: Pick<EmployeeTask, "status" | "dueAt" | "completedAt">,
    dayKey: string,
    timeZone: string | null,
  ) {
    if (!task.dueAt || task.status === TaskStatus.CANCELLED) {
      return false;
    }

    const dueDayKey = this.formatDateKeyInTimeZone(
      new Date(task.dueAt),
      timeZone,
    );
    if (dueDayKey >= dayKey) {
      return false;
    }

    if (task.status === TaskStatus.DONE && task.completedAt) {
      const completedDayKey = this.formatDateKeyInTimeZone(
        new Date(task.completedAt),
        timeZone,
      );
      return completedDayKey > dayKey;
    }

    return task.status !== TaskStatus.DONE;
  }

  private getTaskAnchorDayKey(
    task: {
      dueAt: string | Date | null;
      occurrenceDate?: string | Date | null;
      createdAt: string | Date;
    },
    timeZone: string | null,
  ) {
    const candidates = [task.dueAt, task.occurrenceDate, task.createdAt];

    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }

      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) {
        return this.formatDateKeyInTimeZone(parsed, timeZone);
      }
    }

    return "";
  }

  private isOnTimeArrival(
    session: EmployeeSession | null,
    shift: EmployeeShift | null,
  ) {
    if (!session?.checkInEvent || !shift?.template) {
      return false;
    }

    const graceMs = shift.template.gracePeriodMinutes * 60_000;
    return (
      session.checkInEvent.occurredAt.getTime() <=
      shift.startsAt.getTime() + graceMs
    );
  }

  private isOnTimeDeparture(
    session: EmployeeSession | null,
    shift: EmployeeShift | null,
  ) {
    if (!session?.checkOutEvent || !shift) {
      return false;
    }

    const toleranceMs = LEADERBOARD_CHECK_OUT_TOLERANCE_MINUTES * 60_000;
    return (
      session.checkOutEvent.occurredAt.getTime() >=
      shift.endsAt.getTime() - toleranceMs
    );
  }

  private isApprovedLeaveDay(
    dayKey: string,
    approvedLeaves: ApprovedLeave[],
    timeZone: string | null,
  ) {
    return approvedLeaves.some((request) => {
      const startKey = this.formatDateKeyInTimeZone(request.startsOn, timeZone);
      const endKey = this.formatDateKeyInTimeZone(request.endsOn, timeZone);
      return startKey <= dayKey && endKey >= dayKey;
    });
  }

  private createMonthContext(requestedMonthKey?: string | null): MonthContext {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const requestedMonthStart = this.parseMonthKey(requestedMonthKey);
    const monthStart =
      requestedMonthStart &&
      requestedMonthStart.getTime() <= currentMonthStart.getTime()
        ? requestedMonthStart
        : currentMonthStart;
    const monthEnd = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const evaluationEnd =
      monthStart.getFullYear() === now.getFullYear() &&
      monthStart.getMonth() === now.getMonth()
        ? now
        : monthEnd;
    const taskLookbackStart = this.addDays(
      monthStart,
      -LEADERBOARD_TASK_LOOKBACK_DAYS,
    );
    const streakLookbackStart = this.addDays(
      monthStart,
      -LEADERBOARD_STREAK_LOOKBACK_DAYS,
    );

    return {
      monthKey: this.formatDateKey(monthStart).slice(0, 7),
      monthStart,
      monthEnd,
      taskLookbackStart,
      streakLookbackStart,
      todayKey: this.formatDateKey(evaluationEnd),
      monthKeys: this.buildDateKeyRange(monthStart, evaluationEnd),
    };
  }

  private buildDateKeyRange(start: Date, end: Date) {
    const result: string[] = [];
    let cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);

    const boundary = new Date(end);
    boundary.setHours(0, 0, 0, 0);

    while (cursor.getTime() <= boundary.getTime()) {
      result.push(this.formatDateKey(cursor));
      cursor = this.addDays(cursor, 1);
    }

    return result;
  }

  private compareEntries(left: LeaderboardEntry, right: LeaderboardEntry) {
    if (right.points !== left.points) {
      return right.points - left.points;
    }

    if (right.todayPoints !== left.todayPoints) {
      return right.todayPoints - left.todayPoints;
    }

    if (right.streak !== left.streak) {
      return right.streak - left.streak;
    }

    const leftName =
      `${left.employee.lastName} ${left.employee.firstName}`.trim();
    const rightName =
      `${right.employee.lastName} ${right.employee.firstName}`.trim();
    return leftName.localeCompare(rightName, "ru");
  }

  private createEmptyProgress(): LeaderboardProgressMetric[] {
    return [
      {
        key: "on_time_arrival",
        earnedPoints: 0,
        maxPoints: LEADERBOARD_CHECK_IN_POINTS,
        completed: false,
        details: {
          checkedAt: null,
          shiftBoundaryAt: null,
          dueTaskCount: 0,
          completedDueTaskCount: 0,
          dueChecklistItemCount: 0,
          completedDueChecklistItemCount: 0,
          overdueCount: 0,
        },
      },
      {
        key: "on_time_departure",
        earnedPoints: 0,
        maxPoints: LEADERBOARD_CHECK_OUT_POINTS,
        completed: false,
        details: {
          checkedAt: null,
          shiftBoundaryAt: null,
          dueTaskCount: 0,
          completedDueTaskCount: 0,
          dueChecklistItemCount: 0,
          completedDueChecklistItemCount: 0,
          overdueCount: 0,
        },
      },
      {
        key: "tasks_and_checklists",
        earnedPoints: 0,
        maxPoints: LEADERBOARD_TASK_FULL_POINTS,
        completed: false,
        details: {
          checkedAt: null,
          shiftBoundaryAt: null,
          dueTaskCount: 0,
          completedDueTaskCount: 0,
          dueChecklistItemCount: 0,
          completedDueChecklistItemCount: 0,
          overdueCount: 0,
        },
      },
    ];
  }

  private groupBy<T>(items: T[], getKey: (item: T) => string) {
    const map = new Map<string, T[]>();

    for (const item of items) {
      const key = getKey(item);
      const current = map.get(key);
      if (current) {
        current.push(item);
      } else {
        map.set(key, [item]);
      }
    }

    return map;
  }

  private addDays(value: Date, amount: number) {
    const next = new Date(value);
    next.setDate(next.getDate() + amount);
    return next;
  }

  private parseMonthKey(value?: string | null) {
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

  private formatDateKey(value: Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  private formatDateKeyInTimeZone(value: Date, timeZone?: string | null) {
    if (!timeZone) {
      return this.formatDateKey(value);
    }

    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const parts = formatter.formatToParts(value);
      const year = parts.find((part) => part.type === "year")?.value;
      const month = parts.find((part) => part.type === "month")?.value;
      const day = parts.find((part) => part.type === "day")?.value;

      if (year && month && day) {
        return `${year}-${month}-${day}`;
      }

      return this.formatDateKey(value);
    } catch {
      return this.formatDateKey(value);
    }
  }
}
