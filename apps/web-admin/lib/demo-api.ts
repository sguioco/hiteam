import { getSession } from "./auth";
import {
  createMockApprovalInboxItems,
  createMockScheduleData,
} from "./mock-admin-data";
import {
  createDemoSession,
  getDemoRoleByToken,
  isDemoAccessToken,
  isDemoModeEnabled,
} from "./demo-mode";
import { getMockAvatarDataUrl } from "./mock-avatar";
import { appendTaskMeta } from "./task-meta";

const DEMO_STATE_KEY = "smart-admin-demo-state";

type DemoEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  employeeNumber: string;
  hireDate: string;
  birthDate: string | null;
  gender: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  user: {
    id: string;
    email: string;
  } | null;
  company: {
    id: string;
    name: string;
  } | null;
  department: {
    id: string;
    name: string;
  } | null;
  primaryLocation: {
    id: string;
    name: string;
  } | null;
  position: {
    id: string;
    name: string;
  } | null;
  devices: Array<{
    id: string;
    platform: string;
    deviceName: string | null;
    isPrimary: boolean;
  }>;
};

type DemoState = {
  organization: {
    company: {
      id: string;
      name: string;
      logoUrl: string | null;
      googlePlaceId: string | null;
    } | null;
    configured: boolean;
    defaultGeofenceRadiusMeters: number;
    location: {
      address: string;
      latitude: number;
      longitude: number;
      timezone: string;
      geofenceRadiusMeters: number;
    } | null;
  };
  employees: DemoEmployee[];
  locations: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string }>;
  groups: Array<{
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
      };
    }>;
    _count?: {
      tasks: number;
    };
  }>;
  tasks: any[];
  requests: any[];
  notifications: any[];
  invitations: any[];
  shifts: any[];
  templates: any[];
  payrollPolicy: any;
  holidays: any[];
  exportJobs: any[];
  biometricEmployees: any[];
};

let memoryState: DemoState | null = null;

function createIsoAt(offsetDays: number, hours: number, minutes: number) {
  const next = new Date();
  next.setDate(next.getDate() + offsetDays);
  next.setHours(hours, minutes, 0, 0);
  return next.toISOString();
}

function dateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildTaskId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseBody<T>(body?: BodyInit | null): T {
  if (!body) return {} as T;
  if (typeof body === "string") {
    return JSON.parse(body) as T;
  }
  return body as T;
}

function cloneState(state: DemoState) {
  return JSON.parse(JSON.stringify(state)) as DemoState;
}

