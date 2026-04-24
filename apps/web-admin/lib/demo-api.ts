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
  DEMO_ADMIN_EMAIL,
} from "./demo-mode";
import {
  readBrowserStorageItem,
  writeBrowserStorageItem,
} from "./browser-storage";
import { getMockAvatarDataUrl, resolveMockAvatarGender } from "./mock-avatar";
import { appendTaskMeta } from "./task-meta";

const DEMO_STATE_KEY = "smart-admin-demo-state";
const DEMO_COMPANY_NAME_EN = "Beauty Saloon";
const DEMO_COMPANY_NAME_RU = "Салон Красоты";
const DEMO_HEADER_EMPLOYEE_COUNT = 16;
const DEMO_ADMIN_AVATAR_URL =
  "https://www.untitledui.com/images/avatars/transparent/nicolas-trevino?bg=%23E0E0E0";

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
  announcements: any[];
  announcementArchive: any[];
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

function isLocalDevHost() {
  if (typeof window === "undefined") {
    return false;
  }

  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

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

function resolveDemoEmployee(
  employees: DemoEmployee[],
  employeeId?: string | null,
) {
  if (employeeId) {
    const matched = employees.find((employee) => employee.id === employeeId);
    if (matched) {
      return matched;
    }
  }

  return employees[0] ?? null;
}

function normalizeDemoChecklistItem(
  item: any,
  index: number,
  employees: DemoEmployee[],
  assigneeEmployeeId?: string | null,
) {
  const fallbackEmployee = resolveDemoEmployee(
    employees,
    item.completedByEmployee?.id ?? assigneeEmployeeId,
  );
  const completedByEmployee =
    item.completedByEmployee ??
    (item.isCompleted && fallbackEmployee
      ? {
          id: fallbackEmployee.id,
          firstName: fallbackEmployee.firstName,
          lastName: fallbackEmployee.lastName,
        }
      : null);

  return {
    id: item.id ?? `checklist-${index + 1}`,
    title: item.title ?? `Шаг ${index + 1}`,
    sortOrder: Number.isFinite(item.sortOrder) ? item.sortOrder : index + 1,
    isCompleted: Boolean(item.isCompleted),
    completedAt:
      item.completedAt ??
      (item.isCompleted ? (item.updatedAt ?? new Date().toISOString()) : null),
    completedByEmployee,
  };
}

function buildTodayDemoShifts(employees: DemoEmployee[]) {
  return [
    {
      employeeIndex: 0,
      startsAtLocal: "09:00",
      endsAtLocal: "18:00",
      templateId: "tpl-demo-day-1",
      templateName: "Основная смена",
      templateCode: "MAIN",
    },
    {
      employeeIndex: 1,
      startsAtLocal: "09:00",
      endsAtLocal: "18:00",
      templateId: "tpl-demo-day-2",
      templateName: "Операционный день",
      templateCode: "DAY",
    },
    {
      employeeIndex: 2,
      startsAtLocal: "10:00",
      endsAtLocal: "19:00",
      templateId: "tpl-demo-day-3",
      templateName: "Поддержка зала",
      templateCode: "SUP",
    },
    {
      employeeIndex: 3,
      startsAtLocal: "10:00",
      endsAtLocal: "19:00",
      templateId: "tpl-demo-day-4",
      templateName: "Дневная смена",
      templateCode: "DAY-2",
    },
    {
      employeeIndex: 4,
      startsAtLocal: "09:00",
      endsAtLocal: "18:00",
      templateId: "tpl-demo-day-5",
      templateName: "Ритейл смена",
      templateCode: "RTL",
    },
    {
      employeeIndex: 5,
      startsAtLocal: "11:00",
      endsAtLocal: "20:00",
      templateId: "tpl-demo-day-6",
      templateName: "Поздняя смена",
      templateCode: "LATE",
    },
  ].map((item) => {
    const employee = employees[item.employeeIndex];
    return {
      id: `shift-demo-today-${employee.id}`,
      shiftDate: dateKey(),
      startsAt: createIsoAt(
        0,
        Number(item.startsAtLocal.slice(0, 2)),
        Number(item.startsAtLocal.slice(3, 5)),
      ),
      endsAt: createIsoAt(
        0,
        Number(item.endsAtLocal.slice(0, 2)),
        Number(item.endsAtLocal.slice(3, 5)),
      ),
      status: "ASSIGNED",
      createdAt: createIsoAt(-1, 9, 0),
      updatedAt: createIsoAt(-1, 9, 0),
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
      },
      location: employee.primaryLocation ?? {
        id: "loc-1",
        name: "Main Location",
      },
      position: employee.position ?? {
        id: "pos-1",
        name: "Manager",
      },
      template: {
        id: item.templateId,
        name: item.templateName,
        code: item.templateCode,
        startsAtLocal: item.startsAtLocal,
        endsAtLocal: item.endsAtLocal,
      },
    };
  });
}

function normalizeDemoPhotoProof(
  proof: any,
  employees: DemoEmployee[],
  assigneeEmployeeId?: string | null,
) {
  const fallbackEmployee = resolveDemoEmployee(
    employees,
    proof.uploadedByEmployee?.id ?? assigneeEmployeeId,
  );

  return {
    id: proof.id ?? buildTaskId("proof"),
    fileName: proof.fileName ?? `${proof.id ?? "proof"}.jpg`,
    storageKey:
      proof.storageKey ?? `demo/tasks/${proof.id ?? buildTaskId("proof")}.jpg`,
    url: proof.url ?? null,
    deletedAt: proof.deletedAt ?? null,
    supersededByProofId: proof.supersededByProofId ?? null,
    createdAt: proof.createdAt ?? new Date().toISOString(),
    uploadedByEmployee:
      proof.uploadedByEmployee ??
      (fallbackEmployee
        ? {
            id: fallbackEmployee.id,
            firstName: fallbackEmployee.firstName,
            lastName: fallbackEmployee.lastName,
          }
        : {
            id: "demo-user",
            firstName: "Demo",
            lastName: "User",
          }),
  };
}

function normalizeDemoTask(task: any, employees: DemoEmployee[]) {
  const createdAt = task.createdAt ?? task.dueAt ?? new Date().toISOString();
  const updatedAt =
    task.updatedAt ?? task.completedAt ?? task.dueAt ?? createdAt;

  return {
    ...task,
    requiresPhoto: Boolean(task.requiresPhoto || task.photoProofs?.length),
    isRecurring: Boolean(task.isRecurring),
    taskTemplateId: task.taskTemplateId ?? null,
    occurrenceDate:
      task.occurrenceDate ??
      (typeof task.dueAt === "string" ? task.dueAt.slice(0, 10) : null),
    createdAt,
    updatedAt,
    checklistItems: Array.isArray(task.checklistItems)
      ? task.checklistItems.map((item: any, index: number) =>
          normalizeDemoChecklistItem(
            item,
            index,
            employees,
            task.assigneeEmployeeId ?? task.assigneeEmployee?.id,
          ),
        )
      : [],
    activities: Array.isArray(task.activities) ? task.activities : [],
    photoProofs: Array.isArray(task.photoProofs)
      ? task.photoProofs.map((proof: any) =>
          normalizeDemoPhotoProof(
            proof,
            employees,
            task.assigneeEmployeeId ?? task.assigneeEmployee?.id,
          ),
        )
      : [],
  };
}

