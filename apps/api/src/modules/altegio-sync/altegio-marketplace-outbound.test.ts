import assert from 'node:assert/strict';
import { EmployeeStatus } from '@prisma/client';
import { AltegioStaffScheduleSyncService } from './altegio-staff-schedule-sync.service';

function service(prisma: Record<string, unknown>, b2b: Record<string, unknown>) {
  prisma.$transaction ??= async (fn: (tx: unknown) => unknown) => fn({ $executeRaw: async () => 1 });
  return new AltegioStaffScheduleSyncService(prisma as never, b2b as never);
}

function connectedPrisma(employee: Record<string, unknown> | null) {
  return {
    billingSubscription: {
      findUnique: async () => ({ altegioLocationId: '759658' }),
      updateMany: async () => ({ count: 1 }),
    },
    company: { findFirst: async () => ({ id: 'company-1' }) },
    department: { findFirst: async () => ({ id: 'department-1' }) },
    location: { findFirst: async () => ({ id: 'location-1' }) },
    position: { findFirst: async () => ({ id: 'position-1' }) },
    employee: {
      findFirst: async () => employee,
      update: async (_args: Record<string, unknown>) => employee,
    },
  };
}

async function testLinkedEmployeeProfileIsUpdated() {
  const updates: Array<Record<string, unknown>> = [];
  const creates: Array<Record<string, unknown>> = [];
  const linkedEmployee = {
    id: 'employee-1',
    firstName: 'Anna',
    lastName: 'Petrova',
    phone: '+971501234567',
    status: EmployeeStatus.ACTIVE,
    altegioTeamMemberId: 'remote-1',
    user: { email: 'anna@example.com' },
  };
  const altegio = {
    isConfigured: () => true,
    updateTeamMember: async (args: Record<string, unknown>) => {
      updates.push(args);
      return { id: 'remote-1' };
    },
    createTeamMember: async (args: Record<string, unknown>) => {
      creates.push(args);
      return { id: 'remote-1' };
    },
  };

  const result = await service(connectedPrisma(linkedEmployee), altegio).pushEmployeeToAltegio('tenant-1', 'employee-1');
  assert.deepEqual(result, { skipped: false, updated: true, teamMemberId: 'remote-1' });
  assert.equal(updates.length, 1);
  assert.equal(updates[0].teamMemberId, 'remote-1');
  assert.equal(updates[0].name, 'Petrova Anna');
  assert.equal(creates.length, 0);
}

async function testTerminatedLinkedEmployeeIsDeactivated() {
  const updates: Array<Record<string, unknown>> = [];
  const terminated = {
    id: 'employee-1',
    firstName: 'Anna',
    lastName: 'Petrova',
    phone: '+971501234567',
    status: EmployeeStatus.TERMINATED,
    altegioTeamMemberId: 'remote-1',
    user: { email: 'anna@example.com' },
  };
  const altegio = {
    isConfigured: () => true,
    updateTeamMember: async (args: Record<string, unknown>) => {
      updates.push(args);
      return { id: 'remote-1' };
    },
  };

  const result = await service(connectedPrisma(terminated), altegio).pushEmployeeToAltegio('tenant-1', 'employee-1');
  assert.deepEqual(result, { skipped: false, deactivated: true, teamMemberId: 'remote-1' });
  assert.equal(updates.length, 1);
  assert.equal(updates[0].teamMemberId, 'remote-1');
  assert.equal(updates[0].fired, true);
  assert.equal(updates[0].name, undefined);
}

async function testUnlinkedTerminatedEmployeeIsNotCreated() {
  const creates: Array<Record<string, unknown>> = [];
  const terminated = {
    id: 'employee-1',
    firstName: 'Anna',
    lastName: 'Petrova',
    phone: '+971501234567',
    status: EmployeeStatus.TERMINATED,
    altegioTeamMemberId: null,
    user: { email: 'anna@example.com' },
  };
  const altegio = {
    isConfigured: () => true,
    createTeamMember: async (args: Record<string, unknown>) => {
      creates.push(args);
      return { id: 'remote-9' };
    },
  };

  const result = await service(connectedPrisma(terminated), altegio).pushEmployeeToAltegio('tenant-1', 'employee-1');
  assert.deepEqual(result, { skipped: true, reason: 'terminated_not_linked' });
  assert.equal(creates.length, 0);
}

