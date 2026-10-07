import assert from 'node:assert/strict';
import { localTimeToInstant, locationDate } from '../../common/time/location-time';
import { ScheduleService } from './schedule.service';

assert.equal(localTimeToInstant('2026-10-08', '09:00', 'Asia/Dubai')?.toISOString(), '2026-10-08T05:00:00.000Z');
assert.equal(localTimeToInstant('2026-10-08', '18:00', 'Asia/Dubai')?.toISOString(), '2026-10-08T14:00:00.000Z');
assert.equal(localTimeToInstant('2026-03-29', '02:30', 'Europe/Berlin'), null);
assert.equal(localTimeToInstant('2026-10-25', '02:30', 'Europe/Berlin')?.toISOString(), '2026-10-25T00:30:00.000Z');
assert.equal(localTimeToInstant('2026-02-30', '09:00', 'UTC'), null);
assert.equal(localTimeToInstant('2026-10-08', '09:00', 'Invalid/Zone'), null);
assert.equal(locationDate(new Date('2026-10-08T22:00:00Z'), 'Asia/Dubai'), '2026-10-09');
assert.equal(locationDate(new Date('2026-10-08T02:00:00Z'), 'America/New_York'), '2026-10-07');

async function testCreateAndUpdateUseLocationTimezone() {
  const template = {
    id: 'template', name: 'Day', locationId: 'location', positionId: 'position',
    startsAtLocal: '09:00', endsAtLocal: '18:00',
    fixedBreakStartsAtLocal: '12:00', fixedBreakDurationMinutes: 30, fixedBreakIsPaid: false,
    location: { id: 'location', companyId: 'company', name: 'Dubai', timezone: 'Asia/Dubai' },
  };
  let saved: Record<string, any> = {};
  let employeeId = 'employee';
  const prisma = {
    shiftTemplate: { findFirst: async (args: any) => {
      assert.equal(args.select.location.select.timezone, true);
      return template;
    } },
    employee: { findFirst: async () => ({ id: employeeId, firstName: 'Test', lastName: 'User', primaryLocationId: 'location' }) },
    shift: {
      create: async ({ data }: any) => (saved = { ...data, id: 'shift', status: 'PUBLISHED', location: template.location }),
      findFirst: async () => saved,
      update: async ({ data }: any) => (saved = { ...saved, ...data }),
    },
  };
  const service = new ScheduleService(prisma as never, { log: async () => {} } as never, {} as never);
  const pushes: string[] = [];
  Object.assign(service, {
    pushShiftDayToAltegioInBackground: (_tenant: string, employee: string, date: Date) => pushes.push(`${employee}:${date.toISOString().slice(0, 10)}`),
    assertLocationReadable: async () => {},
    resolveActorEmployeeId: async () => null,
    emitScheduleWorkspaceRefreshForEmployees: async () => {},
  });
  await service.createShift('tenant', 'owner', { templateId: 'template', employeeId: 'employee', shiftDate: '2099-10-08' });
  assert.equal(saved.shiftDate.toISOString(), '2099-10-08T00:00:00.000Z');
  assert.equal(saved.startsAt.toISOString(), '2099-10-08T05:00:00.000Z');
  assert.equal(saved.endsAt.toISOString(), '2099-10-08T14:00:00.000Z');
  assert.equal(saved.fixedBreakStartsAt.toISOString(), '2099-10-08T08:00:00.000Z');
  await service.updateShift('tenant', 'owner', 'shift', { shiftDate: '2099-10-09', fixedBreakStartsAtLocal: '12:00', fixedBreakDurationMinutes: 30 });
  assert.equal(saved.startsAt.toISOString(), '2099-10-09T05:00:00.000Z');
  assert.equal(saved.endsAt.toISOString(), '2099-10-09T14:00:00.000Z');
  assert.equal(saved.fixedBreakStartsAt.toISOString(), '2099-10-09T08:00:00.000Z');
  assert.deepEqual(pushes.slice(-2), ['employee:2099-10-08', 'employee:2099-10-09']);
  employeeId = 'employee-2';
  await service.updateShift('tenant', 'owner', 'shift', { employeeId });
  assert.deepEqual(pushes.slice(-2), ['employee:2099-10-09', 'employee-2:2099-10-09']);
  employeeId = 'employee';
  template.startsAtLocal = '22:00'; template.endsAtLocal = '06:00';
  await service.createShift('tenant', 'owner', { templateId: 'template', employeeId: 'employee', shiftDate: '2099-10-10' });
  assert.equal(saved.startsAt.toISOString(), '2099-10-10T18:00:00.000Z');
  assert.equal(saved.endsAt.toISOString(), '2099-10-11T02:00:00.000Z');
  template.location.timezone = 'Invalid/Zone';
  await assert.rejects(service.createShift('tenant', 'owner', { templateId: 'template', employeeId: 'employee', shiftDate: '2099-10-11' }), /Invalid location timezone/);
}

async function testBackgroundWritesAreSerialized() {
  const calls: number[] = [];
  let release!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  const s = new ScheduleService({} as never, {} as never, {} as never, {
    pushShiftDayToAltegio: async (_tenant: string, _employee: string, day: Date) => {
      calls.push(day.getUTCDate());
      if (day.getUTCDate() === 8) await gate;
    },
  } as never) as any;
  s.pushShiftDayToAltegioInBackground('tenant', 'employee', new Date('2099-10-08'));
  s.pushShiftDayToAltegioInBackground('tenant', 'employee', new Date('2099-10-09'));
  await Promise.resolve();
  assert.deepEqual(calls, [8]);
  const completion = s.altegioScheduleWrites.get('tenant');
  release();
  await completion;
  assert.deepEqual(calls, [8, 9]);
  await Promise.resolve();
  assert.equal(s.altegioScheduleWrites.size, 0);
}

void Promise.all([testCreateAndUpdateUseLocationTimezone(), testBackgroundWritesAreSerialized()]).then(() => console.log('schedule location timezone: ok'));
