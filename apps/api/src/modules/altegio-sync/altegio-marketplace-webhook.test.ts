import assert from 'node:assert/strict';
import { EmployeeStatus } from '@prisma/client';
import { AltegioStaffScheduleSyncService } from './altegio-staff-schedule-sync.service';

function service(prisma: Record<string, unknown>, b2b: Record<string, unknown>) {
  return new AltegioStaffScheduleSyncService(prisma as never, b2b as never);
}

function basePrisma(overrides: Record<string, unknown> = {}) {
  return {
    billingSubscription: {
      findFirst: async () => ({ tenantId: 'tenant-1' }),
      findUnique: async () => ({ altegioLocationId: '759658' }),
      update: async () => ({}),
    },
    company: { findFirst: async () => ({ id: 'company-1' }) },
    department: { findFirst: async () => ({ id: 'department-1' }) },
    location: { findFirst: async () => ({ id: 'location-1' }) },
    position: { findFirst: async () => ({ id: 'position-1' }) },
    ...overrides,
  };
}

function linkedEmployee(status: EmployeeStatus) {
  return {
    id: 'employee-1',
    employeeNumber: 'E-1',
    firstName: 'Anna',
    lastName: 'Petrova',
    phone: '+971501234567',
    status,
    altegioTeamMemberId: '100',
    user: { email: 'anna@example.com' },
  };
}

async function testStaffUpdateEventIsIncrementalAndLinksExistingEmployee() {
  const employeeUpdates: Array<Record<string, unknown>> = [];
  const b2bCalls: string[] = [];
  const prisma = basePrisma({
    employee: {
      findMany: async () => [linkedEmployee(EmployeeStatus.ACTIVE)],
      update: async (args: Record<string, unknown>) => {
        employeeUpdates.push(args);
        return {};
      },
    },
  });
  const b2b = {
    isConfigured: () => true,
    listTeamMembers: async () => {
      b2bCalls.push('listTeamMembers');
      return [];
    },
    getTeamMember: async () => {
      b2bCalls.push('getTeamMember');
      return null;
    },
  };

  const result = await service(prisma, b2b).handleWebhookEvent({
    company_id: 759658,
    resource: 'staff',
    resource_id: 100,
    status: 'update',
    data: { id: 100, name: 'Anna Petrova', fired: 0 },
  });
  assert.deepEqual(result, {
    ok: true,
    kind: 'staff',
    result: { resourceId: '100', mode: 'incremental', linkedLocal: 1 },
    resourceId: '100',
    mode: 'incremental',
  });
  assert.equal(employeeUpdates.length, 1);
  assert.equal((employeeUpdates[0].data as Record<string, unknown>).altegioTeamMemberId, '100');
  assert.equal((employeeUpdates[0].data as Record<string, unknown>).status, EmployeeStatus.ACTIVE);
  assert.deepEqual(b2bCalls, [], 'payload data must be used without a remote fetch or full listing');
}

async function testStaffDeleteEventDeactivatesLinkedLocalEmployee() {
  const employeeUpdates: Array<Record<string, unknown>> = [];
  const b2bCalls: string[] = [];
  const prisma = basePrisma({
    employee: {
      findMany: async () => [linkedEmployee(EmployeeStatus.ACTIVE)],
      update: async (args: Record<string, unknown>) => {
        employeeUpdates.push(args);
        return {};
      },
    },
  });
  const b2b = {
    isConfigured: () => true,
    listTeamMembers: async () => {
      b2bCalls.push('listTeamMembers');
      return [];
    },
    getTeamMember: async () => {
      b2bCalls.push('getTeamMember');
      return null;
    },
  };

  const result = await service(prisma, b2b).handleWebhookEvent({
    company_id: 759658,
    resource: 'master',
    resource_id: 100,
    status: 'delete',
    data: {},
  });
  assert.equal(result.kind, 'staff');
  assert.equal(result.mode, 'incremental');
  assert.deepEqual(result.result, { resourceId: '100', mode: 'incremental', deactivatedLocal: 1 });
  assert.equal((employeeUpdates[0].data as Record<string, unknown>).status, EmployeeStatus.INACTIVE);
  assert.deepEqual(b2bCalls, [], 'deletion events must not trigger any remote call');
}

