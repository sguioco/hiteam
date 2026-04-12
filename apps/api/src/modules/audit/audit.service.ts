import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ActivityKind =
  | 'attendance'
  | 'announcement'
  | 'task'
  | 'shift'
  | 'employee'
  | 'request';

type ActivityAction =
  | 'check_in'
  | 'check_out'
  | 'break_started'
  | 'break_ended'
  | 'published'
  | 'created'
  | 'approved'
  | 'submitted';

type ActivityPerson = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  avatarUrl: string | null;
};

export type CompanyActivityItem = {
  id: string;
  kind: ActivityKind;
  action: ActivityAction;
  createdAt: string;
  actor: ActivityPerson | null;
  title: string | null;
  context: string | null;
  targetLabel: string | null;
  targetEmployees: ActivityPerson[];
};

const COMPANY_ACTIVITY_ACTIONS = [
  'attendance.check_in',
  'attendance.check_out',
  'attendance.break_started',
  'attendance.break_ended',
  'announcement.created',
  'announcement.generated',
  'task.created',
  'schedule.shift_created',
  'employee.profile_submitted',
  'employee.review_approved',
  'request.created',
] as const;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    tenantId: string;
    actorUserId?: string;
    entityType: string;
    entityId: string;
    action: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        metadataJson: params.metadata ? JSON.stringify(params.metadata) : undefined,
      },
    });
  }

  async listCompanyActivity(
    tenantId: string,
    options?: { limit?: number },
  ): Promise<CompanyActivityItem[]> {
    const limit = Math.max(1, Math.min(options?.limit ?? 36, 80));
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        action: {
          in: [...COMPANY_ACTIVITY_ACTIONS],
        },
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit * 4,
    });

    if (!logs.length) {
      return [];
    }

    const actorUserIds = new Set<string>();
    const employeeIds = new Set<string>();
    const groupIds = new Set<string>();
    const shiftIds = new Set<string>();
    const announcementIds = new Set<string>();

    const metadataByLogId = new Map<string, Record<string, unknown>>();

    for (const log of logs) {
      const metadata = this.parseMetadata(log.metadataJson);
      metadataByLogId.set(log.id, metadata);

      if (log.actorUserId) {
        actorUserIds.add(log.actorUserId);
      }

      const singleEmployeeIds = [
        this.readString(metadata.employeeId),
        this.readString(metadata.assigneeEmployeeId),
        this.readString(metadata.targetEmployeeId),
      ].filter((value): value is string => Boolean(value));

      for (const employeeId of singleEmployeeIds) {
        employeeIds.add(employeeId);
      }

      for (const employeeId of this.readStringArray(metadata.employeeIds)) {
        employeeIds.add(employeeId);
      }

      for (const employeeId of this.readStringArray(metadata.assigneeEmployeeIds)) {
        employeeIds.add(employeeId);
      }

      for (const employeeId of this.readStringArray(metadata.targetEmployeeIds)) {
        employeeIds.add(employeeId);
      }

      const singleGroupIds = [this.readString(metadata.groupId)].filter(
        (value): value is string => Boolean(value),
      );

      for (const groupId of singleGroupIds) {
        groupIds.add(groupId);
      }

      for (const groupId of this.readStringArray(metadata.groupIds)) {
        groupIds.add(groupId);
      }

      const metadataShiftId = this.readString(metadata.shiftId);
      if (metadataShiftId) {
        shiftIds.add(metadataShiftId);
      }

      if (
        log.action === 'attendance.check_in' ||
        log.action === 'attendance.check_out' ||
        log.action === 'attendance.break_started' ||
        log.action === 'attendance.break_ended'
      ) {
        const attendanceShiftId = this.readString(metadata.shiftId);
        if (attendanceShiftId) {
          shiftIds.add(attendanceShiftId);
        }
      }

      if (log.action === 'schedule.shift_created') {
        shiftIds.add(log.entityId);
      }

      if (
        log.action === 'announcement.created' ||
        log.action === 'announcement.generated'
      ) {
        announcementIds.add(log.entityId);
      }
    }

    const [actorUsers, relatedEmployees, groups, shifts, announcements] =
      await Promise.all([
        actorUserIds.size
          ? this.prisma.user.findMany({
              where: {
                tenantId,
                id: {
                  in: [...actorUserIds],
                },
              },
              select: {
                id: true,
                email: true,
                employee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
              },
            })
          : [],
        employeeIds.size
          ? this.prisma.employee.findMany({
              where: {
                tenantId,
                id: {
                  in: [...employeeIds],
                },
              },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            })
          : [],
        groupIds.size
          ? this.prisma.workGroup.findMany({
              where: {
                tenantId,
                id: {
                  in: [...groupIds],
                },
              },
              select: {
                id: true,
                name: true,
                memberships: {
                  select: {
                    employee: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                      },
                    },
                  },
                },
              },
            })
          : [],
        shiftIds.size
          ? this.prisma.shift.findMany({
              where: {
                tenantId,
                id: {
                  in: [...shiftIds],
                },
              },
              select: {
                id: true,
                startsAt: true,
                endsAt: true,
                shiftDate: true,
                employee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
                template: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            })
          : [],
        announcementIds.size
          ? this.prisma.announcement.findMany({
              where: {
                tenantId,
                id: {
                  in: [...announcementIds],
                },
              },
              select: {
                id: true,
                title: true,
                audience: true,
                group: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                location: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                targetEmployee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
              },
            })
          : [],
      ]);

    const actorMap = new Map(
      actorUsers.map((user) => [
        user.id,
        user.employee
          ? this.serializeEmployeePerson(user.employee)
          : this.serializeUserPerson(user.id, user.email),
      ]),
    );
    const employeeMap = new Map(
      relatedEmployees.map((employee) => [
        employee.id,
        this.serializeEmployeePerson(employee),
      ]),
    );
    const groupMap = new Map(
      groups.map((group) => [
        group.id,
        {
          id: group.id,
          name: group.name,
          members: this.dedupePeople(
            group.memberships.map((membership) =>
              this.serializeEmployeePerson(membership.employee),
            ),
          ),
        },
      ]),
    );
    const shiftMap = new Map(
      shifts.map((shift) => [
        shift.id,
        {
          id: shift.id,
          title: shift.template?.name ?? null,
          employee:
            shift.employee
              ? this.serializeEmployeePerson(shift.employee)
              : null,
          shiftDate: shift.shiftDate.toISOString(),
          startsAt: shift.startsAt.toISOString(),
          endsAt: shift.endsAt.toISOString(),
        },
      ]),
    );
    const announcementMap = new Map(
      announcements.map((announcement) => [
        announcement.id,
        {
          id: announcement.id,
          title: announcement.title,
          audience: announcement.audience,
          groupName: announcement.group?.name ?? null,
          departmentName: announcement.department?.name ?? null,
          locationName: announcement.location?.name ?? null,
          targetEmployee:
            announcement.targetEmployee
              ? this.serializeEmployeePerson(announcement.targetEmployee)
              : null,
        },
      ]),
    );

    const items = logs
      .map((log) =>
        this.mapCompanyActivityLog(log, metadataByLogId.get(log.id) ?? {}, {
          actorMap,
          employeeMap,
          groupMap,
          shiftMap,
          announcementMap,
        }),
      )
      .filter((item): item is CompanyActivityItem => Boolean(item))
      .slice(0, limit);

    return items;
  }

  private mapCompanyActivityLog(
    log: {
      id: string;
      actorUserId: string | null;
      entityId: string;
      action: string;
      createdAt: Date;
    },
    metadata: Record<string, unknown>,
    refs: {
      actorMap: Map<string, ActivityPerson>;
      employeeMap: Map<string, ActivityPerson>;
      groupMap: Map<
        string,
        { id: string; name: string; members: ActivityPerson[] }
      >;
      shiftMap: Map<
        string,
        {
          id: string;
          title: string | null;
          employee: ActivityPerson | null;
          shiftDate: string;
          startsAt: string;
          endsAt: string;
        }
      >;
      announcementMap: Map<
        string,
        {
          id: string;
          title: string;
          audience: string;
          groupName: string | null;
          departmentName: string | null;
          locationName: string | null;
          targetEmployee: ActivityPerson | null;
        }
      >;
    },
  ): CompanyActivityItem | null {
    const actor = log.actorUserId ? refs.actorMap.get(log.actorUserId) ?? null : null;

    switch (log.action) {
      case 'attendance.check_in':
      case 'attendance.check_out':
      case 'attendance.break_started':
      case 'attendance.break_ended': {
        const shiftId = this.readString(metadata.shiftId);
        const shift = shiftId ? refs.shiftMap.get(shiftId) ?? null : null;

        return {
          id: log.id,
          kind: 'attendance',
          action:
            log.action === 'attendance.check_in'
              ? 'check_in'
              : log.action === 'attendance.check_out'
                ? 'check_out'
                : log.action === 'attendance.break_started'
                  ? 'break_started'
                  : 'break_ended',
          createdAt: log.createdAt.toISOString(),
          actor,
          title: shift?.title ?? null,
          context: null,
          targetLabel: null,
          targetEmployees: [],
        };
      }
      case 'announcement.created':
      case 'announcement.generated': {
        const announcement = refs.announcementMap.get(log.entityId) ?? null;
        const { targetEmployees, targetLabel } = this.resolveTargets({
          employeeMap: refs.employeeMap,
          groupMap: refs.groupMap,
          metadata,
          fallbackTargetEmployee: announcement?.targetEmployee ?? null,
          fallbackTargetLabel:
            announcement?.groupName ??
            announcement?.departmentName ??
            announcement?.locationName ??
            (announcement?.audience === 'ALL' ? 'all-company' : null),
        });

        return {
          id: log.id,
          kind: 'announcement',
          action: 'published',
          createdAt: log.createdAt.toISOString(),
          actor,
          title:
            this.readString(metadata.title) ??
            announcement?.title ??
            null,
          context: null,
          targetLabel,
          targetEmployees,
        };
      }
      case 'task.created': {
        const taskCount = this.readNumber(metadata.taskCount);
        const { targetEmployees, targetLabel } = this.resolveTargets({
          employeeMap: refs.employeeMap,
          groupMap: refs.groupMap,
          metadata,
        });

        return {
          id: log.id,
          kind: 'task',
          action: 'created',
          createdAt: log.createdAt.toISOString(),
          actor,
          title:
            this.readString(metadata.title) ??
            (taskCount && taskCount > 1 ? `${taskCount} tasks` : null),
          context: null,
          targetLabel,
          targetEmployees,
        };
      }
      case 'schedule.shift_created': {
        const shift = refs.shiftMap.get(log.entityId) ?? null;
        const { targetEmployees, targetLabel } = this.resolveTargets({
          employeeMap: refs.employeeMap,
          groupMap: refs.groupMap,
          metadata,
          fallbackTargetEmployee: shift?.employee ?? null,
        });

        return {
          id: log.id,
          kind: 'shift',
          action: 'created',
          createdAt: log.createdAt.toISOString(),
          actor,
          title:
            this.readString(metadata.templateName) ??
            shift?.title ??
            null,
          context: null,
          targetLabel,
          targetEmployees,
        };
      }
      case 'employee.review_approved': {
        const targetEmployeeId = this.readString(metadata.employeeId);
        const targetEmployee = targetEmployeeId
          ? refs.employeeMap.get(targetEmployeeId) ?? null
          : null;

        return {
          id: log.id,
          kind: 'employee',
          action: 'approved',
          createdAt: log.createdAt.toISOString(),
          actor,
          title: targetEmployee?.displayName ?? null,
          context: null,
          targetLabel: null,
          targetEmployees: targetEmployee ? [targetEmployee] : [],
        };
      }
      case 'employee.profile_submitted': {
        return {
          id: log.id,
          kind: 'employee',
          action: 'submitted',
          createdAt: log.createdAt.toISOString(),
          actor,
          title: null,
          context: null,
          targetLabel: null,
          targetEmployees: [],
        };
      }
      case 'request.created': {
        const { targetEmployees, targetLabel } = this.resolveTargets({
          employeeMap: refs.employeeMap,
          groupMap: refs.groupMap,
          metadata: {
            ...metadata,
            employeeIds: this.readStringArray(metadata.approverEmployeeIds),
          },
        });

        return {
          id: log.id,
          kind: 'request',
          action: 'created',
          createdAt: log.createdAt.toISOString(),
          actor,
          title: this.readString(metadata.requestType),
          context: null,
          targetLabel,
          targetEmployees,
        };
      }
      default:
        return null;
    }
  }

  private resolveTargets(args: {
    employeeMap: Map<string, ActivityPerson>;
    groupMap: Map<string, { id: string; name: string; members: ActivityPerson[] }>;
    metadata: Record<string, unknown>;
    fallbackTargetEmployee?: ActivityPerson | null;
    fallbackTargetLabel?: string | null;
  }) {
    const employeeIds = new Set<string>();
    const groupIds = new Set<string>();

    for (const employeeId of this.readStringArray(args.metadata.employeeIds)) {
      employeeIds.add(employeeId);
    }

    for (const employeeId of this.readStringArray(args.metadata.assigneeEmployeeIds)) {
      employeeIds.add(employeeId);
    }

    for (const employeeId of this.readStringArray(args.metadata.targetEmployeeIds)) {
      employeeIds.add(employeeId);
    }

    const singleEmployeeIds = [
      this.readString(args.metadata.employeeId),
      this.readString(args.metadata.assigneeEmployeeId),
      this.readString(args.metadata.targetEmployeeId),
    ].filter((value): value is string => Boolean(value));

    for (const employeeId of singleEmployeeIds) {
      employeeIds.add(employeeId);
    }

    for (const groupId of this.readStringArray(args.metadata.groupIds)) {
      groupIds.add(groupId);
    }

    const singleGroupId = this.readString(args.metadata.groupId);
    if (singleGroupId) {
      groupIds.add(singleGroupId);
    }

    const targetEmployees = this.dedupePeople([
      ...[...employeeIds]
        .map((employeeId) => args.employeeMap.get(employeeId) ?? null)
        .filter((person): person is ActivityPerson => Boolean(person)),
      ...[...groupIds].flatMap(
        (groupId) => args.groupMap.get(groupId)?.members ?? [],
      ),
      ...(args.fallbackTargetEmployee ? [args.fallbackTargetEmployee] : []),
    ]);

    const groupLabels = [...groupIds]
      .map((groupId) => args.groupMap.get(groupId)?.name ?? null)
      .filter((value): value is string => Boolean(value));

    const targetLabel =
      this.readString(args.metadata.groupName) ??
      this.readString(args.metadata.departmentName) ??
      this.readString(args.metadata.locationName) ??
      (groupLabels.length === 1 ? groupLabels[0] : null) ??
      args.fallbackTargetLabel ??
      null;

    return {
      targetEmployees,
      targetLabel,
    };
  }

  private dedupePeople(people: ActivityPerson[]) {
    const seen = new Set<string>();

    return people.filter((person) => {
      if (seen.has(person.id)) {
        return false;
      }

      seen.add(person.id);
      return true;
    });
  }

  private serializeEmployeePerson(employee: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  }): ActivityPerson {
    const displayName = `${employee.firstName} ${employee.lastName}`.trim();

    return {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      displayName,
      avatarUrl: employee.avatarUrl ?? null,
    };
  }

  private serializeUserPerson(userId: string, email: string): ActivityPerson {
    const displayName = email
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      id: userId,
      firstName: null,
      lastName: null,
      displayName: displayName || email,
      avatarUrl: null,
    };
  }

  private parseMetadata(raw: string | null): Record<string, unknown> {
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : null;
  }

  private readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => this.readString(item))
      .filter((item): item is string => Boolean(item));
  }

  private readNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }
}
