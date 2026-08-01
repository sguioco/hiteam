import { Injectable } from '@nestjs/common';
import { TaskPriority, TaskStatus } from '@prisma/client';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { AuditService } from '../audit/audit.service';
import { AttendanceService } from '../attendance/attendance.service';
import { BiometricService } from '../biometric/biometric.service';
import { AltegioMarketplaceBillingService } from '../billing/altegio-marketplace-billing.service';
import { CollaborationService } from '../collaboration/collaboration.service';
import { EmployeesService } from '../employees/employees.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { OrgService } from '../org/org.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from '../requests/requests.service';
import { ScheduleService } from '../schedule/schedule.service';
import type { ListManagerTasksQueryDto } from '../collaboration/dto/list-manager-tasks-query.dto';

const ADMIN_ROLES = ['tenant_owner', 'hr_admin', 'operations_admin', 'manager'] as const;
const DEMO_OWNER_EMAIL = 'owner@demo.smart';
const DEMO_TIME_ZONE = 'Asia/Novosibirsk';
const DEMO_UTC_OFFSET = '+07:00';

type DemoNamedEntity = {
  id: string;
  name: string;
};

type DemoEmployeeRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  employeeNumber: string;
  department?: DemoNamedEntity | null;
  position?: DemoNamedEntity | null;
  primaryLocation?: (DemoNamedEntity & { timezone?: string | null }) | null;
  avatar?: unknown;
  avatarUrl?: string | null;
};

type DemoGroupRecord = {
  id: string;
  name: string;
  description: string | null;
  managerEmployeeId: string;
  memberships: Array<{
    id: string;
    employeeId: string;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
      avatarUrl?: string | null;
    };
  }>;
  _count?: {
    tasks: number;
  };
};

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

function isDemoOwnerAccount(user: JwtUser) {
  return user.email?.trim().toLowerCase() === DEMO_OWNER_EMAIL;
}

function demoTodayDateKey() {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: DEMO_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return formatDateKey(new Date());
  }

  return `${year}-${month}-${day}`;
}

function demoIsoAt(hour: number, minute: number) {
  const normalizedHour = String(hour).padStart(2, '0');
  const normalizedMinute = String(minute).padStart(2, '0');

  return new Date(
    `${demoTodayDateKey()}T${normalizedHour}:${normalizedMinute}:00.000${DEMO_UTC_OFFSET}`,
  ).toISOString();
}

function demoMinutesBetween(startedAt: string, endedAt?: string | null) {
  const endMs = endedAt ? new Date(endedAt).getTime() : Date.now();
  const startMs = new Date(startedAt).getTime();

  return Math.max(0, Math.round((endMs - startMs) / 60_000));
}

