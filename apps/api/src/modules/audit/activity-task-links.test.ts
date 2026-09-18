import assert from 'node:assert/strict';
import { AuditService } from './audit.service';

const service = new AuditService({} as never);
const refs = { actorMap: new Map(), employeeMap: new Map(), groupMap: new Map(), shiftMap: new Map(), announcementMap: new Map() };
const log = { id: 'event', actorUserId: null, entityId: 'employee-not-task', action: 'task.created', createdAt: new Date() };
const map = (metadata: Record<string, unknown>) => (service as any).mapCompanyActivityLog(log, metadata, refs);
assert.deepEqual(map({ taskIds: ['task-a', 'task-b'], taskCount: 2 }).taskIds, ['task-a', 'task-b']);
assert.deepEqual(map({ taskCount: 1 }).taskIds, [], 'Legacy events must not link to an employee or batch id');
assert.deepEqual(map({ taskIds: [null, '', 17, 'task-a'] }).taskIds, ['task-a']);
console.log('activity task links tests passed');
