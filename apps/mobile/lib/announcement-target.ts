import type { AnnouncementAudience } from '@smart/types';

export type AnnouncementTargetInput = {
  audience?: AnnouncementAudience;
  locationId?: string;
  groupId?: string;
  groupIds?: string[];
  targetEmployeeId?: string;
  targetEmployeeIds?: string[];
};

// Workspace context is not an additional audience. Only LOCATION may carry it.
export function buildAnnouncementTarget(input: AnnouncementTargetInput, workspaceLocationId?: string) {
  const audience = input.audience ?? (input.locationId || workspaceLocationId ? 'LOCATION' : 'ALL');
  const locationId = audience === 'LOCATION' ? input.locationId ?? workspaceLocationId : undefined;
  const groupIds = Array.from(new Set([input.groupId, ...(input.groupIds ?? [])].filter((id): id is string => Boolean(id))));
  const employeeIds = Array.from(new Set([input.targetEmployeeId, ...(input.targetEmployeeIds ?? [])].filter((id): id is string => Boolean(id))));
  return {
    audience,
    ...(locationId ? { locationId } : {}),
    ...((audience === 'GROUP' || audience === 'EMPLOYEE') ? {
      ...(groupIds.length === 1 ? { groupId: groupIds[0] } : groupIds.length ? { groupIds } : {}),
      ...(employeeIds.length === 1 ? { targetEmployeeId: employeeIds[0] } : employeeIds.length ? { targetEmployeeIds: employeeIds } : {}),
    } : {}),
  };
}
