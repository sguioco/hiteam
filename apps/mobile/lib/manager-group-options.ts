import type { ManagerEmployeeItem, WorkGroupItem } from '@smart/types';
import { resolveEmployeeAvatarSource } from './employee-avatar';

export type EmployeeOption = ManagerEmployeeItem;

export type GroupMemberOption = {
  departmentName?: string;
  firstName: string;
  gender?: string | null;
  id: string;
  lastName: string;
  avatar?: any;
};

export type GroupOption = {
  apiGroupIds: string[];
  id: string;
  members: GroupMemberOption[];
  memberIds: string[];
  name: string;
  source: 'api' | 'department';
};

function normalizeGroupKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function upsertGroupMember(group: GroupOption, member: GroupMemberOption) {
  const existingMemberIndex = group.memberIds.indexOf(member.id);

  if (existingMemberIndex >= 0) {
    const existingMember = group.members[existingMemberIndex];

    if (!existingMember.avatar && member.avatar) {
      group.members[existingMemberIndex] = {
        ...existingMember,
        avatar: member.avatar,
      };
    }

    return;
  }

  group.memberIds.push(member.id);
  group.members.push(member);
}

export function buildDepartmentFallbackGroups(employees: EmployeeOption[]) {
  const groupsByName = new Map<string, GroupOption>();

  for (const employee of employees) {
    const departmentName = employee.department?.name?.trim() || 'Team';
    const groupKey = normalizeGroupKey(departmentName);
    const existing = groupsByName.get(groupKey);

    if (existing) {
      upsertGroupMember(existing, {
        departmentName: employee.department?.name ?? undefined,
        firstName: employee.firstName,
        gender: employee.gender ?? null,
        id: employee.id,
        lastName: employee.lastName,
        avatar: resolveEmployeeAvatarSource({
          avatar: employee.avatar,
          email: employee.email,
          employeeNumber: employee.employeeNumber,
          firstName: employee.firstName,
          gender: employee.gender,
          id: employee.id,
          lastName: employee.lastName,
        }),
      });
      continue;
    }

    groupsByName.set(groupKey, {
      apiGroupIds: [],
      id: `department:${groupKey}`,
      members: [
        {
          departmentName: employee.department?.name ?? undefined,
          firstName: employee.firstName,
          gender: employee.gender ?? null,
          id: employee.id,
          lastName: employee.lastName,
          avatar: resolveEmployeeAvatarSource({
            avatar: employee.avatar,
            email: employee.email,
            employeeNumber: employee.employeeNumber,
            firstName: employee.firstName,
            gender: employee.gender,
            id: employee.id,
            lastName: employee.lastName,
          }),
        },
      ],
      memberIds: [employee.id],
      name: departmentName,
      source: 'department',
    });
  }

  return Array.from(groupsByName.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export function mapApiGroups(groups: WorkGroupItem[]) {
  const groupsByName = new Map<string, GroupOption>();

  groups.forEach((group) => {
    const groupName = group.name.trim();
    if (!groupName || group.memberships.length === 0) {
      return;
    }

    const groupKey = normalizeGroupKey(groupName);
    const existing = groupsByName.get(groupKey);

    if (existing) {
      if (!existing.apiGroupIds.includes(group.id)) {
        existing.apiGroupIds.push(group.id);
      }
      group.memberships.forEach((membership) =>
        upsertGroupMember(existing, {
          departmentName: groupName,
          firstName: membership.employee.firstName,
          gender: (membership.employee as any).gender ?? null,
          id: membership.employeeId,
          lastName: membership.employee.lastName,
          avatar: resolveEmployeeAvatarSource({
            avatar: (membership.employee as any).avatar,
            avatarUrl: (membership.employee as any).avatarUrl,
            employeeNumber: (membership.employee as any).employeeNumber,
            firstName: membership.employee.firstName,
            gender: (membership.employee as any).gender,
            id: membership.employeeId,
            lastName: membership.employee.lastName,
          }),
        }),
      );
      return;
    }

    groupsByName.set(groupKey, {
      apiGroupIds: [group.id],
      id: `group:${groupKey}`,
      members: group.memberships.map((membership) => ({
        departmentName: groupName,
        firstName: membership.employee.firstName,
        gender: (membership.employee as any).gender ?? null,
        id: membership.employeeId,
        lastName: membership.employee.lastName,
        avatar: resolveEmployeeAvatarSource({
          avatar: (membership.employee as any).avatar,
          avatarUrl: (membership.employee as any).avatarUrl,
          employeeNumber: (membership.employee as any).employeeNumber,
          firstName: membership.employee.firstName,
          gender: (membership.employee as any).gender,
          id: membership.employeeId,
          lastName: membership.employee.lastName,
        }),
      })),
      memberIds: group.memberships.map((membership) => membership.employeeId),
      name: groupName,
      source: 'api',
    });
  });

  return Array.from(groupsByName.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export function mergeGroupOptions(primaryGroups: GroupOption[], fallbackGroups: GroupOption[]) {
  const groupsByName = new Map<string, GroupOption>();

  [...primaryGroups, ...fallbackGroups].forEach((group) => {
    const groupKey = normalizeGroupKey(group.name);
    const existing = groupsByName.get(groupKey);

    if (!existing) {
      groupsByName.set(groupKey, {
        apiGroupIds: [...group.apiGroupIds],
        id: group.id,
        members: [...group.members],
        memberIds: [...group.memberIds],
        name: group.name,
        source: group.source,
      });
      return;
    }

    if (group.source === 'api') {
      existing.source = 'api';
    }

    if (existing.source === 'department' && group.source === 'api') {
      existing.id = group.id;
    }

    group.apiGroupIds.forEach((apiGroupId) => {
      if (!existing.apiGroupIds.includes(apiGroupId)) {
        existing.apiGroupIds.push(apiGroupId);
      }
    });

    group.members.forEach((member) => upsertGroupMember(existing, member));
  });

  return Array.from(groupsByName.values())
    .map((group) => ({
      ...group,
      members: [...group.members].sort((left, right) =>
        `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`),
      ),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
