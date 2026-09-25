import assert from 'node:assert/strict';
import { EmployeeStatus, ShiftStatus } from '@prisma/client';
import { AltegioPilotService } from './altegio-pilot.service';

function service(prisma: Record<string, unknown>, altegio: Record<string, unknown>) {
  const instance = new AltegioPilotService(
    prisma as never,
    { get: () => 'test-pilot-encryption-key' } as never,
    altegio as never,
  );
  (instance as unknown as { decrypt: (value: string) => string }).decrypt = () => 'pilot-user-token';
  return instance;
}

function pilotLocation() {
  return {
    id: 'pilot-location-1',
    altegioLocationId: '759658',
    hiteamLocationId: 'location-1',
    connection: { tenantId: 'tenant-1', userTokenCiphertext: 'ciphertext' },
    hiteamLocation: { id: 'location-1', timezone: 'UTC', companyId: 'company-1' },
  };
}

async function testStaffUpdateEventIsIncrementalWithPayloadData() {
  const employeeUpdates: Array<Record<string, unknown>> = [];
  const b2bCalls: string[] = [];
  const prisma = {
    altegioPilotLocation: { findFirst: async () => pilotLocation(), update: async () => ({}) },
    altegioPilotStaffLink: {
      findFirst: async () => ({ employeeId: 'employee-1', employee: { status: EmployeeStatus.ACTIVE } }),
    },
    employee: {
      update: async (args: Record<string, unknown>) => {
        employeeUpdates.push(args);
        return {};
      },
    },
  };
  const altegio = {
    listTeamMembers: async () => {
      b2bCalls.push('listTeamMembers');
      return [];
    },
    getTeamMember: async () => {
      b2bCalls.push('getTeamMember');
      return null;
    },
  };

  const result = await service(prisma, altegio).handleWebhookEvent({
    company_id: 759658,
    resource: 'master',
    resource_id: 777,
    status: 'update',
    data: { id: 777, name: 'Anna Petrova', fired: 0 },
  });
  assert.equal(result.mode, 'incremental');
  assert.deepEqual(result.result, { resourceId: '777', mode: 'incremental', linkedLocal: 1 });
  assert.equal((employeeUpdates[0].data as Record<string, unknown>).firstName, 'Anna');
  assert.equal((employeeUpdates[0].data as Record<string, unknown>).lastName, 'Petrova');
  assert.equal((employeeUpdates[0].data as Record<string, unknown>).status, EmployeeStatus.ACTIVE);
  assert.deepEqual(b2bCalls, [], 'payload data must be used without any remote call');
}

async function testStaffDeleteEventDeactivatesLinkedLocalEmployee() {
  const employeeUpdates: Array<Record<string, unknown>> = [];
  const b2bCalls: string[] = [];
  const prisma = {
    altegioPilotLocation: { findFirst: async () => pilotLocation(), update: async () => ({}) },
    altegioPilotStaffLink: {
      findFirst: async () => ({ employeeId: 'employee-1', employee: { status: EmployeeStatus.ACTIVE } }),
    },
    employee: {
      update: async (args: Record<string, unknown>) => {
        employeeUpdates.push(args);
        return {};
      },
    },
  };
  const altegio = {
    listTeamMembers: async () => {
      b2bCalls.push('listTeamMembers');
      return [];
    },
    getTeamMember: async () => {
      b2bCalls.push('getTeamMember');
      return null;
    },
  };

  const result = await service(prisma, altegio).handleWebhookEvent({
    company_id: 759658,
    resource: 'staff',
    resource_id: 777,
    status: 'delete',
    data: {},
  });
  assert.equal(result.kind, 'staff');
  assert.equal(result.mode, 'incremental');
  assert.deepEqual(result.result, { resourceId: '777', mode: 'incremental', deactivatedLocal: 1 });
  assert.equal((employeeUpdates[0].data as Record<string, unknown>).status, EmployeeStatus.INACTIVE);
  assert.deepEqual(b2bCalls, [], 'deletion events must not trigger any remote call');
}

async function testScheduleEventIsIncrementalPerStaff() {
  const scheduleCalls: Array<Record<string, unknown>> = [];
  const b2bCalls: string[] = [];
  const prisma = {
    altegioPilotLocation: { findFirst: async () => pilotLocation(), update: async () => ({}) },
    altegioPilotStaffLink: {
      findMany: async () => [
        { altegioStaffId: 'remote-1', employee: { id: 'employee-1', positionId: 'position-1' } },
      ],
    },
    shiftTemplate: {
      upsert: async () => ({ id: 'template-1' }),
    },
    shift: {
      findMany: async () => [],
      findFirst: async () => null,
      update: async () => ({}),
      create: async () => ({}),
    },
  };
  const altegio = {
    listTeamMembers: async () => {
      b2bCalls.push('listTeamMembers');
      return [];
    },
    getStaffSchedule: async (args: Record<string, unknown>) => {
      scheduleCalls.push(args);
      return [];
    },
    setStaffSchedule: async () => ({}),
  };

  const result = await service(prisma, altegio).handleWebhookEvent({
    company_id: 759658,
    resource: 'schedule',
    resource_id: 777,
    status: 'update',
    data: [],
  });
  assert.equal(result.mode, 'incremental');
  assert.deepEqual((result.result as Record<string, unknown>).resourceId, '777');
  assert.equal(scheduleCalls.length, 1);
  assert.deepEqual(scheduleCalls[0].staffIds, ['remote-1']);
  assert.deepEqual(b2bCalls, [], 'schedule webhooks must not list team members');
}

void Promise.all([
  testStaffUpdateEventIsIncrementalWithPayloadData(),
  testStaffDeleteEventDeactivatesLinkedLocalEmployee(),
  testScheduleEventIsIncrementalPerStaff(),
])
  .then(() => console.log('altegio pilot webhook incremental: ok'));