import { Injectable } from '@nestjs/common';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { AttendanceService } from '../attendance/attendance.service';
import { BiometricService } from '../biometric/biometric.service';
import { CollaborationService } from '../collaboration/collaboration.service';
import { EmployeesService } from '../employees/employees.service';
import { OrgService } from '../org/org.service';
import { RequestsService } from '../requests/requests.service';
import { ScheduleService } from '../schedule/schedule.service';

const ADMIN_ROLES = ['tenant_owner', 'hr_admin', 'operations_admin', 'manager'] as const;

function isEmployeeOnlyRole(roleCodes: string[]) {
  return !roleCodes.some((role) => ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]));
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

function startOfSixMonthWindow(reference: Date) {
  const next = new Date(reference);
  next.setHours(0, 0, 0, 0);
  next.setMonth(next.getMonth() - 6);
  return next;
}

@Injectable()
export class BootstrapService {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly biometricService: BiometricService,
    private readonly collaborationService: CollaborationService,
    private readonly employeesService: EmployeesService,
    private readonly orgService: OrgService,
    private readonly requestsService: RequestsService,
    private readonly scheduleService: ScheduleService,
  ) {}

  async tasks(user: JwtUser) {
    const [taskBoard, employees, groups, liveSessions] = await Promise.all([
      this.collaborationService.listManagerTasks(user.sub, {}),
      this.employeesService.list(user.tenantId, {}),
      this.collaborationService.listGroups(user.sub),
      this.attendanceService.liveTeam(user.tenantId),
    ]);

    return {
      tasks: taskBoard.tasks,
      employees,
      groups,
      liveSessions,
    };
  }

  async attendance(
    user: JwtUser,
    dateFrom = formatDateKey(new Date()),
    dateTo = formatDateKey(new Date()),
  ) {
    const query = { dateFrom, dateTo };

    const [employees, history, anomalies, liveSessions, audit] = await Promise.all([
      this.employeesService.list(user.tenantId, {}),
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
    let canCheckWorkdays = false;

    const [
      employeeRecords,
      overview,
      pendingInvitations,
      scheduleShifts,
      scheduleTemplates,
      organizationSetup,
    ] = await Promise.all([
      this.employeesService.list(user.tenantId, {}),
      this.collaborationService.managerOverview(user.sub),
      this.employeesService.listPendingInvitations(user.tenantId),
      this.scheduleService.listShifts(user.tenantId)
        .then((result) => {
          canCheckWorkdays = true;
          return result;
        })
        .catch(() => []),
      this.scheduleService.listTemplates(user.tenantId).catch(() => []),
      this.orgService.getSetup(user.tenantId).catch(() => ({ company: null })),
    ]);

    return {
      employeeRecords,
      overview,
      pendingInvitations,
      scheduleShifts,
      scheduleTemplates,
      organizationSetup,
      canCheckWorkdays,
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
      const employeeTasks = await this.collaborationService.listMyTasks(
        user.sub,
        taskQuery,
      );

      return {
        mode,
        initialData: {
          mode,
          visibleDateFrom: resolvedVisibleDateFrom,
          visibleDateTo: resolvedVisibleDateTo,
          isMockMode: false,
          templates: [],
          shifts: [],
          employees: [],
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
      locations,
      departments,
      positions,
      requests,
      taskBoard,
    ] = await Promise.all([
      this.scheduleService.listTemplates(user.tenantId),
      this.scheduleService.listShifts(user.tenantId),
      this.employeesService.list(user.tenantId, {}),
      this.orgService.listLocations(user.tenantId),
      this.orgService.listDepartments(user.tenantId),
      this.orgService.listPositions(user.tenantId),
      this.requestsService.inbox(user.sub).catch(() => []),
      this.collaborationService.listManagerTasks(user.sub, taskQuery).catch(() => null),
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
        locations,
        departments,
        positions,
        requests,
        taskBoard,
      },
    };
  }

  async dashboard(user: JwtUser) {
    const mode = isEmployeeOnlyRole(user.roleCodes) ? 'employee' : 'admin';
    const historyQuery = {
      dateFrom: startOfSixMonthWindow(new Date()).toISOString(),
      dateTo: new Date().toISOString(),
    };

    if (mode === 'employee') {
      const [employeeTasks, personalHistory] = await Promise.all([
        this.collaborationService.listMyTasks(user.sub),
        this.attendanceService.myHistory(user.sub, historyQuery).catch(() => null),
      ]);

      return {
        mode,
        initialData: {
          liveSessions: [],
          anomalies: null,
          requests: [],
          employees: [],
          groups: [],
          scheduleShifts: [],
          canCheckWorkdays: false,
          personalHistory,
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

    let canCheckWorkdays = false;

    const [
      liveSessions,
      anomalies,
      requests,
      taskBoard,
      employees,
      groups,
      scheduleShifts,
      personalHistory,
    ] = await Promise.all([
      this.attendanceService.liveTeam(user.tenantId).catch(() => []),
      this.attendanceService.teamAnomalies(user.tenantId, {}).catch(() => null),
      this.requestsService.inbox(user.sub).catch(() => []),
      this.collaborationService.listManagerTasks(user.sub, {}).catch(() => null),
      this.employeesService.list(user.tenantId, {}).catch(() => []),
      this.collaborationService.listGroups(user.sub).catch(() => []),
      this.scheduleService.listShifts(user.tenantId)
        .then((result) => {
          canCheckWorkdays = true;
          return result;
        })
        .catch(() => []),
      this.attendanceService.myHistory(user.sub, historyQuery).catch(() => null),
    ]);

    return {
      mode,
      initialData: {
        liveSessions,
        anomalies,
        requests,
        taskBoard,
        employees,
        groups,
        scheduleShifts,
        canCheckWorkdays,
        personalHistory,
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
      this.employeesService.list(user.tenantId, {}),
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

  async biometric(user: JwtUser, result?: string) {
    const biometricResult =
      result === 'FAILED' || result === 'PASSED' || result === 'REVIEW'
        ? result
        : undefined;
    const query: {
      result?: 'FAILED' | 'PASSED' | 'REVIEW';
    } = biometricResult ? { result: biometricResult } : {};
    const [employees, reviews] = await Promise.all([
      this.employeesService.list(user.tenantId, {}),
      this.biometricService.getTeamReviews(user.tenantId, query),
    ]);

    return {
      employees,
      reviews,
      result: result ?? '__all',
    };
  }
}