function normalizeDemoLookup(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function demoEmployeeName(
  employee: Pick<DemoEmployeeRecord, 'firstName' | 'lastName'>,
) {
  return `${employee.lastName} ${employee.firstName}`.trim();
}

function demoTaskEmployee(employee: DemoEmployeeRecord) {
  return {
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
    primaryLocation: employee.primaryLocation
      ? {
          id: employee.primaryLocation.id,
          name: employee.primaryLocation.name,
        }
      : null,
  };
}

function buildDemoManagerTasksBootstrap(
  sourceEmployees: DemoEmployeeRecord[],
  sourceGroups: DemoGroupRecord[],
) {
  const operationsDepartment = {
    id: 'demo-department-operations',
    name: 'Operations',
  };
  const frontDeskDepartment = {
    id: 'demo-department-front-desk',
    name: 'Front desk',
  };
  const adminPosition = {
    id: 'demo-position-admin',
    name: 'Administrator',
  };
  const managerPosition = {
    id: 'demo-position-manager',
    name: 'Manager',
  };
  const specialistPosition = {
    id: 'demo-position-specialist',
    name: 'Specialist',
  };
  const location = {
    id: 'demo-location-hq',
    name: 'Central Studio',
    timezone: DEMO_TIME_ZONE,
  };
  const fallbackEmployees: DemoEmployeeRecord[] = [
    {
      id: 'demo-employee-alexander',
      firstName: 'Alexander',
      lastName: 'Prokhorov',
      email: 'employee@demo.smart',
      employeeNumber: 'EMP-0002',
      department: operationsDepartment,
      position: specialistPosition,
      primaryLocation: location,
      avatarUrl: null,
    },
    {
      id: 'demo-employee-anna',
      firstName: 'Anna',
      lastName: 'Manager',
      email: 'manager@demo.smart',
      employeeNumber: 'EMP-0006',
      department: operationsDepartment,
      position: managerPosition,
      primaryLocation: location,
      avatarUrl: null,
    },
    {
      id: 'demo-employee-ilia',
      firstName: 'Ilia',
      lastName: 'Admin',
      email: DEMO_OWNER_EMAIL,
      employeeNumber: 'EMP-0001',
      department: operationsDepartment,
      position: adminPosition,
      primaryLocation: location,
      avatarUrl: null,
    },
    {
      id: 'demo-employee-julia',
      firstName: 'Julia',
      lastName: 'Zakharova',
      email: 'julia@demo.smart',
      employeeNumber: 'EMP-0003',
      department: frontDeskDepartment,
      position: specialistPosition,
      primaryLocation: location,
      avatarUrl: null,
    },
    {
      id: 'demo-employee-maria',
      firstName: 'Maria',
      lastName: 'Kim',
      email: 'maria@demo.smart',
      employeeNumber: 'EMP-0005',
      department: frontDeskDepartment,
      position: specialistPosition,
      primaryLocation: location,
      avatarUrl: null,
    },
    {
      id: 'demo-employee-sergey',
      firstName: 'Sergey',
      lastName: 'Ivanov',
      email: 'sergey@demo.smart',
      employeeNumber: 'EMP-0004',
      department: operationsDepartment,
      position: specialistPosition,
      primaryLocation: location,
      avatarUrl: null,
    },
  ];
  const findSourceEmployee = (fallback: DemoEmployeeRecord) => {
    const fallbackName = normalizeDemoLookup(demoEmployeeName(fallback));
    const fallbackEmail = normalizeDemoLookup(fallback.email);

    return sourceEmployees.find((employee) => {
      const employeeName = normalizeDemoLookup(demoEmployeeName(employee));

      return (
        normalizeDemoLookup(employee.email) === fallbackEmail ||
        normalizeDemoLookup(employee.employeeNumber) ===
          normalizeDemoLookup(fallback.employeeNumber) ||
        employeeName === fallbackName
      );
    });
  };
  const employees = fallbackEmployees.map((fallback) => {
    const source = findSourceEmployee(fallback);

    return {
      ...fallback,
      ...source,
      email: source?.email ?? fallback.email,
      employeeNumber: source?.employeeNumber ?? fallback.employeeNumber,
      department: source?.department ?? fallback.department,
      position: source?.position ?? fallback.position,
      primaryLocation: source?.primaryLocation ?? fallback.primaryLocation,
      avatarUrl: source?.avatarUrl ?? fallback.avatarUrl ?? null,
    };
  });
  const alexander = employees[0]!;
  const anna = employees[1]!;
  const owner = employees[2]!;
  const julia = employees[3]!;
  const maria = employees[4]!;
  const sergey = employees[5]!;
  const fallbackGroup: DemoGroupRecord = {
    id: 'demo-group-opening',
    name: 'Opening team',
    description: 'Demo team for today attendance and tasks',
    managerEmployeeId: owner.id,
    memberships: employees.map((employee) => ({
      id: `demo-membership-${employee.id}`,
      employeeId: employee.id,
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeNumber: employee.employeeNumber,
        avatarUrl: employee.avatarUrl ?? null,
      },
    })),
    _count: {
      tasks: 0,
    },
  };
  const group = sourceGroups[0] ?? fallbackGroup;
  const managerEmployee = {
    id: owner.id,
    firstName: owner.firstName,
    lastName: owner.lastName,
  };
  const groupSummary = {
    id: group.id,
    name: group.name,
  };
  const now = demoIsoAt(8, 0);
  const createTask = (input: {
    id: string;
    assignee: DemoEmployeeRecord;
    title: string;
    description: string;
    status: TaskStatus;
    priority?: TaskPriority;
    dueHour: number;
    dueMinute: number;
    completedHour?: number;
    completedMinute?: number;
    requiresPhoto?: boolean;
    checklistTitles?: string[];
    completedChecklistCount?: number;
  }) => {
    const completedAt =
      input.status === TaskStatus.DONE
        ? demoIsoAt(
            input.completedHour ?? input.dueHour,
            input.completedMinute ?? input.dueMinute,
          )
        : null;
    const checklistTitles = input.checklistTitles ?? [];
    const completedChecklistCount = input.completedChecklistCount ?? 0;

    return {
      id: input.id,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority ?? TaskPriority.MEDIUM,
      requiresPhoto: input.requiresPhoto ?? false,
      isRecurring: false,
      taskTemplateId: null,
      occurrenceDate: demoTodayDateKey(),
      dueAt: demoIsoAt(input.dueHour, input.dueMinute),
      completedAt,
      createdAt: now,
      updatedAt: completedAt ?? demoIsoAt(10, 5),
      groupId: group.id,
      assigneeEmployeeId: input.assignee.id,
      managerEmployee,
      assigneeEmployee: demoTaskEmployee(input.assignee),
      group: groupSummary,
      checklistItems: checklistTitles.map((title, index) => {
        const isCompleted = index < completedChecklistCount;

        return {
          id: `${input.id}-check-${index + 1}`,
          title,
          sortOrder: index + 1,
          isCompleted,
          completedAt: isCompleted ? demoIsoAt(10, 10 + index * 5) : null,
          completedByEmployee: isCompleted
            ? {
                id: input.assignee.id,
                firstName: input.assignee.firstName,
                lastName: input.assignee.lastName,
              }
            : null,
        };
      }),
      activities: [
        {
          id: `${input.id}-activity-created`,
          kind: 'CREATED',
          body: null,
          createdAt: now,
          actorEmployee: managerEmployee,
        },
      ],
      photoProofs: [],
    };
  };

  return {
    tasks: sortBootstrapTasks([
      createTask({
        id: 'demo-task-alexander-opening-checklist',
        assignee: alexander,
        title: 'Alexander: opening checklist 2 of 4',
        description: 'Late arrival case: the opening checklist is half done.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueHour: 14,
        dueMinute: 0,
        checklistTitles: [
          'Prepare treatment room A',
          'Prepare treatment room B',
          'Refill towels',
          'Send opening photo',
        ],
        completedChecklistCount: 2,
      }),
      createTask({
        id: 'demo-task-alexander-sanitize',
        assignee: alexander,
        title: 'Alexander: sanitize treatment rooms',
        description: 'Completed after the late check-in.',
        status: TaskStatus.DONE,
        dueHour: 11,
        dueMinute: 30,
        completedHour: 11,
        completedMinute: 15,
      }),
      createTask({
        id: 'demo-task-alexander-towels',
        assignee: alexander,
        title: 'Alexander: stock towels before lunch',
        description: 'Second completed task for the 2/4 demo state.',
        status: TaskStatus.DONE,
        dueHour: 12,
        dueMinute: 15,
        completedHour: 12,
        completedMinute: 0,
      }),
      createTask({
        id: 'demo-task-alexander-photo',
        assignee: alexander,
        title: 'Alexander: upload reception photo report',
        description: 'Still open and requires a photo proof.',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueHour: 15,
        dueMinute: 10,
        requiresPhoto: true,
      }),
      createTask({
        id: 'demo-task-anna-no-show-handoff',
        assignee: anna,
        title: 'Anna: no-show shift handoff',
        description: 'No check-in has been recorded for this employee.',
        status: TaskStatus.TODO,
        priority: TaskPriority.URGENT,
        dueHour: 9,
        dueMinute: 30,
      }),
      createTask({
        id: 'demo-task-anna-replacement-call',
        assignee: anna,
        title: 'Anna: call replacement specialist',
        description: 'Open task for the absent employee.',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueHour: 10,
        dueMinute: 0,
      }),
      createTask({
        id: 'demo-task-owner-review-photos',
        assignee: owner,
        title: `${owner.firstName}: review opening photo reports`,
        description: 'Owner/admin has one completed task.',
        status: TaskStatus.DONE,
        dueHour: 10,
        dueMinute: 20,
        completedHour: 10,
        completedMinute: 8,
      }),
      createTask({
        id: 'demo-task-owner-supply-budget',
        assignee: owner,
        title: `${owner.firstName}: approve studio supply budget`,
        description: 'Owner/admin has one remaining task.',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueHour: 16,
        dueMinute: 0,
      }),
      createTask({
        id: 'demo-task-julia-reception-handoff',
        assignee: julia,
        title: 'Julia: confirm reception handoff',
        description: 'On-time employee completed the handoff.',
        status: TaskStatus.DONE,
        dueHour: 10,
        dueMinute: 45,
        completedHour: 10,
        completedMinute: 35,
      }),
      createTask({
        id: 'demo-task-julia-bookings',
        assignee: julia,
        title: 'Julia: update afternoon bookings',
        description: 'Second completed task for Julia.',
        status: TaskStatus.DONE,
        dueHour: 12,
        dueMinute: 0,
        completedHour: 11,
        completedMinute: 48,
      }),
      createTask({
        id: 'demo-task-julia-lobby',
        assignee: julia,
        title: 'Julia: reset lobby stand',
        description: 'Third completed task for Julia.',
        status: TaskStatus.DONE,
        dueHour: 13,
        dueMinute: 20,
        completedHour: 13,
        completedMinute: 5,
      }),
      createTask({
        id: 'demo-task-julia-vip-note',
        assignee: julia,
        title: 'Julia: prepare VIP note',
        description: 'One task remains open for the on-time employee.',
        status: TaskStatus.TODO,
        dueHour: 17,
        dueMinute: 0,
      }),
      createTask({
        id: 'demo-task-maria-break-room-check',
        assignee: maria,
        title: 'Maria: break room checklist',
        description: 'On-break employee has partial progress.',
        status: TaskStatus.IN_PROGRESS,
        dueHour: 14,
        dueMinute: 20,
        checklistTitles: [
          'Clean coffee point',
          'Refill paper cups',
          'Wipe table',
        ],
        completedChecklistCount: 1,
      }),
      createTask({
        id: 'demo-task-maria-inventory',
        assignee: maria,
        title: 'Maria: confirm inventory count',
        description: 'Completed inventory count before break.',
        status: TaskStatus.DONE,
        dueHour: 12,
        dueMinute: 30,
        completedHour: 12,
        completedMinute: 18,
      }),
      createTask({
        id: 'demo-task-maria-photo-report',
        assignee: maria,
        title: 'Maria: add stock room photo report',
        description: 'Open photo proof task while Maria is on break.',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueHour: 15,
        dueMinute: 0,
        requiresPhoto: true,
      }),
      createTask({
        id: 'demo-task-sergey-close-note',
        assignee: sergey,
        title: 'Sergey: close early-leave note',
        description: 'Pending task left after early checkout.',
        status: TaskStatus.TODO,
        dueHour: 16,
        dueMinute: 0,
      }),
      createTask({
        id: 'demo-task-sergey-stock',
        assignee: sergey,
        title: 'Sergey: restock cleaning cart',
        description: 'Completed before leaving early.',
        status: TaskStatus.DONE,
        dueHour: 11,
        dueMinute: 20,
        completedHour: 11,
        completedMinute: 5,
      }),
      createTask({
        id: 'demo-task-sergey-evening',
        assignee: sergey,
        title: 'Sergey: prepare evening handoff',
        description: 'Open task because Sergey checked out early.',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueHour: 17,
        dueMinute: 30,
      }),
      createTask({
        id: 'demo-task-sergey-photo',
        assignee: sergey,
        title: 'Sergey: upload storage photo',
        description: 'Open photo task after early checkout.',
        status: TaskStatus.TODO,
        dueHour: 15,
        dueMinute: 40,
        requiresPhoto: true,
      }),
    ]),
    employees,
    groups: [
      {
        ...fallbackGroup,
        ...group,
        memberships: group.memberships?.length
          ? group.memberships
          : fallbackGroup.memberships,
        _count: group._count ?? fallbackGroup._count,
      },
    ],
    liveSessions: [
      {
        sessionId: 'demo-session-alexander',
        employeeId: alexander.id,
        employeeName: demoEmployeeName(alexander),
        employeeNumber: alexander.employeeNumber,
        department: alexander.department?.name ?? 'Operations',
        location: alexander.primaryLocation?.name ?? 'Central Studio',
        shiftLabel: '09:00-18:00',
        status: 'on_shift',
        startedAt: demoIsoAt(9, 18),
        endedAt: null,
        totalMinutes: demoMinutesBetween(demoIsoAt(9, 18)),
        breakMinutes: 0,
        paidBreakMinutes: 0,
        lateMinutes: 18,
        earlyLeaveMinutes: 0,
      },
      {
        sessionId: 'demo-session-julia',
        employeeId: julia.id,
        employeeName: demoEmployeeName(julia),
        employeeNumber: julia.employeeNumber,
        department: julia.department?.name ?? 'Front desk',
        location: julia.primaryLocation?.name ?? 'Central Studio',
        shiftLabel: '09:00-18:00',
        status: 'on_shift',
        startedAt: demoIsoAt(8, 58),
        endedAt: null,
        totalMinutes: demoMinutesBetween(demoIsoAt(8, 58)),
        breakMinutes: 0,
        paidBreakMinutes: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
      },
      {
        sessionId: 'demo-session-maria',
        employeeId: maria.id,
        employeeName: demoEmployeeName(maria),
        employeeNumber: maria.employeeNumber,
        department: maria.department?.name ?? 'Front desk',
        location: maria.primaryLocation?.name ?? 'Central Studio',
        shiftLabel: '09:00-18:00',
        status: 'on_break',
        startedAt: demoIsoAt(9, 2),
        endedAt: null,
        totalMinutes: demoMinutesBetween(demoIsoAt(9, 2)),
        breakMinutes: 24,
        paidBreakMinutes: 0,
        lateMinutes: 2,
        earlyLeaveMinutes: 0,
      },
      {
        sessionId: 'demo-session-sergey',
        employeeId: sergey.id,
        employeeName: demoEmployeeName(sergey),
        employeeNumber: sergey.employeeNumber,
        department: sergey.department?.name ?? 'Operations',
        location: sergey.primaryLocation?.name ?? 'Central Studio',
        shiftLabel: '09:00-18:00',
        status: 'checked_out',
        startedAt: demoIsoAt(8, 55),
        endedAt: demoIsoAt(15, 20),
        totalMinutes: demoMinutesBetween(demoIsoAt(8, 55), demoIsoAt(15, 20)),
        breakMinutes: 30,
        paidBreakMinutes: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 40,
      },
    ],
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

function parseLeaderboardMonth(month?: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month?.trim() ?? '');
  if (!match) {
    return startOfMonthLocal(new Date());
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const requested = new Date(year, monthIndex, 1);
  const current = startOfMonthLocal(new Date());

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    requested.getTime() > current.getTime()
  ) {
    return current;
  }

  return requested;
}

function formatLeaderboardMonthKey(date: Date) {
  const monthStart = startOfMonthLocal(date);
  return `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
}

function getOrganizationStartMonthKey(
  organizationSetup?: { company?: { createdAt?: string | Date | null } | null } | null,
) {
  const createdAt = organizationSetup?.company?.createdAt;
  const parsed =
    createdAt instanceof Date ? createdAt : createdAt ? new Date(createdAt) : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return formatLeaderboardMonthKey(new Date());
  }

  const currentMonth = startOfMonthLocal(new Date());
  const organizationMonth = startOfMonthLocal(parsed);
  return formatLeaderboardMonthKey(
    organizationMonth.getTime() <= currentMonth.getTime()
      ? organizationMonth
      : currentMonth,
  );
}

function resolveLeaderboardMonthKey(month: string | undefined, earliestMonthKey: string) {
  const requested = parseLeaderboardMonth(month);
  const earliest = parseLeaderboardMonth(earliestMonthKey);
  const resolved =
    requested.getTime() < earliest.getTime() ? earliest : requested;

  return formatLeaderboardMonthKey(resolved);
}

function buildEmptyLeaderboardOverview(month?: string, earliestMonthKey?: string) {
  const monthStart = parseLeaderboardMonth(month);
  const monthEnd = endOfMonthLocal(monthStart);

  return {
    earliestMonthKey,
    month: {
      key: formatLeaderboardMonthKey(monthStart),
      startsAt: monthStart.toISOString(),
      endsAt: monthEnd.toISOString(),
      todayKey: formatDateKey(new Date()),
    },
    summary: {
      participants: 0,
      maxDailyPoints: 15,
    },
    me: {
      employeeId: '',
      rank: 0,
      points: 0,
      todayPoints: 0,
      todayMaxPoints: 15,
      streak: 0,
      progress: [
        {
          key: 'on_time_arrival',
          earnedPoints: 0,
          maxPoints: 5,
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
          key: 'on_time_departure',
          earnedPoints: 0,
          maxPoints: 5,
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
          key: 'tasks_and_checklists',
          earnedPoints: 0,
          maxPoints: 5,
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
      ],
      dailyActivity: [],
    },
    leaderboard: [],
    visibility: {
      hidePeersFromEmployees: false,
      canManage: false,
      peersHiddenForViewer: false,
    },
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
    private readonly altegioMarketplaceBilling: AltegioMarketplaceBillingService,
    private readonly collaborationService: CollaborationService,
    private readonly employeesService: EmployeesService,
    private readonly leaderboardService: LeaderboardService,
    private readonly orgService: OrgService,
    private readonly prisma: PrismaService,
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

  private async loadOrganizationSetup(tenantId: string) {
    return this.orgService.getSetup(tenantId).catch(() => ({
      configured: false,
      company: null,
      location: null,
      attendanceTrackingEnabled: true,
      defaultGeofenceRadiusMeters: 100,
    }));
  }

  private async resolveActivityVisibilityScope(user: JwtUser) {
    if (!isEmployeeOnlyRole(user.roleCodes)) {
      return undefined;
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        tenantId: user.tenantId,
        userId: user.sub,
      },
      select: {
        id: true,
        groupMemberships: {
          select: {
            groupId: true,
          },
        },
      },
    });

    if (!employee) {
      return {
        visibleEmployeeIds: [],
        visibleGroupIds: [],
      };
    }

    const visibleGroupIds = Array.from(
      new Set(
        employee.groupMemberships
          .map((membership) => membership.groupId)
          .filter(Boolean),
      ),
    );
    const visibleEmployeeIds = new Set<string>([employee.id]);

    if (visibleGroupIds.length) {
      const memberships = await this.prisma.workGroupMembership.findMany({
        where: {
          tenantId: user.tenantId,
          groupId: {
            in: visibleGroupIds,
          },
        },
        select: {
          employeeId: true,
        },
      });

      for (const membership of memberships) {
        visibleEmployeeIds.add(membership.employeeId);
      }
    }

    return {
      visibleEmployeeIds: [...visibleEmployeeIds],
      visibleGroupIds,
    };
  }

  async tasks(
    user: JwtUser,
    dateFrom?: string,
    dateTo?: string,
    locationId?: string,
  ) {
    if (isDemoOwnerAccount(user)) {
      const [employees, groups] = await Promise.all([
        withTimeoutFallback(
          this.employeesService
            .list(user.tenantId, {}, user.sub)
            .then((items) => items as DemoEmployeeRecord[])
            .catch(() => [] as DemoEmployeeRecord[]),
          1500,
          [] as DemoEmployeeRecord[],
        ),
        withTimeoutFallback(
          this.collaborationService
            .listGroups(user.sub)
            .then((items) => items as DemoGroupRecord[])
            .catch(() => [] as DemoGroupRecord[]),
          1200,
          [] as DemoGroupRecord[],
        ),
      ]);

      return buildDemoManagerTasksBootstrap(
        employees as DemoEmployeeRecord[],
        groups as DemoGroupRecord[],
      );
    }

    const resolvedRange = {
      ...resolveBootstrapTaskRange(dateFrom, dateTo),
      ...(locationId ? { locationId } : {}),
    };
    const organizationSetup = await this.loadOrganizationSetup(user.tenantId);
    const attendanceTrackingEnabled =
      organizationSetup.attendanceTrackingEnabled ?? true;

    const [taskBoard, employees, groups, liveSessions] = await Promise.all([
      this.collaborationService.listManagerTasks(user.sub, resolvedRange).catch(() => null),
      withTimeoutFallback(
        this.employeesService
          .list(
            user.tenantId,
            locationId ? { locationId } : {},
            user.sub,
          )
          .catch(() => []),
        1500,
        [],
      ),
      withTimeoutFallback(
        this.collaborationService.listGroups(user.sub).catch(() => []),
        1200,
        [],
      ),
      withTimeoutFallback(
        attendanceTrackingEnabled
          ? this.attendanceService.liveTeam(user.tenantId).catch(() => [])
          : Promise.resolve([]),
        1200,
        [],
      ),
    ]);
    return {
      tasks: taskBoard?.tasks ?? [],
      employees,
      groups,
      liveSessions: liveSessions.filter((session) =>
        employees.some((employee) => employee.id === session.employeeId),
      ),
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
    const organizationSetup = await this.loadOrganizationSetup(user.tenantId);

    if (organizationSetup.attendanceTrackingEnabled === false) {
      return {
        employees: await this.employeesService
          .list(user.tenantId, {}, user.sub)
          .catch(() => []),
        history: null,
        anomalies: null,
        liveSessions: [],
        audit: null,
        dateFrom,
        dateTo,
      };
    }

    const [employees, history, anomalies, liveSessions, audit] = await Promise.all([
      this.employeesService.list(user.tenantId, {}, user.sub).catch(() => []),
      this.attendanceService.teamHistory(user.tenantId, query).catch(() => null),
      this.attendanceService.teamAnomalies(user.tenantId, query).catch(() => null),
      this.attendanceService.liveTeam(user.tenantId).catch(() => []),
      this.attendanceService.teamAudit(user.tenantId, query).catch(() => null),
    ]);
    const visibleEmployeeIds = new Set(
      employees.map((employee) => employee.id),
    );
    const visibleHistoryRows =
      history?.rows.filter((row) => visibleEmployeeIds.has(row.employeeId)) ??
      [];
    const visibleAnomalyItems =
      anomalies?.items.filter((item) =>
        visibleEmployeeIds.has(item.employeeId),
      ) ?? [];
    const visibleAuditItems =
      audit?.items.filter((item) => visibleEmployeeIds.has(item.employeeId)) ??
      [];

    return {
      employees,
      history: history
        ? {
            ...history,
            totals: {
              sessions: visibleHistoryRows.length,
              workedMinutes: visibleHistoryRows.reduce(
                (sum, row) => sum + row.workedMinutes,
                0,
              ),
              breakMinutes: visibleHistoryRows.reduce(
                (sum, row) => sum + row.breakMinutes,
                0,
              ),
              paidBreakMinutes: visibleHistoryRows.reduce(
                (sum, row) => sum + row.paidBreakMinutes,
                0,
              ),
              lateMinutes: visibleHistoryRows.reduce(
                (sum, row) => sum + row.lateMinutes,
                0,
              ),
              earlyLeaveMinutes: visibleHistoryRows.reduce(
                (sum, row) => sum + row.earlyLeaveMinutes,
                0,
              ),
            },
            rows: visibleHistoryRows,
          }
        : null,
      anomalies: anomalies
        ? {
            ...anomalies,
            totals: {
              critical: visibleAnomalyItems.filter(
                (item) => item.severity === 'critical',
              ).length,
              warning: visibleAnomalyItems.filter(
                (item) => item.severity === 'warning',
              ).length,
            },
            items: visibleAnomalyItems,
          }
        : null,
      liveSessions: liveSessions.filter((session) =>
        visibleEmployeeIds.has(session.employeeId),
      ),
      audit: audit
        ? {
            ...audit,
            totals: {
              total: visibleAuditItems.length,
              accepted: visibleAuditItems.filter(
                (item) => item.result === 'ACCEPTED',
              ).length,
              rejected: visibleAuditItems.filter(
                (item) => item.result === 'REJECTED',
              ).length,
              reviewRequired: visibleAuditItems.filter(
                (item) => item.biometricVerification?.result === 'REVIEW',
              ).length,
            },
            items: visibleAuditItems,
          }
        : null,
      dateFrom,
      dateTo,
    };
  }

  async employees(user: JwtUser) {
    const organizationSetup = await this.loadOrganizationSetup(user.tenantId);
    const attendanceTrackingEnabled =
      organizationSetup.attendanceTrackingEnabled ?? true;
    const [
      employeeRecords,
      liveSessions,
      overview,
      pendingInvitations,
      workdaySnapshot,
      scheduleTemplates,
      groups,
    ] = await Promise.all([
      withTimeoutFallback(
        this.employeesService.list(user.tenantId, {}, user.sub).catch(() => []),
        1500,
        [],
      ),
      withTimeoutFallback(
        attendanceTrackingEnabled
          ? this.attendanceService.liveTeam(user.tenantId).catch(() => [])
          : Promise.resolve([]),
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
        attendanceTrackingEnabled
          ? this.scheduleService
              .listShifts(user.tenantId, user.sub)
              .then((shifts) => ({
                canCheckWorkdays: true,
                scheduleShifts: shifts,
              }))
              .catch(() => ({
                canCheckWorkdays: false,
                scheduleShifts: [],
              }))
          : Promise.resolve({
              canCheckWorkdays: false,
              scheduleShifts: [],
            }),
        1200,
        {
          canCheckWorkdays: false,
          scheduleShifts: [],
        },
      ),
      withTimeoutFallback(
        attendanceTrackingEnabled
          ? this.scheduleService.listTemplates(user.tenantId, user.sub).catch(() => [])
          : Promise.resolve([]),
        1200,
        [],
      ),
      withTimeoutFallback(
        this.collaborationService.listGroups(user.sub).catch(() => []),
        1000,
        [],
      ),
    ]);
    const employeeRecordIds = new Set(
      employeeRecords.map((employee) => employee.id),
    );

    return {
      employeeRecords,
      liveSessions: liveSessions.filter((session) =>
        employeeRecordIds.has(session.employeeId),
      ),
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
    const [
      employee,
      history,
      anomalies,
      biometricHistory,
      managerAccess,
      groups,
      locations,
    ] =
      await Promise.all([
        this.employeesService
          .getById(user.tenantId, employeeId, user.sub)
          .catch(() => null),
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
        this.collaborationService.listGroups(user.sub).catch(() => []),
        this.orgService
          .listLocations(user.tenantId, undefined, false, user.sub)
          .catch(() => []),
      ]);

    return {
      employeeId,
      employee,
      history,
      anomalies,
      biometricHistory,
      managerAccess,
      groups,
      locations,
    };
  }

  async schedule(
    user: JwtUser,
    visibleDateFrom?: string,
    visibleDateTo?: string,
    locationId?: string,
  ) {
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
    const organizationSetup = await this.loadOrganizationSetup(user.tenantId);
    const attendanceTrackingEnabled =
      organizationSetup.attendanceTrackingEnabled ?? true;

    if (mode === 'employee') {
      const [employeeTasks, shifts] = await Promise.all([
        this.collaborationService.listMyTasks(user.sub, taskQuery).catch(() => []),
        attendanceTrackingEnabled
          ? this.scheduleService.myShifts(user.sub).catch(() => [])
          : Promise.resolve([]),
      ]);

      return {
        mode,
        initialData: {
          mode,
          visibleDateFrom: resolvedVisibleDateFrom,
          visibleDateTo: resolvedVisibleDateTo,
          isMockMode: false,
          organizationSetup,
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

    const locations = await withTimeoutFallback(
      this.orgService
        .listLocations(user.tenantId, undefined, false, user.sub)
        .catch(() => []),
      1200,
      [],
    );
    const readableLocationIds = new Set(
      locations.map((location) => location.id),
    );
    const selectedLocationId =
      locationId && readableLocationIds.has(locationId) ? locationId : null;
    const managerTaskQuery = {
      ...taskQuery,
      ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
    };

    const [
      templates,
      shifts,
      employees,
      groups,
      departments,
      positions,
      requests,
      scheduleTaskBoard,
      overdueTaskBoard,
    ] = await Promise.all([
      attendanceTrackingEnabled
        ? this.scheduleService.listTemplates(user.tenantId, user.sub).catch(() => [])
        : Promise.resolve([]),
      attendanceTrackingEnabled
        ? this.scheduleService.listShifts(user.tenantId, user.sub).catch(() => [])
        : Promise.resolve([]),
      this.employeesService
        .list(
          user.tenantId,
          selectedLocationId ? { locationId: selectedLocationId } : {},
          user.sub,
        )
        .catch(() => []),
      withTimeoutFallback(
        this.collaborationService.listGroups(user.sub).catch(() => []),
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
          .listManagerTasks(user.sub, managerTaskQuery)
          .catch(() => null),
        1500,
        null,
      ),
      withTimeoutFallback(
        this.collaborationService
          .listManagerTasks(user.sub, {
            onlyOverdue: 'true',
            ...(selectedLocationId
              ? { locationId: selectedLocationId }
              : {}),
          })
          .catch(() => null),
        1500,
        null,
      ),
    ]);

    const taskBoard = mergeTaskBoards([scheduleTaskBoard, overdueTaskBoard]);
    const visibleTemplates = templates.filter(
      (template) =>
        readableLocationIds.has(template.location.id) &&
        (!selectedLocationId || template.location.id === selectedLocationId),
    );
    const visibleShifts = shifts.filter(
      (shift) =>
        readableLocationIds.has(shift.location.id) &&
        (!selectedLocationId || shift.location.id === selectedLocationId),
    );

    return {
      mode,
      initialData: {
        mode,
        visibleDateFrom: resolvedVisibleDateFrom,
        visibleDateTo: resolvedVisibleDateTo,
        isMockMode: false,
        organizationSetup,
        templates: visibleTemplates,
        shifts: visibleShifts,
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
    const organizationSetup = await this.loadOrganizationSetup(user.tenantId);
    const attendanceTrackingEnabled =
      organizationSetup.attendanceTrackingEnabled ?? true;

    if (mode === 'employee') {
      const [
        profile,
        attendanceStatus,
        scheduleShifts,
        employeeTasks,
        personalHistory,
      ] = await Promise.all([
        this.employeesService.getMe(user).catch(() => null),
        attendanceTrackingEnabled
          ? this.attendanceService.getMyStatus(user.sub).catch(() => null)
          : Promise.resolve(null),
        attendanceTrackingEnabled
          ? this.scheduleService.myShifts(user.sub).catch(() => [])
          : Promise.resolve([]),
        this.collaborationService.listMyTasks(user.sub, taskQuery).catch(() => []),
        attendanceTrackingEnabled
          ? this.attendanceService.myHistory(user.sub, historyQuery).catch(() => null)
          : Promise.resolve(null),
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
          organizationSetup,
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
      attendanceTrackingEnabled
        ? this.attendanceService.getMyStatus(user.sub).catch(() => null)
        : Promise.resolve(null),
      attendanceTrackingEnabled
        ? this.attendanceService.liveTeam(user.tenantId).catch(() => [])
        : Promise.resolve([]),
      attendanceTrackingEnabled
        ? this.attendanceService.teamAnomalies(user.tenantId, {}).catch(() => null)
        : Promise.resolve(null),
      this.requestsService.inbox(user.sub).catch(() => []),
      this.loadDashboardManagerTaskBoard(user),
      this.collaborationService.listMyTasks(user.sub, taskQuery).catch(() => []),
      this.employeesService.list(user.tenantId, {}, user.sub).catch(() => []),
      this.collaborationService.listGroups(user.sub).catch(() => []),
      attendanceTrackingEnabled
        ? this.scheduleService
            .listShifts(user.tenantId, user.sub)
            .then((result) => ({
              canCheckWorkdays: true,
              scheduleShifts: result,
            }))
            .catch(() => ({
              canCheckWorkdays: false,
              scheduleShifts: [],
            }))
        : Promise.resolve({
            canCheckWorkdays: false,
            scheduleShifts: [],
          }),
      attendanceTrackingEnabled
        ? this.attendanceService.myHistory(user.sub, historyQuery).catch(() => null)
        : Promise.resolve(null),
      withTimeoutFallback(
        attendanceTrackingEnabled
          ? this.auditService
              .listCompanyActivity(user.tenantId, { dateFrom, dateTo })
              .catch(() => [])
          : Promise.resolve([]),
        1200,
        [],
      ),
    ]);
    const dashboardEmployeeIds = new Set(
      employees.map((employee) => employee.id),
    );
    const dashboardAnomalyItems =
      anomalies?.items.filter((item) =>
        dashboardEmployeeIds.has(item.employeeId),
      ) ?? [];

    return {
      mode,
      initialData: {
        profile,
        attendanceStatus,
        liveSessions: liveSessions.filter((session) =>
          dashboardEmployeeIds.has(session.employeeId),
        ),
        anomalies: anomalies
          ? {
              ...anomalies,
              totals: {
                critical: dashboardAnomalyItems.filter(
                  (item) => item.severity === 'critical',
                ).length,
                warning: dashboardAnomalyItems.filter(
                  (item) => item.severity === 'warning',
                ).length,
              },
              items: dashboardAnomalyItems,
            }
          : null,
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
        dailyActivity: dailyActivity.filter(
          (item) =>
            item.targetEmployees.length === 0 ||
            item.targetEmployees.some((employee) =>
              dashboardEmployeeIds.has(employee.id),
            ),
        ),
        organizationSetup,
      },
    };
  }

  async activity(
    user: JwtUser,
    dateFrom?: string,
    dateTo?: string,
    companyId?: string,
    locationId?: string,
  ) {
    const visibilityScope = await this.resolveActivityVisibilityScope(user).catch(() =>
      isEmployeeOnlyRole(user.roleCodes)
        ? { visibleEmployeeIds: [], visibleGroupIds: [] }
        : undefined,
    );

    return {
      items: await this.auditService
        .listCompanyActivity(user.tenantId, {
          dateFrom,
          dateTo,
          companyId,
          locationId,
          limit: 80,
          visibilityScope,
        })
        .catch(() => []),
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

  async analytics(user: JwtUser, days = 14, locationId?: string) {
    const [organizationSetup, locations] = await Promise.all([
      this.loadOrganizationSetup(user.tenantId),
      this.orgService
        .listLocations(user.tenantId, undefined, false, user.sub)
        .catch(() => []),
    ]);

    if (organizationSetup.attendanceTrackingEnabled === false) {
      return {
        history: null,
        anomalies: null,
        employeeCount: 0,
        locations,
        period: days === 7 ? '7d' : days === 30 ? '30d' : '14d',
      };
    }

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const query = {
      dateFrom: start.toISOString(),
      dateTo: end.toISOString(),
    };

    const [history, anomalies, visibleEmployees] = await Promise.all([
      this.attendanceService.teamHistory(user.tenantId, query),
      this.attendanceService.teamAnomalies(user.tenantId, query),
      this.employeesService.list(
        user.tenantId,
        locationId ? { locationId } : {},
        user.sub,
      ),
    ]);
    const visibleEmployeeIds = new Set(
      visibleEmployees.map((employee) => employee.id),
    );
    const visibleRows = history.rows.filter((row) =>
      visibleEmployeeIds.has(row.employeeId),
    );
    const visibleAnomalies = anomalies.items.filter((item) =>
      visibleEmployeeIds.has(item.employeeId),
    );

    return {
      history: {
        ...history,
        totals: {
          sessions: visibleRows.length,
          workedMinutes: visibleRows.reduce(
            (sum, row) => sum + row.workedMinutes,
            0,
          ),
          breakMinutes: visibleRows.reduce(
            (sum, row) => sum + row.breakMinutes,
            0,
          ),
          paidBreakMinutes: visibleRows.reduce(
            (sum, row) => sum + row.paidBreakMinutes,
            0,
          ),
          lateMinutes: visibleRows.reduce(
            (sum, row) => sum + row.lateMinutes,
            0,
          ),
          earlyLeaveMinutes: visibleRows.reduce(
            (sum, row) => sum + row.earlyLeaveMinutes,
            0,
          ),
        },
        rows: visibleRows,
      },
      anomalies: {
        ...anomalies,
        totals: {
          critical: visibleAnomalies.filter(
            (item) => item.severity === 'critical',
          ).length,
          warning: visibleAnomalies.filter(
            (item) => item.severity === 'warning',
          ).length,
        },
        items: visibleAnomalies,
      },
      employeeCount: visibleEmployees.length,
      locations,
      period: days === 7 ? '7d' : days === 30 ? '30d' : '14d',
    };
  }

  async organization(user: JwtUser) {
    const [rawSetup, companies, locations, employees, groups, altegio] = await Promise.all([
      this.orgService.getSetup(user.tenantId).catch(() => ({
        organizationId: null,
        configured: false,
        company: null,
        location: null,
        attendanceTrackingEnabled: true,
        defaultGeofenceRadiusMeters: 100,
      })),
      this.orgService
        .listCompanies(user.tenantId, false, user.sub)
        .catch(() => []),
      this.orgService
        .listLocations(user.tenantId, undefined, false, user.sub)
        .catch(() => []),
      this.employeesService.list(user.tenantId, {}, user.sub).catch(() => []),
      this.collaborationService.listGroups(user.sub).catch(() => []),
      this.altegioMarketplaceBilling
        .getMarketplaceSummary(user.tenantId)
        .catch(() => ({
          connected: false,
          locationId: null,
          applicationId: null,
          activatedAt: null,
        })),
    ]);
    const company =
      companies.find(({ id }) => id === rawSetup.company?.id) ??
      companies[0] ??
      null;
    const location = company
      ? locations.find(({ id }) => id === rawSetup.location?.id) ??
        locations.find(({ companyId }) => companyId === company.id) ??
        null
      : null;
    const setup = {
      ...rawSetup,
      company,
      location,
      configured: Boolean(rawSetup.configured && company && location),
    };
    const employeeCount = company
      ? employees.filter((employee) => employee.company?.id === company.id).length
      : 0;

    return {
      setup,
      employeeCount,
      companies,
      locations,
      employees,
      groups,
      altegio,
    };
  }

  async news(user: JwtUser) {
    const mode = isEmployeeOnlyRole(user.roleCodes) ? 'employee' : 'admin';

    if (mode === 'employee') {
      return {
        mode,
        initialData: {
          items: await this.collaborationService
            .listMyAnnouncements(user.sub)
            .catch(() => []),
          employees: [],
          groups: [],
        },
      };
    }

    const [items, employees, groups] = await Promise.all([
      this.collaborationService.listAnnouncementsForManager(user.sub).catch(() => []),
      this.employeesService.list(user.tenantId, {}, user.sub).catch(() => []),
      this.collaborationService.listGroups(user.sub).catch(() => []),
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
    const organizationSetup = await this.loadOrganizationSetup(user.tenantId);
    const earliestMonthKey = getOrganizationStartMonthKey(organizationSetup);
    const resolvedMonthKey = resolveLeaderboardMonthKey(month, earliestMonthKey);
    const fallback = buildEmptyLeaderboardOverview(resolvedMonthKey, earliestMonthKey);
    const disabledFallback = {
      ...fallback,
      me: {
        ...fallback.me,
        employeeId: user.sub,
      },
    };

    if (organizationSetup.attendanceTrackingEnabled === false) {
      return {
        mode,
        initialData: disabledFallback,
      };
    }

    return {
      mode,
      initialData: await this.leaderboardService
        .getOverview(user.sub, resolvedMonthKey)
        .catch(() => disabledFallback),
    };
  }

  async biometric(user: JwtUser, result?: string) {
    const organizationSetup = await this.loadOrganizationSetup(user.tenantId);

    if (organizationSetup.attendanceTrackingEnabled === false) {
      return {
        employees: [],
        reviews: null,
        result: result ?? '__all',
      };
    }

    const biometricResult =
      result === 'FAILED' || result === 'PASSED' || result === 'REVIEW'
        ? result
        : undefined;
    const query: {
      result?: 'FAILED' | 'PASSED' | 'REVIEW';
    } = biometricResult ? { result: biometricResult } : {};
    const [employees, reviews] = await Promise.all([
      this.employeesService.list(user.tenantId, {}, user.sub).catch(() => []),
      this.biometricService.getTeamReviews(user.tenantId, query).catch(() => null),
    ]);

    return {
      employees,
      reviews,
      result: result ?? '__all',
    };
  }
}
