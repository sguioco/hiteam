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

async function testNewEmployeeIsCreatedAndLinked() {
  const links: Array<Record<string, unknown>> = [];
  const calls: Array<Record<string, unknown>> = [];
  const prisma = {
    employee: {
      findFirst: async () => ({
        id: 'employee-1', firstName: 'Anna', lastName: 'Petrova', phone: '+971501234567',
        primaryLocationId: 'location-1', status: EmployeeStatus.ACTIVE,
        user: { email: 'anna@example.com' },
      }),
    },
    altegioPilotLocation: {
      findMany: async () => [{
        id: 'pilot-location-1', altegioLocationId: '759658',
        connection: { userTokenCiphertext: 'ciphertext' },
      }],
    },
    altegioPilotStaffLink: {
      findFirst: async () => null,
      upsert: async (args: Record<string, unknown>) => links.push(args),
    },
  };
  const altegio = {
    createTeamMember: async (args: Record<string, unknown>) => {
      calls.push(args);
      return { id: 'remote-1' };
    },
  };

  const result = await service(prisma, altegio).pushEmployeeToAltegio('tenant-1', 'employee-1');
  assert.deepEqual(result, { skipped: false, created: 1 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].userToken, 'pilot-user-token');
  assert.equal(links.length, 1);
}

async function testShiftDaySetsSlotsAndDeletesEmptyDay() {
  const requests: Array<Record<string, unknown>> = [];
  let shifts: Array<Record<string, unknown>> = [{
    shiftDate: new Date('2026-08-03T00:00:00.000Z'),
    startsAt: new Date('2026-08-03T09:00:00.000Z'),
    endsAt: new Date('2026-08-03T18:00:00.000Z'),
  }];
  const prisma = {
    altegioPilotStaffLink: {
      findMany: async () => [{
        altegioStaffId: 'remote-1',
        pilotLocation: {
          altegioLocationId: '759658', hiteamLocationId: 'location-1',
          connection: { userTokenCiphertext: 'ciphertext' },
          hiteamLocation: { timezone: 'UTC' },
        },
      }],
    },
    shift: { findMany: async () => shifts },
  };
  const altegio = { setStaffSchedule: async (args: Record<string, unknown>) => requests.push(args) };
  const sync = service(prisma, altegio);

  assert.deepEqual(
    await sync.pushShiftDayToAltegio('tenant-1', 'employee-1', new Date('2026-08-03T00:00:00.000Z')),
    { skipped: false, pushed: 1 },
  );
  assert.equal((requests[0].schedulesToSet as unknown[]).length, 1);
  assert.deepEqual(requests[0].schedulesToDelete, []);

  shifts = [];
  await sync.pushShiftDayToAltegio('tenant-1', 'employee-1', new Date('2026-08-03T00:00:00.000Z'));
  assert.deepEqual(requests[1].schedulesToSet, []);
  assert.deepEqual(requests[1].schedulesToDelete, [{ teamMemberId: 'remote-1', dates: ['2026-08-03'] }]);
}

void Promise.all([testNewEmployeeIsCreatedAndLinked(), testShiftDaySetsSlotsAndDeletesEmptyDay()])
  .then(() => console.log('altegio pilot outbound: ok'));
