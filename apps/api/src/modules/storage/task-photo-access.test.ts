import assert from 'node:assert/strict';
import { TaskPhotoAccessService } from './task-photo-access.service';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

async function main() {
  const actor: any = { sub: 'user', tenantId: 'tenant' };
  let query: any;
  let result: any = { storageKey: 'private/photo.jpg', fileName: 'photo.jpg' };
  const prisma: any = {
    employee: { findFirst: async () => ({ id: 'employee', groupMemberships: [{ groupId: 'group' }] }) },
    userRole: { findMany: async () => [{ scopeId: 'south', scopeType: 'location' }] },
    taskPhotoProof: { findFirst: async (args: any) => { query = args.where; return result; } },
  };
  const scope = { tenantId: 'tenant', OR: [{ primaryLocationId: 'south' }] };
  const access = new TaskPhotoAccessService(prisma, { where: async () => scope } as any);
  await access.findReadableProof(actor, 'proof');
  assert.equal(query.tenantId, 'tenant');
  assert.equal(query.deletedAt, null);
  assert.equal(query.supersededByProofId, null);
  assert.equal(query.OR[0].task.deletedAt, null);
  assert.equal(query.OR[1].taskCompletion.taskTemplate.isActive, true);
  assert.ok(query.OR[0].task.OR.some((entry: any) => entry.assigneeEmployee === scope));
  assert.ok(!query.OR[0].task.OR.some((entry: any) => entry.tenantId));
  result = null;
  await assert.rejects(access.findReadableProof(actor, 'foreign-proof'), /Photo proof was not found/);
  let storageReads = 0;
  const denied = new StorageController(access, { getObject: async () => { storageReads++; } } as any);
  await assert.rejects(denied.getTaskPhotoProofFile(actor, 'proof', {} as any));
  assert.equal(storageReads, 0);
  result = { storageKey: 'private/photo.jpg', fileName: 'photo.jpg' };
  const headers = new Map();
  const controller = new StorageController(access, { getObject: async () => ({ buffer: Buffer.from('photo'), contentLength: 5, contentType: 'image/jpeg' }) } as any);
  await controller.getTaskPhotoProofFile(actor, 'proof', { setHeader: (key: string, value: string) => headers.set(key, value) } as any);
  assert.equal(headers.get('Cache-Control'), 'private, no-store');
  const failure = new StorageController(access, { getObject: async () => { throw new Error('storage unavailable'); } } as any);
  await assert.rejects(failure.getTaskPhotoProofFile(actor, 'proof', {} as any), /storage unavailable/);
  const storage = Object.create(StorageService.prototype);
  storage.publicBaseUrl = 'https://public.invalid';
  assert.equal(storage.getTaskPhotoProofUrl('proof', 'private/key'), null);
  console.log('Protected task photo access tests passed');
}
void main();
