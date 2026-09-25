import 'reflect-metadata';
import assert from 'node:assert/strict';
import { AttendanceService } from './attendance.service';

async function run() {
  const employee = { id: 'employee-1', tenantId: 'tenant-1' };
  const session = { id: 'session-2', employeeId: 'employee-2', startedAt: new Date('2026-09-20T09:00:00Z'), endedAt: null, employee: { firstName: 'Other', lastName: 'Person' } };
  let created = false;
  let savedReason: string | undefined;
  const service = Object.assign(Object.create(AttendanceService.prototype), {
    prisma: {
      employee: { findUniqueOrThrow: async () => employee },
      attendanceSession: { findFirstOrThrow: async () => session },
      attendanceCorrectionRequest: {
        findFirst: async () => null,
        create: async ({ data }: any) => {
          created = true;
          savedReason = data.reason;
          return { id: 'request-1', status: 'PENDING', approverEmployee: { userId: null } };
        },
        findMany: async (query: any) => {
          assert.equal(query.where.tenantId, employee.tenantId);
          assert.equal(query.where.employeeId, employee.id);
          return [];
        },
      },
    },
    resolveCorrectionApprover: async () => ({ id: 'approver-1' }),
    auditService: { log: async () => undefined },
  }) as AttendanceService;

  await assert.rejects(
    () => service.createCorrectionRequest('tenant-1', 'user-1', ['employee'], session.id, { reason: 'Wrong time', endedAt: '2026-09-20T18:00:00Z' }),
    /only for their own attendance/,
  );
  assert.equal(created, false);
  session.employeeId = employee.id;
  await assert.rejects(
    () => service.createCorrectionRequest('tenant-1', 'user-1', ['employee'], session.id, { reason: '  ', endedAt: '2026-09-20T18:00:00Z' }),
    /reason is required/,
  );
  await assert.rejects(
    () => service.createCorrectionRequest('tenant-1', 'user-1', ['employee'], session.id, { reason: 'Wrong time' }),
    /at least one attendance value/,
  );
  await assert.rejects(
    () => service.createCorrectionRequest('tenant-1', 'user-1', ['employee'], session.id, { reason: 'Wrong time', endedAt: '2026-09-20T08:00:00Z' }),
    /after check-in/,
  );
  const submitted = await service.createCorrectionRequest(
    'tenant-1', 'user-1', ['employee'], session.id,
    { reason: '  Wrong check-out  ', endedAt: '2026-09-20T18:00:00Z' },
  );
  assert.equal(submitted.status, 'PENDING');
  assert.equal(savedReason, 'Wrong check-out');
  assert.equal(created, true);
  await service.myCorrectionRequests('user-1', { dateFrom: '2026-09-01', dateTo: '2026-09-30' });
  console.log('attendance correction access tests passed');
}

void run();