function buildEmployeeFullName(employee: {
  firstName: string;
  lastName: string;
  middleName?: string | null;
}) {
  return [employee.lastName, employee.firstName, employee.middleName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function createInitialState(): DemoState {
  const scheduleData = createMockScheduleData(new Date(), "ru");
  const company = {
    id: "company-demo",
    name: "HiTeam Studio",
    logoUrl: null,
    googlePlaceId: "demo-place-id",
  };

  const employees: DemoEmployee[] = scheduleData.employees.map(
    (employee, index) => ({
      ...employee,
      department: employee.department ?? null,
      primaryLocation: employee.primaryLocation ?? null,
      position: employee.position ?? null,
      middleName: index % 2 === 0 ? "Александрович" : "Игоревна",
      birthDate: `199${index}-0${(index % 8) + 1}-1${index}`,
      gender: index % 2 === 0 ? "male" : "female",
      phone: `+7 999 000 0${index}${index}`,
      avatarUrl: getMockAvatarDataUrl(
        `${employee.firstName} ${employee.lastName}`,
      ),
      status: index < 4 ? "ACTIVE" : "INACTIVE",
      user: {
        id: `user-${employee.id}`,
        email: `employee${index + 1}@hiteam.demo`,
      },
      company,
      devices: [
        {
          id: `device-${employee.id}`,
          platform: index % 2 === 0 ? "IOS" : "ANDROID",
          deviceName: index % 2 === 0 ? "iPhone 15" : "Galaxy S25",
          isPrimary: true,
        },
      ],
    }),
  );

  const managerEmployee = employees[0];
  const groups = [
    {
      id: "group-ops",
      name: "Операции / Утро",
      description: "Основная утренняя смена.",
      managerEmployeeId: managerEmployee.id,
      memberships: employees.slice(0, 3).map((employee) => ({
        id: `membership-ops-${employee.id}`,
        employeeId: employee.id,
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeNumber: employee.employeeNumber,
        },
      })),
      _count: { tasks: 4 },
    },
    {
      id: "group-hr",
      name: "People Ops",
      description: "HR и сопровождение.",
      managerEmployeeId: managerEmployee.id,
      memberships: employees.slice(3, 5).map((employee) => ({
        id: `membership-hr-${employee.id}`,
        employeeId: employee.id,
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeNumber: employee.employeeNumber,
        },
      })),
      _count: { tasks: 2 },
    },
  ];

  const buildTask = ({
    id,
    title,
    description,
    dueAt,
    priority,
    status = "TODO",
    assigneeEmployeeId,
    groupId = null,
    checklistItems = [],
  }: {
    id: string;
    title: string;
    description: string | null;
    dueAt: string | null;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    status?: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
    assigneeEmployeeId?: string | null;
    groupId?: string | null;
    checklistItems?: any[];
  }) => {
    const assignee = assigneeEmployeeId
      ? (employees.find((employee) => employee.id === assigneeEmployeeId) ??
        null)
      : null;
    const group = groupId
      ? (groups.find((item) => item.id === groupId) ?? null)
      : null;
    const completedAt = status === "DONE" ? createIsoAt(0, 18, 15) : null;

    return {
      id,
      title,
      description,
      status,
      priority,
      dueAt,
      completedAt,
      createdAt: createIsoAt(-2, 9, 0),
      updatedAt: completedAt ?? createIsoAt(-1, 11, 30),
      groupId,
      assigneeEmployeeId: assignee?.id ?? null,
      managerEmployee: {
        id: managerEmployee.id,
        firstName: managerEmployee.firstName,
        lastName: managerEmployee.lastName,
      },
      assigneeEmployee: assignee
        ? {
            id: assignee.id,
            firstName: assignee.firstName,
            lastName: assignee.lastName,
            employeeNumber: assignee.employeeNumber,
            department: assignee.department,
            primaryLocation: assignee.primaryLocation,
          }
        : null,
      group: group
        ? {
            id: group.id,
            name: group.name,
          }
        : null,
      checklistItems,
      activities: [
        {
          id: `activity-${id}`,
          kind: "CREATED",
          body: "Создано в демо-режиме.",
          createdAt: createIsoAt(-2, 9, 5),
          actorEmployee: {
            id: managerEmployee.id,
            firstName: managerEmployee.firstName,
            lastName: managerEmployee.lastName,
          },
        },
      ],
      photoProofs: [],
    };
  };

  const tasks = [
    buildTask({
      id: "task-demo-1",
      title: "Проверить табель за первую половину месяца",
      description: "Сверить отметки прихода и комментарии по отклонениям.",
      dueAt: createIsoAt(0, 10, 30),
      priority: "HIGH",
      assigneeEmployeeId: employees[0].id,
      checklistItems: [
        {
          id: "task-demo-1-check-1",
          title: "Проверить опоздания по группе A",
          sortOrder: 1,
          isCompleted: true,
          completedAt: createIsoAt(0, 9, 50),
          completedByEmployee: {
            id: employees[0].id,
            firstName: employees[0].firstName,
            lastName: employees[0].lastName,
          },
        },
        {
          id: "task-demo-1-check-2",
          title: "Подготовить комментарии руководителю",
          sortOrder: 2,
          isCompleted: false,
          completedAt: null,
          completedByEmployee: null,
        },
      ],
    }),
    buildTask({
      id: "task-demo-2",
      title: "Встреча: Ежедневный синк по сменам",
      description:
        appendTaskMeta("Обсуждение покрытия вечерних смен.", {
          kind: "meeting",
          meetingMode: "offline",
          meetingLocation: "Переговорная B",
        }) ?? null,
      dueAt: createIsoAt(0, 15, 0),
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      assigneeEmployeeId: employees[0].id,
    }),
    buildTask({
      id: "task-demo-3",
      title: "Подготовить список сотрудников на обучение",
      description: "Собрать кандидатов на внутреннее обучение в апреле.",
      dueAt: createIsoAt(1, 11, 15),
      priority: "MEDIUM",
      assigneeEmployeeId: employees[1].id,
    }),
    buildTask({
      id: "task-demo-4",
      title: "Подтвердить подменный состав",
      description: "Убедиться, что резерв на конец недели подтвержден.",
      dueAt: createIsoAt(2, 9, 20),
      priority: "HIGH",
      assigneeEmployeeId: employees[2].id,
    }),
    buildTask({
      id: "task-demo-5",
      title: "Собрать комментарии по повторным опозданиям",
      description: "Подготовить short summary для HR.",
      dueAt: createIsoAt(-1, 13, 0),
      priority: "URGENT",
      status: "DONE",
      assigneeEmployeeId: employees[0].id,
    }),
    buildTask({
      id: "task-demo-6",
      title: "Открыть новый onboarding-поток",
      description: "Групповая задача для People Ops.",
      dueAt: createIsoAt(3, 12, 30),
      priority: "MEDIUM",
      groupId: groups[1].id,
      assigneeEmployeeId: employees[3].id,
    }),
  ];

  const requests = createMockApprovalInboxItems(new Date(), "ru").map(
    (item, index) => ({
      ...item,
      status: index === 0 ? "PENDING" : item.status,
      request: {
        ...item.request,
        employee: {
          id: employees[index % employees.length].id,
          firstName: employees[index % employees.length].firstName,
          lastName: employees[index % employees.length].lastName,
          employeeNumber: employees[index % employees.length].employeeNumber,
        },
      },
    }),
  );

  const notifications = [
    {
      id: "notification-1",
      type: "REQUEST_ACTION_REQUIRED",
      title: "Новая заявка на согласование",
      body: "Во входящих появилось новое согласование по смене.",
      actionUrl: "/requests",
      isRead: false,
      readAt: null,
      createdAt: createIsoAt(0, 9, 20),
    },
    {
      id: "notification-2",
      type: "ATTENDANCE_ANOMALY_CRITICAL",
      title: "Критическая аномалия посещаемости",
      body: "У одного сотрудника пропущена отметка прихода.",
      actionUrl: "/attendance",
      isRead: false,
      readAt: null,
      createdAt: createIsoAt(0, 8, 45),
    },
    {
      id: "notification-3",
      type: "BIOMETRIC_REVIEW_ACTION_REQUIRED",
      title: "Биометрия требует ручного ревью",
      body: "Есть 2 верификации со статусом Review.",
      actionUrl: "/biometric",
      isRead: true,
      readAt: createIsoAt(0, 8, 15),
      createdAt: createIsoAt(0, 8, 10),
    },
  ];

  const invitations = [
    {
      id: "invitation-1",
      email: "new.employee@hiteam.demo",
      status: "PENDING_APPROVAL",
      expiresAt: createIsoAt(3, 23, 59),
      submittedAt: createIsoAt(-1, 14, 15),
      resentCount: 0,
      firstName: "Екатерина",
      lastName: "Морозова",
      middleName: "",
      birthDate: "1998-04-12",
      gender: "female",
      phone: "+7 999 120 33 44",
      avatarUrl: null,
      rejectedReason: null,
    },
  ];

  const payrollPolicy = {
    id: "policy-demo",
    tenantId: "demo-tenant",
    baseHourlyRate: 12.5,
    overtimeMultiplier: 1.5,
    weekendMultiplier: 1.25,
    weekendOvertimeMultiplier: 1.75,
    holidayMultiplier: 2,
    holidayOvertimeMultiplier: 2.5,
    nightPremiumMultiplier: 1.2,
    nightShiftStartLocal: "22:00",
    nightShiftEndLocal: "06:00",
    latenessPenaltyPerMinute: 0.08,
    earlyLeavePenaltyPerMinute: 0.08,
    leavePaidRatio: 1,
    sickLeavePaidRatio: 0.75,
    standardShiftMinutes: 480,
    defaultBreakIsPaid: false,
    maxBreakMinutes: 60,
    mandatoryBreakThresholdMinutes: 360,
    mandatoryBreakDurationMinutes: 30,
  };

  const holidays = [
    {
      id: "holiday-1",
      name: "Company Day",
      date: dateKey(new Date(new Date().getFullYear(), 4, 20)),
      isPaid: true,
    },
    {
      id: "holiday-2",
      name: "Inventory Reset",
      date: dateKey(new Date(new Date().getFullYear(), 6, 15)),
      isPaid: false,
    },
  ];

  const exportJobs = [
    {
      id: "export-job-1",
      type: "PAYROLL_SUMMARY",
      format: "xlsx",
      status: "COMPLETED",
      fileName: "payroll-march-demo.xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      downloadUrl: "#",
      errorMessage: null,
      attempts: 1,
      createdAt: createIsoAt(-1, 16, 0),
      startedAt: createIsoAt(-1, 16, 1),
      completedAt: createIsoAt(-1, 16, 2),
    },
  ];

  const biometricEmployees = employees.map((employee, index) => {
    const result = index === 1 ? "REVIEW" : index === 4 ? "FAILED" : "PASSED";
    const manualReviewStatus =
      result === "REVIEW"
        ? "PENDING"
        : result === "FAILED"
          ? "REJECTED"
          : "APPROVED";

    return {
      employeeId: employee.id,
      employeeName: buildEmployeeFullName(employee),
      employeeNumber: employee.employeeNumber,
      department: employee.department?.name ?? "—",
      location: employee.primaryLocation?.name ?? "—",
      enrollmentStatus: index === 5 ? "NOT_STARTED" : "ENROLLED",
      provider: "guided-web",
      enrolledAt: index === 5 ? null : createIsoAt(-20, 10, 0),
      lastVerifiedAt: index === 5 ? null : createIsoAt(-(index + 1), 9, 35),
      pendingReview: result === "REVIEW",
      latestVerification:
        index === 5
          ? null
          : {
              id: `verification-${employee.id}`,
              result,
              manualReviewStatus,
              reviewedAt: result === "REVIEW" ? null : createIsoAt(-1, 17, 0),
              reviewerComment:
                result === "FAILED"
                  ? "Требуется повторная регистрация лица."
                  : result === "REVIEW"
                    ? "Низкая уверенность матчинга."
                    : "Проверка пройдена.",
              reviewerEmployee:
                result === "REVIEW"
                  ? null
                  : {
                      id: managerEmployee.id,
                      firstName: managerEmployee.firstName,
                      lastName: managerEmployee.lastName,
                    },
              livenessScore: 0.93 - index * 0.05,
              matchScore: 0.91 - index * 0.06,
              reviewReason:
                result === "REVIEW" ? "Face mismatch confidence is low." : null,
              capturedAt: createIsoAt(-(index + 1), 9, 30),
              artifactCount: 2,
              artifactPreviewUrls: employee.avatarUrl
                ? [employee.avatarUrl]
                : [],
            },
    };
  });

  return {
    organization: {
      company,
      configured: true,
      defaultGeofenceRadiusMeters: 180,
      location: {
        address: "Sukhumvit Rd, Bangkok, Thailand",
        latitude: 13.7563,
        longitude: 100.5018,
        timezone: "Asia/Bangkok",
        geofenceRadiusMeters: 180,
      },
    },
    employees,
    locations: scheduleData.locations,
    departments: scheduleData.departments,
    positions: scheduleData.positions,
    groups,
    tasks,
    requests,
    notifications,
    invitations,
    shifts: scheduleData.shifts,
    templates: scheduleData.templates,
    payrollPolicy,
    holidays,
    exportJobs,
    biometricEmployees,
  };
}

