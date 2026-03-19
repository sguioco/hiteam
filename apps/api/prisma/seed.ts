import 'dotenv/config';
import {
  ApprovalStatus,
  AttendanceEventType,
  AttendanceResult,
  AttendanceSessionStatus,
  DevicePlatform,
  EmployeeStatus,
  NotificationType,
  PrismaClient,
  TaskPriority,
  TaskStatus,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const DEMO_SHIFT_UTC_OFFSET_HOURS = 7;

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = startOfToday();
  date.setHours(23, 59, 59, 999);
  return date;
}

function hoursFromNow(offsetHours: number) {
  return new Date(Date.now() + offsetHours * 60 * 60 * 1000);
}

function startOfDayAtUtcOffset(offsetHours: number) {
  const shiftedNow = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  return new Date(Date.UTC(shiftedNow.getUTCFullYear(), shiftedNow.getUTCMonth(), shiftedNow.getUTCDate(), -offsetHours, 0, 0, 0));
}

function endOfDayAtUtcOffset(offsetHours: number) {
  const start = startOfDayAtUtcOffset(offsetHours);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

function dateAtUtcOffset(offsetHours: number, hour: number, minute: number) {
  const shiftedNow = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  return new Date(Date.UTC(shiftedNow.getUTCFullYear(), shiftedNow.getUTCMonth(), shiftedNow.getUTCDate(), hour - offsetHours, minute, 0, 0));
}

function dateDaysFromNow(offsetDays: number, year: number) {
  const next = new Date();
  next.setDate(next.getDate() + offsetDays);
  next.setHours(12, 0, 0, 0);
  next.setFullYear(year);
  return next;
}

async function ensureRole(code: string, name: string, description: string) {
  return prisma.role.upsert({
    where: { code },
    update: {},
    create: { code, name, description },
  });
}

async function ensureEmployee(params: {
  tenantId: string;
  companyId: string;
  departmentId: string;
  locationId: string;
  positionId: string;
  email: string;
  passwordHash: string;
  roleId: string;
  roleScopeId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  managerEmployeeId?: string;
  birthDate?: Date;
  hireDate: Date;
  deviceFingerprint: string;
  deviceName: string;
}) {
  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: params.tenantId,
        email: params.email,
      },
    },
    update: {
      passwordHash: params.passwordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      tenantId: params.tenantId,
      email: params.email,
      passwordHash: params.passwordHash,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId_scopeType_scopeId: {
        userId: user.id,
        roleId: params.roleId,
        scopeType: 'tenant',
        scopeId: params.roleScopeId,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: params.roleId,
      scopeType: 'tenant',
      scopeId: params.roleScopeId,
    },
  });

  const employee = await prisma.employee.upsert({
    where: { userId: user.id },
    update: {
      companyId: params.companyId,
      departmentId: params.departmentId,
      primaryLocationId: params.locationId,
      positionId: params.positionId,
      managerEmployeeId: params.managerEmployeeId,
      employeeNumber: params.employeeNumber,
      firstName: params.firstName,
      lastName: params.lastName,
      birthDate: params.birthDate ?? null,
      status: EmployeeStatus.ACTIVE,
      hireDate: params.hireDate,
    },
    create: {
      tenantId: params.tenantId,
      userId: user.id,
      companyId: params.companyId,
      departmentId: params.departmentId,
      primaryLocationId: params.locationId,
      positionId: params.positionId,
      managerEmployeeId: params.managerEmployeeId,
      employeeNumber: params.employeeNumber,
      firstName: params.firstName,
      lastName: params.lastName,
      birthDate: params.birthDate ?? null,
      status: EmployeeStatus.ACTIVE,
      hireDate: params.hireDate,
    },
  });

  const device = await prisma.device.upsert({
    where: {
      employeeId_deviceFingerprint: {
        employeeId: employee.id,
        deviceFingerprint: params.deviceFingerprint,
      },
    },
    update: {
      platform: DevicePlatform.WEB,
      deviceName: params.deviceName,
      isPrimary: true,
    },
    create: {
      employeeId: employee.id,
      platform: DevicePlatform.WEB,
      deviceFingerprint: params.deviceFingerprint,
      deviceName: params.deviceName,
      isPrimary: true,
    },
  });

  return { user, employee, device };
}