async function testStaffEventWithNoLinkFallsBackToRemoteFetch() {
  const b2bCalls: string[] = [];
  const prisma = basePrisma({
    employee: { findMany: async () => [] },
  });
  const b2b = {
    isConfigured: () => true,
    listTeamMembers: async () => {
      b2bCalls.push('listTeamMembers');
      return [];
    },
    getTeamMember: async () => {
      b2bCalls.push('getTeamMember');
      return null;
    },
  };

  const result = await service(prisma, b2b).handleWebhookEvent({
    company_id: 759658,
    resource: 'staff',
    resource_id: 404,
    status: 'update',
  });
  assert.deepEqual(b2bCalls, ['getTeamMember']);
  assert.deepEqual(result.result, { resourceId: '404', mode: 'incremental', ignored: 'no_live_local_link' });
}

async function testScheduleEventIsIncrementalPerStaff() {
  const getStaffScheduleCalls: Array<Record<string, unknown>> = [];
  const b2bCalls: string[] = [];
  const prisma = basePrisma({
    employee: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        assert.deepEqual(where.altegioTeamMemberId, { in: ['100'] });
        return [{
          id: 'employee-1',
          positionId: 'position-1',
          primaryLocationId: 'location-1',
          altegioTeamMemberId: '100',
          primaryLocation: { timezone: 'UTC' },
          status: EmployeeStatus.ACTIVE,
        }];
      },
      findFirst: async () => null,
    },
    shiftTemplate: { findFirst: async () => ({ id: 'template-1' }) },
    shift: {
      findMany: async () => [],
      findFirst: async () => null,
      update: async () => ({}),
      create: async () => ({}),
    },
  });
  const b2b = {
    isConfigured: () => true,
    listTeamMembers: async () => {
      b2bCalls.push('listTeamMembers');
      return [];
    },
    getStaffSchedule: async (args: Record<string, unknown>) => {
      getStaffScheduleCalls.push(args);
      return [];
    },
    setStaffSchedule: async () => ({}),
  };

  const result = await service(prisma, b2b).handleWebhookEvent({
    company_id: 759658,
    resource: 'schedule',
    resource_id: 100,
    status: 'update',
    data: [],
  });
  assert.equal(result.mode, 'incremental');
  assert.equal((result.result as Record<string, unknown>).upserted, 0);
  assert.equal(getStaffScheduleCalls.length, 1);
  assert.deepEqual(getStaffScheduleCalls[0].staffIds, ['100']);
  assert.deepEqual(b2bCalls, [], 'schedule webhooks must not list team members');
}

async function testEventWithoutResourceIdStillFallsBackToFullSync() {
  const b2bCalls: string[] = [];
  const prisma = basePrisma({
    employee: { findMany: async () => [] },
  });
  const b2b = {
    isConfigured: () => true,
    listTeamMembers: async () => {
      b2bCalls.push('listTeamMembers');
      return [];
    },
    createTeamMember: async () => ({ id: 'remote-9' }),
  };

  const result = await service(prisma, b2b).handleWebhookEvent({
    company_id: 759658,
    resource: 'staff',
    data: {},
  });
  assert.equal(result.mode, 'full');
  assert.deepEqual(b2bCalls, ['listTeamMembers']);
}

void Promise.all([
  testStaffUpdateEventIsIncrementalAndLinksExistingEmployee(),
  testStaffDeleteEventDeactivatesLinkedLocalEmployee(),
  testStaffEventWithNoLinkFallsBackToRemoteFetch(),
  testScheduleEventIsIncrementalPerStaff(),
  testEventWithoutResourceIdStillFallsBackToFullSync(),
])
  .then(() => console.log('altegio marketplace webhook incremental: ok'));