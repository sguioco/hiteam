import type { TaskItem, WorkGroupItem } from "@smart/types";

// UI availability mirrors the existing service rules; the API remains authoritative.
export function taskActionAvailability(task: TaskItem, employeeId: string | null, groups: WorkGroupItem[]) {
  const recurring = /^recurring:([^:]+):([^:]+):(\d{4}-\d{2}-\d{2})$/.test(task.id);
  const allowed = Boolean(employeeId && (recurring
    ? task.assigneeEmployeeId === employeeId
    : task.managerEmployee.id === employeeId || task.assigneeEmployeeId === employeeId ||
      groups.some(group => group.id === task.groupId && group.memberships.some(member => member.employeeId === employeeId))));
  return {
    allowed,
    comment: allowed && !recurring,
    reschedule: allowed && task.status !== "DONE" && task.status !== "CANCELLED",
    complete: allowed && (!task.requiresPhoto || task.photoProofs.some(proof => !proof.deletedAt && !proof.supersededByProofId)),
  };
}