function loadState(): DemoState {
  if (memoryState) return memoryState;
  if (typeof window === "undefined") {
    memoryState = createInitialState();
    return memoryState;
  }

  const raw = window.localStorage.getItem(DEMO_STATE_KEY);
  if (!raw) {
    memoryState = createInitialState();
    return memoryState;
  }

  try {
    memoryState = JSON.parse(raw) as DemoState;
    return memoryState;
  } catch {
    memoryState = createInitialState();
    return memoryState;
  }
}

function saveState(state: DemoState) {
  memoryState = cloneState(state);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(memoryState));
  }
}

function updateState(mutator: (state: DemoState) => DemoState | void) {
  const current = cloneState(loadState());
  const next = mutator(current) ?? current;
  saveState(next);
  return next;
}

function currentDemoRole(token?: string) {
  return getDemoRoleByToken(token ?? getSession()?.accessToken ?? null);
}

function currentEmployeeId(token?: string) {
  const role = currentDemoRole(token);
  return role === "employee" ? "emp-2" : "emp-1";
}

function shouldHandle(token?: string) {
  return (
    isDemoModeEnabled() &&
    isDemoAccessToken(token ?? getSession()?.accessToken ?? null)
  );
}

function buildAttendanceLive(state: DemoState) {
  return state.employees.slice(0, 5).map((employee, index) => ({
    sessionId: `session-${employee.id}`,
    employeeId: employee.id,
    employeeName: buildEmployeeFullName(employee),
    employeeNumber: employee.employeeNumber,
    department: employee.department?.name ?? "—",
    location: employee.primaryLocation?.name ?? "—",
    shiftLabel: index === 4 ? null : "09:00-18:00",
    status: index === 0 ? "on_break" : index === 3 ? "checked_out" : "on_shift",
    startedAt: createIsoAt(0, 9 + (index % 2), 0),
    endedAt: index === 3 ? createIsoAt(0, 17, 55) : null,
    totalMinutes: 420 - index * 24,
    breakMinutes: index === 0 ? 15 : index === 2 ? 30 : 0,
    paidBreakMinutes: 0,
    lateMinutes: index === 1 ? 18 : index === 4 ? 6 : 0,
    earlyLeaveMinutes: index === 3 ? 10 : 0,
  }));
}

function buildAttendanceHistory(
  state: DemoState,
  employeeId?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null,
) {
  const from =
    dateFrom ?? dateKey(new Date(new Date().setDate(new Date().getDate() - 6)));
  const to = dateTo ?? dateKey(new Date());
  const rows: any[] = [];

  state.employees
    .filter((employee) => !employeeId || employee.id === employeeId)
    .forEach((employee, employeeIndex) => {
      for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
        const startedAt = createIsoAt(-dayOffset, 9 + (employeeIndex % 2), 0);
        const endedAt = createIsoAt(-dayOffset, 18, 5);
        const dayKey = dateKey(new Date(startedAt));
        if (dayKey < from || dayKey > to) {
          continue;
        }
        rows.push({
          sessionId: `${employee.id}-history-${dayOffset}`,
          employeeId: employee.id,
          employeeName: buildEmployeeFullName(employee),
          employeeNumber: employee.employeeNumber,
          department: employee.department?.name ?? "—",
          location: employee.primaryLocation?.name ?? "—",
          shiftLabel: "09:00-18:00",
          status:
            dayOffset === 0 && employeeIndex === 0 ? "on_break" : "checked_out",
          startedAt,
          endedAt,
          totalMinutes: 540,
          workedMinutes: 495 - employeeIndex * 8,
          breakMinutes: 45,
          paidBreakMinutes: 0,
          lateMinutes:
            employee.id === "emp-2"
              ? 0
              : employeeIndex === 1 && dayOffset < 2
                ? 12
                : 0,
          earlyLeaveMinutes: employeeIndex === 3 && dayOffset === 2 ? 15 : 0,
          checkInEvent: {
            occurredAt: startedAt,
            distanceMeters: 21 + employeeIndex * 3,
            notes: null,
          },
          checkOutEvent: {
            occurredAt: endedAt,
            distanceMeters: 14 + employeeIndex * 2,
            notes: null,
          },
          breaks: [
            {
              id: `${employee.id}-break-${dayOffset}`,
              startedAt: createIsoAt(-dayOffset, 13, 0),
              endedAt: createIsoAt(-dayOffset, 13, 45),
              totalMinutes: 45,
              isPaid: false,
              startEvent: {
                occurredAt: createIsoAt(-dayOffset, 13, 0),
                distanceMeters: 8,
              },
              endEvent: {
                occurredAt: createIsoAt(-dayOffset, 13, 45),
                distanceMeters: 9,
              },
            },
          ],
        });

        if (employee.id === "emp-2" && dayOffset === 1) {
          const extraStartedAt = createIsoAt(-dayOffset, 10, 12);
          const extraEndedAt = createIsoAt(-dayOffset, 19, 2);
          const extraDayKey = dateKey(new Date(extraStartedAt));

          if (extraDayKey >= from && extraDayKey <= to) {
            rows.push({
              sessionId: `${employee.id}-history-extra-${dayOffset}`,
              employeeId: employee.id,
              employeeName: buildEmployeeFullName(employee),
              employeeNumber: employee.employeeNumber,
              department: employee.department?.name ?? "—",
              location: employee.primaryLocation?.name ?? "—",
              shiftLabel: "10:00-19:00",
              status: "checked_out",
              startedAt: extraStartedAt,
              endedAt: extraEndedAt,
              totalMinutes: 540,
              workedMinutes: 465,
              breakMinutes: 45,
              paidBreakMinutes: 0,
              lateMinutes: 12,
              earlyLeaveMinutes: 0,
              checkInEvent: {
                occurredAt: extraStartedAt,
                distanceMeters: 18,
                notes: null,
              },
              checkOutEvent: {
                occurredAt: extraEndedAt,
                distanceMeters: 11,
                notes: null,
              },
              breaks: [
                {
                  id: `${employee.id}-break-extra-${dayOffset}`,
                  startedAt: createIsoAt(-dayOffset, 14, 0),
                  endedAt: createIsoAt(-dayOffset, 14, 45),
                  totalMinutes: 45,
                  isPaid: false,
                  startEvent: {
                    occurredAt: createIsoAt(-dayOffset, 14, 0),
                    distanceMeters: 7,
                  },
                  endEvent: {
                    occurredAt: createIsoAt(-dayOffset, 14, 45),
                    distanceMeters: 8,
                  },
                },
              ],
            });
          }
        }
      }
    });

  const totals = rows.reduce(
    (accumulator, row) => ({
      sessions: accumulator.sessions + 1,
      workedMinutes: accumulator.workedMinutes + row.workedMinutes,
      breakMinutes: accumulator.breakMinutes + row.breakMinutes,
      paidBreakMinutes: accumulator.paidBreakMinutes + row.paidBreakMinutes,
      lateMinutes: accumulator.lateMinutes + row.lateMinutes,
      earlyLeaveMinutes: accumulator.earlyLeaveMinutes + row.earlyLeaveMinutes,
    }),
    {
      sessions: 0,
      workedMinutes: 0,
      breakMinutes: 0,
      paidBreakMinutes: 0,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
    },
  );

  return {
    range: {
      dateFrom: from,
      dateTo: to,
    },
    totals,
    rows,
  };
}

