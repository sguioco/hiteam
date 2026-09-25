import assert from 'node:assert/strict';
import { CollaborationService } from './collaboration.service';
import { replaceTaskDescriptionBody } from './task-description';

async function main() {
  const service = Object.create(CollaborationService.prototype) as any;
  const task = { id: 'task-1', tenantId: 'tenant-1', managerEmployeeId: 'creator', title: 'Before', description: 'Before body', priority: 'LOW', status: 'TODO', deletedAt: null as Date | null };
  const calls: Array<{ operation: string; data?: any }> = [];
  service.taskInclude = () => ({});
  service.prisma = {
    employee: { findUniqueOrThrow: async () => ({ id: service.actorId, tenantId: 'tenant-1' }) },
    task: { findFirst: async ({ where }: any) => task.deletedAt && where.deletedAt === null ? null : task },
    $transaction: async (fn: (tx: any) => Promise<any>) => fn({
      task: {
        update: async ({ data }: any) => { calls.push({ operation: 'update', data }); Object.assign(task, data); },
        findUniqueOrThrow: async () => task,
      },
      taskActivity: { create: async ({ data }: any) => { calls.push({ operation: 'activity', data }); } },
    }),
  };
  service.auditService = { log: async () => undefined };
  service.kommoService = { recordTaskUpdated: () => undefined };
  service.emitWorkspaceRefreshForTasks = async () => undefined;
  service.serializeTaskWithPhotoProofUrls = (value: any) => value;

  service.actorId = 'worker';
  await assert.rejects(service.updateTaskDetails('user', 'task-1', { title: 'After' }), /Only the task creator/);
  assert.equal(calls.length, 0, 'Unauthorized users must not write or add activity');

  service.actorId = 'creator';
  await assert.rejects(service.updateTaskDetails('user', 'task-1', { title: '   ' }), /cannot be empty/);
  assert.equal(calls.length, 0);
  const result = await service.updateTaskDetails('user', 'task-1', { title: ' After ', description: 'After body', priority: 'HIGH' });
  assert.equal(result.title, 'After');
  assert.equal(result.description, 'After body');
  assert.equal(result.priority, 'HIGH');
  assert.equal(calls[0].operation, 'update');
  assert.equal(calls[1].operation, 'activity');
  assert.equal(replaceTaskDescriptionBody('Original\n\n[smart-task-meta]{"kind":"meeting"}', 'Edited'), 'Edited\n\n[smart-task-meta]{"kind":"meeting"}');
  assert.throws(() => replaceTaskDescriptionBody(null, '[smart-task-meta]bad'));
  service.actorId = 'worker';
  await assert.rejects(service.deleteTask('user', 'task-1'), /Only the task creator/);
  service.actorId = 'creator';
  task.status = 'DONE';
  await assert.rejects(service.deleteTask('user', 'task-1'), /Completed or cancelled tasks cannot be deleted/);
  assert.equal(calls.length, 2, 'Completed task deletion must not write');
  task.status = 'TODO';
  const deleted = await service.deleteTask('user', 'task-1');
  assert.equal(deleted.deletedTaskId, 'task-1');
  assert.ok(task.deletedAt instanceof Date);
  assert.equal(calls.at(-1)?.operation, 'activity');
  await assert.rejects(service.updateTaskDetails('user', 'task-1', { title: 'Again' }), /Task not found/);
  console.log('Task details update regression passed');
}

void main();
