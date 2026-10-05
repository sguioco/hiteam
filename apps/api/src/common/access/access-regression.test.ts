import 'reflect-metadata';
import assert from 'node:assert/strict';
import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { WorkspaceAccessGuard } from '../guards/workspace-access.guard';
import { EmployeeScopeService } from './employee-scope.service';
import { CollaborationService } from '../../modules/collaboration/collaboration.service';
import { CollaborationGateway } from '../../modules/collaboration/collaboration.gateway';
import { ALLOW_PENDING_ACCESS_KEY } from '../decorators/allow-pending-access.decorator';
import { ALLOW_UNPAID_ACCESS_KEY } from '../decorators/allow-unpaid-access.decorator';

async function run() {
  let allowPending = false;
  let allowUnpaid = false;
  let paid = true;
  const user = { sub: 'user', tenantId: 'tenant', roleCodes: ['employee'], workspaceAccessAllowed: true };
  const request: any = { user };
  const context: any = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => run, getClass: () => WorkspaceAccessGuard,
  };
  const guard = new WorkspaceAccessGuard({ getAllAndOverride: (key: string) => {
    if (key === ALLOW_UNPAID_ACCESS_KEY) return allowUnpaid;
    assert.equal(key, ALLOW_PENDING_ACCESS_KEY); return allowPending;
  } } as any, {
    isServiceActive: async () => paid,
    buildPaymentRequiredException: () => new HttpException('Payment required', 402),
  } as any);
  assert.equal(await guard.canActivate(context), true);
  user.workspaceAccessAllowed = false;
  await assert.rejects(() => guard.canActivate(context), ForbiddenException);
  allowPending = true;
  assert.equal(await guard.canActivate(context), true);
  allowPending = false; user.workspaceAccessAllowed = true; paid = false;
  await assert.rejects(() => guard.canActivate(context), (e: any) => e.getStatus() === 402);
  allowUnpaid = true;
  assert.equal(await guard.canActivate(context), true);
  allowUnpaid = false;
  user.roleCodes = ['tenant_owner'];
  assert.equal(await guard.canActivate(context), true);
  request.user = undefined;
  await assert.rejects(() => guard.canActivate(context), UnauthorizedException);

  let assignments: any[] = [{ scopeType: 'location', scopeId: 'south', role: { code: 'manager' } }];
  let accessibleCount = 0;
  const scope = new EmployeeScopeService({
    userRole: { findMany: async (args: any) => { assert.equal(args.where.user.tenantId, 'tenant'); return assignments; } },
    employee: { count: async () => accessibleCount },
  } as any);
  const where: any = await scope.where('tenant', 'manager');
  assert.equal(where.tenantId, 'tenant');
  assert.deepEqual(where.OR[1].primaryLocationId.in, ['south']);
  assert.equal(where.OR[2].locationAssignments.some.unassignedAt, null);
  await assert.rejects(() => scope.assertEmployees('tenant', 'manager', ['other']), ForbiddenException);
  accessibleCount = 1;
  await scope.assertEmployees('tenant', 'manager', ['south-employee', 'south-employee']);
  assignments = [{ scopeType: 'tenant', scopeId: 'tenant', role: { code: 'tenant_owner' } }];
  assert.deepEqual(await scope.where('tenant', 'owner'), { tenantId: 'tenant' });
  assignments = [{ scopeType: 'tenant', scopeId: 'other-tenant', role: { code: 'manager' } }];
  assert.ok((await scope.where('tenant', 'manager')).OR);

  let existingRead = false;
  const chat = Object.assign(Object.create(CollaborationService.prototype), {
    prisma: {
      employee: { findUniqueOrThrow: async () => ({ id: 'outsider', tenantId: 'tenant' }) },
      workGroup: { findFirst: async () => ({ id: 'private', memberships: [{ employeeId: 'owner' }] }) },
      chatThread: { findFirst: async () => { existingRead = true; return { id: 'secret' }; } },
    },
  }) as CollaborationService;
  await assert.rejects(() => chat.createChat('user', { groupId: 'private' }), ForbiddenException);
  assert.equal(existingRead, false, 'Membership must be checked before returning existing messages.');
  assert.deepEqual((chat as any).chatInclude().participants.include.employee.include.user,
    { select: { id: true, email: true } }, 'Chat DTO must never expose password hashes or account tokens');

  const deliveries: string[] = [];
  const disconnects: string[] = [];
  const gateway = Object.assign(Object.create(CollaborationGateway.prototype), {
    workspaceAccess: guard,
    prisma: {
      user: { findUnique: async ({ where }: any) => ({
        id: where.id, tenantId: 'tenant', email: 'qa@example.invalid', status: 'ACTIVE',
        workspaceAccessAllowed: where.id !== 'pending', roles: [{ role: { code: 'employee' } }],
      }) },
      chatParticipant: { findMany: async () => [
        { employeeId: 'member', employee: { userId: 'member' }, thread: { kind: 'GROUP', group: { memberships: [{ employeeId: 'member' }] } } },
        { employeeId: 'removed', employee: { userId: 'removed' }, thread: { kind: 'GROUP', group: { memberships: [] } } },
        { employeeId: 'pending', employee: { userId: 'pending' }, thread: { kind: 'DIRECT' } },
      ] },
    },
    server: { to: (room: string) => ({ emit: () => deliveries.push(room) }), in: (room: string) => ({ disconnectSockets: () => disconnects.push(room) }) },
  }) as CollaborationGateway;
  paid = true;
  await gateway.emitThreadMessage('thread', { body: 'private' });
  assert.deepEqual(deliveries, ['user:member']);
  assert.deepEqual(disconnects, ['user:pending']);
  console.log('access regression tests passed');
}
void run();