async function testUnlinkedEmployeeIsCreatedAndLinked() {
  const creates: Array<Record<string, unknown>> = [];
  const saved: Array<Record<string, unknown>> = [];
  const unlinked = {
    id: 'employee-1',
    primaryLocationId: 'location-1',
    firstName: 'Anna',
    lastName: 'Petrova',
    phone: '+971501234567',
    status: EmployeeStatus.ACTIVE,
    altegioTeamMemberId: null,
    user: { email: 'anna@example.com' },
  };
  const prisma = connectedPrisma(unlinked);
  const prevUpdate = prisma.employee.update;
  prisma.employee.update = async (args: Record<string, unknown>) => {
    saved.push(args);
    return prevUpdate(args);
  };
  const altegio = {
    isConfigured: () => true,
    createTeamMember: async (args: Record<string, unknown>) => {
      creates.push(args);
      return { id: 'remote-9' };
    },
  };

  const result = await service(prisma, altegio).pushEmployeeToAltegio('tenant-1', 'employee-1');
  assert.deepEqual(result, { skipped: false, teamMemberId: 'remote-9' });
  assert.equal(creates.length, 1);
  assert.equal(creates[0].name, 'Petrova Anna');
  assert.deepEqual((saved[0].data as Record<string, unknown>).altegioTeamMemberId, 'remote-9');
}

async function testImportedAndOtherLocationStaffAreNotExported() {
  for (const employee of [
    { employeeNumber: 'ALT-759658-100', primaryLocationId: 'location-1', user: { email: 'real@example.com' }, expected: 'imported_not_linked' },
    { employeeNumber: 'E-2', primaryLocationId: 'other-location', user: { email: 'real@example.com' }, expected: 'different_location' },
  ]) {
    let creates = 0;
    const result = await service(connectedPrisma({ id: 'e', firstName: 'A', lastName: 'B', phone: null, status: EmployeeStatus.ACTIVE, altegioTeamMemberId: null, ...employee }), {
      isConfigured: () => true, createTeamMember: async () => { creates++; return { id: 'new' }; },
    }).pushEmployeeToAltegio('tenant-1', 'e');
    assert.equal(result.reason, employee.expected);
    assert.equal(creates, 0);
  }
}

async function testPartialExportFailureIsNotReportedAsSuccess() {
  const local = { id: 'local-1', employeeNumber: 'E-1', primaryLocationId: 'location-1', firstName: 'A', lastName: 'B', phone: null, status: EmployeeStatus.ACTIVE, altegioTeamMemberId: null, user: { email: 'a@example.com' } };
  const prisma = connectedPrisma(local);
  const saved: Record<string, unknown>[] = [];
  Object.assign(prisma.employee, { findMany: async () => [local] });
  Object.assign(prisma.billingSubscription, { update: async (args: Record<string, unknown>) => { saved.push(args); }, updateMany: async (args: Record<string, unknown>) => { saved.push(args); } });
  await assert.rejects(service(prisma, { isConfigured: () => true, listTeamMembers: async () => [], createTeamMember: async () => { throw new Error('invalid contact'); } }).syncEmployees('tenant-1'), /partially failed/);
  assert.equal(saved.length, 1);
  assert.match(String((saved[0].data as Record<string, unknown>).altegioSyncLastError), /partially failed/);
}

async function testPilotImportsAreReconciledWithoutRemoteDuplicates() {
  const pilot = { id: 'pilot-1', employeeNumber: 'ALT-759658-100', primaryLocationId: 'location-1', firstName: 'A', lastName: 'B', phone: null, status: EmployeeStatus.ACTIVE, altegioTeamMemberId: null, user: { email: 'altegio+old-link-100@users.hiteam.local' } };
  const unrelated = { ...pilot, id: 'other', employeeNumber: 'ALT-1292583-999', primaryLocationId: 'other-location' };
  const prisma = connectedPrisma(pilot);
  const updates: Record<string, unknown>[] = [];
  Object.assign(prisma.employee, { findMany: async () => [pilot, unrelated], update: async (args: Record<string, unknown>) => { updates.push(args); return pilot; } });
  Object.assign(prisma.billingSubscription, { update: async () => ({}) });
  let creates = 0;
  const result = await service(prisma, { isConfigured: () => true, listTeamMembers: async () => [{ id: '100', name: 'A B', phone: null, email: null, fired: false }], createTeamMember: async () => { creates++; return { id: 'new' }; } }).syncEmployees('tenant-1');
  assert.equal(result.createdLocal, 0);
  assert.equal(result.createdRemote, 0);
  assert.equal(creates, 0);
  assert.equal(updates.length, 1);
  assert.equal((updates[0].data as Record<string, unknown>).altegioTeamMemberId, '100');
}

async function testScheduleExportErrorIsPersisted() {
  const prisma = connectedPrisma(null);
  const saved: Record<string, unknown>[] = [];
  Object.assign(prisma.billingSubscription, { updateMany: async (args: Record<string, unknown>) => { saved.push(args); } });
  Object.assign(prisma, { shift: { findMany: async () => { throw new Error('Altegio schedule export denied (403)'); } } });
  const result = await service(prisma, { isConfigured: () => true }).pushShiftDayToAltegio('tenant-1', 'employee-1', new Date('2026-10-08'));
  assert.deepEqual(result, { skipped: true, reason: 'push_failed' });
  assert.equal(saved.length, 1);
  assert.match(String((saved[0].data as Record<string, unknown>).altegioSyncLastError), /schedule export denied/);
}