function buildAttendanceAnomalies(state: DemoState) {
  return {
    date: dateKey(new Date()),
    totals: {
      critical: 1,
      warning: 2,
    },
    items: [
      {
        anomalyId: "anomaly-1",
        type: "MISSED_CHECK_IN",
        severity: "critical",
        employeeId: state.employees[4].id,
        employeeName: buildEmployeeFullName(state.employees[4]),
        employeeNumber: state.employees[4].employeeNumber,
        department: state.employees[4].department?.name ?? "—",
        location: state.employees[4].primaryLocation?.name ?? "—",
        shiftLabel: "09:00-18:00",
        detectedAt: createIsoAt(0, 10, 5),
        summary: "Нет отметки начала смены.",
        details: "Сотрудник в расписании, но check-in не зафиксирован.",
        actionUrl: "/attendance",
      },
      {
        anomalyId: "anomaly-2",
        type: "REPEATED_LATENESS",
        severity: "warning",
        employeeId: state.employees[1].id,
        employeeName: buildEmployeeFullName(state.employees[1]),
        employeeNumber: state.employees[1].employeeNumber,
        department: state.employees[1].department?.name ?? "—",
        location: state.employees[1].primaryLocation?.name ?? "—",
        shiftLabel: "09:00-18:00",
        detectedAt: createIsoAt(0, 9, 25),
        summary: `${state.employees[1].firstName} ${state.employees[1].lastName} has repeated lateness.`,
        details: "Опоздания фиксировались 3 раза за последние 7 дней.",
        actionUrl: "/attendance",
      },
      {
        anomalyId: "anomaly-3",
        type: "LONG_BREAK",
        severity: "warning",
        employeeId: state.employees[0].id,
        employeeName: buildEmployeeFullName(state.employees[0]),
        employeeNumber: state.employees[0].employeeNumber,
        department: state.employees[0].department?.name ?? "—",
        location: state.employees[0].primaryLocation?.name ?? "—",
        shiftLabel: "09:00-18:00",
        detectedAt: createIsoAt(0, 14, 10),
        summary: "Перерыв превысил допустимое время.",
        details: "Перерыв длился 65 минут вместо 45.",
        actionUrl: "/attendance",
      },
    ],
  };
}

function buildAttendanceAudit(
  state: DemoState,
  dateFrom?: string | null,
  dateTo?: string | null,
) {
  const from =
    dateFrom ?? dateKey(new Date(new Date().setDate(new Date().getDate() - 6)));
  const to = dateTo ?? dateKey(new Date());
  const location = state.organization.location;

  const items = state.employees.slice(0, 4).map((employee, index) => ({
    eventId: `audit-in-${employee.id}`,
    source: "ATTENDANCE_EVENT",
    employeeId: employee.id,
    employeeName: buildEmployeeFullName(employee),
    employeeNumber: employee.employeeNumber,
    department: employee.department?.name ?? "—",
    eventType: "CHECK_IN",
    result: index === 2 ? "REJECTED" : "ACCEPTED",
    occurredAt: createIsoAt(-index, 9, 0),
    serverRecordedAt: createIsoAt(-index, 9, 0),
    latitude: location?.latitude ?? 13.7563,
    longitude: location?.longitude ?? 100.5018,
    accuracyMeters: 12,
    distanceMeters: 18 + index * 5,
    notes: null,
    failureReason:
      index === 2 ? "Current device is not the employee primary device." : null,
    location: {
      id: "demo-location",
      name: location?.address ?? "Bangkok HQ",
      address: location?.address ?? "Bangkok HQ",
      latitude: location?.latitude ?? 13.7563,
      longitude: location?.longitude ?? 100.5018,
      geofenceRadiusMeters: location?.geofenceRadiusMeters ?? 180,
    },
    device: {
      id: employee.devices[0]?.id ?? null,
      name: employee.devices[0]?.deviceName ?? null,
      platform: employee.devices[0]?.platform ?? "WEB",
      isPrimary: employee.devices[0]?.isPrimary ?? true,
    },
    biometricVerification: {
      id: `bio-audit-${employee.id}`,
      result: index === 1 ? "REVIEW" : "PASSED",
      manualReviewStatus: index === 1 ? "PENDING" : "APPROVED",
      capturedAt: createIsoAt(-index, 9, 0),
      livenessScore: 0.91,
      matchScore: 0.88,
    },
  }));

  return {
    range: {
      dateFrom: from,
      dateTo: to,
    },
    totals: {
      total: items.length,
      accepted: items.filter((item) => item.result === "ACCEPTED").length,
      rejected: items.filter((item) => item.result === "REJECTED").length,
      reviewRequired: items.filter(
        (item) => item.biometricVerification?.manualReviewStatus === "PENDING",
      ).length,
    },
    items,
  };
}

function buildCollaborationOverview(state: DemoState) {
  return {
    groups: state.groups.map((group) => ({
      ...group,
      _count: {
        tasks: state.tasks.filter((task) => task.groupId === group.id).length,
      },
    })),
    recentTasks: [...state.tasks]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 8),
    employeeStats: state.employees.map((employee) => {
      const employeeTasks = state.tasks.filter(
        (task) => task.assigneeEmployee?.id === employee.id,
      );
      return {
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeNumber: employee.employeeNumber,
        },
        total: employeeTasks.length,
        todo: employeeTasks.filter((task) => task.status === "TODO").length,
        inProgress: employeeTasks.filter(
          (task) => task.status === "IN_PROGRESS",
        ).length,
        done: employeeTasks.filter((task) => task.status === "DONE").length,
        cancelled: employeeTasks.filter((task) => task.status === "CANCELLED")
          .length,
      };
    }),
  };
}

function buildTaskBoard(state: DemoState) {
  const tasks = [...state.tasks].sort((left, right) => {
    if (!left.dueAt && !right.dueAt) return 0;
    if (!left.dueAt) return 1;
    if (!right.dueAt) return -1;
    return left.dueAt.localeCompare(right.dueAt);
  });
  const now = Date.now();

  return {
    totals: {
      total: tasks.length,
      overdue: tasks.filter(
        (task) =>
          task.dueAt &&
          new Date(task.dueAt).getTime() < now &&
          task.status !== "DONE",
      ).length,
      active: tasks.filter(
        (task) => task.status === "TODO" || task.status === "IN_PROGRESS",
      ).length,
      done: tasks.filter((task) => task.status === "DONE").length,
    },
    tasks,
  };
}

