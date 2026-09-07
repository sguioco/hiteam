import assert from 'node:assert/strict';
import { CollaborationService } from './collaboration.service';

async function main() {
  const service = Object.create(CollaborationService.prototype) as any;
  const now = Date.now();
  const base = { title: 'Task', assigneeEmployee: { id: 'e', firstName: 'A', lastName: 'B', userId: 'u' }, lastReminderAt: null, lastEscalatedAt: null };
  const tasks = [
    { ...base, id: 'due', dueAt: new Date(now + 86400000) },
    { ...base, id: 'late', dueAt: new Date(now - 3 * 86400000) },
    { ...base, id: 'future', dueAt: new Date(now + 10 * 86400000) },
    { ...base, id: 'recent', dueAt: new Date(now + 86400000), lastReminderAt: new Date(now) },
  ];
  service.prisma = { task: { findMany: async (query: any) => {
    assert.equal(query.include, undefined);
    assert.equal(query.select.activities, undefined, 'Historical activity must never enter the automation working set');
    assert.equal(query.select.photoProofs, undefined);
    assert.equal(query.where.tenantId, 'tenant');
    assert.equal(query.where.managerEmployeeId, 'manager');
    return tasks;
  } } };
  const calls: any[] = [];
  service.triggerTaskReminder = async (_manager: any, task: any, options: any) => calls.push({ id: task.id, ...options });
  const result = await service.runTaskAutomationForManager({ id: 'manager', tenantId: 'tenant' }, {
    reminderLeadDays: 2, reminderRepeatHours: 24, escalationDelayDays: 2,
    notifyAssignee: true, sendChatMessages: false, escalateToManager: true,
  });
  assert.deepEqual(result.remindedTaskIds, ['due']);
  assert.deepEqual(result.escalatedTaskIds, ['late']);
  assert.equal(calls[0].notifyAssignee, true);
  assert.equal(calls[0].sendChatMessages, false);
  assert.equal(calls[1].escalation, true);
  assert.equal(calls[1].escalateToManager, true);
  console.log('Task automation regression passed');
}
void main();
