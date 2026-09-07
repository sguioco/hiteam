import assert from 'node:assert/strict';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

async function main() {
  const hash = await bcrypt.hash('password-one', 4);
  const otherHash = await bcrypt.hash('password-two', 4);
  const users = [
    { id: '1', email: 'same@example.com', status: 'ACTIVE', passwordHash: hash, tenant: { slug: 'one', name: 'One' }, roles: [] },
    { id: '2', email: 'same@example.com', status: 'ACTIVE', passwordHash: otherHash, tenant: { slug: 'two', name: 'Two' }, roles: [] },
    { id: '3', email: 'same@example.com', status: 'ACTIVE', passwordHash: hash, tenant: { slug: 'three', name: 'Three' }, roles: [] },
  ];
  const service = new AuthService({ user: { findMany: async ({ where }: any) => users.filter(u => !where.tenant || u.tenant.slug === where.tenant.slug) } } as never, {} as never, {} as never, {} as never, {} as never, {} as never);
  assert.deepEqual(await service.loginWorkspaces({ identifier: 'same@example.com', password: 'password-one' }), [{ slug: 'one', name: 'One' }, { slug: 'three', name: 'Three' }]);
  assert.deepEqual(await service.loginWorkspaces({ identifier: 'same@example.com', password: 'password-two' }), [{ slug: 'two', name: 'Two' }]);
  await assert.rejects(service.loginWorkspaces({ identifier: 'same@example.com', password: 'incorrect' }));
  await assert.rejects(service.loginWorkspaces({ identifier: 'same@example.com', password: 'password-one', tenantSlug: 'two' }));
  users[2].status = 'INACTIVE';
  assert.equal((await service.loginWorkspaces({ identifier: 'same@example.com', password: 'password-one' })).length, 1);
  console.log('Auth workspace tests passed');
}
void main();
