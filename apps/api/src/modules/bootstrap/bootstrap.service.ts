import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { AuditService } from '../audit/audit.service';
import { AttendanceService } from '../attendance/attendance.service';
import { BiometricService } from '../biometric/biometric.service';
import { CollaborationService } from '../collaboration/collaboration.service';
import { EmployeesService } from '../employees/employees.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { OrgService } from '../org/org.service';
import { RequestsService } from '../requests/requests.service';
import { ScheduleService } from '../schedule/schedule.service';
import type { ListManagerTasksQueryDto } from '../collaboration/dto/list-manager-tasks-query.dto';

const ADMIN_ROLES = ['tenant_owner', 'hr_admin', 'operations_admin', 'manager'] as const;

function isEmployeeOnlyRole(roleCodes: string[]) {
  return !roleCodes.some((role) => ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]));
}

function canManageEmployeeRoles(roleCodes: string[]) {
  return roleCodes.some((role) =>
    ['tenant_owner', 'hr_admin', 'operations_admin'].includes(role),
  );
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfMonthLocal(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonthLocal(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

function eachDayBetween(start: Date, end: Date) {
  const result: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    result.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function buildCalendarDays(cursor: Date) {
  const monthStart = startOfMonthLocal(cursor);
  const monthEnd = endOfMonthLocal(cursor);
  const monthDays = eachDayBetween(monthStart, monthEnd);
  const leading = (monthStart.getDay() + 6) % 7;
  const trailing = (7 - ((leading + monthDays.length) % 7)) % 7;

  return [
    ...Array.from({ length: leading }, (_, index) =>
      addDays(monthStart, index - leading),
    ),
    ...monthDays,
    ...Array.from({ length: trailing }, (_, index) =>
      addDays(monthEnd, index + 1),
    ),
  ];
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDayLocal(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function resolveBootstrapTaskRange(dateFrom?: string, dateTo?: string) {
  const today = formatDateKey(new Date());

  return {
    dateFrom: dateFrom ?? dateTo ?? today,
    dateTo: dateTo ?? dateFrom ?? today,
  };
}

function resolveRequestsBootstrapRange(dateFrom?: string, dateTo?: string) {
  const today = new Date();
  const monthStart = startOfMonthLocal(today);
  const monthEnd = endOfMonthLocal(today);

  return {
    dateFrom: dateFrom ?? formatDateKey(monthStart),
    dateTo: dateTo ?? formatDateKey(monthEnd),
  };
}

function resolveCollaborationBootstrapQuery(
  query: Record<string, string | undefined>,
) {
  const days = query.days ? Number(query.days) : 30;
  const taskQuery: ListManagerTasksQueryDto = {
    search: query.search,
    status: query.status as ListManagerTasksQueryDto['status'],
    priority: query.priority as ListManagerTasksQueryDto['priority'],
    groupId: query.groupId,
    assigneeEmployeeId: query.assigneeEmployeeId,
    departmentId: query.departmentId,
    locationId: query.locationId,
    onlyOverdue: query.onlyOverdue,
  };

  return {
    days: Number.isFinite(days) && days > 0 ? days : 30,
    taskQuery,
  };
}

function startOfSixMonthWindow(reference: Date) {
  const next = new Date(reference);
  next.setHours(0, 0, 0, 0);
  next.setMonth(next.getMonth() - 6);
  return next;
}

async function withTimeoutFallback<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

function sortBootstrapTasks<
  T extends {
    status: string;
    dueAt?: string | Date | null;
    createdAt: string | Date;
  },
>(tasks: T[]) {
  return tasks.slice().sort((left, right) => {
    const leftDone =
      left.status === TaskStatus.DONE || left.status === TaskStatus.CANCELLED
        ? 1
        : 0;
    const rightDone =
      right.status === TaskStatus.DONE || right.status === TaskStatus.CANCELLED
        ? 1
        : 0;

    if (leftDone !== rightDone) {
      return leftDone - rightDone;
    }

    const leftDueAt = left.dueAt
      ? new Date(left.dueAt).getTime()
      : Number.POSITIVE_INFINITY;
    const rightDueAt = right.dueAt
      ? new Date(right.dueAt).getTime()
      : Number.POSITIVE_INFINITY;

    if (leftDueAt !== rightDueAt) {
      return leftDueAt - rightDueAt;
    }

    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  });
}

function mergeTaskBoards<
  T extends {
    id: string;
    status: string;
    dueAt?: string | Date | null;
    createdAt: string | Date;
  },
>(boards: Array<{ tasks: T[] } | null>) {
  const availableBoards = boards.filter(
    (board): board is { tasks: T[] } => Boolean(board),
  );

  if (!availableBoards.length) {
    return null;
  }

  const taskMap = new Map<string, T>();

  for (const board of availableBoards) {
    for (const task of board.tasks) {
      taskMap.set(task.id, task);
    }
  }

  const tasks = sortBootstrapTasks(Array.from(taskMap.values()));
  const now = Date.now();

  return {
    totals: {
      total: tasks.length,
      overdue: tasks.filter(
        (task) =>
          task.status !== TaskStatus.DONE &&
          task.status !== TaskStatus.CANCELLED &&
          Boolean(task.dueAt) &&
          new Date(task.dueAt as string | Date).getTime() < now,
      ).length,
      active: tasks.filter(
        (task) =>
          task.status !== TaskStatus.DONE &&
          task.status !== TaskStatus.CANCELLED,
      ).length,
      done: tasks.filter((task) => task.status === TaskStatus.DONE).length,
    },
    tasks,
  };
}

@Injectable()
export class BootstrapService {
  constructor(
    private readonly auditService: AuditService,
    private readonly attendanceService: AttendanceService,
    private readonly biometricService: BiometricService,
    private readonly collaborationService: CollaborationService,
    private readonly employeesService: EmployeesService,
    private readonly leaderboardService: LeaderboardService,
    private readonly orgService: OrgService,
    private readonly requestsService: RequestsService,
    private readonly scheduleService: ScheduleService,
  ) {}

  private async loadDashboardManagerTaskBoard(user: JwtUser) {
    const today = startOfDayLocal(new Date());
    const dateFrom = formatDateKey(today);
    const dateTo = formatDateKey(addDays(today, 6));

    const [upcomingBoard, overdueBoard] = await Promise.all([
      this.collaborationService
        .listManagerTasks(user.sub, {
          dateFrom,
          dateTo,
        })
        .catch(() => null),
      this.collaborationService
        .listManagerTasks(user.sub, {
          onlyOverdue: 'true',
        })
        .catch(() => null),
    ]);

    return mergeTaskBoards([upcomingBoard, overdueBoard]);
  }

  async tasks(user: JwtUser, dateFrom?: string, dateTo?: string) {
    const resolvedRange = resolveBootstrapTaskRange(dateFrom, dateTo);

    const [taskBoard, employees, groups, liveSessions] = await Promise.all([
      this.collaborationService.listManagerTasks(user.sub, resolvedRange).catch(() => null),
      withTimeoutFallback(
        this.employeesService.list(user.tenantId, {}, user.sub).catch(() => []),
        1500,
        [],
      ),
      withTimeoutFallback(
        this.collaborationService.listGroups(user.sub).catch(() => []),
        1200,
        [],
      ),
      withTimeoutFallback(
        this.attendanceService.liveTeam(user.tenantId).catch(() => []),
        1200,
        [],
      ),
    ]);

    return {
      tasks: taskBoard?.tasks ?? [],
      employees,
      groups,
      liveSessions,
    };
  }

  async collaboration(user: JwtUser, query: Record<string, string | undefined>) {
    const { days, taskQuery } = resolveCollaborationBootstrapQuery(query);

    const [
      overview,
      analytics,
      taskBoard,
      automationPolicy,
      taskTemplates,
      announcementTemplates,
      employees,
      announcements,
      chats,
    ] = await Promise.all([
      this.collaborationService.managerOverview(user.sub).catch(() => null),
      this.collaborationService.managerAnalytics(user.sub, days).catch(() => null),
      this.collaborationService.listManagerTasks(user.sub, taskQuery).catch(() => null),
      this.collaborationService.getTaskAutomationPolicy(user.sub).catch(() => null),
      this.collaborationService.listTaskTemplates(user.sub).catch(() => []),
      this.collaborationService.listAnnouncementTemplates(user.sub).catch(() => []),
      this.employeesService.list(user.tenantId, {}, user.sub).catch(() => []),
      this.collaborationService
        .listAnnouncementsForManager(user.sub)
        .catch(() => []),
      this.collaborationService.listChats(user.sub).catch(() => []),
    ]);

    return {
      overview,
      analytics,
      taskBoard,
      automationPolicy,
      taskTemplates,
      announcementTemplates,
      employees,
      announcements,
      chats,
      windowDays: days,
    };
  }

  async attendance(
    user: JwtUser,
    dateFrom = formatDateKey(new Date()),
    dateTo = formatDateKey(new Date()),
  ) {
    const query = { dateFrom, dateTo };

    const [employees, history, anomalies, liveSessions, audit] = await Promise.all([
      this.employeesService.list(user.tenantId, {}, user.sub),
      this.attendanceService.teamHistory(user.tenantId, query),
      this.attendanceService.teamAnomalies(user.tenantId, query),
      this.attendanceService.liveTeam(user.tenantId),
      this.attendanceService.teamAudit(user.tenantId, query),
    ]);

    return {
      employees,
      history,
      anomalies,
      liveSessions,
      audit,
      dateFrom,
      dateTo,
    };
  }

  async employees(user: JwtUser) {
    const [
      employeeRecords,
      liveSessions,
      overview,
      pendingInvitations,
      workdaySnapshot,
      scheduleTemplates,
      organizationSetup,
      groups,
    ] = await Promise.all([
      this.employeesService.list(user.tenantId, {}, user.sub),
      withTimeoutFallback(
        this.attendanceService.liveTeam(user.tenantId).catch(() => []),
        1000,
        [],
      ),
      withTimeoutFallback(
        this.collaborationService.managerOverview(user.sub).catch(() => null),
        1200,
        null,
      ),
      withTimeoutFallback(
        this.employeesService.listPendingInvitations(user.tenantId).catch(() => []),
        1000,
        [],
      ),
      withTimeoutFallback(
        this.scheduleService
          .listShifts(user.tenantId)
          .then((shifts) => ({
            canCheckWorkdays: true,
            scheduleShifts: shifts,
          }))
          .catch(() => ({
            canCheckWorkdays: false,
            scheduleShifts: [],
          })),
        1200,
        {
          canCheckWorkdays: false,
          scheduleShifts: [],
        },
      ),
      withTimeoutFallback(
        this.scheduleService.listTemplates(user.tenantId).catch(() => []),
        1200,
        [],
      ),
      withTimeoutFallback(
        this.orgService.getSetup(user.tenantId).catch(() => ({ company: null })),
        1000,
        { company: null },
      ),
      withTimeoutFallback(
        this.collaborationService.listGroups(user.sub).catch(() => []),
        1000,
        [],
      ),
    ]);

    return {
      employeeRecords,
      liveSessions,
      overview,
      pendingInvitations,
      scheduleShifts: workdaySnapshot.scheduleShifts,
      scheduleTemplates,
      organizationSetup,
      canCheckWorkdays: workdaySnapshot.canCheckWorkdays,
      groups,
    };
  }

  async employeeDetail(user: JwtUser, employeeId: string) {
    const [employee, history, anomalies, biometricHistory, managerAccess] =
      await Promise.all([
        this.employeesService.getById(user.tenantId, employeeId).catch(() => null),
        this.attendanceService
          .employeeHistory(user.tenantId, employeeId, {})
          .catch(() => null),
        this.attendanceService
          .teamAnomalies(user.tenantId, { employeeId })
          .catch(() => null),
        this.biometricService
          .getEmployeeHistory(user.tenantId, employeeId, 50)
          .catch(() => null),
        canManageEmployeeRoles(user.roleCodes)
          ? this.employeesService
              .getManagerAccess(user.tenantId, employeeId)
              .catch(() => null)
          : Promise.resolve(null),
      ]);

    return {
      employeeId,
      employee,
      history,
      anomalies,
      biometricHistory,
      managerAccess,
    };
  }

  async schedule(user: JwtUser, visibleDateFrom?: string, visibleDateTo?: string) {
    const mode = isEmployeeOnlyRole(user.roleCodes) ? 'employee' : 'admin';
    const today = new Date();
    const calendarDays = buildCalendarDays(today);
    const resolvedVisibleDateFrom = visibleDateFrom ?? formatDateInput(calendarDays[0]);
    const resolvedVisibleDateTo =
      visibleDateTo ?? formatDateInput(calendarDays[calendarDays.length - 1]);
    const taskQuery = {
      dateFrom: resolvedVisibleDateFrom,
      dateTo: resolvedVisibleDateTo,
    };

    if (mode === 'employee') {
      const [employeeTasks, shifts] = await Promise.all([
        this.collaborationService.listMyTasks(user.sub, taskQuery),
        this.scheduleService.myShifts(user.sub).catch(() => []),
      ]);

      return {
        mode,
        initialData: {
          mode,
          visibleDateFrom: resolvedVisibleDateFrom,
          visibleDateTo: resolvedVisibleDateTo,
          isMockMode: false,
          templates: [],
          shifts,
          employees: [],
          groups: [],
          locations: [],
          departments: [],
          positions: [],
          requests: [],
          taskBoard: {
            tasks: employeeTasks,
            totals: {
              total: employeeTasks.length,
              overdue: employeeTasks.filter(
                (task) =>
                  task.status !== 'DONE' &&
                  Boolean(task.dueAt) &&
                  new Date(task.dueAt as string).getTime() < Date.now(),
              ).length,
              active: employeeTasks.filter((task) => task.status !== 'DONE').length,
              done: employeeTasks.filter((task) => task.status === 'DONE').length,
            },
          },
        },
      };
    }

    const [
      templates,
      shifts,
      employees,
      groups,
      locations,
      departments,
      positions,
      requests,
      taskBoard,
    ] = await Promise.all([
      this.scheduleService.listTemplates(user.tenantId).catch(() => []),
      this.scheduleService.listShifts(user.tenantId).catch(() => []),
      this.employeesService.list(user.tenantId, {}, user.sub).catch(() => []),
      withTimeoutFallback(
        this.collaborationService.listGroups(user.sub).catch(() => []),
        1200,
        [],
      ),
      withTimeoutFallback(
        this.orgService.listLocations(user.tenantId).catch(() => []),
        1200,
        [],
      ),
      withTimeoutFallback(
        this.orgService.listDepartments(user.tenantId).catch(() => []),
        1200,
        [],
      ),
      withTimeoutFallback(
        this.orgService.listPositions(user.tenantId).catch(() => []),
        1200,
        [],
      ),
      withTimeoutFallback(
        this.requestsService.inbox(user.sub).catch(() => []),
        1200,
        [],
      ),
      withTimeoutFallback(
        this.collaborationService
          .listManagerTasks(user.sub, taskQuery)
          .catch(() => null),
        1500,
        null,
      ),
    ]);

    return {
      mode,
      initialData: {
        mode,
        visibleDateFrom: resolvedVisibleDateFrom,
        visibleDateTo: resolvedVisibleDateTo,
        isMockMode: false,
        templates,
        shifts,
        employees,
        groups,
        locations,
        departments,
        positions,
        requests,
        taskBoard,
      },
    };
  }

  async dashboard(user: JwtUser, dateFrom?: string, dateTo?: string) {
    const mode = isEmployeeOnlyRole(user.roleCodes) ? 'employee' : 'admin';
    const historyQuery =
      dateFrom || dateTo
        ? {
            dateFrom: dateFrom ?? dateTo,
            dateTo: dateTo ?? dateFrom,
          }
        : {
            dateFrom: startOfSixMonthWindow(new Date()).toISOString(),
            dateTo: new Date().toISOString(),
          };
    const taskQuery =
      dateFrom || dateTo
        ? {
            dateFrom,
            dateTo,
          }
        : undefined;

    if (mode === 'employee') {
      const [
        profile,
        attendanceStatus,
        scheduleShifts,
        employeeTasks,
        personalHistory,
      ] = await Promise.all([
        this.employeesService.getMe(user).catch(() => null),
        this.attendanceService.getMyStatus(user.sub).catch(() => null),
        this.scheduleService.myShifts(user.sub).catch(() => []),
        this.collaborationService.listMyTasks(user.sub, taskQuery),
        this.attendanceService.myHistory(user.sub, historyQuery).catch(() => null),
      ]);

      const taskBoard = {
        tasks: employeeTasks,
        totals: {
          total: employeeTasks.length,
          overdue: employeeTasks.filter(
            (task) =>
              task.status !== 'DONE' &&
              Boolean(task.dueAt) &&
              new Date(task.dueAt as string).getTime() < Date.now(),
          ).length,
          active: employeeTasks.filter((task) => task.status !== 'DONE').length,
          done: employeeTasks.filter((task) => task.status === 'DONE').length,
        },
      };

      return {
        mode,
        initialData: {
          profile,
          attendanceStatus,
          liveSessions: [],
          anomalies: null,
          requests: [],
          employees: [],
          groups: [],
          scheduleShifts,
          canCheckWorkdays: false,
          personalHistory,
          taskBoard,
          personalTaskBoard: taskBoard,
        },
      };
    }

    const [
      profile,
      attendanceStatus,
      liveSessions,
      anomalies,
      requests,
      taskBoard,
      personalTasks,
      employees,
      groups,
      scheduleShifts,
      personalHistory,
      dailyActivity,
    ] = await Promise.all([
      this.employeesService.getMe(user).catch(() => null),
      this.attendanceService.getMyStatus(user.sub).catch(() => null),
      this.attendanceService.liveTeam(user.tenantId).catch(() => []),
      this.attendanceService.teamAnomalies(user.tenantId, {}).catch(() => null),
      this.requestsService.inbox(user.sub).catch(() => []),
      this.loadDashboardManagerTaskBoard(user),
      this.collaborationService.listMyTasks(user.sub, taskQuery).catch(() => []),
      this.employeesService.list(user.tenantId, {}, user.sub).catch(() => []),
      this.collaborationService.listGroups(user.sub).catch(() => []),
      this.scheduleService
        .listShifts(user.tenantId)
        .then((result) => ({
          canCheckWorkdays: true,
          scheduleShifts: result,
        }))
        .catch(() => ({
          canCheckWorkdays: false,
          scheduleShifts: [],
        })),
      this.attendanceService.myHistory(user.sub, historyQuery).catch(() => null),
      withTimeoutFallback(
        this.auditService.listCompanyActivity(user.tenantId).catch(() => []),
        1200,
        [],
      ),
    ]);

    return {
      mode,
      initialData: {
        profile,
        attendanceStatus,
        liveSessions,
        anomalies,
        requests,
        taskBoard,
        personalTaskBoard: {
          tasks: personalTasks,
          totals: {
            total: personalTasks.length,
            overdue: personalTasks.filter(
              (task) =>
                task.status !== 'DONE' &&
                Boolean(task.dueAt) &&
                new Date(task.dueAt as string).getTime() < Date.now(),
            ).length,
            active: personalTasks.filter((task) => task.status !== 'DONE').length,
            done: personalTasks.filter((task) => task.status === 'DONE').length,
          },
        },
        employees,
        groups,
        scheduleShifts: scheduleShifts.scheduleShifts,
        canCheckWorkdays: scheduleShifts.canCheckWorkdays,
        personalHistory,
        dailyActivity,
      },
    };
  }

  async requests(user: JwtUser, dateFrom?: string, dateTo?: string) {
    const mode = isEmployeeOnlyRole(user.roleCodes) ? 'employee' : 'admin';
    const range = resolveRequestsBootstrapRange(dateFrom, dateTo);

    if (mode === 'employee') {
      const [balances, items, calendar, tasks] = await Promise.all([
        this.requestsService.getMyBalances(user.sub).catch(() => null),
        this.requestsService.listMine(user.sub).catch(() => []),
        this.requestsService.getMyCalendar(user.sub, range).catch(() => null),
        this.collaborationService.listMyTasks(user.sub, range).catch(() => []),
      ]);

      return {
        mode,
        initialData: {
          inbox: [],
          balances,
          items,
          calendar,
          tasks,
          ...range,
        },
      };
    }

    return {
      mode,
      initialData: {
        inbox: await this.requestsService.inbox(user.sub).catch(() => []),
        balances: null,
        items: [],
        calendar: null,
        tasks: [],
        ...range,
      },
    };
  }

  async analytics(user: JwtUser, days = 14) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const query = {
      dateFrom: start.toISOString(),
      dateTo: end.toISOString(),
    };

    const [history, anomalies, employeeStats] = await Promise.all([
      this.attendanceService.teamHistory(user.tenantId, query),
      this.attendanceService.teamAnomalies(user.tenantId, query),
      this.employeesService.stats(user.tenantId, {}),
    ]);

    return {
      history,
      anomalies,
      employeeCount: employeeStats.total,
      period: days === 7 ? '7d' : days === 30 ? '30d' : '14d',
    };
  }

  async organization(user: JwtUser) {
    const setup = await this.orgService.getSetup(user.tenantId);
    const employeeStats = setup.company?.id
      ? await this.employeesService.stats(user.tenantId, {
          companyId: setup.company.id,
        })
      : { total: 0 };

    return {
      setup,
      employeeCount: employeeStats.total,
    };
  }

  async news(user: JwtUser) {
    const mode = isEmployeeOnlyRole(user.roleCodes) ? 'employee' : 'admin';

    if (mode === 'employee') {
      return {
        mode,
        initialData: {
          items: await this.collaborationService.listMyAnnouncements(user.sub),
          employees: [],
          groups: [],
        },
      };
    }

    const [items, employees, groups] = await Promise.all([
      this.collaborationService.listAnnouncementsForManager(user.sub),
      this.employeesService.list(user.tenantId, {}, user.sub),
      this.collaborationService.listGroups(user.sub),
    ]);

    return {
      mode,
      initialData: {
        items,
        employees,
        groups,
      },
    };
  }

  async leaderboard(user: JwtUser, month?: string) {
    const mode = isEmployeeOnlyRole(user.roleCodes) ? 'employee' : 'admin';

    return {
      mode,
      initialData: await this.leaderboardService.getOverview(user.sub, month),
    };
  }

  async biometric(user: JwtUser, result?: string) {
    const biometricResult =
      result === 'FAILED' || result === 'PASSED' || result === 'REVIEW'
        ? result
        : undefined;
    const query: {
      result?: 'FAILED' | 'PASSED' | 'REVIEW';
    } = biometricResult ? { result: biometricResult } : {};
    const [employees, reviews] = await Promise.all([
      this.employeesService.list(user.tenantId, {}, user.sub),
      this.biometricService.getTeamReviews(user.tenantId, query),
    ]);

    return {
      employees,
      reviews,
      result: result ?? '__all',
    };
  }
}