function buildBiometricReviewResponse(
  state: DemoState,
  searchParams: URLSearchParams,
) {
  const employeeId = searchParams.get("employeeId");
  const result = searchParams.get("result");
  const items = state.biometricEmployees.filter((item) => {
    if (employeeId && item.employeeId !== employeeId) return false;
    if (result && item.latestVerification?.result !== result) return false;
    return true;
  });

  return {
    totals: {
      employees: state.biometricEmployees.length,
      enrolled: state.biometricEmployees.filter(
        (item) => item.enrollmentStatus === "ENROLLED",
      ).length,
      reviewRequired: state.biometricEmployees.filter(
        (item) => item.pendingReview,
      ).length,
      notEnrolled: state.biometricEmployees.filter(
        (item) => item.enrollmentStatus === "NOT_STARTED",
      ).length,
    },
    items,
  };
}

function buildBiometricInbox(state: DemoState) {
  return {
    items: state.biometricEmployees
      .filter(
        (item) =>
          item.latestVerification &&
          item.latestVerification.result === "REVIEW" &&
          item.latestVerification.manualReviewStatus === "PENDING",
      )
      .map((item) => ({
        verificationId: item.latestVerification.id,
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        employeeNumber: item.employeeNumber,
        department: item.department,
        location: item.location,
        provider: item.provider,
        result: item.latestVerification.result,
        manualReviewStatus: item.latestVerification.manualReviewStatus,
        livenessScore: item.latestVerification.livenessScore,
        matchScore: item.latestVerification.matchScore,
        reviewReason: item.latestVerification.reviewReason,
        capturedAt: item.latestVerification.capturedAt,
        attendanceEvent: {
          id: `attendance-${item.employeeId}`,
          eventType: "CHECK_IN",
          occurredAt: item.latestVerification.capturedAt,
        },
        artifacts: [
          {
            id: `artifact-${item.employeeId}`,
            kind: "VERIFICATION",
            stepId: null,
            url: item.latestVerification.artifactPreviewUrls[0] ?? null,
          },
        ],
      })),
  };
}

function buildEmployeeBiometricHistory(state: DemoState, employeeId: string) {
  const employee = state.employees.find((item) => item.id === employeeId);
  const biometric = state.biometricEmployees.find(
    (item) => item.employeeId === employeeId,
  );

  if (!employee || !biometric) {
    throw new Error("Сотрудник не найден.");
  }

  return {
    employee: {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeNumber: employee.employeeNumber,
      department: employee.department,
      location: employee.primaryLocation,
    },
    profile:
      biometric.enrollmentStatus === "NOT_STARTED"
        ? null
        : {
            id: `profile-${employee.id}`,
            enrollmentStatus: biometric.enrollmentStatus,
            consentVersion: "1.0",
            enrolledAt: biometric.enrolledAt,
            lastVerifiedAt: biometric.lastVerifiedAt,
            provider: biometric.provider,
            templateRef: `tpl-${employee.id}`,
            templateUrl: employee.avatarUrl,
          },
    verifications: biometric.latestVerification
      ? [
          {
            id: biometric.latestVerification.id,
            result: biometric.latestVerification.result,
            manualReviewStatus: biometric.latestVerification.manualReviewStatus,
            reviewedAt: biometric.latestVerification.reviewedAt,
            reviewerComment: biometric.latestVerification.reviewerComment,
            reviewerEmployee: biometric.latestVerification.reviewerEmployee,
            livenessScore: biometric.latestVerification.livenessScore,
            matchScore: biometric.latestVerification.matchScore,
            reviewReason: biometric.latestVerification.reviewReason,
            capturedAt: biometric.latestVerification.capturedAt,
            attendanceEvent: {
              id: `attendance-${employee.id}`,
              eventType: "CHECK_IN",
              occurredAt: biometric.latestVerification.capturedAt,
            },
            artifacts: [
              {
                id: `artifact-full-${employee.id}`,
                kind: "VERIFICATION",
                stepId: null,
                contentType: "image/png",
                createdAt: biometric.latestVerification.capturedAt,
                storageKey: `demo/${employee.id}.png`,
                url: employee.avatarUrl,
              },
            ],
          },
        ]
      : [],
  };
}

function buildPayrollSummary(state: DemoState) {
  const rows = state.employees.map((employee, index) => {
    const workedMinutes = 8640 - index * 120;
    const scheduledMinutes = 9120;
    const breakMinutes = 780;
    const overtimeMinutes = 240 - index * 15;
    const nightMinutes = index === 3 ? 320 : 0;
    const gross =
      1850 - index * 120 + overtimeMinutes * 0.12 + nightMinutes * 0.05;

    return {
      employeeId: employee.id,
      employeeName: buildEmployeeFullName(employee),
      employeeNumber: employee.employeeNumber,
      department: employee.department?.name ?? "—",
      position: employee.position?.name ?? "—",
      scheduledMinutes,
      workedMinutes,
      rawWorkedMinutes: workedMinutes + breakMinutes,
      breakMinutes,
      regularMinutes: workedMinutes - overtimeMinutes,
      weekendMinutes: 480,
      holidayMinutes: 0,
      overtimeMinutes,
      weekendOvertimeMinutes: 60,
      holidayOvertimeMinutes: 0,
      nightMinutes,
      lateMinutes: index === 1 ? 36 : 0,
      earlyLeaveMinutes: index === 4 ? 20 : 0,
      leaveDays: index === 2 ? 1 : 0,
      sickDays: 0,
      attendanceSessions: 22,
      assignedShifts: 23,
      basePay: 1450 - index * 90,
      weekendPay: 140,
      holidayPay: 0,
      overtimePay: 110,
      weekendOvertimePay: 35,
      holidayOvertimePay: 0,
      nightPremiumPay: nightMinutes ? 42 : 0,
      latenessPenalty: index === 1 ? 18 : 0,
      earlyLeavePenalty: index === 4 ? 9 : 0,
      leavePay: index === 2 ? 75 : 0,
      sickPay: 0,
      estimatedGrossPay: gross,
    };
  });

  return {
    policy: state.payrollPolicy,
    holidays: state.holidays,
    range: {
      dateFrom: dateKey(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      ),
      dateTo: dateKey(new Date()),
    },
    totals: {
      employees: rows.length,
      scheduledMinutes: rows.reduce(
        (sum, row) => sum + row.scheduledMinutes,
        0,
      ),
      workedMinutes: rows.reduce((sum, row) => sum + row.workedMinutes, 0),
      rawWorkedMinutes: rows.reduce(
        (sum, row) => sum + row.rawWorkedMinutes,
        0,
      ),
      breakMinutes: rows.reduce((sum, row) => sum + row.breakMinutes, 0),
      weekendMinutes: rows.reduce((sum, row) => sum + row.weekendMinutes, 0),
      holidayMinutes: rows.reduce((sum, row) => sum + row.holidayMinutes, 0),
      overtimeMinutes: rows.reduce((sum, row) => sum + row.overtimeMinutes, 0),
      weekendOvertimeMinutes: rows.reduce(
        (sum, row) => sum + row.weekendOvertimeMinutes,
        0,
      ),
      holidayOvertimeMinutes: rows.reduce(
        (sum, row) => sum + row.holidayOvertimeMinutes,
        0,
      ),
      nightMinutes: rows.reduce((sum, row) => sum + row.nightMinutes, 0),
      leaveDays: rows.reduce((sum, row) => sum + row.leaveDays, 0),
      sickDays: rows.reduce((sum, row) => sum + row.sickDays, 0),
      estimatedGrossPay: rows.reduce(
        (sum, row) => sum + row.estimatedGrossPay,
        0,
      ),
    },
    rows,
  };
}

