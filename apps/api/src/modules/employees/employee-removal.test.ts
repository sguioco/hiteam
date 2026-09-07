import assert from 'node:assert/strict';
import { AltegioStaffScheduleSyncService } from '../altegio-sync/altegio-staff-schedule-sync.service';
import { EmployeesService } from './employees.service';

async function main() {
  const service = Object.create(EmployeesService.prototype) as any;
  const writes: Array<{ model: string; args: any }> = [];
  let actorAllowed = true;
  let target: any = { id: 'employee-a', userId: 'user-a', user: { roles: [] } };
  const tx: any = {
    user: { findFirst: async ({ where }: any) => {
      assert.equal(where.tenantId, 'company-a');
      assert.equal(where.roles.some.role.code, 'tenant_owner');
      return actorAllowed ? { id: 'owner' } : null;
    } },
    employee: { findFirst: async ({ where }: any) => {
      assert.deepEqual(where, { id: 'employee-a', tenantId: 'company-a' });
      return target;
    } },
  };
  for (const [model, method] of [['employee','update'],['user','update'],['session','deleteMany'],['passwordResetToken','deleteMany'],['pushDevice','deleteMany'],['employeeInvitation','updateMany'],['workGroupMembership','deleteMany']]) {
    tx[model] ??= {};
    tx[model][method] = async (args: any) => { writes.push({ model, args }); return {}; };
  }
  service.prisma = { $transaction: async (fn: any) => fn(tx) };
  service.auditService = { log: async () => {} };
  service.syncBillingSeatsInBackground = () => {};
  service.kommoService = { recordEmployeeUpdated: () => {} };
  service.emitWorkspaceRefreshForUser = () => {};
  const remove = () => service.removeEmployee('company-a','owner','employee-a');
  actorAllowed = false;
  await assert.rejects(remove(), /Only the owner/);
  actorAllowed = true; target = null;
  await assert.rejects(remove(), /Employee not found/);
  target = { id: 'employee-a', userId: 'owner', user: { roles: [] } };
  await assert.rejects(remove(), /owner cannot be removed/);
  target.userId = 'user-a'; target.user.roles = [{ role: { code: 'tenant_owner' } }];
  await assert.rejects(remove(), /owner cannot be removed/);
  assert.equal(writes.length, 0);
  target.user.roles = [];
  assert.equal((await remove()).deleted, true);
  assert.equal(writes.find(w => w.model === 'employee')?.args.data.status, 'TERMINATED');
  assert.equal(writes.find(w => w.model === 'user')?.args.data.status, 'SUSPENDED');
  for (const model of ['session','passwordResetToken','pushDevice']) {
    assert.deepEqual(writes.find(w => w.model === model)?.args.where, { userId: 'user-a' });
  }
  assert.equal(writes.find(w => w.model === 'employeeInvitation')?.args.where.tenantId, 'company-a');
  assert.equal(writes.find(w => w.model === 'employeeInvitation')?.args.data.status, 'EXPIRED');
  const sync = Object.create(AltegioStaffScheduleSyncService.prototype) as any;
  sync.requireConnectedContext = async () => ({ locationId: 'location' });
  sync.altegioB2b = { isConfigured: () => true, listTeamMembers: async () => [{ id: 'remote', name: 'Former Employee', fired: false }] };
  sync.prisma = {
    employee: { findMany: async () => [{ id: 'employee-a', status: 'TERMINATED', altegioTeamMemberId: 'remote', phone: null, user: { email: 'former@example.com' } }],
      update: async () => { throw new Error('A removed employee must not be reactivated by sync'); } },
    billingSubscription: { update: async () => ({}) },
  };
  const synced = await sync.syncEmployees('company-a');
  assert.equal(synced.updatedLocal, 0);
  assert.equal(synced.createdLocal, 0);
  console.log('Employee removal permissions, isolation and sync tests passed');
}
void main();
