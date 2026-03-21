"use client";

import type { ApprovalInboxItem } from "@smart/types";
type MockLocale = "en" | "ru";

type Option = {
  id: string;
  name: string;
};

type EmployeeApiRecord = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  employeeNumber: string;
  hireDate: string;
  avatarUrl?: string | null;
  department?: Option | null;
  primaryLocation?: Option | null;
  position?: Option | null;
};

type ShiftTemplateRecord = {
  id: string;
  name: string;
  code: string;
  startsAtLocal: string;
  endsAtLocal: string;
  weekDaysJson?: string | null;
  gracePeriodMinutes: number;
  createdAt: string;
  updatedAt: string;
  location: Option;
  position: Option;
};

type ShiftRecord = {
  id: string;
  shiftDate: string;
  startsAt: string;
  endsAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
  };
  location: Option;
  position: Option;
  template: {
    id: string;
    name: string;
    code: string;
    startsAtLocal: string;
    endsAtLocal: string;
  };
};

export type MockScheduleData = {
  employees: EmployeeApiRecord[];
  locations: Option[];
  departments: Option[];
  positions: Option[];
  templates: ShiftTemplateRecord[];
  shifts: ShiftRecord[];
  requests: ApprovalInboxItem[];
};

function atLocalTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next.toISOString();
}