async function testScheduleEligibilityGuardsOutboundWrites() {
  for (const enabled of [false, true]) {
    let writes = 0;
    const prisma = {
      shift: { findMany: async () => [{
        shiftDate: new Date('2026-10-09'), startsAt: new Date('2026-10-09T05:00Z'), endsAt: new Date('2026-10-09T14:00Z'),
        employee: { altegioTeamMemberId: '123', primaryLocation: { timezone: 'Asia/Dubai' } },
      }] },
      employee: { updateMany: async () => ({ count: 1 }) },
    };
    const sync = service(prisma, {
      getTeamMember: async () => ({ id: '123', name: 'Test', hasAccessTimetable: enabled, bookable: false, fired: false, deleted: false }),
      setStaffSchedule: async () => { writes++; },
    });
    const run = () => (sync as any).pushHiteamShiftsToAltegio('tenant-1', '759658', { from: new Date('2026-10-09'), to: new Date('2026-10-10') });
    if (enabled) assert.equal(await run(), 1);
    else await assert.rejects(run, /timetable_disabled/);
    assert.equal(writes, enabled ? 1 : 0);
  }
}

async function testStatusSeparatesLinkedAndReady() {
  const prisma = {
    billingSubscription: { findUnique: async () => ({ altegioLocationId: '759658' }) },
    employee: {
      count: async () => 3,
      findMany: async () => [
        { id: 'ready', firstName: 'Ready', lastName: '', altegioScheduleAccess: { hasAccessTimetable: true, bookable: false } },
        { id: 'blocked', firstName: 'Blocked', lastName: '', altegioScheduleAccess: { hasAccessTimetable: false } },
        { id: 'unknown', firstName: 'Unknown', lastName: '', altegioScheduleAccess: null },
      ],
    },
    shift: { count: async () => 0 },
  };
  const result = await service(prisma, { isConfigured: () => true }).getStatus('tenant-1');
  assert.equal(result.linkedEmployees, 3);
  assert.equal(result.scheduleReadyEmployees, 1);
  assert.deepEqual(result.blockedScheduleEmployees.map(e => e.reason), ['timetable_disabled', 'timetable_unknown']);
}

async function testErrorsClearOnlyTheirOwnDomain() {
  const writes: any[] = [];
  const s = service({ billingSubscription: { updateMany: async (args: any) => { writes.push(args); return { count: 1 }; } } }, {});
  await (s as any).rememberSyncError('tenant-1', new Error('blocked'), 'schedule:employee-1');
  assert.equal(writes[0].data.altegioSyncLastErrorScope, 'schedule:employee-1');
  assert.ok(writes[0].data.altegioSyncLastErrorAt instanceof Date);
  await (s as any).clearSyncError('tenant-1', 'staff');
  assert.deepEqual(writes[1].where.OR[0], { altegioSyncLastErrorScope: 'staff' });
  assert.deepEqual(writes[1].where.OR[1], { altegioSyncLastErrorScope: { startsWith: 'staff:' } });
  await (s as any).clearSyncError('tenant-1', 'schedule:employee-1');
  assert.deepEqual(writes[2].where.OR, [{ altegioSyncLastErrorScope: 'schedule:employee-1' }]);
  const start = new Date('2026-10-07T00:00:00Z');
  await (s as any).clearSyncError('tenant-1', 'schedule:employee-1:2026-10-08', start);
  assert.deepEqual(writes[3].where.OR, [{ altegioSyncLastErrorScope: 'schedule:employee-1:2026-10-08' }]);
  assert.equal(writes[3].where.altegioSyncLastErrorAt.lte, start);
}

async function testCancellationDeletesOnlyEmptyOwnedDays() {
  const s = service({ employee: { findMany: async () => [{ id: 'e1', altegioTeamMemberId: 'r1' }] }, shift: { findMany: async () => [{ employeeId: 'e1', shiftDate: new Date('2026-10-10T00:00:00Z') }] } }, {});
  const result = await (s as any).emptyHiteamScheduleDays('tenant-1', ['e1'], { from: new Date('2026-10-09T00:00:00Z'), to: new Date('2026-10-11T00:00:00Z') });
  assert.deepEqual(result, [{ teamMemberId: 'r1', dates: ['2026-10-09'] }]);
}

void Promise.all([
  testErrorsClearOnlyTheirOwnDomain(),
  testCancellationDeletesOnlyEmptyOwnedDays(),
  testLinkedEmployeeProfileIsUpdated(),
  testTerminatedLinkedEmployeeIsDeactivated(),
  testUnlinkedTerminatedEmployeeIsNotCreated(),
  testUnlinkedEmployeeIsCreatedAndLinked(),
  testImportedAndOtherLocationStaffAreNotExported(),
  testPartialExportFailureIsNotReportedAsSuccess(),
  testPilotImportsAreReconciledWithoutRemoteDuplicates(),
  testScheduleExportErrorIsPersisted(),
  testScheduleEligibilityGuardsOutboundWrites(),
  testStatusSeparatesLinkedAndReady(),
])
  .then(() => console.log('altegio marketplace outbound: ok'));