async function main(): Promise<void> {
  const adminPasswordHash = await bcrypt.hash('Admin12345!', 10);
  const employeePasswordHash = await bcrypt.hash('Employee123!', 10);

  const ownerRole = await ensureRole(
    'tenant_owner',
    'Tenant Owner',
    'Full company access',
  );
  const employeeRole = await ensureRole(
    'employee',
    'Employee',
    'Standard employee access',
  );

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Beauty Life',
      slug: 'demo',
      timezone: 'Asia/Novosibirsk',
      locale: 'ru',
    },
  });

  const company = await prisma.company.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'BEAUTY-HQ' } },
    update: {
      name: 'Beauty Life',
    },
    create: {
      tenantId: tenant.id,
      name: 'Beauty Life',
      code: 'BEAUTY-HQ',
    },
  });

  const operationsDepartment = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'OPS' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Operations',
      code: 'OPS',
    },
  });

  const frontDeskDepartment = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'FRONT' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Front Desk',
      code: 'FRONT',
    },
  });

  const ownerPosition = await prisma.position.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'OWNER' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Administrator',
      code: 'OWNER',
    },
  });

  const staffPosition = await prisma.position.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SPEC' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Specialist',
      code: 'SPEC',
    },
  });

  const location = await prisma.location.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'HQ' } },
    update: {
      companyId: company.id,
      name: 'Central Studio',
    },
    create: {
      tenantId: tenant.id,
      companyId: company.id,
      name: 'Central Studio',
      code: 'HQ',
      address: 'Demo address',
      latitude: 55.0302,
      longitude: 82.9204,
      geofenceRadiusMeters: 120,
      timezone: 'Asia/Novosibirsk',
    },
  });

  const owner = await ensureEmployee({
    tenantId: tenant.id,
    companyId: company.id,
    departmentId: operationsDepartment.id,
    locationId: location.id,
    positionId: ownerPosition.id,
    email: 'owner@demo.smart',
    passwordHash: adminPasswordHash,
    roleId: ownerRole.id,
    roleScopeId: tenant.id,
    employeeNumber: 'EMP-0001',
    firstName: 'Ilia',
    lastName: 'Admin',
    birthDate: dateDaysFromNow(2, 1990),
    hireDate: new Date('2026-01-01T00:00:00.000Z'),
    deviceFingerprint: 'demo-device-owner',
    deviceName: 'Owner Browser',
  });

  const alex = await ensureEmployee({
    tenantId: tenant.id,
    companyId: company.id,
    departmentId: operationsDepartment.id,
    locationId: location.id,
    positionId: staffPosition.id,
    email: 'employee@demo.smart',
    passwordHash: employeePasswordHash,
    roleId: employeeRole.id,
    roleScopeId: tenant.id,
    employeeNumber: 'EMP-0002',
    firstName: 'Alexander',
    lastName: 'Prokhorov',
    managerEmployeeId: owner.employee.id,
    birthDate: dateDaysFromNow(8, 1994),
    hireDate: new Date('2026-01-05T00:00:00.000Z'),
    deviceFingerprint: 'demo-device-alex',
    deviceName: 'Alex Browser',
  });

  const julia = await ensureEmployee({
    tenantId: tenant.id,
    companyId: company.id,
    departmentId: frontDeskDepartment.id,
    locationId: location.id,
    positionId: staffPosition.id,
    email: 'julia@demo.smart',
    passwordHash: employeePasswordHash,
    roleId: employeeRole.id,
    roleScopeId: tenant.id,
    employeeNumber: 'EMP-0003',
    firstName: 'Julia',
    lastName: 'Zakharova',
    managerEmployeeId: owner.employee.id,
    birthDate: dateDaysFromNow(15, 1996),
    hireDate: new Date('2026-01-12T00:00:00.000Z'),
    deviceFingerprint: 'demo-device-julia',
    deviceName: 'Julia Browser',
  });

  const sergey = await ensureEmployee({
    tenantId: tenant.id,
    companyId: company.id,
    departmentId: operationsDepartment.id,
    locationId: location.id,
    positionId: staffPosition.id,
    email: 'sergey@demo.smart',
    passwordHash: employeePasswordHash,
    roleId: employeeRole.id,
    roleScopeId: tenant.id,
    employeeNumber: 'EMP-0004',
    firstName: 'Sergey',
    lastName: 'Ivanov',
    managerEmployeeId: owner.employee.id,
    birthDate: dateDaysFromNow(28, 1991),
    hireDate: new Date('2026-01-20T00:00:00.000Z'),
    deviceFingerprint: 'demo-device-sergey',
    deviceName: 'Sergey Browser',
  });

  const maria = await ensureEmployee({
    tenantId: tenant.id,
    companyId: company.id,
    departmentId: frontDeskDepartment.id,
    locationId: location.id,
    positionId: staffPosition.id,
    email: 'maria@demo.smart',
    passwordHash: employeePasswordHash,
    roleId: employeeRole.id,
    roleScopeId: tenant.id,
    employeeNumber: 'EMP-0005',
    firstName: 'Maria',
    lastName: 'Kim',
    managerEmployeeId: owner.employee.id,
    birthDate: dateDaysFromNow(41, 1993),
    hireDate: new Date('2026-02-01T00:00:00.000Z'),
    deviceFingerprint: 'demo-device-maria',
    deviceName: 'Maria Browser',
  });

  await prisma.payrollPolicy.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      baseHourlyRate: 15,
      overtimeMultiplier: 1.5,
      weekendMultiplier: 2,
      weekendOvertimeMultiplier: 2.5,
      holidayMultiplier: 2,
      holidayOvertimeMultiplier: 3,
      nightPremiumMultiplier: 0.2,
      nightShiftStartLocal: '22:00',
      nightShiftEndLocal: '06:00',
      latenessPenaltyPerMinute: 0.2,
      earlyLeavePenaltyPerMinute: 0.2,
      leavePaidRatio: 1,
      sickLeavePaidRatio: 0.8,
      standardShiftMinutes: 480,
      defaultBreakIsPaid: false,
      maxBreakMinutes: 60,
      mandatoryBreakThresholdMinutes: 360,
      mandatoryBreakDurationMinutes: 30,
    },
  });

  await prisma.approvalPolicy.upsert({
    where: { id: `${tenant.id}-leave-owner` },
    update: { approverEmployeeId: owner.employee.id },
    create: {
      id: `${tenant.id}-leave-owner`,
      tenantId: tenant.id,
      requestType: 'LEAVE',
      approverEmployeeId: owner.employee.id,
      priority: 1,
    },
  });

  await prisma.approvalPolicy.upsert({
    where: { id: `${tenant.id}-sick-owner` },
    update: { approverEmployeeId: owner.employee.id },
    create: {
      id: `${tenant.id}-sick-owner`,
      tenantId: tenant.id,
      requestType: 'SICK_LEAVE',
      approverEmployeeId: owner.employee.id,
      priority: 1,
    },
  });

  await prisma.holidayCalendarDay.upsert({
    where: {
      tenantId_date: {
        tenantId: tenant.id,
        date: new Date('2026-03-08T00:00:00.000Z'),
      },
    },
    update: {
      name: "Women's Day",
      isPaid: true,
    },
    create: {
      tenantId: tenant.id,
      name: "Women's Day",
      date: new Date('2026-03-08T00:00:00.000Z'),
      isPaid: true,
    },
  });

  const template = await prisma.shiftTemplate.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'DAY-FLEX',
      },
    },
    update: {
      name: 'Flexible Day Shift',
    },
    create: {
      tenantId: tenant.id,
      name: 'Flexible Day Shift',
      code: 'DAY-FLEX',
      locationId: location.id,
      positionId: staffPosition.id,
      startsAtLocal: '09:00',
      endsAtLocal: '18:00',
      gracePeriodMinutes: 10,
    },
  });

  const allEmployees = [owner, alex, julia, sergey, maria];
  const allEmployeeIds = allEmployees.map((item) => item.employee.id);
  const todayStart = startOfDayAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS);
  const todayEnd = endOfDayAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS);

  await prisma.attendanceCorrectionComment.deleteMany({
    where: {
      tenantId: tenant.id,
      correctionRequest: {
        employeeId: { in: allEmployeeIds },
      },
    },
  });
  await prisma.attendanceCorrectionRequest.deleteMany({
    where: {
      tenantId: tenant.id,
      employeeId: { in: allEmployeeIds },
    },
  });
  await prisma.attendanceBreak.deleteMany({
    where: {
      tenantId: tenant.id,
      employeeId: { in: allEmployeeIds },
      startedAt: { gte: todayStart },
    },
  });
  await prisma.attendanceSession.deleteMany({
    where: {
      tenantId: tenant.id,
      employeeId: { in: allEmployeeIds },
      startedAt: { gte: todayStart },
    },
  });
  await prisma.attendanceEvent.deleteMany({
    where: {
      tenantId: tenant.id,
      employeeId: { in: allEmployeeIds },
      occurredAt: { gte: todayStart },
    },
  });
  await prisma.shift.deleteMany({
    where: {
      tenantId: tenant.id,
      employeeId: { in: allEmployeeIds },
      shiftDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  const shifts = {
    alex: await prisma.shift.create({
      data: {
        tenantId: tenant.id,
        templateId: template.id,
        employeeId: alex.employee.id,
        locationId: location.id,
        positionId: staffPosition.id,
        shiftDate: todayStart,
        startsAt: dateAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS, 9, 0),
        endsAt: dateAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS, 18, 0),
      },
    }),
    maria: await prisma.shift.create({
      data: {
        tenantId: tenant.id,
        templateId: template.id,
        employeeId: maria.employee.id,
        locationId: location.id,
        positionId: staffPosition.id,
        shiftDate: todayStart,
        startsAt: dateAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS, 8, 0),
        endsAt: dateAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS, 17, 0),
      },
    }),
    sergey: await prisma.shift.create({
      data: {
        tenantId: tenant.id,
        templateId: template.id,
        employeeId: sergey.employee.id,
        locationId: location.id,
        positionId: staffPosition.id,
        shiftDate: todayStart,
        startsAt: dateAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS, 7, 30),
        endsAt: dateAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS, 16, 0),
      },
    }),
    julia: await prisma.shift.create({
      data: {
        tenantId: tenant.id,
        templateId: template.id,
        employeeId: julia.employee.id,
        locationId: location.id,
        positionId: staffPosition.id,
        shiftDate: todayStart,
        startsAt: dateAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS, 10, 0),
        endsAt: dateAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS, 19, 0),
      },
    }),
  };

  const mariaCheckIn = await prisma.attendanceEvent.create({
    data: {
      tenantId: tenant.id,
      employeeId: maria.employee.id,
      eventType: AttendanceEventType.CHECK_IN,
      result: AttendanceResult.ACCEPTED,
      occurredAt: hoursFromNow(-4),
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMeters: 6,
      distanceMeters: 10,
      notes: 'Seeded break shift',
      locationId: location.id,
      deviceId: maria.device.id,
    },
  });

  const mariaBreakStart = await prisma.attendanceEvent.create({
    data: {
      tenantId: tenant.id,
      employeeId: maria.employee.id,
      eventType: AttendanceEventType.BREAK_START,
      result: AttendanceResult.ACCEPTED,
      occurredAt: hoursFromNow(-2),
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMeters: 6,
      distanceMeters: 14,
      notes: 'Seeded long break',
      locationId: location.id,
      deviceId: maria.device.id,
    },
  });

  const mariaSession = await prisma.attendanceSession.create({
    data: {
      tenantId: tenant.id,
      employeeId: maria.employee.id,
      shiftId: shifts.maria.id,
      checkInEventId: mariaCheckIn.id,
      status: AttendanceSessionStatus.ON_BREAK,
      startedAt: mariaCheckIn.occurredAt,
      totalMinutes: 240,
    },
  });

  await prisma.attendanceBreak.create({
    data: {
      tenantId: tenant.id,
      employeeId: maria.employee.id,
      sessionId: mariaSession.id,
      startEventId: mariaBreakStart.id,
      isPaid: false,
      startedAt: mariaBreakStart.occurredAt,
    },
  });

  const sergeyCheckIn = await prisma.attendanceEvent.create({
    data: {
      tenantId: tenant.id,
      employeeId: sergey.employee.id,
      eventType: AttendanceEventType.CHECK_IN,
      result: AttendanceResult.ACCEPTED,
      occurredAt: hoursFromNow(-6),
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMeters: 7,
      distanceMeters: 11,
      notes: 'Seeded early leave',
      locationId: location.id,
      deviceId: sergey.device.id,
    },
  });

  const sergeyCheckOut = await prisma.attendanceEvent.create({
    data: {
      tenantId: tenant.id,
      employeeId: sergey.employee.id,
      eventType: AttendanceEventType.CHECK_OUT,
      result: AttendanceResult.ACCEPTED,
      occurredAt: hoursFromNow(-2),
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMeters: 7,
      distanceMeters: 9,
      notes: 'Seeded early leave',
      locationId: location.id,
      deviceId: sergey.device.id,
    },
  });

  await prisma.attendanceSession.create({
    data: {
      tenantId: tenant.id,
      employeeId: sergey.employee.id,
      shiftId: shifts.sergey.id,
      checkInEventId: sergeyCheckIn.id,
      checkOutEventId: sergeyCheckOut.id,
      status: AttendanceSessionStatus.CLOSED,
      startedAt: sergeyCheckIn.occurredAt,
      endedAt: sergeyCheckOut.occurredAt,
      totalMinutes: 240,
      earlyLeaveMinutes: 35,
    },
  });

  const group = await prisma.workGroup.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'Frontline Operations',
      },
    },
    update: {
      description: 'Core studio shift group',
      managerEmployeeId: owner.employee.id,
    },
    create: {
      tenantId: tenant.id,
      managerEmployeeId: owner.employee.id,
      name: 'Frontline Operations',
      description: 'Core studio shift group',
    },
  });

  await prisma.workGroupMembership.deleteMany({
    where: { groupId: group.id },
  });
  await prisma.workGroupMembership.createMany({
    data: [alex, julia, sergey, maria].map((item) => ({
      tenantId: tenant.id,
      groupId: group.id,
      employeeId: item.employee.id,
    })),
  });

  const demoTaskTitles = [
    'Prepare two treatment rooms',
    'Restock towels and cleaning supplies',
    'Take before-service photos',
    'Meeting: front desk briefing',
    'Finish laundry cycle',
  ];

  await prisma.task.deleteMany({
    where: {
      tenantId: tenant.id,
      title: { in: demoTaskTitles },
    },
  });

  await prisma.task.create({
    data: {
      tenantId: tenant.id,
      managerEmployeeId: owner.employee.id,
      assigneeEmployeeId: alex.employee.id,
      title: 'Prepare two treatment rooms',
      description: 'Open room A and room B for the morning clients and verify that all surfaces are clean.',
      priority: TaskPriority.HIGH,
      status: TaskStatus.TODO,
      dueAt: dateAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS, 10, 30),
      checklistItems: {
        create: [
          { tenantId: tenant.id, title: 'Wipe both desks and mirrors', sortOrder: 1 },
          { tenantId: tenant.id, title: 'Set fresh towels in each room', sortOrder: 2 },
        ],
      },
    },
  });

  await prisma.task.create({
    data: {
      tenantId: tenant.id,
      managerEmployeeId: owner.employee.id,
      assigneeEmployeeId: alex.employee.id,
      title: 'Restock towels and cleaning supplies',
      description: 'Refill the storage cart before the lunch rush so the evening shift does not run out of supplies.',
      priority: TaskPriority.URGENT,
      status: TaskStatus.TODO,
      dueAt: dateAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS, 12, 15),
      checklistItems: {
        create: [
          {
            tenantId: tenant.id,
            title: 'Count clean towels',
            sortOrder: 1,
            isCompleted: true,
            completedAt: dateAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS, 11, 10),
            completedByEmployeeId: alex.employee.id,
          },
          { tenantId: tenant.id, title: 'Refill spray bottles and wipes', sortOrder: 2 },
        ],
      },
    },
  });

  await prisma.task.create({
    data: {
      tenantId: tenant.id,
      managerEmployeeId: owner.employee.id,
      assigneeEmployeeId: alex.employee.id,
      title: 'Take before-service photos',
      description: 'Take two photos of the prepared rooms before the first service block starts.',
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      dueAt: dateAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS, 13, 40),
    },
  });

  await prisma.task.create({
    data: {
      tenantId: tenant.id,
      managerEmployeeId: owner.employee.id,
      assigneeEmployeeId: alex.employee.id,
      title: 'Meeting: front desk briefing',
      description:
        'Short coordination before the afternoon bookings start.\n\n[smart-task-meta] {"kind":"meeting","meetingMode":"offline","meetingLocation":"Reception desk"}',
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      dueAt: dateAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS, 14, 30),
    },
  });

  await prisma.task.create({
    data: {
      tenantId: tenant.id,
      managerEmployeeId: owner.employee.id,
      assigneeEmployeeId: alex.employee.id,
      title: 'Finish laundry cycle',
      description: 'Move washed towels to the drying rack and prepare the second batch.',
      priority: TaskPriority.HIGH,
      status: TaskStatus.DONE,
      dueAt: dateAtUtcOffset(DEMO_SHIFT_UTC_OFFSET_HOURS, 11, 0),
    },
  });

  const demoRequestTitles = [
    'Supply request for consumables',
    'Leave request for next week',
  ];

  await prisma.employeeRequest.deleteMany({
    where: {
      tenantId: tenant.id,
      title: { in: demoRequestTitles },
    },
  });

  const supplyRequest = await prisma.employeeRequest.create({
    data: {
      tenantId: tenant.id,
      employeeId: alex.employee.id,
      managerEmployeeId: owner.employee.id,
      requestType: 'SUPPLY',
      status: 'PENDING',
      title: 'Supply request for consumables',
      reason: 'Need signed purchase package for gloves and salon supplies.',
      startsOn: hoursFromNow(0),
      endsOn: hoursFromNow(24),
      requestedDays: 1,
      approvalSteps: {
        create: {
          tenantId: tenant.id,
          approverEmployeeId: owner.employee.id,
          sequence: 1,
          status: ApprovalStatus.PENDING,
        },
      },
    },
    include: {
      approvalSteps: true,
    },
  });

  await prisma.requestAttachment.createMany({
    data: [
      {
        tenantId: tenant.id,
        requestId: supplyRequest.id,
        uploadedByEmployeeId: alex.employee.id,
        fileName: 'consumables-pack.pdf',
        contentType: 'application/pdf',
        sizeBytes: 248000,
        storageKey: `requests/${tenant.id}/supply/consumables-pack.pdf`,
      },
      {
        tenantId: tenant.id,
        requestId: supplyRequest.id,
        uploadedByEmployeeId: alex.employee.id,
        fileName: 'invoice-draft.pdf',
        contentType: 'application/pdf',
        sizeBytes: 196000,
        storageKey: `requests/${tenant.id}/supply/invoice-draft.pdf`,
      },
    ],
  });

  await prisma.employeeRequest.create({
    data: {
      tenantId: tenant.id,
      employeeId: julia.employee.id,
      managerEmployeeId: owner.employee.id,
      requestType: 'LEAVE',
      status: 'PENDING',
      title: 'Leave request for next week',
      reason: 'Need approval for family travel from Monday to Wednesday.',
      startsOn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endsOn: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      requestedDays: 3,
      approvalSteps: {
        create: {
          tenantId: tenant.id,
          approverEmployeeId: owner.employee.id,
          sequence: 1,
          status: ApprovalStatus.PENDING,
        },
      },
    },
  });

  const demoNotificationTitles = [
    'Action required: supply package',
    'Shift issue needs attention',
    'Three approvals still waiting',
  ];

  await prisma.notification.deleteMany({
    where: {
      tenantId: tenant.id,
      userId: owner.user.id,
      title: { in: demoNotificationTitles },
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: owner.user.id,
        type: NotificationType.REQUEST_ACTION_REQUIRED,
        title: 'Action required: supply package',
        body: 'Alexander uploaded two files that need your sign-off.',
        actionUrl: '/requests',
        isRead: false,
      },
      {
        tenantId: tenant.id,
        userId: owner.user.id,
        type: NotificationType.ATTENDANCE_ANOMALY_CRITICAL,
        title: 'Shift issue needs attention',
        body: 'Julia did not check in for the active shift after the grace period.',
        actionUrl: '/attendance',
        isRead: false,
      },
      {
        tenantId: tenant.id,
        userId: owner.user.id,
        type: NotificationType.OPERATIONS_ALERT,
        title: 'Three approvals still waiting',
        body: 'Pending requests and document actions are still open on your side.',
        actionUrl: '/requests',
        isRead: false,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