function makeIsoDay(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

const mockCopy = {
  ru: {
    locations: ["Главный офис", "Склад Север", "Розница Юг"],
    departments: ["Операции", "Продажи", "HR", "Охрана"],
    positions: ["Менеджер", "Оператор", "HR-специалист", "Охранник"],
    employees: [
      { firstName: "Анна", lastName: "Иванова" },
      { firstName: "Илья", lastName: "Петров" },
      { firstName: "Мария", lastName: "Соколова" },
      { firstName: "Дмитрий", lastName: "Кузнецов" },
      { firstName: "Ольга", lastName: "Смирнова" },
      { firstName: "Алексей", lastName: "Волков" },
    ],
    templates: [
      { name: "Утренняя 08-17", code: "UTR" },
      { name: "Дневная 09-18", code: "DAY" },
      { name: "Поддержка 10-19", code: "SUP" },
      { name: "Ночная 20-08", code: "NGT" },
    ],
    requests: {
      shiftSwapTitle: "Обмен сменой в пятницу вечером",
      shiftSwapReason:
        "Нужно поменяться сменой из-за семейной встречи. Готова выйти в воскресенье утром.",
      leaveTitle: "Личный выходной на следующей неделе",
      leaveReason:
        "Нужен один день, чтобы закрыть вопросы по документам на квартиру.",
      advanceTitle: "Запрос на аванс",
      advanceReason: "В этом месяце возникли непредвиденные расходы на ремонт машины.",
      supplyTitle: "Замена сканера штрихкодов",
      supplyReason: "Текущий сканер теряет связь во время вечерней смены.",
      commentSwap:
        "Обмен уже согласован с коллегой, риска для покрытия смены нет.",
      commentForward: "Передаю дальше на финальное согласование.",
      commentBudget: "Бюджет на выплату доступен.",
      commentPayroll: "Одобрено для включения в ближайшую выплату.",
      commentPayrollPublic: "Аванс будет добавлен в ближайший расчетный цикл.",
      commentSupplyReject:
        "Сначала используйте резервное устройство со склада, без новой закупки.",
    },
  },
  en: {
    locations: ["HQ", "Warehouse North", "Retail South"],
    departments: ["Operations", "Sales", "HR", "Security"],
    positions: ["Manager", "Operator", "HR Specialist", "Security Guard"],
    employees: [
      { firstName: "Mia", lastName: "Johnson" },
      { firstName: "Noah", lastName: "Davis" },
      { firstName: "Emma", lastName: "Taylor" },
      { firstName: "James", lastName: "Walker" },
      { firstName: "Olivia", lastName: "Stone" },
      { firstName: "Lucas", lastName: "Hayes" },
    ],
    templates: [
      { name: "Morning 08-17", code: "MORN" },
      { name: "Day 09-18", code: "DAY" },
      { name: "Support 10-19", code: "SUP" },
      { name: "Night 20-08", code: "NGT" },
    ],
    requests: {
      shiftSwapTitle: "Shift swap for Friday evening",
      shiftSwapReason:
        "Need to swap due to a family appointment. Ready to take Sunday morning instead.",
      leaveTitle: "Personal day next week",
      leaveReason: "Need one personal day to handle apartment paperwork.",
      advanceTitle: "Advance payout request",
      advanceReason: "Unexpected car repair expenses this month.",
      supplyTitle: "Replacement barcode scanner",
      supplyReason: "Current device loses connection during the evening shift.",
      commentSwap:
        "Swap already discussed with teammate, no coverage risk expected.",
      commentForward: "Forwarding to operations for final review.",
      commentBudget: "Budget available.",
      commentPayroll: "Approved for payroll.",
      commentPayrollPublic: "Payroll will include the advance in the next cycle.",
      commentSupplyReject:
        "Use spare device from stockroom before ordering a new one.",
    },
  },
} as const;

export function createMockApprovalInboxItems(
  baseDate = new Date(),
  locale: MockLocale = "en",
): ApprovalInboxItem[] {
  const copy = mockCopy[locale];
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const first = addDays(start, 2);
  const second = addDays(start, 5);
  const third = addDays(start, 9);
  const fourth = addDays(start, 12);

  return [
    {
      id: "mock-inbox-1",
      sequence: 1,
      status: "PENDING",
      request: {
        id: "mock-request-1",
        requestType: "SHIFT_CHANGE",
        status: "PENDING",
        title: copy.requests.shiftSwapTitle,
        reason: copy.requests.shiftSwapReason,
        startsOn: makeIsoDay(first),
        endsOn: makeIsoDay(first),
        requestedDays: 1,
        relatedRequestId: null,
        relatedRequest: null,
        employee: {
          id: "emp-1",
          firstName: "Mia",
          lastName: "Johnson",
          employeeNumber: "EMP-1001",
        },
        approvalSteps: [
          {
            id: "mock-step-1-1",
            sequence: 1,
            status: "PENDING",
            comment: null,
            approverEmployee: {
              id: "manager-1",
              firstName: "Olivia",
              lastName: "Stone",
            },
          },
          {
            id: "mock-step-1-2",
            sequence: 2,
            status: "PENDING",
            comment: null,
            approverEmployee: {
              id: "manager-2",
              firstName: "Ethan",
              lastName: "Cole",
            },
          },
        ],
        comments: [
          {
            id: "mock-comment-1",
            body: copy.requests.commentSwap,
            createdAt: addDays(first, -1).toISOString(),
            authorEmployee: {
              id: "emp-1",
              firstName: copy.employees[0].firstName,
              lastName: copy.employees[0].lastName,
            },
          },
        ],
        attachments: [
          {
            id: "mock-attachment-1",
            fileName: "swap-note.pdf",
            contentType: "application/pdf",
            sizeBytes: 184000,
            storageKey: "#",
            createdAt: addDays(first, -1).toISOString(),
            url: null,
          },
        ],
      },
    },
    {
      id: "mock-inbox-2",
      sequence: 1,
      status: "APPROVED",
      request: {
        id: "mock-request-2",
        requestType: "LEAVE",
        status: "PENDING",
        title: copy.requests.leaveTitle,
        reason: copy.requests.leaveReason,
        startsOn: makeIsoDay(second),
        endsOn: makeIsoDay(second),
        requestedDays: 1,
        relatedRequestId: null,
        relatedRequest: null,
        employee: {
          id: "emp-2",
          firstName: "Noah",
          lastName: "Davis",
          employeeNumber: "EMP-1002",
        },
        approvalSteps: [
          {
            id: "mock-step-2-1",
            sequence: 1,
            status: "APPROVED",
            comment: copy.requests.commentForward,
            actedAt: addDays(second, -2).toISOString(),
            approverEmployee: {
              id: "manager-3",
              firstName: "Sofia",
              lastName: "Reed",
            },
          },
          {
            id: "mock-step-2-2",
            sequence: 2,
            status: "PENDING",
            comment: null,
            approverEmployee: {
              id: "manager-4",
              firstName: "Lucas",
              lastName: "Hayes",
            },
          },
        ],
        comments: [],
        attachments: [],
      },
    },
    {
      id: "mock-inbox-3",
      sequence: 2,
      status: "APPROVED",
      request: {
        id: "mock-request-3",
        requestType: "ADVANCE",
        status: "APPROVED",
        title: copy.requests.advanceTitle,
        reason: copy.requests.advanceReason,
        startsOn: makeIsoDay(third),
        endsOn: makeIsoDay(third),
        requestedDays: 0,
        relatedRequestId: null,
        relatedRequest: null,
        employee: {
          id: "emp-3",
          firstName: "Emma",
          lastName: "Taylor",
          employeeNumber: "EMP-1003",
        },
        approvalSteps: [
          {
            id: "mock-step-3-1",
            sequence: 1,
            status: "APPROVED",
            comment: copy.requests.commentBudget,
            actedAt: addDays(third, -3).toISOString(),
            approverEmployee: {
              id: "manager-5",
              firstName: "Ava",
              lastName: "Scott",
            },
          },
          {
            id: "mock-step-3-2",
            sequence: 2,
            status: "APPROVED",
            comment: copy.requests.commentPayroll,
            actedAt: addDays(third, -2).toISOString(),
            approverEmployee: {
              id: "manager-6",
              firstName: "Liam",
              lastName: "Perry",
            },
          },
        ],
        comments: [
          {
            id: "mock-comment-3",
            body: copy.requests.commentPayrollPublic,
            createdAt: addDays(third, -2).toISOString(),
            authorEmployee: {
              id: "manager-6",
              firstName: "Liam",
              lastName: "Perry",
            },
          },
        ],
        attachments: [],
      },
    },
    {
      id: "mock-inbox-4",
      sequence: 1,
      status: "REJECTED",
      request: {
        id: "mock-request-4",
        requestType: "SUPPLY",
        status: "REJECTED",
        title: copy.requests.supplyTitle,
        reason: copy.requests.supplyReason,
        startsOn: makeIsoDay(fourth),
        endsOn: makeIsoDay(fourth),
        requestedDays: 0,
        relatedRequestId: null,
        relatedRequest: null,
        employee: {
          id: "emp-4",
          firstName: "James",
          lastName: "Walker",
          employeeNumber: "EMP-1004",
        },
        approvalSteps: [
          {
            id: "mock-step-4-1",
            sequence: 1,
            status: "REJECTED",
            comment: copy.requests.commentSupplyReject,
            actedAt: addDays(fourth, -1).toISOString(),
            approverEmployee: {
              id: "manager-7",
              firstName: "Grace",
              lastName: "Ward",
            },
          },
        ],
        comments: [],
        attachments: [
          {
            id: "mock-attachment-4",
            fileName: "scanner-photo.jpg",
            contentType: "image/jpeg",
            sizeBytes: 264000,
            storageKey: "#",
            createdAt: addDays(fourth, -2).toISOString(),
            url: null,
          },
        ],
      },
    },
  ];
}

export function createMockScheduleData(
  baseDate = new Date(),
  locale: MockLocale = "en",
): MockScheduleData {
  const copy = mockCopy[locale];
  const locations = [
    { id: "loc-1", name: copy.locations[0] },
    { id: "loc-2", name: copy.locations[1] },
    { id: "loc-3", name: copy.locations[2] },
  ];
  const departments = [
    { id: "dep-1", name: copy.departments[0] },
    { id: "dep-2", name: copy.departments[1] },
    { id: "dep-3", name: copy.departments[2] },
    { id: "dep-4", name: copy.departments[3] },
  ];
  const positions = [
    { id: "pos-1", name: copy.positions[0] },
    { id: "pos-2", name: copy.positions[1] },
    { id: "pos-3", name: copy.positions[2] },
    { id: "pos-4", name: copy.positions[3] },
  ];

  const employees: EmployeeApiRecord[] = [
    {
      id: "emp-1",
      firstName: copy.employees[0].firstName,
      lastName: copy.employees[0].lastName,
      employeeNumber: "EMP-1001",
      hireDate: "2024-02-11",
      department: departments[0],
      primaryLocation: locations[0],
      position: positions[0],
    },
    {
      id: "emp-2",
      firstName: copy.employees[1].firstName,
      lastName: copy.employees[1].lastName,
      employeeNumber: "EMP-1002",
      hireDate: "2023-09-20",
      department: departments[1],
      primaryLocation: locations[2],
      position: positions[1],
    },
    {
      id: "emp-3",
      firstName: copy.employees[2].firstName,
      lastName: copy.employees[2].lastName,
      employeeNumber: "EMP-1003",
      hireDate: "2022-06-10",
      department: departments[2],
      primaryLocation: locations[0],
      position: positions[2],
    },
    {
      id: "emp-4",
      firstName: copy.employees[3].firstName,
      lastName: copy.employees[3].lastName,
      employeeNumber: "EMP-1004",
      hireDate: "2021-01-03",
      department: departments[3],
      primaryLocation: locations[1],
      position: positions[3],
    },
    {
      id: "emp-5",
      firstName: copy.employees[4].firstName,
      lastName: copy.employees[4].lastName,
      employeeNumber: "EMP-1005",
      hireDate: "2023-11-18",
      department: departments[0],
      primaryLocation: locations[1],
      position: positions[1],
    },
    {
      id: "emp-6",
      firstName: copy.employees[5].firstName,
      lastName: copy.employees[5].lastName,
      employeeNumber: "EMP-1006",
      hireDate: "2022-04-01",
      department: departments[1],
      primaryLocation: locations[2],
      position: positions[0],
    },
  ];

  const now = new Date(baseDate);
  const createdAt = now.toISOString();
  const templates: ShiftTemplateRecord[] = [
    {
      id: "tpl-1",
      name: copy.templates[0].name,
      code: copy.templates[0].code,
      startsAtLocal: "08:00",
      endsAtLocal: "17:00",
      weekDaysJson: JSON.stringify([1, 2, 3, 4, 5]),
      gracePeriodMinutes: 10,
      createdAt,
      updatedAt: createdAt,
      location: locations[0],
      position: positions[0],
    },
    {
      id: "tpl-2",
      name: copy.templates[1].name,
      code: "DAY",
      startsAtLocal: "09:00",
      endsAtLocal: "18:00",
      weekDaysJson: JSON.stringify([1, 2, 3, 4, 5]),
      gracePeriodMinutes: 10,
      createdAt,
      updatedAt: createdAt,
      location: locations[1],
      position: positions[1],
    },
    {
      id: "tpl-3",
      name: copy.templates[2].name,
      code: "SUP",
      startsAtLocal: "10:00",
      endsAtLocal: "19:00",
      weekDaysJson: JSON.stringify([1, 2, 3, 4, 5, 6]),
      gracePeriodMinutes: 5,
      createdAt,
      updatedAt: createdAt,
      location: locations[0],
      position: positions[2],
    },
    {
      id: "tpl-4",
      name: copy.templates[3].name,
      code: "NGT",
      startsAtLocal: "20:00",
      endsAtLocal: "08:00",
      weekDaysJson: JSON.stringify([1, 2, 3, 4]),
      gracePeriodMinutes: 15,
      createdAt,
      updatedAt: createdAt,
      location: locations[1],
      position: positions[3],
    },
  ];

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const shifts: ShiftRecord[] = [];
  let shiftId = 1;

  for (let dayIndex = 0; dayIndex < 32; dayIndex += 1) {
    const day = addDays(monthStart, dayIndex);
    if (day.getMonth() !== now.getMonth()) break;

    const assignments = [
      { employee: employees[dayIndex % employees.length], template: templates[0] },
      { employee: employees[(dayIndex + 1) % employees.length], template: templates[1] },
    ];

    if (dayIndex % 3 === 0) {
      assignments.push({
        employee: employees[(dayIndex + 2) % employees.length],
        template: templates[2],
      });
    }

    if (dayIndex % 5 === 0) {
      assignments.push({
        employee: employees[(dayIndex + 3) % employees.length],
        template: templates[3],
      });
    }

    for (const assignment of assignments) {
      shifts.push({
        id: `shift-${shiftId++}`,
        shiftDate: makeIsoDay(day),
        startsAt: atLocalTime(day, assignment.template.startsAtLocal),
        endsAt: atLocalTime(day, assignment.template.endsAtLocal === "08:00" ? "23:59" : assignment.template.endsAtLocal),
        status: "ASSIGNED",
        createdAt,
        updatedAt: createdAt,
        employee: {
          id: assignment.employee.id,
          firstName: assignment.employee.firstName,
          lastName: assignment.employee.lastName,
        },
        location: assignment.template.location,
        position: assignment.template.position,
        template: {
          id: assignment.template.id,
          name: assignment.template.name,
          code: assignment.template.code,
          startsAtLocal: assignment.template.startsAtLocal,
          endsAtLocal: assignment.template.endsAtLocal,
        },
      });
    }
  }

  return {
    employees,
    locations,
    departments,
    positions,
    templates,
    shifts,
    requests: createMockApprovalInboxItems(baseDate, locale),
  };
}
