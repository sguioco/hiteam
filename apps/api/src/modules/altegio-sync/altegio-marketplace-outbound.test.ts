import assert from 'node:assert/strict';
import { EmployeeStatus } from '@prisma/client';
import { AltegioStaffScheduleSyncService } from './altegio-staff-schedule-sync.service';

function service(prisma: Record<string, unknown>, b2b: Record<string, unknown>) {
  return new AltegioStaffScheduleSyncService(prisma as never, b2b as never);
}

function connectedPrisma(employee: Record<string, unknown> | null) {
  return {
    billingSubscription: {
      findUnique: async () => ({ altegioLocationId: '759658' }),
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

void Promise.all([
  testLinkedEmployeeProfileIsUpdated(),
  testTerminatedLinkedEmployeeIsDeactivated(),
  testUnlinkedTerminatedEmployeeIsNotCreated(),
  testUnlinkedEmployeeIsCreatedAndLinked(),
])
  .then(() => console.log('altegio marketplace outbound: ok'));