function buildEmployeeSummary(state: DemoState, token?: string) {
  const employeeId = currentEmployeeId(token);
  const unreadNotifications = state.notifications.filter(
    (item) => !item.isRead,
  ).length;
  const pendingTasks = state.tasks.filter(
    (task) =>
      task.assigneeEmployee?.id === employeeId &&
      task.status !== "DONE" &&
      task.status !== "CANCELLED",
  ).length;

  return {
    unreadNotifications,
    unreadChats: 2,
    pendingTasks,
    pinnedAnnouncements: 1,
    totalAttention: unreadNotifications + pendingTasks + 3,
  };
}

function isRealBackendOnlyPath(path: string) {
  return /^\/employees\/invitations\/public(?:\/|$)/.test(path);
}

export function shouldUseDemoApi(path: string, token?: string) {
  if (isRealBackendOnlyPath(path)) {
    return false;
  }

  return shouldHandle(token);
}

export async function demoApiRequest<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const token = options?.token ?? getSession()?.accessToken ?? undefined;
  if (!shouldHandle(token)) {
    throw new Error("Demo mode is not active.");
  }

  const session = getSession();
  const currentState = loadState();
  const url = new URL(path, "https://demo.local");
  const pathname = url.pathname;
  const method = (options?.method ?? "GET").toUpperCase();

  if (pathname === "/notifications/me/unread-count" && method === "GET") {
    return {
      unreadCount: currentState.notifications.filter((item) => !item.isRead)
        .length,
    } as T;
  }

  if (pathname === "/notifications/me" && method === "GET") {
    return [...currentState.notifications].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    ) as T;
  }

  const readNotificationMatch = pathname.match(
    /^\/notifications\/([^/]+)\/read$/,
  );
  if (readNotificationMatch && method === "POST") {
    const notificationId = readNotificationMatch[1];
    updateState((state) => {
      const item = state.notifications.find(
        (entry) => entry.id === notificationId,
      );
      if (item && !item.isRead) {
        item.isRead = true;
        item.readAt = new Date().toISOString();
      }
    });
    return undefined as T;
  }

  if (pathname === "/employees" && method === "GET") {
    return cloneState(currentState).employees as T;
  }

  const employeeDetailsMatch = pathname.match(/^\/employees\/([^/]+)$/);
  if (employeeDetailsMatch && method === "GET") {
    const employee = currentState.employees.find(
      (item) => item.id === employeeDetailsMatch[1],
    );
    if (!employee) {
      throw new Error("Сотрудник не найден.");
    }
    return employee as T;
  }

  if (pathname === "/employees/me/access-status" && method === "GET") {
    return {
      workspaceAccessAllowed: session?.user.workspaceAccessAllowed ?? true,
      invitationStatus: "APPROVED",
      submittedAt: null,
      rejectedReason: null,
    } as T;
  }

  if (pathname === "/employees/invitations/pending" && method === "GET") {
    return cloneState(currentState).invitations as T;
  }

  if (pathname === "/employees/invitations" && method === "POST") {
    const payload = parseBody<{ email: string }>(options?.body);
    updateState((state) => {
      state.invitations.unshift({
        id: buildTaskId("invitation"),
        email: payload.email,
        status: "INVITED",
        expiresAt: createIsoAt(3, 23, 59),
        submittedAt: null,
        resentCount: 0,
        firstName: null,
        lastName: null,
        middleName: null,
        birthDate: null,
        gender: null,
        phone: null,
        avatarUrl: null,
        rejectedReason: null,
      });
    });
    return undefined as T;
  }

  const resendInvitationMatch = pathname.match(
    /^\/employees\/invitations\/([^/]+)\/resend$/,
  );
  if (resendInvitationMatch && method === "POST") {
    updateState((state) => {
      const invitation = state.invitations.find(
        (item) => item.id === resendInvitationMatch[1],
      );
      if (invitation) {
        invitation.resentCount += 1;
        invitation.status = "INVITED";
      }
    });
    return undefined as T;
  }

  const reviewInvitationMatch = pathname.match(
    /^\/employees\/invitations\/([^/]+)\/review$/,
  );
  if (reviewInvitationMatch && method === "PATCH") {
    const payload = parseBody<any>(options?.body);
    updateState((state) => {
      const invitation = state.invitations.find(
        (item) => item.id === reviewInvitationMatch[1],
      );
      if (!invitation) return;

      if (payload.decision === "APPROVE") {
        invitation.status = "INVITED";
        invitation.rejectedReason = null;
        invitation.firstName = payload.firstName;
        invitation.lastName = payload.lastName;
        invitation.middleName = payload.middleName ?? null;
        invitation.birthDate = payload.birthDate ?? null;
        invitation.gender = payload.gender ?? null;
        invitation.phone = payload.phone ?? null;
      } else {
        invitation.status = "REJECTED";
        invitation.rejectedReason =
          payload.rejectedReason ?? "Не указана причина.";
      }
    });
    return undefined as T;
  }

  if (pathname === "/org/setup" && method === "GET") {
    return cloneState(currentState).organization as T;
  }

  if (pathname === "/org/setup" && method === "POST") {
    const payload = parseBody<any>(options?.body);
    const nextState = updateState((state) => {
      state.organization.company = {
        ...(state.organization.company ?? {
          id: "company-demo",
          googlePlaceId: null,
          logoUrl: null,
          name: "HiTeam Studio",
        }),
        name: payload.companyName,
        logoUrl: payload.companyLogoUrl ?? null,
        googlePlaceId: payload.googlePlaceId ?? null,
      };
      state.organization.location = {
        address: payload.address,
        latitude: Number(payload.latitude),
        longitude: Number(payload.longitude),
        timezone: payload.timezone,
        geofenceRadiusMeters: Number(payload.geofenceRadiusMeters),
      };
      state.organization.configured = true;
      state.organization.defaultGeofenceRadiusMeters = Number(
        payload.geofenceRadiusMeters,
      );
    });
    return nextState.organization as T;
  }

  if (pathname === "/org/locations" && method === "GET") {
    return cloneState(currentState).locations as T;
  }

  if (pathname === "/org/departments" && method === "GET") {
    return cloneState(currentState).departments as T;
  }

  if (pathname === "/org/positions" && method === "GET") {
    return cloneState(currentState).positions as T;
  }

  if (pathname === "/collaboration/overview" && method === "GET") {
    return buildCollaborationOverview(currentState) as T;
  }

  if (pathname === "/collaboration/inbox-summary/me" && method === "GET") {
    return buildEmployeeSummary(currentState, token) as T;
  }

  if (pathname === "/collaboration/tasks" && method === "GET") {
    return buildTaskBoard(currentState) as T;
  }

  if (pathname === "/collaboration/tasks/me" && method === "GET") {
    const employeeId = currentEmployeeId(token);
    return currentState.tasks.filter(
      (task) => task.assigneeEmployee?.id === employeeId,
    ) as T;
  }

  if (pathname === "/collaboration/tasks" && method === "POST") {
    const payload = parseBody<any>(options?.body);
    updateState((state) => {
      const assignee =
        state.employees.find(
          (employee) => employee.id === payload.assigneeEmployeeId,
        ) ?? state.employees[0];
      const group = payload.groupId
        ? (state.groups.find((entry) => entry.id === payload.groupId) ?? null)
        : null;
      state.tasks.unshift({
        id: buildTaskId("task"),
        title: payload.title,
        description: payload.description ?? null,
        status: "TODO",
        priority: payload.priority ?? "MEDIUM",
        requiresPhoto: Boolean(payload.requiresPhoto),
        isRecurring: false,
        taskTemplateId: null,
        occurrenceDate: null,
        dueAt: payload.dueAt ?? null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        groupId: group?.id ?? null,
        assigneeEmployeeId: assignee?.id ?? null,
        managerEmployee: {
          id: "emp-1",
          firstName: state.employees[0].firstName,
          lastName: state.employees[0].lastName,
        },
        assigneeEmployee: assignee
          ? {
              id: assignee.id,
              firstName: assignee.firstName,
              lastName: assignee.lastName,
              employeeNumber: assignee.employeeNumber,
              department: assignee.department,
              primaryLocation: assignee.primaryLocation,
            }
          : null,
        group: group ? { id: group.id, name: group.name } : null,
        checklistItems: [],
        activities: [],
        photoProofs: [],
      });
    });
    return undefined as T;
  }

  const taskStatusMatch = pathname.match(
    /^\/collaboration\/tasks\/([^/]+)\/status$/,
  );
  if (taskStatusMatch && method === "POST") {
    const payload = parseBody<{ status: string }>(options?.body);
    updateState((state) => {
      const task = state.tasks.find((entry) => entry.id === taskStatusMatch[1]);
      if (task) {
        task.status = payload.status;
        task.updatedAt = new Date().toISOString();
        task.completedAt =
          payload.status === "DONE" ? new Date().toISOString() : null;
      }
    });
    return undefined as T;
  }

  const checklistToggleMatch = pathname.match(
    /^\/collaboration\/tasks\/([^/]+)\/checklist\/([^/]+)\/toggle$/,
  );
  if (checklistToggleMatch && method === "POST") {
    updateState((state) => {
      const task = state.tasks.find(
        (entry) => entry.id === checklistToggleMatch[1],
      );
      const checklistItem = task?.checklistItems.find(
        (entry: any) => entry.id === checklistToggleMatch[2],
      );
      if (checklistItem) {
        checklistItem.isCompleted = !checklistItem.isCompleted;
        checklistItem.completedAt = checklistItem.isCompleted
          ? new Date().toISOString()
          : null;
        checklistItem.completedByEmployee = checklistItem.isCompleted
          ? {
              id: currentEmployeeId(token),
              firstName:
                state.employees.find(
                  (employee) => employee.id === currentEmployeeId(token),
                )?.firstName ?? "Demo",
              lastName:
                state.employees.find(
                  (employee) => employee.id === currentEmployeeId(token),
                )?.lastName ?? "User",
            }
          : null;
      }
    });
    return undefined as T;
  }

  if (pathname === "/requests/inbox" && method === "GET") {
    return cloneState(currentState).requests as T;
  }

  const requestActionMatch = pathname.match(
    /^\/requests\/([^/]+)\/(approve|reject|forward)$/,
  );
  if (requestActionMatch && method === "POST") {
    const [, requestId, action] = requestActionMatch;
    updateState((state) => {
      const item = state.requests.find(
        (entry) => entry.request.id === requestId,
      );
      if (!item) return;
      const nextStatus =
        action === "approve"
          ? "APPROVED"
          : action === "reject"
            ? "REJECTED"
            : "PENDING";
      item.status = nextStatus;
      item.request.status = nextStatus;
      const currentStep = item.request.approvalSteps.find(
        (step: any) => step.sequence === item.sequence,
      );
      if (currentStep) {
        currentStep.status =
          action === "approve"
            ? "APPROVED"
            : action === "reject"
              ? "REJECTED"
              : "PENDING";
      }
    });
    return undefined as T;
  }

  const requestCommentMatch = pathname.match(/^\/requests\/([^/]+)\/comments$/);
  if (requestCommentMatch && method === "POST") {
    const payload = parseBody<{ body: string }>(options?.body);
    let createdComment: any = null;
    updateState((state) => {
      const item = state.requests.find(
        (entry) => entry.request.id === requestCommentMatch[1],
      );
      if (!item) return;
      createdComment = {
        id: buildTaskId("request-comment"),
        body: payload.body,
        createdAt: new Date().toISOString(),
        authorEmployee: {
          id: currentEmployeeId(token),
          firstName:
            state.employees.find(
              (employee) => employee.id === currentEmployeeId(token),
            )?.firstName ?? "Demo",
          lastName:
            state.employees.find(
              (employee) => employee.id === currentEmployeeId(token),
            )?.lastName ?? "User",
        },
      };
      item.request.comments = [
        ...(item.request.comments ?? []),
        createdComment,
      ];
    });
    return createdComment as T;
  }

  if (pathname === "/schedule/templates" && method === "GET") {
    return cloneState(currentState).templates as T;
  }

  if (pathname === "/schedule/templates" && method === "POST") {
    const payload = parseBody<any>(options?.body);
    updateState((state) => {
      const location =
        state.locations.find((item) => item.id === payload.locationId) ??
        state.locations[0];
      const position =
        state.positions.find((item) => item.id === payload.positionId) ??
        state.positions[0];
      state.templates.unshift({
        id: buildTaskId("template"),
        name: payload.name,
        code: payload.code,
        startsAtLocal: payload.startsAtLocal,
        endsAtLocal: payload.endsAtLocal,
        weekDaysJson: Array.isArray(payload.weekDays)
          ? JSON.stringify(payload.weekDays)
          : null,
        gracePeriodMinutes: Number(payload.gracePeriodMinutes ?? 10),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        location,
        position,
      });
    });
    return undefined as T;
  }

  if (pathname === "/schedule/shifts" && method === "GET") {
    return cloneState(currentState).shifts as T;
  }

  if (pathname === "/schedule/shifts" && method === "POST") {
    const payload = parseBody<any>(options?.body);
    updateState((state) => {
      const template =
        state.templates.find((item) => item.id === payload.templateId) ??
        state.templates[0];
      const employee =
        state.employees.find((item) => item.id === payload.employeeId) ??
        state.employees[0];
      state.shifts.unshift({
        id: buildTaskId("shift"),
        shiftDate: payload.shiftDate,
        startsAt: new Date(
          `${payload.shiftDate}T${template.startsAtLocal}:00`,
        ).toISOString(),
        endsAt: new Date(
          `${payload.shiftDate}T${template.endsAtLocal}:00`,
        ).toISOString(),
        status: "ASSIGNED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
        },
        location: template.location,
        position: template.position,
        template: {
          id: template.id,
          name: template.name,
          code: template.code,
          startsAtLocal: template.startsAtLocal,
          endsAtLocal: template.endsAtLocal,
        },
      });
    });
    return undefined as T;
  }

  if (pathname === "/attendance/team/live" && method === "GET") {
    return buildAttendanceLive(currentState) as T;
  }

  if (pathname === "/attendance/team/history" && method === "GET") {
    return buildAttendanceHistory(
      currentState,
      url.searchParams.get("employeeId"),
      url.searchParams.get("dateFrom"),
      url.searchParams.get("dateTo"),
    ) as T;
  }

  if (pathname === "/attendance/me/history" && method === "GET") {
    return buildAttendanceHistory(
      currentState,
      currentEmployeeId(token),
      url.searchParams.get("dateFrom"),
      url.searchParams.get("dateTo"),
    ) as T;
  }

  if (pathname === "/attendance/team/anomalies" && method === "GET") {
    return buildAttendanceAnomalies(currentState) as T;
  }

  if (pathname === "/attendance/team/audit" && method === "GET") {
    return buildAttendanceAudit(
      currentState,
      url.searchParams.get("dateFrom"),
      url.searchParams.get("dateTo"),
    ) as T;
  }

  if (pathname === "/biometric/team/reviews" && method === "GET") {
    return buildBiometricReviewResponse(currentState, url.searchParams) as T;
  }

  if (pathname === "/biometric/reviews/inbox" && method === "GET") {
    return buildBiometricInbox(currentState) as T;
  }

  const biometricHistoryMatch = pathname.match(
    /^\/biometric\/employees\/([^/]+)\/history$/,
  );
  if (biometricHistoryMatch && method === "GET") {
    return buildEmployeeBiometricHistory(
      currentState,
      biometricHistoryMatch[1],
    ) as T;
  }

  const biometricReviewMatch = pathname.match(
    /^\/biometric\/verifications\/([^/]+)\/review$/,
  );
  if (biometricReviewMatch && method === "POST") {
    const payload = parseBody<any>(options?.body);
    updateState((state) => {
      const item = state.biometricEmployees.find(
        (entry) => entry.latestVerification?.id === biometricReviewMatch[1],
      );
      if (!item?.latestVerification) return;
      item.latestVerification.manualReviewStatus =
        payload.decision === "APPROVE" ? "APPROVED" : "REJECTED";
      item.latestVerification.result =
        payload.decision === "APPROVE" ? "PASSED" : "FAILED";
      item.latestVerification.reviewedAt = new Date().toISOString();
      item.latestVerification.reviewerComment = payload.comment ?? null;
      item.latestVerification.reviewerEmployee = {
        id: "emp-1",
        firstName: state.employees[0].firstName,
        lastName: state.employees[0].lastName,
      };
      item.pendingReview = false;
      item.lastVerifiedAt = item.latestVerification.capturedAt;
    });
    return undefined as T;
  }

  if (pathname === "/payroll/summary" && method === "GET") {
    return buildPayrollSummary(currentState) as T;
  }

  if (pathname === "/payroll/policy" && method === "GET") {
    return cloneState(currentState).payrollPolicy as T;
  }

  if (pathname === "/payroll/policy" && method === "POST") {
    const payload = parseBody<any>(options?.body);
    const next = updateState((state) => {
      state.payrollPolicy = {
        ...state.payrollPolicy,
        ...payload,
      };
    });
    return next.payrollPolicy as T;
  }

  if (pathname === "/payroll/holidays" && method === "GET") {
    return cloneState(currentState).holidays as T;
  }

  if (pathname === "/payroll/holidays" && method === "POST") {
    const payload = parseBody<any>(options?.body);
    updateState((state) => {
      state.holidays.unshift({
        id: buildTaskId("holiday"),
        name: payload.name,
        date: payload.date,
        isPaid: Boolean(payload.isPaid),
      });
    });
    return undefined as T;
  }

  const deleteHolidayMatch = pathname.match(/^\/payroll\/holidays\/([^/]+)$/);
  if (deleteHolidayMatch && method === "DELETE") {
    updateState((state) => {
      state.holidays = state.holidays.filter(
        (holiday) => holiday.id !== deleteHolidayMatch[1],
      );
    });
    return undefined as T;
  }

  if (pathname === "/exports/jobs" && method === "GET") {
    return {
      items: cloneState(currentState).exportJobs,
      total: currentState.exportJobs.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    } as T;
  }

  if (pathname === "/exports/payroll" && method === "POST") {
    const payload = parseBody<any>(options?.body);
    updateState((state) => {
      state.exportJobs.unshift({
        id: buildTaskId("export"),
        type: "PAYROLL_SUMMARY",
        format: payload.format ?? "xlsx",
        status: "QUEUED",
        fileName: null,
        contentType: null,
        downloadUrl: null,
        errorMessage: null,
        attempts: 0,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
      });
    });
    return undefined as T;
  }

  if (pathname === "/collaboration/groups" && method === "POST") {
    const payload = parseBody<any>(options?.body);
    updateState((state) => {
      state.groups.unshift({
        id: buildTaskId("group"),
        name: payload.name,
        description: payload.description ?? null,
        managerEmployeeId: "emp-1",
        memberships: [],
        _count: {
          tasks: 0,
        },
      });
    });
    return undefined as T;
  }

  const groupMatch = pathname.match(/^\/collaboration\/groups\/([^/]+)$/);
  if (groupMatch && method === "PATCH") {
    const payload = parseBody<{ name?: string; description?: string }>(
      options?.body,
    );
    updateState((state) => {
      const group = state.groups.find((entry) => entry.id === groupMatch[1]);
      if (!group) return;

      if (typeof payload.name === "string") {
        group.name = payload.name;
      }

      if (typeof payload.description === "string") {
        group.description = payload.description || null;
      }

      state.tasks.forEach((task) => {
        if (task.groupId === group.id && task.group) {
          task.group = {
            id: group.id,
            name: group.name,
          };
        }
      });
    });
    return undefined as T;
  }

  if (groupMatch && method === "DELETE") {
    updateState((state) => {
      state.groups = state.groups.filter((entry) => entry.id !== groupMatch[1]);
      state.tasks.forEach((task) => {
        if (task.groupId === groupMatch[1]) {
          task.groupId = null;
          task.group = null;
        }
      });
    });
    return undefined as T;
  }

  const groupMembersMatch = pathname.match(
    /^\/collaboration\/groups\/([^/]+)\/members$/,
  );
  if (groupMembersMatch && method === "POST") {
    const payload = parseBody<{ employeeIds: string[] }>(options?.body);
    updateState((state) => {
      const group = state.groups.find(
        (entry) => entry.id === groupMembersMatch[1],
      );
      if (!group) return;
      group.memberships = payload.employeeIds
        .map((employeeId, index) => {
          const employee = state.employees.find(
            (entry) => entry.id === employeeId,
          );
          if (!employee) return null;
          return {
            id: `membership-${group.id}-${employee.id}-${index}`,
            employeeId: employee.id,
            employee: {
              id: employee.id,
              firstName: employee.firstName,
              lastName: employee.lastName,
              employeeNumber: employee.employeeNumber,
            },
          };
        })
        .filter(Boolean) as any[];
    });
    return undefined as T;
  }

  throw new Error(`Демо-режим пока не поддерживает ${method} ${pathname}.`);
}

export async function demoApiDownload(
  path: string,
  options?: RequestInit & { token?: string },
) {
  const token = options?.token ?? getSession()?.accessToken ?? undefined;
  if (!shouldHandle(token)) {
    throw new Error("Demo mode is not active.");
  }

  const url = new URL(path, "https://demo.local");
  const format = url.searchParams.get("format") ?? "xlsx";
  const content =
    "HiTeam demo export\nThis file was generated locally in demo mode.\n";

  return {
    blob: new Blob([content], { type: "text/plain;charset=utf-8" }),
    fileName: `hiteam-demo-export.${format}`,
  };
}

export function resetDemoState() {
  memoryState = createInitialState();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(memoryState));
  }
}

export function getDemoSessionForRole(role: "admin" | "employee") {
  return createDemoSession(role);
}