function buildDemoBirthDate(index: number) {
  const now = new Date();
  const year = 1990 + index;

  if (index < 3) {
    const nextBirthday = new Date(now);
    nextBirthday.setDate(now.getDate() + [1, 3, 6][index]);
    const month = String(nextBirthday.getMonth() + 1).padStart(2, "0");
    const day = String(nextBirthday.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return `199${index}-0${(index % 8) + 1}-1${index}`;
}

function getDemoCompanyName(locale: "ru" | "en" = "en") {
  return locale === "ru" ? DEMO_COMPANY_NAME_RU : DEMO_COMPANY_NAME_EN;
}

function buildDemoAuthBootstrap(state: DemoState, token?: string) {
  const role = currentDemoRole(token);
  const isEmployee = role === "employee";
  const fallbackAvatarUrl = isEmployee
    ? getMockAvatarDataUrl("Alex Mironov", "male")
    : DEMO_ADMIN_AVATAR_URL;
  const unreadCount = state.notifications.filter((item) => !item.isRead).length;

  return {
    header: {
      employeeCount: DEMO_HEADER_EMPLOYEE_COUNT,
      organization: {
        company: {
          logoUrl: state.organization.company?.logoUrl ?? null,
          name: getDemoCompanyName("en"),
        },
        configured: state.organization.configured,
      },
      accountProfile: {
        firstName: isEmployee ? "Alex" : "Alex",
        lastName: isEmployee ? "Mironov" : "Petrov",
        avatarUrl: fallbackAvatarUrl,
        company: {
          logoUrl: state.organization.company?.logoUrl ?? null,
          name: getDemoCompanyName("en"),
        },
      },
    },
    notifications: {
      unreadCount,
      notificationItems: [...state.notifications].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      ),
    },
  };
}

function withDemoOwnerIdentity(employee: DemoEmployee) {
  const isOwner = employee.user?.email === DEMO_ADMIN_EMAIL;
  if (!isOwner) {
    return employee;
  }

  return {
    ...employee,
    firstName: "Alex",
    lastName: "Petrov",
    avatarUrl: DEMO_ADMIN_AVATAR_URL,
  };
}

function createInitialState(): DemoState {
  const scheduleData = createMockScheduleData(new Date(), "ru");
  const company = {
    id: "company-demo",
    name: DEMO_COMPANY_NAME_EN,
    logoUrl: null,
    googlePlaceId: "demo-place-id",
  };

  const employees: DemoEmployee[] = scheduleData.employees.map(
    (employee, index) => {
      const gender = resolveMockAvatarGender(
        `${employee.firstName} ${employee.lastName}`,
      );
      return {
        ...employee,
        firstName: index === 0 ? "Alex" : employee.firstName,
        lastName: index === 0 ? "Petrov" : employee.lastName,
        department: employee.department ?? null,
        primaryLocation: employee.primaryLocation ?? null,
        position: employee.position ?? null,
        middleName: gender === "male" ? "Александрович" : "Игоревна",
        birthDate: buildDemoBirthDate(index),
        gender,
        phone: `+7 999 000 0${index}${index}`,
        avatarUrl:
          index === 0
            ? DEMO_ADMIN_AVATAR_URL
            : getMockAvatarDataUrl(
                `${employee.firstName} ${employee.lastName}`,
                gender,
              ),
        status: index < 4 ? "ACTIVE" : "INACTIVE",
        user: {
          id: `user-${employee.id}`,
          email:
            index === 0 ? DEMO_ADMIN_EMAIL : `employee${index + 1}@hiteam.demo`,
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
      };
    },
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
    buildTask({
      id: "task-sgiuoco-1",
      title: "Финальная проверка квартального отчета",
      description:
        "Необходимо сверить все цифры перед отправкой в финансовый отдел.",
      dueAt: createIsoAt(0, 18, 0),
      priority: "URGENT",
      status: "TODO",
      assigneeEmployeeId: employees[0].id,
      checklistItems: [
        { id: "s1-c1", title: "Сверить налоги за март", isCompleted: true },
        {
          id: "s1-c2",
          title: "Проверить выплаты по пропускам",
          isCompleted: false,
        },
        { id: "s1-c3", title: "Подписать PDF", isCompleted: false },
      ],
    }),
    buildTask({
      id: "task-sgiuoco-2",
      title: "Встреча: Ревью дизайн-системы",
      description: "Обсуждение новых UI-компонентов для мобильного приложения.",
      dueAt: createIsoAt(1, 10, 0),
      priority: "HIGH",
      status: "IN_PROGRESS",
      assigneeEmployeeId: employees[0].id,
    }),
    buildTask({
      id: "task-sgiuoco-3",
      title: "Заказать новые пропуска для офиса",
      description: "Закончились болванки для NFС-карт.",
      dueAt: createIsoAt(2, 12, 0),
      priority: "LOW",
      status: "TODO",
      assigneeEmployeeId: employees[0].id,
    }),
    buildTask({
      id: "task-sgiuoco-4",
      title: "Подготовка презентации для инвесторов",
      description: "Собрать метрики роста за последний месяц.",
      dueAt: createIsoAt(4, 15, 30),
      priority: "HIGH",
      status: "TODO",
      assigneeEmployeeId: employees[0].id,
    }),
    buildTask({
      id: "task-sgiuoco-5",
      title: "Обновление документации API",
      description: "Добавить описание новых эндпоинтов для интеграции с ERP.",
      dueAt: createIsoAt(-2, 17, 0),
      priority: "MEDIUM",
      status: "DONE",
      assigneeEmployeeId: employees[0].id,
    }),
    buildTask({
      id: "task-sgiuoco-today-1",
      title: "Проверить состояние инвентаря в зале",
      description:
        "Необходимо осмотреть витрины и убедиться, что все товары на своих местах.",
      dueAt: createIsoAt(0, 11, 0),
      priority: "MEDIUM",
      status: "TODO",
      assigneeEmployeeId: employees[0].id,
    }),
    buildTask({
      id: "task-sgiuoco-today-2",
      title: "Сверить отчет по кассе за утро",
      description: "Проверить Z-отчет и соответствие наличных в кассе.",
      dueAt: createIsoAt(0, 13, 30),
      priority: "HIGH",
      status: "IN_PROGRESS",
      assigneeEmployeeId: employees[0].id,
    }),
    {
      ...buildTask({
        id: "task-sgiuoco-today-photo-1",
        title: "Уборка рабочего места",
        description: "Фото-отчет о чистоте рабочего стола в конце смены.",
        dueAt: createIsoAt(0, 16, 45),
        priority: "LOW",
        status: "DONE",
        assigneeEmployeeId: employees[0].id,
      }),
      photoProofs: [
        {
          id: "proof-1",
          url: "https://images.unsplash.com/photo-1593062096033-9a26b09da705?auto=format&fit=crop&q=80&w=1000",
          createdAt: createIsoAt(0, 16, 30),
        },
      ],
    },
    {
      ...buildTask({
        id: "task-sgiuoco-today-photo-2",
        title: "Проверка выкладки товара",
        description: "Фото нового поступления на главной витрине.",
        dueAt: createIsoAt(0, 10, 0),
        priority: "MEDIUM",
        status: "DONE",
        assigneeEmployeeId: employees[0].id,
      }),
      photoProofs: [
        {
          id: "proof-2",
          url: "https://images.unsplash.com/photo-1601004890684-d8cbf393f922?auto=format&fit=crop&q=80&w=1000",
          createdAt: createIsoAt(0, 9, 45),
        },
      ],
    },
    buildTask({
      id: "task-owner-today-1",
      title: "Собрать отчёт по инвентаризации для управляющего",
      description:
        "Сверить остатки по категориям и отправить короткий статус руководителю смены.",
      dueAt: createIsoAt(0, 9, 45),
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      assigneeEmployeeId: employees[0].id,
    }),
    buildTask({
      id: "task-owner-today-2",
      title: "Проверить заявки на смены за выходные",
      description:
        "Подтвердить или отклонить все актуальные запросы на обмены.",
      dueAt: createIsoAt(0, 12, 20),
      priority: "HIGH",
      assigneeEmployeeId: employees[0].id,
    }),
    buildTask({
      id: "task-owner-today-3",
      title: "Подготовить сводку по отсутствующим сотрудникам",
      description: "Собрать список отсутствий и отметить причину неявок.",
      dueAt: createIsoAt(0, 14, 10),
      priority: "MEDIUM",
      assigneeEmployeeId: employees[0].id,
    }),
    buildTask({
      id: "task-owner-today-4",
      title: "Проверить статус обучения новых сотрудников",
      description:
        "Проконтролировать завершение онбординга и назначить наставника.",
      dueAt: createIsoAt(0, 16, 5),
      priority: "LOW",
      assigneeEmployeeId: employees[0].id,
    }),
    {
      ...buildTask({
        id: "task-owner-today-photo-1",
        title: "Фото отчёт по кассовой зоне",
        description: "Загрузить фото закрытой кассовой зоны после пересчёта.",
        dueAt: createIsoAt(0, 10, 15),
        priority: "HIGH",
        status: "DONE",
        assigneeEmployeeId: employees[0].id,
      }),
      photoProofs: [
        {
          id: "owner-proof-1",
          url: "https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&q=80&w=1000",
          createdAt: createIsoAt(0, 10, 10),
        },
      ],
    },
    {
      ...buildTask({
        id: "task-owner-today-photo-2",
        title: "Фото отчёт по чистоте торгового зала",
        description:
          "Подтвердить фотоотчётом, что зал приведён в порядок после открытия.",
        dueAt: createIsoAt(0, 15, 30),
        priority: "MEDIUM",
        status: "DONE",
        assigneeEmployeeId: employees[0].id,
      }),
      photoProofs: [
        {
          id: "owner-proof-2",
          url: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=1000",
          createdAt: createIsoAt(0, 15, 25),
        },
      ],
    },
  ].map((task) => normalizeDemoTask(task, employees));

  const announcements = [
    {
      id: "announcement-demo-1",
      audience: "ALL",
      title: "Планёрка по открытию новой недели",
      body: "Сегодня в 09:30 короткий синк по загрузке мастеров, SLA по ответам и аномалиям attendance. Сводка и ссылки на материалы уже в рабочем чате.",
      isPinned: true,
      linkUrl: "https://smart.demo/company-weekly-brief",
      imageUrl:
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=1400",
      imageAspectRatio: "16:9",
      scheduledFor: null,
      publishedAt: createIsoAt(0, 8, 15),
      createdAt: createIsoAt(0, 8, 5),
      updatedAt: createIsoAt(0, 8, 15),
      notificationId: "notification-news-1",
      authorEmployee: {
        id: managerEmployee.id,
        firstName: managerEmployee.firstName,
        lastName: managerEmployee.lastName,
      },
      group: null,
      department: null,
      location: null,
      targetEmployee: null,
      attachments: [],
      readAtByEmployeeId: {
        [managerEmployee.id]: createIsoAt(0, 8, 20),
        [employees[2].id]: createIsoAt(0, 8, 27),
      },
    },
    {
      id: "announcement-demo-2",
      audience: "GROUP",
      title: "Фотоотчёт по витрине до 18:00",
      body: "Команда утренней смены должна загрузить фото итоговой выкладки и отметить, что ценники обновлены.",
      isPinned: false,
      groupIds: [groups[0].id],
      linkUrl: null,
      imageUrl:
        "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=1400",
      imageAspectRatio: "4:3",
      scheduledFor: null,
      publishedAt: createIsoAt(-1, 17, 20),
      createdAt: createIsoAt(-1, 17, 10),
      updatedAt: createIsoAt(-1, 17, 20),
      notificationId: "notification-news-2",
      authorEmployee: {
        id: managerEmployee.id,
        firstName: managerEmployee.firstName,
        lastName: managerEmployee.lastName,
      },
      group: {
        id: groups[0].id,
        name: groups[0].name,
      },
      department: null,
      location: null,
      targetEmployee: null,
      attachments: [
        {
          id: "announcement-demo-2-attachment",
          fileName: "storefront-checklist.pdf",
          contentType: "application/pdf",
          sizeBytes: 184320,
          url: "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp...",
        },
      ],
      readAtByEmployeeId: {
        [managerEmployee.id]: createIsoAt(-1, 17, 24),
        [employees[1].id]: createIsoAt(-1, 17, 41),
      },
    },
    {
      id: "announcement-demo-3",
      audience: "EMPLOYEE",
      title: "Индивидуальный onboarding по CRM",
      body: "Завтра в 11:00 для нового сотрудника запланирован персональный разбор карточек клиента, сценариев follow-up и быстрых ответов.",
      isPinned: false,
      linkUrl: "https://meet.smart.demo/onboarding-crm",
      imageUrl: null,
      imageAspectRatio: null,
      scheduledFor: createIsoAt(1, 11, 0),
      publishedAt: null,
      createdAt: createIsoAt(0, 16, 40),
      updatedAt: createIsoAt(0, 16, 40),
      notificationId: null,
      authorEmployee: {
        id: managerEmployee.id,
        firstName: managerEmployee.firstName,
        lastName: managerEmployee.lastName,
      },
      group: null,
      department: null,
      location: null,
      targetEmployee: {
        id: employees[1].id,
        firstName: employees[1].firstName,
        lastName: employees[1].lastName,
        employeeNumber: employees[1].employeeNumber,
      },
      targetEmployeeIds: [employees[1].id],
      attachments: [],
      readAtByEmployeeId: {},
    },
    {
      id: "announcement-demo-4",
      audience: "LOCATION",
      title: "Проверка кассовой зоны перед вечерней сменой",
      body: "До 17:30 нужно сверить терминал, печать чеков и подготовить резервную ленту. Если заметите проблему, сразу приложите фото и комментарий.",
      isPinned: false,
      linkUrl: null,
      attachmentLocation: {
        address: "Sukhumvit Rd, Bangkok, Thailand",
        latitude: 13.7563,
        longitude: 100.5018,
        placeId: "demo-place-id",
      },
      imageUrl: null,
      imageAspectRatio: null,
      scheduledFor: null,
      publishedAt: createIsoAt(0, 12, 10),
      createdAt: createIsoAt(0, 12, 0),
      updatedAt: createIsoAt(0, 12, 10),
      notificationId: "notification-news-4",
      authorEmployee: {
        id: managerEmployee.id,
        firstName: managerEmployee.firstName,
        lastName: managerEmployee.lastName,
      },
      group: null,
      department: null,
      location: employees[0].primaryLocation ?? {
        id: "location-demo-main",
        name: "Main salon",
      },
      targetEmployee: null,
      attachments: [
        {
          id: "announcement-demo-4-attachment",
          fileName: "cash-zone-checklist.xlsx",
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          sizeBytes: 92314,
          url: "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,UEsDBBQABgAIAAAAIQD...",
        },
      ],
      readAtByEmployeeId: {
        [managerEmployee.id]: createIsoAt(0, 12, 12),
      },
    },
  ];

  const announcementArchive = [
    {
      id: "announcement-archive-1",
      announcementId: "announcement-demo-1",
      action: "announcement.created",
      createdAt: createIsoAt(0, 8, 15),
      title: "Планёрка по открытию новой недели",
      isPinned: true,
      actorEmployee: {
        id: managerEmployee.id,
        firstName: managerEmployee.firstName,
        lastName: managerEmployee.lastName,
      },
    },
    {
      id: "announcement-archive-2",
      announcementId: "announcement-demo-2",
      action: "announcement.created",
      createdAt: createIsoAt(-1, 17, 20),
      title: "Фотоотчёт по витрине до 18:00",
      isPinned: false,
      actorEmployee: {
        id: managerEmployee.id,
        firstName: managerEmployee.firstName,
        lastName: managerEmployee.lastName,
      },
    },
    {
      id: "announcement-archive-3",
      announcementId: "announcement-demo-3",
      action: "announcement.generated",
      createdAt: createIsoAt(0, 16, 40),
      title: "Индивидуальный onboarding по CRM",
      isPinned: false,
      actorEmployee: {
        id: managerEmployee.id,
        firstName: managerEmployee.firstName,
        lastName: managerEmployee.lastName,
      },
    },
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

  const todayDemoShifts = buildTodayDemoShifts(employees);

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
    announcements,
    announcementArchive,
    requests,
    notifications,
    invitations,
    shifts: [
      ...scheduleData.shifts.filter((shift) => shift.shiftDate !== dateKey()),
      ...todayDemoShifts,
    ],
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

  const raw = readBrowserStorageItem(DEMO_STATE_KEY);
  if (!raw) {
    memoryState = createInitialState();
    return memoryState;
  }

  try {
    const parsed = JSON.parse(raw) as DemoState;
    const normalized = cloneState(parsed);
    const seedState = createInitialState();
    let changed = false;

    normalized.employees = normalized.employees.map((employee, index) => {
      const fullName = `${employee.firstName} ${employee.lastName}`.trim();
      const normalizedGender = resolveMockAvatarGender(fullName);
      const nextAvatarUrl = getMockAvatarDataUrl(fullName, normalizedGender);
      const nextBirthDate = employee.birthDate ?? buildDemoBirthDate(index);
      const isOwner = employee.user?.email === DEMO_ADMIN_EMAIL;
      const nextMiddleName =
        normalizedGender === "male" ? "Александрович" : "Игоревна";
      const shouldReplaceAvatar =
        !employee.avatarUrl ||
        employee.avatarUrl.startsWith("data:") ||
        employee.avatarUrl.includes("/avatars/") === false;

      if (
        shouldReplaceAvatar ||
        employee.birthDate !== nextBirthDate ||
        employee.gender !== normalizedGender ||
        employee.middleName !== nextMiddleName ||
        employee.user?.email === DEMO_ADMIN_EMAIL
      ) {
        changed = true;
      }

      return {
        ...withDemoOwnerIdentity(employee),
        gender: normalizedGender,
        middleName: nextMiddleName,
        birthDate: nextBirthDate,
        avatarUrl: isOwner
          ? DEMO_ADMIN_AVATAR_URL
          : shouldReplaceAvatar
            ? nextAvatarUrl
            : employee.avatarUrl,
      };
    });

    const normalizedTasks = Array.isArray(normalized.tasks)
      ? normalized.tasks.map((task) =>
          normalizeDemoTask(task, normalized.employees),
        )
      : seedState.tasks;
    if (
      !Array.isArray(normalized.tasks) ||
      JSON.stringify(normalizedTasks) !== JSON.stringify(normalized.tasks)
    ) {
      changed = true;
    }
    normalized.tasks = normalizedTasks;

    if (!Array.isArray(normalized.announcements)) {
      normalized.announcements = seedState.announcements;
      changed = true;
    } else {
      normalized.announcements = normalized.announcements.map(
        (announcement) => ({
          ...announcement,
          attachments: Array.isArray(announcement.attachments)
            ? announcement.attachments
            : [],
          groupIds: Array.isArray(announcement.groupIds)
            ? announcement.groupIds
            : [],
          readAtByEmployeeId:
            announcement.readAtByEmployeeId &&
            typeof announcement.readAtByEmployeeId === "object"
              ? announcement.readAtByEmployeeId
              : {},
          targetEmployeeIds: Array.isArray(announcement.targetEmployeeIds)
            ? announcement.targetEmployeeIds
            : [],
        }),
      );
    }

    if (!Array.isArray(normalized.announcementArchive)) {
      normalized.announcementArchive = seedState.announcementArchive;
      changed = true;
    }

    const todayShiftKey = dateKey();
    const seedTodayShifts = Array.isArray(seedState.shifts)
      ? seedState.shifts.filter((shift) => shift.shiftDate === todayShiftKey)
      : [];
    const normalizedNonTodayShifts = Array.isArray(normalized.shifts)
      ? normalized.shifts.filter((shift) => shift.shiftDate !== todayShiftKey)
      : [];
    const mergedShifts = [...normalizedNonTodayShifts, ...seedTodayShifts];

    if (
      !Array.isArray(normalized.shifts) ||
      JSON.stringify(mergedShifts) !== JSON.stringify(normalized.shifts)
    ) {
      normalized.shifts = mergedShifts;
      changed = true;
    }

    memoryState = normalized;

    if (changed) {
      saveState(normalized);
      return memoryState;
    }

    return memoryState;
  } catch {
    memoryState = createInitialState();
    return memoryState;
  }
}

function saveState(state: DemoState) {
  memoryState = cloneState(state);
  if (typeof window !== "undefined") {
    writeBrowserStorageItem(DEMO_STATE_KEY, JSON.stringify(memoryState));
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
    (isDemoModeEnabled() || isLocalDevHost()) &&
    isDemoAccessToken(token ?? getSession()?.accessToken ?? null)
  );
}

function buildAttendanceLive(state: DemoState) {
  const presets = [
    {
      shiftLabel: "09:00-18:00",
      status: "on_shift",
      startedAt: createIsoAt(0, 9, 0),
      endedAt: null,
      totalMinutes: 420,
      breakMinutes: 0,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
    },
    {
      shiftLabel: "09:00-18:00",
      status: "on_shift",
      startedAt: createIsoAt(0, 10, 13),
      endedAt: null,
      totalMinutes: 347,
      breakMinutes: 0,
      lateMinutes: 73,
      earlyLeaveMinutes: 0,
    },
    {
      shiftLabel: "09:00-18:00",
      status: "checked_out",
      startedAt: createIsoAt(0, 8, 46),
      endedAt: createIsoAt(0, 16, 46),
      totalMinutes: 421,
      breakMinutes: 45,
      lateMinutes: 0,
      earlyLeaveMinutes: 74,
    },
    {
      shiftLabel: "09:00-18:00",
      status: "on_shift",
      startedAt: createIsoAt(0, 10, 0),
      endedAt: null,
      totalMinutes: 348,
      breakMinutes: 0,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
    },
    {
      shiftLabel: null,
      status: "on_shift",
      startedAt: createIsoAt(0, 9, 6),
      endedAt: null,
      totalMinutes: 324,
      breakMinutes: 0,
      lateMinutes: 6,
      earlyLeaveMinutes: 0,
    },
  ] as const;

  return state.employees.slice(0, 5).map((employee, index) => {
    const preset = presets[index];
    return {
      sessionId: `session-${employee.id}`,
      employeeId: employee.id,
      employeeName: buildEmployeeFullName(employee),
      employeeNumber: employee.employeeNumber,
      department: employee.department?.name ?? "—",
      location: employee.primaryLocation?.name ?? "—",
      shiftLabel: preset?.shiftLabel ?? "09:00-18:00",
      status: preset?.status ?? "on_shift",
      startedAt: preset?.startedAt ?? createIsoAt(0, 9, 0),
      endedAt: preset?.endedAt ?? null,
      totalMinutes: preset?.totalMinutes ?? 420,
      breakMinutes: preset?.breakMinutes ?? 0,
      paidBreakMinutes: 0,
      lateMinutes: preset?.lateMinutes ?? 0,
      earlyLeaveMinutes: preset?.earlyLeaveMinutes ?? 0,
    };
  });
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
        const isToday = dayOffset === 0;
        const isPetrovLateToday = employee.id === "emp-2" && isToday;
        const isSokolovaEarlyToday = employee.id === "emp-3" && isToday;
        const startedAt = isPetrovLateToday
          ? createIsoAt(0, 10, 13)
          : createIsoAt(-dayOffset, 9 + (employeeIndex % 2), 0);
        const endedAt = isSokolovaEarlyToday
          ? createIsoAt(0, 16, 46)
          : createIsoAt(-dayOffset, 18, 5);
        const lateMinutes = isPetrovLateToday
          ? 73
          : employee.id === "emp-2"
            ? 0
            : employeeIndex === 1 && dayOffset < 2
              ? 12
              : 0;
        const earlyLeaveMinutes = isSokolovaEarlyToday
          ? 74
          : employeeIndex === 3 && dayOffset === 2
            ? 15
            : 0;
        const workedMinutes = isPetrovLateToday
          ? 422
          : isSokolovaEarlyToday
            ? 421
            : 495 - employeeIndex * 8;
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
          status: "checked_out",
          startedAt,
          endedAt,
          totalMinutes: 540,
          workedMinutes,
          breakMinutes: 45,
          paidBreakMinutes: 0,
          lateMinutes,
          earlyLeaveMinutes,
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

function buildDemoAnnouncementRecipients(state: DemoState, announcement: any) {
  const deduped = new Map<string, DemoEmployee>();
  const register = (employee: DemoEmployee | null | undefined) => {
    if (employee) {
      deduped.set(employee.id, employee);
    }
  };

  if (announcement.audience === "GROUP") {
    const groupIds = Array.isArray(announcement.groupIds)
      ? announcement.groupIds
      : announcement.group?.id
        ? [announcement.group.id]
        : [];
    state.groups
      .filter((group) => groupIds.includes(group.id))
      .forEach((group) => {
        group.memberships.forEach((membership) => {
          register(
            state.employees.find(
              (employee) => employee.id === membership.employeeId,
            ),
          );
        });
      });
  } else if (announcement.audience === "EMPLOYEE") {
    const employeeIds: string[] = Array.isArray(announcement.targetEmployeeIds)
      ? announcement.targetEmployeeIds
      : announcement.targetEmployee?.id
        ? [announcement.targetEmployee.id]
        : [];
    employeeIds.forEach((employeeId: string) => {
      register(state.employees.find((employee) => employee.id === employeeId));
    });
  } else if (announcement.audience === "DEPARTMENT") {
    state.employees
      .filter(
        (employee) => employee.department?.id === announcement.department?.id,
      )
      .forEach(register);
  } else if (announcement.audience === "LOCATION") {
    state.employees
      .filter(
        (employee) =>
          employee.primaryLocation?.id === announcement.location?.id,
      )
      .forEach(register);
  } else {
    state.employees.forEach(register);
  }

  return Array.from(deduped.values());
}

function countDemoAnnouncementReads(state: DemoState, announcement: any) {
  const recipients = buildDemoAnnouncementRecipients(state, announcement);
  const readAtByEmployeeId =
    announcement.readAtByEmployeeId &&
    typeof announcement.readAtByEmployeeId === "object"
      ? announcement.readAtByEmployeeId
      : {};
  const readRecipients = recipients.filter(
    (employee) => typeof readAtByEmployeeId[employee.id] === "string",
  ).length;

  return {
    recipients,
    readRecipients,
    unreadRecipients: Math.max(0, recipients.length - readRecipients),
  };
}

function buildDemoDashboardActivityPerson(employee?: DemoEmployee | null) {
  if (!employee) {
    return null;
  }

  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    displayName: buildEmployeeFullName(employee),
    avatarUrl: employee.avatarUrl ?? null,
  };
}

function buildDemoAnnouncementItemForViewer(
  state: DemoState,
  announcement: any,
  token?: string,
) {
  const role = currentDemoRole(token);
  const viewerEmployeeId = currentEmployeeId(token);
  const isEmployee = role === "employee";
  const { recipients, readRecipients, unreadRecipients } =
    countDemoAnnouncementReads(state, announcement);
  const readAt = announcement.readAtByEmployeeId?.[viewerEmployeeId] ?? null;

  return {
    ...announcement,
    attachments: Array.isArray(announcement.attachments)
      ? announcement.attachments
      : [],
    groupIds: Array.isArray(announcement.groupIds) ? announcement.groupIds : [],
    targetEmployeeIds: Array.isArray(announcement.targetEmployeeIds)
      ? announcement.targetEmployeeIds
      : [],
    totalRecipients: recipients.length,
    readRecipients,
    unreadRecipients,
    isRead: isEmployee ? Boolean(readAt) : announcement.isRead,
    readAt: isEmployee ? readAt : (announcement.readAt ?? null),
  };
}

function buildDemoAnnouncementsForViewer(state: DemoState, token?: string) {
  const role = currentDemoRole(token);
  const viewerEmployeeId = currentEmployeeId(token);

  return [...state.announcements]
    .filter((announcement) => {
      if (role !== "employee") {
        return true;
      }

      if (announcement.scheduledFor && !announcement.publishedAt) {
        return false;
      }

      return buildDemoAnnouncementRecipients(state, announcement).some(
        (employee) => employee.id === viewerEmployeeId,
      );
    })
    .map((announcement) =>
      buildDemoAnnouncementItemForViewer(state, announcement, token),
    )
    .sort((left, right) => {
      const leftTime = left.publishedAt ?? left.scheduledFor ?? left.createdAt;
      const rightTime =
        right.publishedAt ?? right.scheduledFor ?? right.createdAt;
      return rightTime.localeCompare(leftTime);
    });
}

function buildDemoAnnouncementReadReceipts(
  state: DemoState,
  announcementId: string,
) {
  const announcement = state.announcements.find(
    (item) => item.id === announcementId,
  );
  if (!announcement) {
    throw new Error("Новость не найдена.");
  }

  const readAtByEmployeeId =
    announcement.readAtByEmployeeId &&
    typeof announcement.readAtByEmployeeId === "object"
      ? announcement.readAtByEmployeeId
      : {};

  return buildDemoAnnouncementRecipients(state, announcement)
    .map((employee) => ({
      notificationId: announcement.notificationId ?? announcement.id,
      userId: employee.user?.id ?? employee.id,
      employeeId: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeNumber: employee.employeeNumber,
      avatarUrl: employee.avatarUrl ?? null,
      isRead: typeof readAtByEmployeeId[employee.id] === "string",
      readAt: readAtByEmployeeId[employee.id] ?? null,
    }))
    .sort(
      (left, right) =>
        Number(right.isRead) - Number(left.isRead) ||
        `${left.lastName} ${left.firstName}`.localeCompare(
          `${right.lastName} ${right.firstName}`,
          "ru-RU",
        ),
    );
}

function buildDemoNewsBootstrap(state: DemoState, token?: string) {
  return {
    items: buildDemoAnnouncementsForViewer(state, token),
    employees: state.employees.map((employee) => ({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeNumber: employee.employeeNumber,
    })),
    groups: state.groups.map((group) => ({
      ...group,
      _count: {
        tasks: state.tasks.filter((task) => task.groupId === group.id).length,
      },
    })),
  };
}

function buildDemoActivityBootstrap(state: DemoState) {
  return {
    items: buildDemoDailyActivity(state),
  };
}

function buildDemoDailyActivity(state: DemoState) {
  const manager = state.employees[0];
  const liveSessions = buildAttendanceLive(state);
  const announcements = buildDemoAnnouncementsForViewer(
    state,
    createDemoSession("admin").accessToken,
  ).filter((item) => item.publishedAt);

  if (!manager) {
    return [];
  }

  const managerPerson = buildDemoDashboardActivityPerson(manager);
  const employeeAt = (index: number) => state.employees[index] ?? manager;
  const personAt = (index: number) =>
    buildDemoDashboardActivityPerson(employeeAt(index));
  const buildTargets = (...indexes: number[]) =>
    indexes.map((index) => personAt(index)).filter(Boolean);
  const taskTargets = buildTargets(0, 1, 2);
  const locationAt = (index: number) =>
    state.locations[index]?.name ?? state.locations[0]?.name ?? null;
  const groupAt = (index: number) =>
    state.groups[index]?.name ?? state.groups[0]?.name ?? null;

  const items = [
    announcements[0]
      ? {
          id: `activity-announcement-${announcements[0].id}`,
          kind: "announcement",
          action: "published",
          createdAt: announcements[0].publishedAt ?? announcements[0].createdAt,
          actor: managerPerson,
          title: announcements[0].title,
          context: announcements[0].body,
          targetLabel:
            announcements[0].audience === "ALL"
              ? "all-company"
              : (announcements[0].group?.name ??
                announcements[0].location?.name ??
                announcements[0].targetEmployee?.firstName ??
                null),
          targetEmployees: buildDemoAnnouncementRecipients(
            state,
            state.announcements.find((item) => item.id === announcements[0].id),
          )
            .slice(0, 5)
            .map((employee) => ({
              id: employee.id,
              firstName: employee.firstName,
              lastName: employee.lastName,
              displayName: buildEmployeeFullName(employee),
              avatarUrl: employee.avatarUrl ?? null,
            })),
        }
      : null,
    {
      id: "activity-task-demo",
      kind: "task",
      action: "created",
      createdAt: createIsoAt(0, 9, 12),
      actor: managerPerson,
      title: "Проверить фотоотчёты по витрине",
      context: "Новая задача с фото-подтверждением ушла в утреннюю смену.",
      targetLabel: state.groups[0]?.name ?? null,
      targetEmployees: taskTargets,
    },
    {
      id: "activity-shift-demo",
      kind: "shift",
      action: "created",
      createdAt: createIsoAt(0, 8, 40),
      actor: managerPerson,
      title: "Вечерняя смена на пятницу",
      context: "Добавлены 3 сотрудника и подтверждён резервный мастер.",
      targetLabel: state.locations[0]?.name ?? null,
      targetEmployees: buildTargets(0, 1, 2),
    },
    liveSessions[1]
      ? {
          id: `activity-checkin-${liveSessions[1].employeeId}`,
          kind: "attendance",
          action: "check_in",
          createdAt: liveSessions[1].startedAt,
          actor: buildDemoDashboardActivityPerson(
            state.employees.find(
              (employee) => employee.id === liveSessions[1].employeeId,
            ),
          ),
          title: "Открытие смены",
          context:
            liveSessions[1].lateMinutes > 0
              ? `Опоздание ${liveSessions[1].lateMinutes} мин.`
              : "Отметка внутри геозоны.",
          targetLabel: liveSessions[1].location,
          targetEmployees: [],
        }
      : null,
    liveSessions[3]
      ? {
          id: `activity-checkout-${liveSessions[3].employeeId}`,
          kind: "attendance",
          action: "check_out",
          createdAt: liveSessions[3].endedAt ?? liveSessions[3].startedAt,
          actor: buildDemoDashboardActivityPerson(
            state.employees.find(
              (employee) => employee.id === liveSessions[3].employeeId,
            ),
          ),
          title: "Смена закрыта",
          context: "Чек-аут завершён, комментарий к раннему уходу добавлен.",
          targetLabel: liveSessions[3].location,
          targetEmployees: [],
        }
      : null,
    state.requests[0]
      ? {
          id: `activity-request-${state.requests[0].id}`,
          kind: "request",
          action: "submitted",
          createdAt:
            state.requests[0].request?.comments?.[0]?.createdAt ??
            createIsoAt(-1, 18, 10),
          actor: buildDemoDashboardActivityPerson(
            state.employees.find(
              (employee) =>
                employee.id === state.requests[0].request.employee.id,
            ),
          ),
          title: state.requests[0].request.title,
          context: "Новый запрос ушёл на согласование руководителю.",
          targetLabel: null,
          targetEmployees: [managerPerson].filter(Boolean),
        }
      : null,
    announcements[1]
      ? {
          id: `activity-announcement-${announcements[1].id}`,
          kind: "announcement",
          action: "published",
          createdAt: announcements[1].publishedAt ?? announcements[1].createdAt,
          actor: managerPerson,
          title: announcements[1].title,
          context: announcements[1].body,
          targetLabel:
            announcements[1].group?.name ??
            announcements[1].location?.name ??
            null,
          targetEmployees: buildDemoAnnouncementRecipients(
            state,
            state.announcements.find((item) => item.id === announcements[1].id),
          )
            .slice(0, 5)
            .map((employee) => ({
              id: employee.id,
              firstName: employee.firstName,
              lastName: employee.lastName,
              displayName: buildEmployeeFullName(employee),
              avatarUrl: employee.avatarUrl ?? null,
            })),
        }
      : null,
    {
      id: "activity-task-restock",
      kind: "task",
      action: "created",
      createdAt: createIsoAt(-1, 16, 25),
      actor: managerPerson,
      title: "Подтвердить пополнение расходников",
      context:
        "Обычная ежедневная задача для вечерней смены на фото-подтверждение.",
      targetLabel: groupAt(1),
      targetEmployees: buildTargets(3, 4, 5),
    },
    {
      id: "activity-attendance-open-south",
      kind: "attendance",
      action: "check_in",
      createdAt: createIsoAt(-1, 10, 6),
      actor: personAt(1),
      title: "Открытие смены",
      context: "Сотрудник вошёл через Face ID без замечаний.",
      targetLabel: locationAt(0),
      targetEmployees: [],
    },
    {
      id: "activity-announcement-inventory",
      kind: "announcement",
      action: "published",
      createdAt: createIsoAt(-2, 18, 40),
      actor: managerPerson,
      title: "Пятничная инвентаризация материалов",
      context:
        "Опубликовали напоминание и список фото-зон для отчёта по филиалам.",
      targetLabel: "all-company",
      targetEmployees: buildTargets(0, 1, 2, 3, 4),
    },
    {
      id: "activity-employee-approved-cashier",
      kind: "employee",
      action: "approved",
      createdAt: createIsoAt(-2, 10, 20),
      actor: managerPerson,
      title: "Профиль нового кассира",
      context: `${buildEmployeeFullName(employeeAt(5))} завершил загрузку документов и получил доступ к сменам.`,
      targetLabel: null,
      targetEmployees: buildTargets(5),
    },
    {
      id: "activity-request-shift-swap",
      kind: "request",
      action: "submitted",
      createdAt: createIsoAt(-3, 9, 5),
      actor: personAt(2),
      title: "Обмен сменой на субботу",
      context: "Обычный запрос на подмену уже ушёл менеджеру на согласование.",
      targetLabel: null,
      targetEmployees: [managerPerson].filter(Boolean),
    },
    {
      id: "activity-shift-cover-sunday",
      kind: "shift",
      action: "created",
      createdAt: createIsoAt(-4, 17, 10),
      actor: managerPerson,
      title: "Подмена на воскресенье",
      context: "Собрали резервную смену для главного офиса и склада.",
      targetLabel: locationAt(1),
      targetEmployees: buildTargets(1, 4, 6),
    },
    {
      id: "activity-task-waiting-zone-photo",
      kind: "task",
      action: "created",
      createdAt: createIsoAt(-5, 12, 35),
      actor: managerPerson,
      title: "Сделать фото зоны ожидания",
      context:
        "Задача с фото нужна для стандартного аудита чистоты и выкладки.",
      targetLabel: groupAt(0),
      targetEmployees: buildTargets(0, 2, 4),
    },
    {
      id: "activity-attendance-early-start",
      kind: "attendance",
      action: "check_in",
      createdAt: createIsoAt(-6, 8, 55),
      actor: personAt(4),
      title: "Открытие смены",
      context: "Сотрудник пришёл на 5 минут раньше начала графика.",
      targetLabel: locationAt(2),
      targetEmployees: [],
    },
    {
      id: "activity-announcement-training",
      kind: "announcement",
      action: "published",
      createdAt: createIsoAt(-7, 19, 0),
      actor: managerPerson,
      title: "Подготовка к внутреннему обучению",
      context: "Руководителям отправили список участников и слоты по филиалам.",
      targetLabel: groupAt(0),
      targetEmployees: buildTargets(0, 1, 2, 3),
    },
    {
      id: "activity-task-front-desk",
      kind: "task",
      action: "created",
      createdAt: createIsoAt(-9, 14, 25),
      actor: managerPerson,
      title: "Проверить стойку ресепшн перед вечером",
      context:
        "Обычная операционная задача с чек-листом и коротким фото-отчётом.",
      targetLabel: locationAt(0),
      targetEmployees: buildTargets(2, 3),
    },
    {
      id: "activity-employee-submitted-docs",
      kind: "employee",
      action: "submitted",
      createdAt: createIsoAt(-11, 10, 15),
      actor: personAt(6),
      title: "Документы для оформления",
      context:
        "Новый сотрудник загрузил документы и ждёт подтверждения администратора.",
      targetLabel: null,
      targetEmployees: [managerPerson].filter(Boolean),
    },
    {
      id: "activity-request-uniform",
      kind: "request",
      action: "submitted",
      createdAt: createIsoAt(-12, 15, 45),
      actor: personAt(3),
      title: "Запрос на новую форму",
      context: "Обычный служебный запрос по размеру формы для следующей смены.",
      targetLabel: null,
      targetEmployees: [managerPerson].filter(Boolean),
    },
  ].filter(Boolean);

  return items.sort((left: any, right: any) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

function buildDemoShowcaseTaskBoardForCurrentUser(
  state: DemoState,
  token?: string,
) {
  return currentDemoRole(token) === "employee"
    ? buildDemoEmployeeShowcaseTaskBoard(state, currentEmployeeId(token))
    : buildTaskBoard(state);
}

function buildBootstrapTasks(state: DemoState) {
  const snapshot = cloneState(state);

  return {
    tasks: snapshot.tasks,
    employees: buildDemoEmployeeRecords(snapshot),
    groups: snapshot.groups.map((group) => ({
      ...group,
      _count: {
        tasks: snapshot.tasks.filter((task) => task.groupId === group.id)
          .length,
      },
    })),
    liveSessions: buildAttendanceLive(snapshot),
  };
}

function createFixedIso(dateKey: string, hours: number, minutes: number) {
  const value = new Date(`${dateKey}T00:00:00`);
  value.setHours(hours, minutes, 0, 0);
  return value.toISOString();
}

function buildDemoEmployeeRecords(state: DemoState) {
  const biometricStatusByEmployeeId = new Map(
    state.biometricEmployees.map((item) => [
      item.employeeId,
      item.enrollmentStatus,
    ]),
  );

  return state.employees.map((employee) => ({
    ...employee,
    user: employee.user
      ? {
          ...employee.user,
          roles:
            employee.user.email === DEMO_ADMIN_EMAIL
              ? [{ role: { code: "tenant_owner" } }]
              : [],
        }
      : null,
    biometricProfile: {
      enrollmentStatus:
        biometricStatusByEmployeeId.get(employee.id) ?? "NOT_STARTED",
    },
  }));
}

function buildDemoEmployeesBootstrap(state: DemoState) {
  const snapshot = cloneState(state);

  return {
    employeeRecords: buildDemoEmployeeRecords(snapshot),
    liveSessions: buildAttendanceLive(snapshot),
    overview: buildCollaborationOverview(snapshot),
    pendingInvitations: snapshot.invitations,
    scheduleShifts: snapshot.shifts,
    scheduleTemplates: snapshot.templates,
    organizationSetup: {
      company: snapshot.organization.company
        ? {
            id: snapshot.organization.company.id,
            code: "DEMO",
            name: snapshot.organization.company.name,
          }
        : null,
    },
    canCheckWorkdays: true,
  };
}

function buildDemoAttendanceBootstrap(
  state: DemoState,
  searchParams: URLSearchParams,
) {
  const snapshot = cloneState(state);
  const dateFrom = searchParams.get("dateFrom")?.trim() || dateKey(new Date());
  const dateTo = searchParams.get("dateTo")?.trim() || dateKey(new Date());

  return {
    employees: snapshot.employees.map((employee) => ({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeNumber: employee.employeeNumber,
      position: employee.position,
      department: employee.department,
      primaryLocation: employee.primaryLocation,
      avatarUrl: employee.avatarUrl,
    })),
    history: buildAttendanceHistory(snapshot, null, dateFrom, dateTo),
    anomalies: buildAttendanceAnomalies(snapshot),
    liveSessions: buildAttendanceLive(snapshot),
    audit: buildAttendanceAudit(snapshot, dateFrom, dateTo),
    dateFrom,
    dateTo,
  };
}

function buildDemoBiometricBootstrap(
  state: DemoState,
  searchParams: URLSearchParams,
) {
  const snapshot = cloneState(state);
  const result = searchParams.get("result");
  const normalizedResult =
    result === "FAILED" || result === "PASSED" || result === "REVIEW"
      ? result
      : "__all";

  return {
    employees: snapshot.employees.map((employee) => ({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeNumber: employee.employeeNumber,
      avatarUrl: employee.avatarUrl,
      department: employee.department,
      primaryLocation: employee.primaryLocation,
    })),
    reviews: buildBiometricReviewResponse(snapshot, searchParams),
    result: normalizedResult,
  };
}

function buildDemoEmployeeShowcaseHistory(
  state: DemoState,
  employeeId: string,
) {
  const employee =
    state.employees.find((item) => item.id === employeeId) ??
    state.employees[1] ??
    state.employees[0];

  if (!employee) {
    return buildAttendanceHistory(state, employeeId, null, null);
  }

  const weeklyLatePlan: Record<string, number[]> = {
    "2026-03-02": [0, 14, 0, 9, 0],
    "2026-03-09": [0, 8, 0, 0, 0],
    "2026-03-16": [0, 0, 0, 0, 0],
    "2026-03-23": [16, 0, 11, 0, 7],
    "2026-03-30": [0, 6],
    "2026-04-01": [0, 12, 0],
    "2026-04-06": [0, 0, 0, 7, 0],
    "2026-04-13": [9, 0, 0, 0, 0],
    "2026-04-20": [0, 0, 0, 0, 0],
    "2026-04-27": [0, 15, 0, 0],
  };

  const rows = Object.entries(weeklyLatePlan).flatMap(
    ([weekStart, latePlan], weekIndex) =>
      latePlan.map((lateMinutes, dayIndex) => {
        const day = new Date(`${weekStart}T00:00:00`);
        day.setDate(day.getDate() + dayIndex);
        const dateKey = day.toISOString().slice(0, 10);
        const startedAt = createFixedIso(
          dateKey,
          9,
          lateMinutes > 0 ? lateMinutes : 0,
        );
        const endedAt = createFixedIso(
          dateKey,
          18,
          weekIndex === 3 && dayIndex === 4 ? 5 : 0,
        );
        const workedMinutes = lateMinutes > 0 ? 480 - lateMinutes : 480;

        return {
          sessionId: `${employee.id}-showcase-${dateKey}`,
          employeeId: employee.id,
          employeeName: buildEmployeeFullName(employee),
          employeeNumber: employee.employeeNumber,
          department: employee.department?.name ?? "—",
          location: employee.primaryLocation?.name ?? "—",
          shiftLabel: "09:00-18:00",
          status: "checked_out",
          startedAt,
          endedAt,
          totalMinutes: 540,
          workedMinutes,
          breakMinutes: 60,
          paidBreakMinutes: 0,
          lateMinutes,
          earlyLeaveMinutes: 0,
          checkInEvent: {
            occurredAt: startedAt,
            distanceMeters: 10 + dayIndex,
            notes: null,
          },
          checkOutEvent: {
            occurredAt: endedAt,
            distanceMeters: 8 + dayIndex,
            notes: null,
          },
          breaks: [
            {
              id: `${employee.id}-showcase-break-${dateKey}`,
              startedAt: createFixedIso(dateKey, 13, 0),
              endedAt: createFixedIso(dateKey, 14, 0),
              totalMinutes: 60,
              isPaid: false,
              startEvent: {
                occurredAt: createFixedIso(dateKey, 13, 0),
                distanceMeters: 5,
              },
              endEvent: {
                occurredAt: createFixedIso(dateKey, 14, 0),
                distanceMeters: 5,
              },
            },
          ],
        };
      }),
  );

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
      dateFrom: "2026-03-02",
      dateTo: "2026-04-30",
    },
    totals,
    rows,
  };
}

function buildDemoEmployeeShowcaseScheduleShifts(
  state: DemoState,
  employeeId: string,
) {
  const employee =
    state.employees.find((item) => item.id === employeeId) ??
    state.employees[1] ??
    state.employees[0];

  if (!employee) {
    return state.shifts;
  }

  const shiftDates = [
    "2026-03-02",
    "2026-03-03",
    "2026-03-04",
    "2026-03-05",
    "2026-03-06",
    "2026-03-09",
    "2026-03-10",
    "2026-03-11",
    "2026-03-12",
    "2026-03-13",
    "2026-03-16",
    "2026-03-17",
    "2026-03-18",
    "2026-03-19",
    "2026-03-20",
    "2026-03-23",
    "2026-03-24",
    "2026-03-25",
    "2026-03-26",
    "2026-03-27",
    "2026-03-30",
    "2026-03-31",
    "2026-04-03",
    "2026-04-04",
    "2026-04-05",
    "2026-04-06",
    "2026-04-07",
    "2026-04-08",
    "2026-04-09",
    "2026-04-13",
    "2026-04-14",
    "2026-04-15",
    "2026-04-16",
    "2026-04-17",
    "2026-04-20",
    "2026-04-21",
    "2026-04-22",
    "2026-04-23",
    "2026-04-24",
    "2026-04-27",
    "2026-04-28",
    "2026-04-29",
    "2026-04-30",
  ];

  return shiftDates.map((shiftDate, index) => ({
    id: `demo-employee-shift-${employee.id}-${shiftDate}`,
    shiftDate,
    startsAt: createFixedIso(shiftDate, index % 2 === 0 ? 9 : 10, 0),
    endsAt: createFixedIso(shiftDate, index % 2 === 0 ? 18 : 19, 0),
    status: "ASSIGNED",
    createdAt: createFixedIso(shiftDate, 7, 45),
    updatedAt: createFixedIso(shiftDate, 7, 45),
    employee: {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
    },
    location: employee.primaryLocation ?? {
      id: "location-demo-main",
      name: "Main salon",
    },
    position: employee.position ?? {
      id: "position-demo",
      name: "Stylist",
    },
    template: {
      id: `demo-template-${index % 2 === 0 ? "morning" : "evening"}`,
      name: index % 2 === 0 ? "Morning shift" : "Evening shift",
      code: index % 2 === 0 ? "MORN" : "EVE",
      startsAtLocal: index % 2 === 0 ? "09:00" : "10:00",
      endsAtLocal: index % 2 === 0 ? "18:00" : "19:00",
    },
  }));
}

function buildDemoEmployeeShowcaseTaskPreset(
  taskId: string,
  employee: DemoEmployee,
  managerEmployee: DemoEmployee,
): any {
  if (taskId === "emp-showcase-task-4") {
    return {
      description:
        "Нужно обзвонить неподтвержденные записи, отметить ответ и отправить short summary в чат смены.",
      checklistItems: [
        {
          id: "emp-showcase-task-4-check-1",
          title: "Подтвердить VIP-клиентов",
          isCompleted: true,
        },
        {
          id: "emp-showcase-task-4-check-2",
          title: "Закрыть неподтвержденные окна",
          isCompleted: false,
        },
        {
          id: "emp-showcase-task-4-check-3",
          title: "Передать итог менеджеру",
          isCompleted: false,
        },
      ],
    };
  }

  if (taskId === "emp-showcase-task-20") {
    return {
      description: appendTaskMeta(
        "10-минутный синк по загрузке четверга и переносам клиентов.",
        {
          kind: "meeting",
          meetingMode: "online",
          meetingLink: "https://meet.smart.demo/thursday-sync",
        },
      ),
    };
  }

  if (taskId === "emp-showcase-task-28") {
    return {
      title: "Встреча: Разбор вечерней загрузки",
      description: appendTaskMeta(
        "Проверим заполнение расписания, SLA по ответам и свободные окна на завтра.",
        {
          kind: "meeting",
          meetingMode: "offline",
          meetingLocation: "Кабинет менеджера",
        },
      ),
    };
  }

  if (taskId === "emp-showcase-task-29") {
    return {
      title: "Фотоотчёт по витрине весенней кампании",
      description:
        "Сделать 3 фото фронтальной выкладки, зоны кассы и стойки с акционными наборами.",
      requiresPhoto: true,
      photoProofs: [
        {
          id: "emp-showcase-task-29-proof-1",
          url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1200",
          createdAt: createFixedIso("2026-04-16", 17, 52),
          fileName: "spring-storefront.jpg",
          uploadedByEmployee: {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
          },
        },
      ],
    };
  }

  if (taskId === "emp-showcase-task-30") {
    return {
      title: "Открытие смены по новому чек-листу",
      description:
        "Перед первым клиентом нужно пройти новый morning checklist и отметить всё прямо в задаче.",
      checklistItems: [
        {
          id: "emp-showcase-task-30-check-1",
          title: "Включить кассу и терминал",
          isCompleted: true,
        },
        {
          id: "emp-showcase-task-30-check-2",
          title: "Проверить расходники у моек",
          isCompleted: false,
        },
        {
          id: "emp-showcase-task-30-check-3",
          title: "Подготовить welcome-зону",
          isCompleted: false,
        },
      ],
    };
  }

  if (taskId === "emp-showcase-task-31") {
    return {
      title: "Собрать набор расходников на субботу",
      description:
        "Проверить краску, перчатки, полотенца и сфотографировать собранный комплект перед закрытием.",
      requiresPhoto: true,
      checklistItems: [
        {
          id: "emp-showcase-task-31-check-1",
          title: "Собрать материалы по процедурам",
          isCompleted: true,
        },
        {
          id: "emp-showcase-task-31-check-2",
          title: "Проверить резерв по краске",
          isCompleted: false,
        },
      ],
      photoProofs: [
        {
          id: "emp-showcase-task-31-proof-1",
          url: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=1200",
          createdAt: createFixedIso("2026-04-18", 17, 4),
          fileName: "supplies-kit.jpg",
          uploadedByEmployee: {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
          },
        },
      ],
    };
  }

  return {
    activities: [
      {
        id: `activity-${taskId}`,
        kind: "CREATED",
        body: "Задача создана менеджером в demo-режиме.",
        createdAt: createIsoAt(-2, 9, 15),
        actorEmployee: {
          id: managerEmployee.id,
          firstName: managerEmployee.firstName,
          lastName: managerEmployee.lastName,
        },
      },
    ],
  };
}

function buildDemoEmployeeShowcaseTaskBoard(
  state: DemoState,
  employeeId: string,
) {
  const employee =
    state.employees.find((item) => item.id === employeeId) ??
    state.employees[1] ??
    state.employees[0];
  const managerEmployee = state.employees[0] ?? employee;

  if (!employee || !managerEmployee) {
    return buildTaskBoard(state);
  }

  const taskBlueprints = [
    {
      id: "emp-showcase-task-1",
      title: "Подготовить рабочее место к открытию недели",
      dueDate: "2026-03-03",
      hours: 10,
      minutes: 0,
      status: "DONE" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-2",
      title: "Проверить чек-лист витрины",
      dueDate: "2026-03-05",
      hours: 15,
      minutes: 30,
      status: "DONE" as const,
      priority: "HIGH" as const,
    },
    {
      id: "emp-showcase-task-3",
      title: "Сверить остатки по расходным материалам",
      dueDate: "2026-03-10",
      hours: 11,
      minutes: 15,
      status: "DONE" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-4",
      title: "Подтвердить запись клиентов на пятницу",
      dueDate: "2026-03-12",
      hours: 16,
      minutes: 20,
      status: "TODO" as const,
      priority: "HIGH" as const,
    },
    {
      id: "emp-showcase-task-5",
      title: "Подготовить зону ожидания к загрузке выходных",
      dueDate: "2026-03-17",
      hours: 9,
      minutes: 40,
      status: "DONE" as const,
      priority: "LOW" as const,
    },
    {
      id: "emp-showcase-task-6",
      title: "Обновить отчет по допродажам",
      dueDate: "2026-03-19",
      hours: 13,
      minutes: 10,
      status: "DONE" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-7",
      title: "Проверить готовность кабинетов к вечерней смене",
      dueDate: "2026-03-20",
      hours: 11,
      minutes: 25,
      status: "DONE" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-8",
      title: "Закрыть чек-лист подготовки к выходным",
      dueDate: "2026-03-21",
      hours: 16,
      minutes: 5,
      status: "DONE" as const,
      priority: "LOW" as const,
    },
    {
      id: "emp-showcase-task-9",
      title: "Проверить наличие расходников на новой неделе",
      dueDate: "2026-03-24",
      hours: 10,
      minutes: 45,
      status: "IN_PROGRESS" as const,
      priority: "HIGH" as const,
    },
    {
      id: "emp-showcase-task-10",
      title: "Собрать короткий отчет по отзывам клиентов",
      dueDate: "2026-03-26",
      hours: 17,
      minutes: 0,
      status: "TODO" as const,
      priority: "LOW" as const,
    },
    {
      id: "emp-showcase-task-11",
      title: "Проверить готовность рабочих мест перед закрытием месяца",
      dueDate: "2026-03-30",
      hours: 12,
      minutes: 10,
      status: "DONE" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-12",
      title: "Обновить список расходников на 31 марта",
      dueDate: "2026-03-31",
      hours: 15,
      minutes: 40,
      status: "TODO" as const,
      priority: "HIGH" as const,
    },
    {
      id: "emp-showcase-task-13",
      title: "Подтвердить расписание мастеров на первую неделю апреля",
      dueDate: "2026-04-02",
      hours: 10,
      minutes: 20,
      status: "DONE" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-14",
      title: "Подготовить кабинет к пятничной загрузке",
      dueDate: "2026-04-03",
      hours: 10,
      minutes: 30,
      status: "TODO" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-15",
      title: "Проверить наличие расходников на выходные",
      dueDate: "2026-04-04",
      hours: 16,
      minutes: 10,
      status: "TODO" as const,
      priority: "HIGH" as const,
    },
    {
      id: "emp-showcase-task-16",
      title: "Провести воскресную сверку записей",
      dueDate: "2026-04-05",
      hours: 12,
      minutes: 0,
      status: "DONE" as const,
      priority: "LOW" as const,
    },
    {
      id: "emp-showcase-task-17",
      title: "Подтвердить подмену на понедельник",
      dueDate: "2026-04-06",
      hours: 9,
      minutes: 20,
      status: "DONE" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-18",
      title: "Собрать расходники для окрашивания",
      dueDate: "2026-04-07",
      hours: 11,
      minutes: 45,
      status: "TODO" as const,
      priority: "HIGH" as const,
    },
    {
      id: "emp-showcase-task-19",
      title: "Обновить витрину сезонных услуг",
      dueDate: "2026-04-08",
      hours: 11,
      minutes: 40,
      status: "DONE" as const,
      priority: "LOW" as const,
    },
    {
      id: "emp-showcase-task-20",
      title: "Проверить подтверждения на четверг",
      dueDate: "2026-04-09",
      hours: 14,
      minutes: 15,
      status: "IN_PROGRESS" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-21",
      title: "Согласовать акции на следующую неделю",
      dueDate: "2026-04-11",
      hours: 15,
      minutes: 0,
      status: "IN_PROGRESS" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-22",
      title: "Подготовить список клиентов для напоминаний",
      dueDate: "2026-04-15",
      hours: 12,
      minutes: 15,
      status: "DONE" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-23",
      title: "Проверить готовность кабинетов к вечерней загрузке",
      dueDate: "2026-04-18",
      hours: 17,
      minutes: 20,
      status: "TODO" as const,
      priority: "HIGH" as const,
    },
    {
      id: "emp-showcase-task-24",
      title: "Обновить чек-лист открытия смены",
      dueDate: "2026-04-22",
      hours: 9,
      minutes: 50,
      status: "DONE" as const,
      priority: "LOW" as const,
    },
    {
      id: "emp-showcase-task-25",
      title: "Проверить подтверждения онлайн-записей",
      dueDate: "2026-04-25",
      hours: 14,
      minutes: 30,
      status: "DONE" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-26",
      title: "Подготовить короткий отчет по апрелю",
      dueDate: "2026-04-28",
      hours: 13,
      minutes: 0,
      status: "IN_PROGRESS" as const,
      priority: "HIGH" as const,
    },
    {
      id: "emp-showcase-task-27",
      title: "Собрать отзывы клиентов по итогам месяца",
      dueDate: "2026-04-30",
      hours: 18,
      minutes: 10,
      status: "TODO" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-28",
      title: "Разбор вечерней загрузки",
      dueDate: "2026-04-14",
      hours: 9,
      minutes: 30,
      status: "IN_PROGRESS" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-29",
      title: "Фотоотчёт по витрине",
      dueDate: "2026-04-16",
      hours: 18,
      minutes: 0,
      status: "DONE" as const,
      priority: "HIGH" as const,
    },
    {
      id: "emp-showcase-task-30",
      title: "Открытие смены",
      dueDate: "2026-04-17",
      hours: 8,
      minutes: 40,
      status: "TODO" as const,
      priority: "MEDIUM" as const,
    },
    {
      id: "emp-showcase-task-31",
      title: "Набор расходников",
      dueDate: "2026-04-18",
      hours: 17,
      minutes: 10,
      status: "DONE" as const,
      priority: "HIGH" as const,
    },
  ];

  const tasks = taskBlueprints.map((task, index) => {
    const preset = buildDemoEmployeeShowcaseTaskPreset(
      task.id,
      employee,
      managerEmployee,
    );
    const dueAt = createFixedIso(task.dueDate, task.hours, task.minutes);
    const createdAt = createFixedIso(task.dueDate, 8, 30 - Math.min(index, 20));
    const persistedTask = state.tasks.find((entry) => entry.id === task.id);
    const effectiveStatus = persistedTask?.status ?? task.status;
    const completedAt =
      persistedTask?.completedAt ??
      (effectiveStatus === "DONE"
        ? createFixedIso(task.dueDate, task.hours + 1, task.minutes)
        : null);

    return normalizeDemoTask(
      {
        id: task.id,
        title: persistedTask?.title ?? preset.title ?? task.title,
        description:
          persistedTask?.description ??
          preset.description ??
          "Показательный набор задач для demo-режима.",
        status: effectiveStatus,
        priority: persistedTask?.priority ?? task.priority,
        requiresPhoto:
          persistedTask?.requiresPhoto ?? preset.requiresPhoto ?? false,
        dueAt: persistedTask?.dueAt ?? dueAt,
        completedAt,
        createdAt,
        updatedAt: persistedTask?.updatedAt ?? completedAt ?? dueAt,
        groupId: null,
        assigneeEmployeeId: employee.id,
        managerEmployee: {
          id: managerEmployee.id,
          firstName: managerEmployee.firstName,
          lastName: managerEmployee.lastName,
        },
        assigneeEmployee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeNumber: employee.employeeNumber,
          department: employee.department,
          primaryLocation: employee.primaryLocation,
        },
        group: null,
        checklistItems:
          persistedTask?.checklistItems ?? preset.checklistItems ?? [],
        activities: persistedTask?.activities ?? preset.activities ?? [],
        photoProofs: persistedTask?.photoProofs ?? preset.photoProofs ?? [],
      },
      state.employees,
    );
  });

  return {
    totals: {
      total: tasks.length,
      overdue: tasks.filter(
        (task) =>
          task.dueAt &&
          new Date(task.dueAt).getTime() < Date.now() &&
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

function buildDemoDashboardInitialData(state: DemoState, token?: string) {
  const snapshot = cloneState(state);
  const role = currentDemoRole(token);
  const employeeId = currentEmployeeId(token);
  const isEmployee = role === "employee";

  return {
    liveSessions: buildAttendanceLive(snapshot),
    anomalies: buildAttendanceAnomalies(snapshot),
    requests: snapshot.requests,
    taskBoard: buildDemoShowcaseTaskBoardForCurrentUser(snapshot, token),
    employees: snapshot.employees.map((employee) => ({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      birthDate: employee.birthDate,
      avatarUrl: employee.avatarUrl,
      user: employee.user,
      company: employee.company,
      department: employee.department,
    })),
    groups: snapshot.groups.map((group) => ({
      ...group,
      _count: {
        tasks: snapshot.tasks.filter((task) => task.groupId === group.id)
          .length,
      },
    })),
    scheduleShifts: isEmployee
      ? buildDemoEmployeeShowcaseScheduleShifts(snapshot, employeeId)
      : snapshot.shifts,
    canCheckWorkdays: true,
    dailyActivity: buildDemoDailyActivity(snapshot),
    personalHistory: isEmployee
      ? buildDemoEmployeeShowcaseHistory(snapshot, employeeId)
      : buildAttendanceHistory(snapshot, employeeId, null, null),
  };
}

export function getDemoDashboardBootstrap(token?: string) {
  const state = loadState();
  return {
    initialData: buildDemoDashboardInitialData(state, token),
    mode: currentDemoRole(token) === "employee" ? "employee" : "admin",
  };
}

export function getDemoNewsBootstrap(token?: string) {
  const state = loadState();
  return {
    initialData: buildDemoNewsBootstrap(state, token),
    mode: currentDemoRole(token) === "employee" ? "employee" : "admin",
  };
}

function parseLeaderboardMonthKey(value?: string | null) {
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

function resolveLeaderboardMonthStart(monthKey?: string | null) {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const requestedMonthStart = parseLeaderboardMonthKey(monthKey);

  if (
    requestedMonthStart &&
    requestedMonthStart.getTime() <= currentMonthStart.getTime()
  ) {
    return requestedMonthStart;
  }

  return currentMonthStart;
}

function getLeaderboardMonthOffset(monthStart: Date) {
  const now = new Date();
  return Math.max(
    0,
    (now.getFullYear() - monthStart.getFullYear()) * 12 +
      (now.getMonth() - monthStart.getMonth()),
  );
}

function buildDemoLeaderboardDailyActivity(
  anchorDate: Date,
  todayPoints: number,
) {
  const points = [9, 13, 8, 14, 11, 7, todayPoints];

  return points.map((earnedPoints, index) => {
    const day = new Date(anchorDate);
    day.setDate(anchorDate.getDate() - (points.length - 1 - index));

    return {
      dayKey: dateKey(day),
      earnedPoints,
      maxPoints: 15,
      completed: earnedPoints >= 15,
      onTimeArrival: earnedPoints >= 5,
      hadShift: true,
    };
  });
}

function buildDemoLeaderboardEntries(monthKey?: string | null) {
  const monthStart = resolveLeaderboardMonthStart(monthKey);
  const monthOffset = getLeaderboardMonthOffset(monthStart);
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

  return source
    .map(
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
        rank: 0,
        employee: {
          id,
          firstName,
          lastName,
          employeeNumber,
          avatarUrl: getMockAvatarDataUrl(`${firstName} ${lastName}`),
          department: {
            id: `department-${departmentName.toLowerCase()}`,
            name: departmentName,
          },
          position: {
            id: `position-${positionName.toLowerCase().replace(/\s+/g, "-")}`,
            name: positionName,
          },
        },
        points: Math.max(36, points - monthOffset * (4 + (index % 3))),
        todayPoints:
          monthOffset === 0
            ? todayPoints
            : Math.max(0, todayPoints - (index % 4)),
        streak: Math.max(0, streak - monthOffset),
      }),
    )
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      if (right.todayPoints !== left.todayPoints) {
        return right.todayPoints - left.todayPoints;
      }

      if (right.streak !== left.streak) {
        return right.streak - left.streak;
      }

      return `${left.employee.lastName} ${left.employee.firstName}`.localeCompare(
        `${right.employee.lastName} ${right.employee.firstName}`,
        "ru",
      );
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function buildDemoLeaderboardOverview(
  token?: string,
  monthKey?: string | null,
) {
  const role = currentDemoRole(token) === "employee" ? "employee" : "admin";
  const now = new Date();
  const monthStart = resolveLeaderboardMonthStart(monthKey);
  const monthEnd = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  const anchorDate =
    monthStart.getFullYear() === now.getFullYear() &&
    monthStart.getMonth() === now.getMonth()
      ? now
      : monthEnd;
  const leaderboard = buildDemoLeaderboardEntries(monthKey);
  const me =
    leaderboard.find((entry) =>
      role === "employee"
        ? entry.employee.firstName === "Alexey" &&
          entry.employee.lastName === "Mironov"
        : entry.employee.firstName === "Alex" &&
          entry.employee.lastName === "Petrov",
    ) ?? leaderboard[0];
  const progress =
    role === "employee"
      ? [
          {
            key: "on_time_arrival",
            earnedPoints: 5,
            maxPoints: 5,
            completed: true,
            details: {
              checkedAt: createIsoAt(0, 8, 56),
              shiftBoundaryAt: createIsoAt(0, 9, 0),
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
            maxPoints: 5,
            completed: false,
            details: {
              checkedAt: null,
              shiftBoundaryAt: createIsoAt(0, 18, 0),
              dueTaskCount: 0,
              completedDueTaskCount: 0,
              dueChecklistItemCount: 0,
              completedDueChecklistItemCount: 0,
              overdueCount: 0,
            },
          },
          {
            key: "tasks_and_checklists",
            earnedPoints: 3,
            maxPoints: 5,
            completed: false,
            details: {
              checkedAt: null,
              shiftBoundaryAt: null,
              dueTaskCount: 4,
              completedDueTaskCount: 4,
              dueChecklistItemCount: 8,
              completedDueChecklistItemCount: 6,
              overdueCount: 2,
            },
          },
        ]
      : [
          {
            key: "on_time_arrival",
            earnedPoints: 5,
            maxPoints: 5,
            completed: true,
            details: {
              checkedAt: createIsoAt(0, 8, 54),
              shiftBoundaryAt: createIsoAt(0, 9, 0),
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
            maxPoints: 5,
            completed: false,
            details: {
              checkedAt: null,
              shiftBoundaryAt: createIsoAt(0, 18, 0),
              dueTaskCount: 0,
              completedDueTaskCount: 0,
              dueChecklistItemCount: 0,
              completedDueChecklistItemCount: 0,
              overdueCount: 0,
            },
          },
          {
            key: "tasks_and_checklists",
            earnedPoints: 5,
            maxPoints: 5,
            completed: true,
            details: {
              checkedAt: null,
              shiftBoundaryAt: null,
              dueTaskCount: 4,
              completedDueTaskCount: 4,
              dueChecklistItemCount: 8,
              completedDueChecklistItemCount: 8,
              overdueCount: 0,
            },
          },
        ];
  const todayPoints = progress.reduce(
    (total, item) => total + item.earnedPoints,
    0,
  );

  return {
    month: {
      key: dateKey(monthStart).slice(0, 7),
      startsAt: monthStart.toISOString(),
      endsAt: monthEnd.toISOString(),
      todayKey: dateKey(anchorDate),
    },
    summary: {
      participants: leaderboard.length,
      maxDailyPoints: 15,
    },
    me: {
      employeeId: me.employee.id,
      rank: me.rank,
      points: me.points,
      todayPoints,
      todayMaxPoints: 15,
      streak: me.streak,
      progress,
      dailyActivity: buildDemoLeaderboardDailyActivity(anchorDate, todayPoints),
    },
    leaderboard,
  };
}

export function getDemoLeaderboardBootstrap(
  token?: string,
  monthKey?: string | null,
) {
  return {
    initialData: buildDemoLeaderboardOverview(token, monthKey),
    mode: currentDemoRole(token) === "employee" ? "employee" : "admin",
  };
}

export function getDemoActivityBootstrap() {
  const state = loadState();
  return {
    initialData: buildDemoActivityBootstrap(state),
  };
}

export function getDemoScheduleBootstrap(
  token?: string,
  options?: {
    dateFrom?: string | null;
    dateTo?: string | null;
  },
) {
  const snapshot = cloneState(loadState());
  const mode = currentDemoRole(token) === "employee" ? "employee" : "admin";

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const visibleDateFrom = options?.dateFrom?.trim() || dateKey(monthStart);
  const visibleDateTo = options?.dateTo?.trim() || dateKey(monthEnd);

  return {
    initialData: {
      departments: snapshot.departments,
      employees: snapshot.employees.map((employee) => ({
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        middleName: employee.middleName,
        employeeNumber: employee.employeeNumber,
        hireDate: employee.hireDate,
        avatarUrl: employee.avatarUrl,
        department: employee.department,
        primaryLocation: employee.primaryLocation,
        position: employee.position,
      })),
      isMockMode: false,
      locations: snapshot.locations,
      mode,
      positions: snapshot.positions,
      requests: snapshot.requests,
      shifts: snapshot.shifts,
      taskBoard: buildDemoShowcaseTaskBoardForCurrentUser(snapshot, token),
      templates: snapshot.templates,
      visibleDateFrom,
      visibleDateTo,
    },
    mode,
  };
}

function buildBiometricReviewResponse(
  state: DemoState,
  searchParams: URLSearchParams,
) {
  const employeeId = searchParams.get("employeeId");
  const rawResult = searchParams.get("result");
  const result =
    rawResult === "FAILED" || rawResult === "PASSED" || rawResult === "REVIEW"
      ? rawResult
      : null;
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
        (item) => item.enrollmentStatus !== "ENROLLED",
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

  if (pathname === "/auth/bootstrap" && method === "GET") {
    return buildDemoAuthBootstrap(currentState, token) as T;
  }

  if (pathname === "/bootstrap/organization" && method === "GET") {
    return {
      employeeCount: DEMO_HEADER_EMPLOYEE_COUNT,
      setup: cloneState(currentState).organization,
    } as T;
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
          name: DEMO_COMPANY_NAME_EN,
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

  if (pathname === "/bootstrap/tasks" && method === "GET") {
    return buildBootstrapTasks(currentState) as T;
  }

  if (pathname === "/bootstrap/employees" && method === "GET") {
    return buildDemoEmployeesBootstrap(currentState) as T;
  }

  if (pathname === "/bootstrap/attendance" && method === "GET") {
    return buildDemoAttendanceBootstrap(currentState, url.searchParams) as T;
  }

  if (pathname === "/bootstrap/dashboard" && method === "GET") {
    return getDemoDashboardBootstrap(token) as T;
  }

  if (pathname === "/bootstrap/activity" && method === "GET") {
    return getDemoActivityBootstrap().initialData as T;
  }

  if (pathname === "/bootstrap/schedule" && method === "GET") {
    return getDemoScheduleBootstrap(token, {
      dateFrom: url.searchParams.get("dateFrom"),
      dateTo: url.searchParams.get("dateTo"),
    }) as T;
  }

  if (pathname === "/bootstrap/news" && method === "GET") {
    return getDemoNewsBootstrap(token) as T;
  }

  if (pathname === "/bootstrap/leaderboard" && method === "GET") {
    return getDemoLeaderboardBootstrap(
      token,
      url.searchParams.get("month"),
    ) as T;
  }

  if (pathname === "/bootstrap/biometric" && method === "GET") {
    return buildDemoBiometricBootstrap(currentState, url.searchParams) as T;
  }

  if (pathname === "/leaderboard/overview" && method === "GET") {
    return buildDemoLeaderboardOverview(
      token,
      url.searchParams.get("month"),
    ) as T;
  }

  if (pathname === "/collaboration/announcements" && method === "GET") {
    return buildDemoAnnouncementsForViewer(currentState, token) as T;
  }

  if (pathname === "/collaboration/announcements/me" && method === "GET") {
    return buildDemoAnnouncementsForViewer(
      currentState,
      createDemoSession("employee").accessToken,
    ) as T;
  }

  if (pathname === "/collaboration/announcements/archive" && method === "GET") {
    return [...currentState.announcementArchive].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    ) as T;
  }

  if (pathname === "/collaboration/announcements" && method === "POST") {
    const payload = parseBody<any>(options?.body);
    const actor =
      currentState.employees.find(
        (employee) => employee.id === currentEmployeeId(token),
      ) ?? currentState.employees[0];
    const group = payload.groupId
      ? (currentState.groups.find((entry) => entry.id === payload.groupId) ??
        null)
      : null;
    const targetEmployee = payload.targetEmployeeId
      ? (currentState.employees.find(
          (entry) => entry.id === payload.targetEmployeeId,
        ) ?? null)
      : null;
    const scheduledFor = payload.scheduledFor ?? null;
    const publishedAt =
      scheduledFor && new Date(scheduledFor).getTime() > Date.now()
        ? null
        : new Date().toISOString();
    const announcementId = buildTaskId("announcement");

    let createdAnnouncement: any = null;
    updateState((state) => {
      createdAnnouncement = {
        id: announcementId,
        audience: payload.audience ?? "ALL",
        title: payload.title,
        body: payload.body,
        isPinned: Boolean(payload.isPinned),
        groupIds: Array.isArray(payload.groupIds)
          ? payload.groupIds
          : payload.groupId
            ? [payload.groupId]
            : [],
        targetEmployeeIds: Array.isArray(payload.targetEmployeeIds)
          ? payload.targetEmployeeIds
          : payload.targetEmployeeId
            ? [payload.targetEmployeeId]
            : [],
        linkUrl: payload.linkUrl ?? null,
        attachmentLocation: payload.attachmentLocation ?? null,
        attachments: Array.isArray(payload.attachments)
          ? payload.attachments.map((attachment: any, index: number) => ({
              id: `${announcementId}-attachment-${index + 1}`,
              fileName: attachment.fileName ?? `attachment-${index + 1}`,
              contentType: attachment.contentType ?? null,
              sizeBytes: attachment.sizeBytes ?? null,
              url: attachment.dataUrl ?? attachment.url ?? "#",
            }))
          : [],
        imageUrl: payload.imageDataUrl ?? payload.imageUrl ?? null,
        imageAspectRatio: payload.imageAspectRatio ?? null,
        scheduledFor,
        publishedAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notificationId: publishedAt ? `notification-${announcementId}` : null,
        authorEmployee: actor
          ? {
              id: actor.id,
              firstName: actor.firstName,
              lastName: actor.lastName,
            }
          : {
              id: "emp-1",
              firstName: "Demo",
              lastName: "Manager",
            },
        group: group ? { id: group.id, name: group.name } : null,
        department: null,
        location: null,
        targetEmployee: targetEmployee
          ? {
              id: targetEmployee.id,
              firstName: targetEmployee.firstName,
              lastName: targetEmployee.lastName,
              employeeNumber: targetEmployee.employeeNumber,
            }
          : null,
        readAtByEmployeeId: actor
          ? { [actor.id]: new Date().toISOString() }
          : {},
      };
      state.announcements.unshift(createdAnnouncement);
      state.announcementArchive.unshift({
        id: buildTaskId("announcement-archive"),
        announcementId,
        action: publishedAt ? "announcement.created" : "announcement.generated",
        createdAt: new Date().toISOString(),
        title: payload.title,
        isPinned: Boolean(payload.isPinned),
        actorEmployee: actor
          ? {
              id: actor.id,
              firstName: actor.firstName,
              lastName: actor.lastName,
            }
          : null,
      });
    });

    return buildDemoAnnouncementItemForViewer(
      loadState(),
      createdAnnouncement,
      token,
    ) as T;
  }

  if (pathname === "/collaboration/overview" && method === "GET") {
    return buildCollaborationOverview(currentState) as T;
  }

  if (pathname === "/collaboration/inbox-summary/me" && method === "GET") {
    return buildEmployeeSummary(currentState, token) as T;
  }

  if (pathname === "/collaboration/tasks" && method === "GET") {
    return buildDemoShowcaseTaskBoardForCurrentUser(currentState, token) as T;
  }

  if (pathname === "/collaboration/tasks/me" && method === "GET") {
    const employeeId = currentEmployeeId(token);
    return (
      currentDemoRole(token) === "employee"
        ? buildDemoEmployeeShowcaseTaskBoard(currentState, employeeId).tasks
        : currentState.tasks.filter(
            (task) => task.assigneeEmployee?.id === employeeId,
          )
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
      state.tasks.unshift(
        normalizeDemoTask(
          {
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
          },
          state.employees,
        ),
      );
    });
    return undefined as T;
  }

  const taskStatusMatch = pathname.match(
    /^\/collaboration\/tasks\/([^/]+)\/status$/,
  );
  if (taskStatusMatch && method === "POST") {
    const payload = parseBody<{ status: string }>(options?.body);
    updateState((state) => {
      let task = state.tasks.find((entry) => entry.id === taskStatusMatch[1]);

      if (!task) {
        const employeeId = currentEmployeeId(token);
        const showcaseTask = buildDemoEmployeeShowcaseTaskBoard(
          state,
          employeeId,
        ).tasks.find((entry) => entry.id === taskStatusMatch[1]);

        if (showcaseTask) {
          state.tasks.unshift({ ...showcaseTask });
          task = state.tasks[0];
        }
      }

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

  const announcementReadersMatch = pathname.match(
    /^\/collaboration\/announcements\/([^/]+)\/readers$/,
  );
  if (announcementReadersMatch && method === "GET") {
    return buildDemoAnnouncementReadReceipts(
      currentState,
      announcementReadersMatch[1],
    ) as T;
  }

  const announcementReadMatch = pathname.match(
    /^\/collaboration\/announcements\/([^/]+)\/read$/,
  );
  if (announcementReadMatch && method === "POST") {
    const viewerEmployeeId = currentEmployeeId(token);
    let readAt = new Date().toISOString();

    updateState((state) => {
      const announcement = state.announcements.find(
        (item) => item.id === announcementReadMatch[1],
      );
      if (!announcement) {
        return;
      }

      announcement.readAtByEmployeeId = {
        ...(announcement.readAtByEmployeeId ?? {}),
        [viewerEmployeeId]: readAt,
      };
    });

    return { readAt } as T;
  }

  const announcementDetailsMatch = pathname.match(
    /^\/collaboration\/announcements\/([^/]+)$/,
  );
  if (announcementDetailsMatch && method === "PATCH") {
    const payload = parseBody<any>(options?.body);
    const actor =
      currentState.employees.find(
        (employee) => employee.id === currentEmployeeId(token),
      ) ?? currentState.employees[0];
    let updatedAnnouncement: any = null;

    updateState((state) => {
      const announcement = state.announcements.find(
        (item) => item.id === announcementDetailsMatch[1],
      );
      if (!announcement) {
        return;
      }

      announcement.title = payload.title ?? announcement.title;
      announcement.body = payload.body ?? announcement.body;
      announcement.isPinned =
        typeof payload.isPinned === "boolean"
          ? payload.isPinned
          : announcement.isPinned;
      announcement.updatedAt = new Date().toISOString();
      updatedAnnouncement = { ...announcement };

      state.announcementArchive.unshift({
        id: buildTaskId("announcement-archive"),
        announcementId: announcement.id,
        action: "announcement.updated",
        createdAt: new Date().toISOString(),
        title: announcement.title,
        isPinned: announcement.isPinned,
        actorEmployee: actor
          ? {
              id: actor.id,
              firstName: actor.firstName,
              lastName: actor.lastName,
            }
          : null,
      });
    });

    if (!updatedAnnouncement) {
      throw new Error("Новость не найдена.");
    }

    return buildDemoAnnouncementItemForViewer(
      loadState(),
      updatedAnnouncement,
      token,
    ) as T;
  }

  if (announcementDetailsMatch && method === "DELETE") {
    const actor =
      currentState.employees.find(
        (employee) => employee.id === currentEmployeeId(token),
      ) ?? currentState.employees[0];

    updateState((state) => {
      const announcement = state.announcements.find(
        (item) => item.id === announcementDetailsMatch[1],
      );
      state.announcements = state.announcements.filter(
        (item) => item.id !== announcementDetailsMatch[1],
      );

      if (announcement) {
        state.announcementArchive.unshift({
          id: buildTaskId("announcement-archive"),
          announcementId: announcement.id,
          action: "announcement.deleted",
          createdAt: new Date().toISOString(),
          title: announcement.title,
          isPinned: announcement.isPinned,
          actorEmployee: actor
            ? {
                id: actor.id,
                firstName: actor.firstName,
                lastName: actor.lastName,
              }
            : null,
        });
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
    writeBrowserStorageItem(DEMO_STATE_KEY, JSON.stringify(memoryState));
  }
}

export function getDemoSessionForRole(role: "admin" | "employee") {
  return createDemoSession(role);
}
