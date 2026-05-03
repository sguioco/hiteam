import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AnnouncementAudience,
  AnnouncementTemplateFrequency,
  ChatThreadKind,
  NotificationType,
  Prisma,
  TaskActivityKind,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { TranslationService } from "../translation/translation.service";
import { CollaborationRealtimeService } from "./collaboration-realtime.service";
import { AddTaskCommentDto } from "./dto/add-task-comment.dto";
import { BulkRemindTasksDto } from "./dto/bulk-remind-tasks.dto";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { CreateAnnouncementTemplateDto } from "./dto/create-announcement-template.dto";
import { CreateChatThreadDto } from "./dto/create-chat-thread.dto";
import { CreateGroupDto } from "./dto/create-group.dto";
import { CreateTaskDto } from "./dto/create-task.dto";
import { CreateTaskPhotoProofDto } from "./dto/create-task-photo-proof.dto";
import { CreateTaskTemplateDto } from "./dto/create-task-template.dto";
import { ListManagerTasksQueryDto } from "./dto/list-manager-tasks-query.dto";
import { RescheduleTaskDto } from "./dto/reschedule-task.dto";
import { SendChatMessageDto } from "./dto/send-chat-message.dto";
import { SetGroupMembersDto } from "./dto/set-group-members.dto";
import { SetTaskStatusDto } from "./dto/set-task-status.dto";
import { ToggleAnnouncementTemplateDto } from "./dto/toggle-announcement-template.dto";
import { ToggleTaskTemplateDto } from "./dto/toggle-task-template.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";
import { UpdateAnnouncementTemplateDto } from "./dto/update-announcement-template.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { UpdateTaskTemplateDto } from "./dto/update-task-template.dto";
import { UpdateTaskAutomationPolicyDto } from "./dto/update-task-automation-policy.dto";

const TASK_PHOTO_PROOF_LIMIT = 7;
const ANNOUNCEMENT_ATTACHMENT_LIMIT = 5;
const ANNOUNCEMENT_IMAGE_ASPECT_RATIOS = new Set(["1:1", "16:9", "4:3"]);
const TASK_META_MARKER = "[smart-task-meta]";

const MINIMAL_EMPLOYEE_SELECT = {
  id: true,
  tenantId: true,
  userId: true,
  departmentId: true,
  primaryLocationId: true,
  firstName: true,
  lastName: true,
  employeeNumber: true,
  gender: true,
  avatarStorageKey: true,
  avatarUrl: true,
} satisfies Prisma.EmployeeSelect;

@Injectable()
export class CollaborationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly collaborationRealtimeService: CollaborationRealtimeService,
    private readonly storageService: StorageService,
    private readonly translationService: TranslationService,
  ) {}

  async listGroups(userId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    return this.prisma.workGroup.findMany({
      where: {
        tenantId: employee.tenantId,
        managerEmployeeId: employee.id,
      },
      include: {
        memberships: {
          include: {
            employee: {
              select: MINIMAL_EMPLOYEE_SELECT,
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });
  }

  async createGroup(userId: string, dto: CreateGroupDto) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const memberEmployeeIds = Array.from(new Set(dto.memberEmployeeIds ?? []));
    const name = dto.name.trim();
    const description = dto.description?.trim() || null;

    if (!name) {
      throw new BadRequestException("Group name is required.");
    }

    if (memberEmployeeIds.length > 0) {
      const members = await this.prisma.employee.count({
        where: {
          tenantId: manager.tenantId,
          id: { in: memberEmployeeIds },
        },
      });

      if (members !== memberEmployeeIds.length) {
        throw new BadRequestException(
          "Group contains employees outside the current tenant.",
        );
      }
    }

    let group;
    try {
      group = await this.prisma.workGroup.create({
        data: {
          tenantId: manager.tenantId,
          managerEmployeeId: manager.id,
          name,
          description,
          memberships: {
            create: memberEmployeeIds.map((employeeId) => ({
              tenantId: manager.tenantId,
              employeeId,
            })),
          },
        },
        include: {
          memberships: {
            include: { employee: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Group with this name already exists.");
      }
      throw error;
    }

    await this.auditService.log({
      tenantId: manager.tenantId,
      actorUserId: userId,
      entityType: "work_group",
      entityId: group.id,
      action: "work_group.created",
      metadata: {
        memberEmployeeIds,
      },
    });

    return group;
  }

  async updateGroup(userId: string, groupId: string, dto: UpdateGroupDto) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const group = await this.prisma.workGroup.findFirst({
      where: {
        id: groupId,
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
      },
    });

    if (!group) {
      throw new NotFoundException("Group not found.");
    }

    const name = dto.name?.trim();
    const description =
      dto.description === undefined
        ? undefined
        : dto.description.trim() || null;

    if (name !== undefined && !name) {
      throw new BadRequestException("Group name is required.");
    }

    let updated;
    try {
      updated = await this.prisma.workGroup.update({
        where: { id: group.id },
        data: {
          name,
          description,
        },
        include: {
          memberships: {
            include: { employee: true },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: { tasks: true },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Group with this name already exists.");
      }
      throw error;
    }

    await this.auditService.log({
      tenantId: manager.tenantId,
      actorUserId: userId,
      entityType: "work_group",
      entityId: group.id,
      action: "work_group.updated",
      metadata: {
        previousName: group.name,
        nextName: updated.name,
        descriptionUpdated: description !== undefined,
      },
    });

    return updated;
  }

  async deleteGroup(userId: string, groupId: string) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const group = await this.prisma.workGroup.findFirst({
      where: {
        id: groupId,
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
      },
      include: {
        memberships: {
          select: {
            employeeId: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException("Group not found.");
    }

    await this.prisma.workGroup.delete({
      where: { id: group.id },
    });

    await this.auditService.log({
      tenantId: manager.tenantId,
      actorUserId: userId,
      entityType: "work_group",
      entityId: group.id,
      action: "work_group.deleted",
      metadata: {
        name: group.name,
        memberEmployeeIds: group.memberships.map(
          (membership) => membership.employeeId,
        ),
        tasksCount: group._count.tasks,
      },
    });

    return { success: true };
  }

  async setGroupMembers(
    userId: string,
    groupId: string,
    dto: SetGroupMembersDto,
  ) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const group = await this.prisma.workGroup.findFirst({
      where: {
        id: groupId,
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
      },
    });

    if (!group) {
      throw new NotFoundException("Group not found.");
    }

    const employeeIds = Array.from(new Set(dto.employeeIds));
    if (employeeIds.length > 0) {
      const members = await this.prisma.employee.count({
        where: {
          tenantId: manager.tenantId,
          id: { in: employeeIds },
        },
      });

      if (members !== employeeIds.length) {
        throw new BadRequestException(
          "Group contains employees outside the current tenant.",
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.workGroupMembership.deleteMany({
        where: { groupId: group.id },
      });

      if (employeeIds.length > 0) {
        await tx.workGroupMembership.createMany({
          data: employeeIds.map((employeeId) => ({
            tenantId: manager.tenantId,
            groupId: group.id,
            employeeId,
          })),
        });
      }

      return tx.workGroup.findUniqueOrThrow({
        where: { id: group.id },
        include: {
          memberships: {
            include: { employee: true },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: { tasks: true },
          },
        },
      });
    });

    await this.auditService.log({
      tenantId: manager.tenantId,
      actorUserId: userId,
      entityType: "work_group",
      entityId: group.id,
      action: "work_group.members_updated",
      metadata: { employeeIds },
    });

    return updated;
  }

  async managerOverview(userId: string) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    const [groups, tasks, stats] = await Promise.all([
      this.prisma.workGroup.findMany({
        where: {
          tenantId: manager.tenantId,
          managerEmployeeId: manager.id,
        },
        include: {
          memberships: {
            include: { employee: true },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: { tasks: true },
          },
        },
        orderBy: [{ name: "asc" }],
      }),
      this.prisma.task.findMany({
        where: {
          tenantId: manager.tenantId,
          managerEmployeeId: manager.id,
        },
        include: this.taskListInclude(),
        orderBy: [{ createdAt: "desc" }],
        take: 24,
      }),
      this.prisma.task.groupBy({
        by: ["assigneeEmployeeId", "status"],
        where: {
          tenantId: manager.tenantId,
          managerEmployeeId: manager.id,
          assigneeEmployeeId: { not: null },
        },
        _count: { _all: true },
      }),
    ]);

    const employeeIds = Array.from(
      new Set(
        stats
          .map((item) => item.assigneeEmployeeId)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const employees = employeeIds.length
      ? await this.prisma.employee.findMany({
          where: { id: { in: employeeIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        })
      : [];
    const employeeMap = new Map(
      employees.map((employee) => [employee.id, employee]),
    );

    const statsMap = new Map<
      string,
      {
        total: number;
        todo: number;
        inProgress: number;
        done: number;
        cancelled: number;
      }
    >();

    for (const item of stats) {
      if (!item.assigneeEmployeeId) continue;

      const current = statsMap.get(item.assigneeEmployeeId) ?? {
        total: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
        cancelled: 0,
      };

      current.total += item._count._all;
      if (item.status === TaskStatus.TODO) current.todo += item._count._all;
      if (item.status === TaskStatus.IN_PROGRESS)
        current.inProgress += item._count._all;
      if (item.status === TaskStatus.DONE) current.done += item._count._all;
      if (item.status === TaskStatus.CANCELLED)
        current.cancelled += item._count._all;
      statsMap.set(item.assigneeEmployeeId, current);
    }

    return {
      groups,
      recentTasks: tasks,
      employeeStats: Array.from(statsMap.entries()).map(
        ([employeeId, value]) => ({
          employee: employeeMap.get(employeeId) ?? null,
          ...value,
        }),
      ),
    };
  }

  async managerAnalytics(userId: string, days = 30) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const windowDays = Number.isFinite(days)
      ? Math.min(Math.max(days, 1), 365)
      : 30;
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - windowDays);
    const now = new Date();
    const slaRiskBoundary = new Date();
    slaRiskBoundary.setDate(slaRiskBoundary.getDate() + 3);
    const dueSoonBoundary = new Date();
    dueSoonBoundary.setDate(dueSoonBoundary.getDate() + 7);

    const [groups, tasks, activeChats, announcementsPublished] =
      await Promise.all([
        this.prisma.workGroup.findMany({
          where: {
            tenantId: manager.tenantId,
            managerEmployeeId: manager.id,
          },
          include: {
            memberships: {
              include: {
                employee: true,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: [{ name: "asc" }],
        }),
        this.prisma.task.findMany({
          where: {
            tenantId: manager.tenantId,
            managerEmployeeId: manager.id,
            createdAt: {
              gte: rangeStart,
            },
          },
          include: this.taskListInclude(),
          orderBy: [{ createdAt: "desc" }],
        }),
        this.prisma.chatThread.count({
          where: {
            tenantId: manager.tenantId,
            createdByEmployeeId: manager.id,
            updatedAt: {
              gte: rangeStart,
            },
          },
        }),
        this.prisma.announcement.count({
          where: {
            tenantId: manager.tenantId,
            authorEmployeeId: manager.id,
            createdAt: {
              gte: rangeStart,
            },
          },
        }),
      ]);

    const completedTasks = tasks.filter(
      (task) => task.status === TaskStatus.DONE,
    );
    const activeTasks = tasks.filter(
      (task) =>
        task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED,
    );
    const overdueTasks = activeTasks.filter(
      (task) => task.dueAt && new Date(task.dueAt) < now,
    );
    const slaRiskTasks = activeTasks.filter(
      (task) =>
        task.dueAt &&
        new Date(task.dueAt) >= now &&
        new Date(task.dueAt) <= slaRiskBoundary,
    );
    const urgentOpenTasks = activeTasks.filter(
      (task) => task.priority === TaskPriority.URGENT,
    );
    const completedTaskHours = completedTasks
      .map((task) => this.taskCompletionHours(task.createdAt, task.completedAt))
      .filter((value): value is number => value !== null);
    const totalChecklistItems = tasks.reduce(
      (total, task) => total + task.checklistItems.length,
      0,
    );
    const completedChecklistItems = tasks.reduce(
      (total, task) =>
        total + task.checklistItems.filter((item) => item.isCompleted).length,
      0,
    );
    const assigneeIds = Array.from(
      new Set(
        tasks
          .map((task) => task.assigneeEmployee?.id)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const assigneeDepartments = assigneeIds.length
      ? await this.prisma.employee.findMany({
          where: {
            id: {
              in: assigneeIds,
            },
          },
          select: {
            id: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : [];
    const assigneeDepartmentMap = new Map(
      assigneeDepartments
        .filter((item) => item.department)
        .map((item) => [item.id, item.department] as const),
    );

    const employeeMap = new Map<
      string,
      {
        employee: {
          id: string;
          firstName: string;
          lastName: string;
          employeeNumber: string;
        } | null;
        totalTasks: number;
        completedTasks: number;
        activeTasks: number;
        overdueTasks: number;
        completionRate: number;
        averageCompletionHours: number | null;
        checklistCompletionRate: number;
        checklistDoneCount: number;
        checklistTotalCount: number;
        completionHoursTotal: number;
        completionHoursCount: number;
      }
    >();
    const departmentMap = new Map<
      string,
      {
        department: {
          id: string;
          name: string;
        };
        totalTasks: number;
        completedTasks: number;
        activeTasks: number;
        overdueTasks: number;
        completionHoursTotal: number;
        completionHoursCount: number;
      }
    >();

    for (const task of tasks) {
      if (!task.assigneeEmployee) continue;
      const department = assigneeDepartmentMap.get(task.assigneeEmployee.id);

      const current = employeeMap.get(task.assigneeEmployee.id) ?? {
        employee: {
          id: task.assigneeEmployee.id,
          firstName: task.assigneeEmployee.firstName,
          lastName: task.assigneeEmployee.lastName,
          employeeNumber: task.assigneeEmployee.employeeNumber,
        },
        totalTasks: 0,
        completedTasks: 0,
        activeTasks: 0,
        overdueTasks: 0,
        completionRate: 0,
        averageCompletionHours: null,
        checklistCompletionRate: 0,
        checklistDoneCount: 0,
        checklistTotalCount: 0,
        completionHoursTotal: 0,
        completionHoursCount: 0,
      };

      current.totalTasks += 1;
      current.checklistTotalCount += task.checklistItems.length;
      current.checklistDoneCount += task.checklistItems.filter(
        (item) => item.isCompleted,
      ).length;

      if (task.status === TaskStatus.DONE) {
        current.completedTasks += 1;
      } else if (task.status !== TaskStatus.CANCELLED) {
        current.activeTasks += 1;
      }

      if (
        task.status !== TaskStatus.DONE &&
        task.status !== TaskStatus.CANCELLED &&
        task.dueAt &&
        new Date(task.dueAt) < now
      ) {
        current.overdueTasks += 1;
      }

      const completionHours = this.taskCompletionHours(
        task.createdAt,
        task.completedAt,
      );
      if (completionHours !== null) {
        current.completionHoursTotal += completionHours;
        current.completionHoursCount += 1;
      }

      employeeMap.set(task.assigneeEmployee.id, current);

      if (department) {
        const departmentCurrent = departmentMap.get(department.id) ?? {
          department: {
            id: department.id,
            name: department.name,
          },
          totalTasks: 0,
          completedTasks: 0,
          activeTasks: 0,
          overdueTasks: 0,
          completionHoursTotal: 0,
          completionHoursCount: 0,
        };

        departmentCurrent.totalTasks += 1;
        if (task.status === TaskStatus.DONE) {
          departmentCurrent.completedTasks += 1;
        } else if (task.status !== TaskStatus.CANCELLED) {
          departmentCurrent.activeTasks += 1;
        }

        if (
          task.status !== TaskStatus.DONE &&
          task.status !== TaskStatus.CANCELLED &&
          task.dueAt &&
          new Date(task.dueAt) < now
        ) {
          departmentCurrent.overdueTasks += 1;
        }

        const departmentCompletionHours = this.taskCompletionHours(
          task.createdAt,
          task.completedAt,
        );
        if (departmentCompletionHours !== null) {
          departmentCurrent.completionHoursTotal += departmentCompletionHours;
          departmentCurrent.completionHoursCount += 1;
        }

        departmentMap.set(department.id, departmentCurrent);
      }
    }

    const employeePerformance = Array.from(employeeMap.values())
      .map((item) => ({
        employee: item.employee,
        totalTasks: item.totalTasks,
        completedTasks: item.completedTasks,
        activeTasks: item.activeTasks,
        overdueTasks: item.overdueTasks,
        completionRate:
          item.totalTasks > 0
            ? Number(((item.completedTasks / item.totalTasks) * 100).toFixed(1))
            : 0,
        averageCompletionHours:
          item.completionHoursCount > 0
            ? Number(
                (item.completionHoursTotal / item.completionHoursCount).toFixed(
                  1,
                ),
              )
            : null,
        checklistCompletionRate:
          item.checklistTotalCount > 0
            ? Number(
                (
                  (item.checklistDoneCount / item.checklistTotalCount) *
                  100
                ).toFixed(1),
              )
            : 0,
      }))
      .sort((left, right) => {
        if (right.completionRate !== left.completionRate) {
          return right.completionRate - left.completionRate;
        }

        return right.completedTasks - left.completedTasks;
      });

    const groupPerformance = groups.map((group) => {
      const groupTasks = tasks.filter((task) => task.groupId === group.id);
      const groupCompletedTasks = groupTasks.filter(
        (task) => task.status === TaskStatus.DONE,
      );
      const groupActiveTasks = groupTasks.filter(
        (task) =>
          task.status !== TaskStatus.DONE &&
          task.status !== TaskStatus.CANCELLED,
      );
      const groupOverdueTasks = groupActiveTasks.filter(
        (task) => task.dueAt && new Date(task.dueAt) < now,
      );
      const groupCompletionHours = groupCompletedTasks
        .map((task) =>
          this.taskCompletionHours(task.createdAt, task.completedAt),
        )
        .filter((value): value is number => value !== null);

      const members = group.memberships
        .map((membership) => {
          const memberTasks = groupTasks.filter(
            (task) => task.assigneeEmployeeId === membership.employeeId,
          );
          const memberCompletedTasks = memberTasks.filter(
            (task) => task.status === TaskStatus.DONE,
          );
          const memberActiveTasks = memberTasks.filter(
            (task) =>
              task.status !== TaskStatus.DONE &&
              task.status !== TaskStatus.CANCELLED,
          );
          const memberOverdueTasks = memberActiveTasks.filter(
            (task) => task.dueAt && new Date(task.dueAt) < now,
          );

          return {
            employee: {
              id: membership.employee.id,
              firstName: membership.employee.firstName,
              lastName: membership.employee.lastName,
              employeeNumber: membership.employee.employeeNumber,
            },
            totalTasks: memberTasks.length,
            completedTasks: memberCompletedTasks.length,
            activeTasks: memberActiveTasks.length,
            overdueTasks: memberOverdueTasks.length,
            completionRate:
              memberTasks.length > 0
                ? Number(
                    (
                      (memberCompletedTasks.length / memberTasks.length) *
                      100
                    ).toFixed(1),
                  )
                : 0,
          };
        })
        .sort((left, right) => {
          if (right.completedTasks !== left.completedTasks) {
            return right.completedTasks - left.completedTasks;
          }

          return right.completionRate - left.completionRate;
        });

      return {
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
        },
        membersCount: group.memberships.length,
        totalTasks: groupTasks.length,
        completedTasks: groupCompletedTasks.length,
        activeTasks: groupActiveTasks.length,
        overdueTasks: groupOverdueTasks.length,
        completionRate:
          groupTasks.length > 0
            ? Number(
                (
                  (groupCompletedTasks.length / groupTasks.length) *
                  100
                ).toFixed(1),
              )
            : 0,
        averageCompletionHours:
          groupCompletionHours.length > 0
            ? Number(
                (
                  groupCompletionHours.reduce(
                    (total, value) => total + value,
                    0,
                  ) / groupCompletionHours.length
                ).toFixed(1),
              )
            : null,
        members,
      };
    });

    const departmentPerformance = Array.from(departmentMap.values())
      .map((item) => ({
        department: item.department,
        totalTasks: item.totalTasks,
        completedTasks: item.completedTasks,
        activeTasks: item.activeTasks,
        overdueTasks: item.overdueTasks,
        completionRate:
          item.totalTasks > 0
            ? Number(((item.completedTasks / item.totalTasks) * 100).toFixed(1))
            : 0,
        averageCompletionHours:
          item.completionHoursCount > 0
            ? Number(
                (item.completionHoursTotal / item.completionHoursCount).toFixed(
                  1,
                ),
              )
            : null,
      }))
      .sort((left, right) => {
        if (right.overdueTasks !== left.overdueTasks) {
          return right.overdueTasks - left.overdueTasks;
        }

        return right.totalTasks - left.totalTasks;
      });

    return {
      windowDays,
      rangeStart: rangeStart.toISOString(),
      summary: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        activeTasks: activeTasks.length,
        overdueTasks: overdueTasks.length,
        urgentOpenTasks: urgentOpenTasks.length,
        completionRate:
          tasks.length > 0
            ? Number(((completedTasks.length / tasks.length) * 100).toFixed(1))
            : 0,
        averageCompletionHours:
          completedTaskHours.length > 0
            ? Number(
                (
                  completedTaskHours.reduce(
                    (total, value) => total + value,
                    0,
                  ) / completedTaskHours.length
                ).toFixed(1),
              )
            : null,
        averageChecklistCompletionRate:
          totalChecklistItems > 0
            ? Number(
                ((completedChecklistItems / totalChecklistItems) * 100).toFixed(
                  1,
                ),
              )
            : 0,
        groupsCount: groups.length,
        activeChats,
        announcementsPublished,
        slaRiskTasks: slaRiskTasks.length,
        slaBreachedTasks: overdueTasks.length,
      },
      sla: {
        dueSoonThresholdDays: 3,
        riskTasks: slaRiskTasks.length,
        breachedTasks: overdueTasks.length,
      },
      employeePerformance,
      groupPerformance,
      departmentPerformance,
      deadlineBoard: {
        overdue: overdueTasks
          .sort((left, right) => {
            if (!left.dueAt || !right.dueAt) return 0;
            return (
              new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
            );
          })
          .slice(0, 8),
        dueSoon: activeTasks
          .filter(
            (task) =>
              task.dueAt &&
              new Date(task.dueAt) >= now &&
              new Date(task.dueAt) <= dueSoonBoundary,
          )
          .sort((left, right) => {
            if (!left.dueAt || !right.dueAt) return 0;
            return (
              new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
            );
          })
          .slice(0, 8),
        urgentOpen: urgentOpenTasks
          .sort((left, right) => {
            if (!left.dueAt && !right.dueAt) return 0;
            if (!left.dueAt) return 1;
            if (!right.dueAt) return -1;
            return (
              new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
            );
          })
          .slice(0, 8),
      },
    };
  }

  private parseNotificationMetadata(
    metadataJson: string | null,
  ): Record<string, unknown> | null {
    if (!metadataJson) {
      return null;
    }

    try {
      const parsed = JSON.parse(metadataJson) as Record<string, unknown>;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  private async loadAnnouncementNotifications(
    tenantId: string,
    announcementIds: string[],
    createdAfter?: Date,
    userId?: string,
  ) {
    if (!announcementIds.length) {
      return [];
    }

    const announcementIdSet = new Set(announcementIds);
    const notifications = await this.prisma.notification.findMany({
      where: {
        tenantId,
        type: NotificationType.OPERATIONS_ALERT,
        ...(createdAfter ? { createdAt: { gte: createdAfter } } : {}),
        ...(userId ? { userId } : {}),
      },
      select: {
        id: true,
        userId: true,
        isRead: true,
        readAt: true,
        metadataJson: true,
        user: {
          select: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return notifications.filter((notification) => {
      const metadata = this.parseNotificationMetadata(notification.metadataJson);
      const announcementId =
        typeof metadata?.announcementId === "string"
          ? metadata.announcementId
          : null;

      return announcementId ? announcementIdSet.has(announcementId) : false;
    });
  }

  private collectAnnouncementRefreshUserIds(
    authorUserId: string | null | undefined,
    notifications: Awaited<
      ReturnType<CollaborationService["loadAnnouncementNotifications"]>
    >,
  ) {
    const userIds = new Set<string>();

    if (authorUserId) {
      userIds.add(authorUserId);
    }

    for (const notification of notifications) {
      if (notification.userId) {
        userIds.add(notification.userId);
      }
    }

    return Array.from(userIds);
  }

  private attachManagerAnnouncementStats<
    T extends {
      id: string;
      tenantId: string;
      createdAt: Date;
      imageStorageKey?: string | null;
    },
  >(
    announcements: T[],
    notifications: Awaited<
      ReturnType<CollaborationService["loadAnnouncementNotifications"]>
    >,
  ) {
    return announcements.map((announcement) => {
      const relatedNotifications = notifications.filter((notification) => {
        const metadata = this.parseNotificationMetadata(notification.metadataJson);
        return metadata?.announcementId === announcement.id;
      });

      const readRecipients = relatedNotifications.filter(
        (notification) => notification.isRead,
      ).length;

      return {
        ...this.serializeAnnouncementWithImage(announcement),
        totalRecipients: relatedNotifications.length,
        readRecipients,
        unreadRecipients: Math.max(0, relatedNotifications.length - readRecipients),
      };
    });
  }

  private serializeAnnouncementWithImage<
    T extends {
      imageStorageKey?: string | null;
      attachmentsJson?: string | null;
      attachmentLocationAddress?: string | null;
      attachmentLocationPlaceId?: string | null;
      attachmentLocationLatitude?: number | null;
      attachmentLocationLongitude?: number | null;
      groupTargets?: Array<{ groupId: string }>;
      employeeTargets?: Array<{ employeeId: string }>;
    },
  >(
    announcement: T,
  ): T & {
    attachmentLocation: {
      address: string;
      latitude: number;
      longitude: number;
      placeId: string | null;
    } | null;
    attachments: Array<{
      id: string;
      fileName: string;
      contentType: string | null;
      sizeBytes: number | null;
      url: string;
    }>;
    groupIds: string[];
    imageUrl: string | null;
    targetEmployeeIds: string[];
  } {
    const attachments = this.parseAnnouncementAttachments(
      announcement.attachmentsJson ?? null,
    ).map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      contentType: attachment.contentType,
      sizeBytes: attachment.sizeBytes,
      url: this.resolveAnnouncementAssetUrl(attachment.storageKey) ?? "",
    }));

    const attachmentLocation =
      announcement.attachmentLocationAddress &&
      typeof announcement.attachmentLocationLatitude === "number" &&
      typeof announcement.attachmentLocationLongitude === "number"
        ? {
            address: announcement.attachmentLocationAddress,
            latitude: announcement.attachmentLocationLatitude,
            longitude: announcement.attachmentLocationLongitude,
            placeId: announcement.attachmentLocationPlaceId ?? null,
          }
        : null;

    return {
      ...announcement,
      attachmentLocation,
      attachments,
      groupIds:
        announcement.groupTargets?.map((target) => target.groupId) ?? [],
      imageUrl: announcement.imageStorageKey
        ? this.resolveAnnouncementAssetUrl(announcement.imageStorageKey)
        : null,
      targetEmployeeIds:
        announcement.employeeTargets?.map((target) => target.employeeId) ?? [],
    } as T & {
      attachmentLocation: {
        address: string;
        latitude: number;
        longitude: number;
        placeId: string | null;
      } | null;
      attachments: Array<{
        id: string;
        fileName: string;
        contentType: string | null;
        sizeBytes: number | null;
        url: string;
      }>;
      groupIds: string[];
      imageUrl: string | null;
      targetEmployeeIds: string[];
    };
  }

  private parseAnnouncementAttachments(
    raw: string | null,
  ): Array<{
    id: string;
    fileName: string;
    contentType: string | null;
    sizeBytes: number | null;
    storageKey: string;
  }> {
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter(
          (
            item,
          ): item is {
            id?: string;
            fileName: string;
            contentType?: string | null;
            sizeBytes?: number | null;
            storageKey: string;
          } =>
            typeof item === "object" &&
            item !== null &&
            typeof item.storageKey === "string" &&
            typeof item.fileName === "string",
        )
        .map((item, index) => ({
          id: item.id?.trim() || `attachment-${index + 1}`,
          fileName: item.fileName,
          contentType: item.contentType ?? null,
          sizeBytes:
            typeof item.sizeBytes === "number" ? item.sizeBytes : null,
          storageKey: item.storageKey,
        }));
    } catch {
      return [];
    }
  }

  private parseScheduledAnnouncementDate(value?: string | null) {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseAnnouncementAuditMetadata(raw: string | null) {
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  async listAnnouncementsForManager(userId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    const announcements = await this.prisma.announcement.findMany({
      where: {
        tenantId: employee.tenantId,
      },
      include: {
        authorEmployee: true,
        group: true,
        department: true,
        location: true,
        targetEmployee: true,
        groupTargets: true,
        employeeTargets: true,
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    const notifications = await this.loadAnnouncementNotifications(
      employee.tenantId,
      announcements.map((announcement) => announcement.id),
      announcements[announcements.length - 1]?.createdAt,
    );

    return this.attachManagerAnnouncementStats(announcements, notifications);
  }

  async listAnnouncementArchive(userId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    const logs = await this.prisma.auditLog.findMany({
      where: {
        tenantId: employee.tenantId,
        entityType: "announcement",
        action: {
          in: [
            "announcement.created",
            "announcement.generated",
            "announcement.updated",
            "announcement.deleted",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 120,
    });

    const actorUserIds = Array.from(
      new Set(
        logs
          .map((log) => log.actorUserId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const actors = actorUserIds.length
      ? await this.prisma.employee.findMany({
          where: {
            tenantId: employee.tenantId,
            userId: { in: actorUserIds },
          },
        })
      : [];
    const actorMap = new Map(actors.map((actor) => [actor.userId, actor]));

    return logs.map((log) => {
      const metadata = this.parseAnnouncementAuditMetadata(log.metadataJson);
      const actor = log.actorUserId ? actorMap.get(log.actorUserId) : null;

      return {
        id: log.id,
        announcementId: log.entityId,
        action: log.action,
        createdAt: log.createdAt.toISOString(),
        title:
          typeof metadata.title === "string" && metadata.title.trim()
            ? metadata.title
            : null,
        isPinned:
          typeof metadata.isPinned === "boolean" ? metadata.isPinned : null,
        actorEmployee: actor
          ? {
              id: actor.id,
              firstName: actor.firstName,
              lastName: actor.lastName,
            }
          : null,
      };
    });
  }

  async listMyAnnouncements(userId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const memberships = await this.prisma.workGroupMembership.findMany({
      where: {
        employeeId: employee.id,
      },
      select: {
        groupId: true,
      },
    });
    const groupIds = memberships.map((item) => item.groupId);

    const announcements = await this.prisma.announcement.findMany({
      where: {
        tenantId: employee.tenantId,
        AND: [
          {
            OR: [
              { audience: AnnouncementAudience.ALL },
              {
                audience: AnnouncementAudience.EMPLOYEE,
                targetEmployeeId: employee.id,
              },
              {
                audience: AnnouncementAudience.DEPARTMENT,
                departmentId: employee.departmentId,
              },
              {
                audience: AnnouncementAudience.LOCATION,
                locationId: employee.primaryLocationId,
              },
              {
                audience: AnnouncementAudience.GROUP,
                groupId: groupIds.length > 0 ? { in: groupIds } : undefined,
              },
              {
                employeeTargets: {
                  some: {
                    employeeId: employee.id,
                  },
                },
              },
              {
                groupTargets:
                  groupIds.length > 0
                    ? {
                        some: {
                          groupId: { in: groupIds },
                        },
                      }
                    : undefined,
              },
            ],
          },
          {
            OR: [
              {
                publishedAt: {
                  lte: new Date(),
                },
              },
              {
                publishedAt: null,
                scheduledFor: null,
              },
            ],
          },
        ],
      },
      include: {
        authorEmployee: true,
        group: true,
        department: true,
        location: true,
        targetEmployee: true,
        groupTargets: true,
        employeeTargets: true,
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    const notifications = await this.loadAnnouncementNotifications(
      employee.tenantId,
      announcements.map((announcement) => announcement.id),
      announcements[announcements.length - 1]?.createdAt,
      userId,
    );

    return announcements.map((announcement) => {
      const notification = notifications.find((item) => {
        const metadata = this.parseNotificationMetadata(item.metadataJson);
        return metadata?.announcementId === announcement.id;
      });

      return {
        ...this.serializeAnnouncementWithImage(announcement),
        notificationId: notification?.id ?? null,
        isRead: notification?.isRead ?? false,
        readAt: notification?.readAt?.toISOString() ?? null,
      };
    });
  }

  async markAnnouncementRead(userId: string, announcementId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id: announcementId,
        tenantId: employee.tenantId,
      },
    });

    if (!announcement) {
      throw new NotFoundException("Announcement not found.");
    }

    const notification = await this.prisma.notification.findFirst({
      where: {
        userId,
        tenantId: employee.tenantId,
        type: NotificationType.OPERATIONS_ALERT,
        metadataJson: {
          contains: `"announcementId":"${announcementId}"`,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!notification) {
      return {
        success: true,
        notificationId: null,
      };
    }

    const updated = await this.notificationsService.markRead(userId, notification.id);

    return {
      success: true,
      notificationId: updated.id,
      readAt: updated.readAt?.toISOString() ?? null,
    };
  }

  async listAnnouncementReaders(userId: string, announcementId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id: announcementId,
        tenantId: employee.tenantId,
      },
    });

    if (!announcement) {
      throw new NotFoundException("Announcement not found.");
    }

    const notifications = await this.loadAnnouncementNotifications(
      employee.tenantId,
      [announcementId],
      announcement.createdAt,
    );

    return notifications
      .map((notification) => ({
        notificationId: notification.id,
        userId: notification.userId,
        employeeId: notification.user.employee?.id ?? null,
        firstName: notification.user.employee?.firstName ?? "",
        lastName: notification.user.employee?.lastName ?? "",
        employeeNumber: notification.user.employee?.employeeNumber ?? null,
        avatarUrl: notification.user.employee?.avatarUrl ?? null,
        isRead: notification.isRead,
        readAt: notification.readAt?.toISOString() ?? null,
      }))
      .sort((left, right) => {
        if (left.isRead !== right.isRead) {
          return left.isRead ? 1 : -1;
        }

        const leftName = `${left.lastName} ${left.firstName}`.trim();
        const rightName = `${right.lastName} ${right.firstName}`.trim();
        return leftName.localeCompare(rightName, "ru");
      });
  }

  async updateAnnouncement(
    userId: string,
    announcementId: string,
    dto: UpdateAnnouncementDto,
  ) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    const current = await this.prisma.announcement.findFirst({
      where: {
        id: announcementId,
        tenantId: employee.tenantId,
      },
    });

    if (!current) {
      throw new NotFoundException("Announcement not found.");
    }

    if (
      (dto.imageDataUrl && !dto.imageAspectRatio) ||
      (!dto.imageDataUrl && dto.imageAspectRatio && !dto.removeImage)
    ) {
      throw new BadRequestException(
        "Announcement image update requires both imageDataUrl and imageAspectRatio.",
      );
    }

    let imageUpdateData: Prisma.AnnouncementUpdateInput = {};
    let attachmentsUpdateData: Prisma.AnnouncementUpdateInput = {};
    const linkUpdateData: Prisma.AnnouncementUpdateInput = dto.removeLink
      ? { linkUrl: null }
      : dto.linkUrl !== undefined
        ? { linkUrl: dto.linkUrl.trim() || null }
        : {};
    const locationUpdateData: Prisma.AnnouncementUpdateInput =
      dto.removeAttachmentLocation
        ? {
            attachmentLocationAddress: null,
            attachmentLocationPlaceId: null,
            attachmentLocationLatitude: null,
            attachmentLocationLongitude: null,
          }
        : dto.attachmentLocation
          ? {
              attachmentLocationAddress:
                dto.attachmentLocation.address?.trim() || null,
              attachmentLocationPlaceId:
                dto.attachmentLocation.placeId?.trim() || null,
              attachmentLocationLatitude: dto.attachmentLocation.latitude,
              attachmentLocationLongitude: dto.attachmentLocation.longitude,
            }
          : {};

    if (dto.removeImage) {
      imageUpdateData = {
        imageStorageKey: null,
        imageAspectRatio: null,
      };
    } else if (dto.imageDataUrl && dto.imageAspectRatio) {
      const uploaded = await this.uploadAnnouncementImage(
        employee.tenantId,
        announcementId,
        dto.imageDataUrl,
      );

      imageUpdateData = {
        imageStorageKey: uploaded.key,
        imageAspectRatio: dto.imageAspectRatio,
      };
    }

    if ((dto.attachments?.length ?? 0) > ANNOUNCEMENT_ATTACHMENT_LIMIT) {
      throw new BadRequestException(
        `Announcement supports up to ${ANNOUNCEMENT_ATTACHMENT_LIMIT} attachments.`,
      );
    }

    if (dto.removeAttachments) {
      attachmentsUpdateData = {
        attachmentsJson: null,
      };
    } else if (dto.attachments !== undefined) {
      const uploadedAttachments = await Promise.all(
        dto.attachments.map((attachment, index) =>
          this.uploadAnnouncementAttachment(
            employee.tenantId,
            announcementId,
            attachment.fileName,
            attachment.dataUrl,
            index,
          ),
        ),
      );
      attachmentsUpdateData = {
        attachmentsJson: JSON.stringify(uploadedAttachments),
      };
    }

    const updated = await this.prisma.announcement.update({
      where: { id: announcementId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.body !== undefined ? { body: dto.body.trim() } : {}),
        ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
        ...imageUpdateData,
        ...linkUpdateData,
        ...locationUpdateData,
        ...attachmentsUpdateData,
      },
      include: {
        authorEmployee: true,
        group: true,
        department: true,
        location: true,
        targetEmployee: true,
        groupTargets: true,
        employeeTargets: true,
      },
    });

    await this.prisma.notification.updateMany({
      where: {
        tenantId: employee.tenantId,
        type: NotificationType.OPERATIONS_ALERT,
        metadataJson: {
          contains: `"announcementId":"${announcementId}"`,
        },
      },
      data: {
        title: `Announcement: ${updated.title}`,
        body: updated.body,
      },
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: "announcement",
      entityId: announcementId,
      action: "announcement.updated",
      metadata: {
        title: updated.title,
        isPinned: updated.isPinned,
        linkUrl: updated.linkUrl,
        hasAttachmentLocation: Boolean(updated.attachmentLocationAddress),
        attachmentCount: this.parseAnnouncementAttachments(
          updated.attachmentsJson ?? null,
        ).length,
      },
    });

    this.queueTranslationPrewarm([updated.title, updated.body]);

    const notifications = await this.loadAnnouncementNotifications(
      employee.tenantId,
      [announcementId],
      current.createdAt,
    );

    this.emitWorkspaceRefresh(
      this.collectAnnouncementRefreshUserIds(employee.userId, notifications),
      "announcement.updated",
    );

    return this.attachManagerAnnouncementStats([updated], notifications)[0];
  }

  async deleteAnnouncement(userId: string, announcementId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    const current = await this.prisma.announcement.findFirst({
      where: {
        id: announcementId,
        tenantId: employee.tenantId,
      },
    });

    if (!current) {
      throw new NotFoundException("Announcement not found.");
    }

    const notifications = await this.loadAnnouncementNotifications(
      employee.tenantId,
      [announcementId],
      current.createdAt,
    );

    await this.prisma.notification.deleteMany({
      where: {
        tenantId: employee.tenantId,
        type: NotificationType.OPERATIONS_ALERT,
        metadataJson: {
          contains: `"announcementId":"${announcementId}"`,
        },
      },
    });

    await this.prisma.announcement.delete({
      where: { id: announcementId },
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: "announcement",
      entityId: announcementId,
      action: "announcement.deleted",
      metadata: {
        title: current.title,
        isPinned: current.isPinned,
      },
    });

    this.emitWorkspaceRefresh(
      this.collectAnnouncementRefreshUserIds(employee.userId, notifications),
      "announcement.deleted",
    );

    return { success: true };
  }

  async createAnnouncement(userId: string, dto: CreateAnnouncementDto) {
    const author = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    await this.validateAnnouncementTarget(
      author.tenantId,
      dto.audience,
      dto.groupId,
      dto.targetEmployeeId,
      dto.groupIds,
      dto.targetEmployeeIds,
      dto.departmentId,
      dto.locationId,
    );

    return this.publishAnnouncement(
      {
        tenantId: author.tenantId,
        id: author.id,
        firstName: author.firstName,
        lastName: author.lastName,
      },
      dto,
      userId,
    );
  }

  async listAnnouncementTemplates(userId: string) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    return this.prisma.announcementTemplate.findMany({
      where: {
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
      },
      include: {
        group: true,
        department: true,
        location: true,
        targetEmployee: true,
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  }

  async createAnnouncementTemplate(
    userId: string,
    dto: CreateAnnouncementTemplateDto,
  ) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    await this.validateAnnouncementTarget(
      manager.tenantId,
      dto.audience,
      dto.groupId,
      dto.targetEmployeeId,
      undefined,
      undefined,
      dto.departmentId,
      dto.locationId,
    );

    const template = await this.prisma.announcementTemplate.create({
      data: {
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
        audience: dto.audience,
        groupId: dto.groupId ?? null,
        targetEmployeeId: dto.targetEmployeeId ?? null,
        departmentId: dto.departmentId ?? null,
        locationId: dto.locationId ?? null,
        title: dto.title,
        body: dto.body,
        isPinned: dto.isPinned ?? false,
        frequency: dto.frequency,
        weekDaysJson: dto.weekDays?.length
          ? JSON.stringify(Array.from(new Set(dto.weekDays)).sort())
          : null,
        dayOfMonth: dto.dayOfMonth ?? null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        publishTimeLocal: dto.publishTimeLocal ?? null,
        isActive: dto.isActive ?? true,
      },
      include: {
        group: true,
        department: true,
        location: true,
        targetEmployee: true,
      },
    });

    await this.auditService.log({
      tenantId: manager.tenantId,
      actorUserId: userId,
      entityType: "announcement_template",
      entityId: template.id,
      action: "announcement_template.created",
      metadata: {
        frequency: template.frequency,
        audience: template.audience,
        groupId: template.groupId,
        targetEmployeeId: template.targetEmployeeId,
      },
    });

    this.queueTranslationPrewarm([template.title, template.body]);

    return template;
  }

  async updateAnnouncementTemplate(
    userId: string,
    templateId: string,
    dto: UpdateAnnouncementTemplateDto,
  ) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const template = await this.prisma.announcementTemplate.findFirst({
      where: {
        id: templateId,
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
      },
    });

    if (!template) {
      throw new NotFoundException("Announcement template not found.");
    }

    await this.validateAnnouncementTarget(
      manager.tenantId,
      dto.audience,
      dto.groupId,
      dto.targetEmployeeId,
      undefined,
      undefined,
      dto.departmentId,
      dto.locationId,
    );

    const updated = await this.prisma.announcementTemplate.update({
      where: { id: template.id },
      data: {
        audience: dto.audience,
        groupId: dto.groupId ?? null,
        targetEmployeeId: dto.targetEmployeeId ?? null,
        departmentId: dto.departmentId ?? null,
        locationId: dto.locationId ?? null,
        title: dto.title,
        body: dto.body,
        isPinned: dto.isPinned ?? false,
        frequency: dto.frequency,
        weekDaysJson: dto.weekDays?.length
          ? JSON.stringify(Array.from(new Set(dto.weekDays)).sort())
          : null,
        dayOfMonth: dto.dayOfMonth ?? null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        publishTimeLocal: dto.publishTimeLocal ?? null,
        isActive: dto.isActive ?? template.isActive,
      },
      include: {
        group: true,
        department: true,
        location: true,
        targetEmployee: true,
      },
    });

    await this.auditService.log({
      tenantId: manager.tenantId,
      actorUserId: userId,
      entityType: "announcement_template",
      entityId: template.id,
      action: "announcement_template.updated",
      metadata: {
        frequency: updated.frequency,
        audience: updated.audience,
        groupId: updated.groupId,
        targetEmployeeId: updated.targetEmployeeId,
      },
    });

    this.queueTranslationPrewarm([updated.title, updated.body]);

    return updated;
  }

  async toggleAnnouncementTemplate(
    userId: string,
    templateId: string,
    dto: ToggleAnnouncementTemplateDto,
  ) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const template = await this.prisma.announcementTemplate.findFirst({
      where: {
        id: templateId,
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
      },
    });

    if (!template) {
      throw new NotFoundException("Announcement template not found.");
    }

    const updated = await this.prisma.announcementTemplate.update({
      where: { id: template.id },
      data: { isActive: dto.isActive },
      include: {
        group: true,
        department: true,
        location: true,
        targetEmployee: true,
      },
    });

    await this.auditService.log({
      tenantId: manager.tenantId,
      actorUserId: userId,
      entityType: "announcement_template",
      entityId: template.id,
      action: dto.isActive
        ? "announcement_template.activated"
        : "announcement_template.paused",
    });

    return updated;
  }

  async deleteAnnouncementTemplate(userId: string, templateId: string) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const template = await this.prisma.announcementTemplate.findFirst({
      where: {
        id: templateId,
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
      },
    });

    if (!template) {
      throw new NotFoundException("Announcement template not found.");
    }

    await this.prisma.announcementTemplate.delete({
      where: { id: template.id },
    });

    await this.auditService.log({
      tenantId: manager.tenantId,
      actorUserId: userId,
      entityType: "announcement_template",
      entityId: template.id,
      action: "announcement_template.deleted",
    });

    return { success: true };
  }

  async runDueAnnouncementTemplates(userId: string) {
    const manager = await this.prisma.employee.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!manager) {
      throw new NotFoundException("Manager employee not found.");
    }

    const generatedTemplateIds = await this.runDueAnnouncementTemplatesForScope(
      manager,
      userId,
    );
    return {
      success: true,
      generatedCount: generatedTemplateIds.length,
      generatedTemplateIds,
    };
  }

  async runDueAnnouncementTemplatesForAllTenants() {
    const managers = await this.prisma.employee.findMany({
      where: {
        createdAnnouncementTemplates: {
          some: {
            isActive: true,
          },
        },
      },
      include: { user: true },
    });

    let generatedCount = 0;
    for (const manager of managers) {
      const generatedTemplateIds =
        await this.runDueAnnouncementTemplatesForScope(manager);
      generatedCount += generatedTemplateIds.length;
    }

    return generatedCount;
  }

  async publishDueScheduledAnnouncements() {
    const now = new Date();
    const dueAnnouncements = await this.prisma.announcement.findMany({
      where: {
        publishedAt: null,
        scheduledFor: {
          lte: now,
        },
      },
      select: {
        id: true,
      },
    });

    let publishedCount = 0;

    for (const dueAnnouncement of dueAnnouncements) {
      const publishedAt = new Date();
      const claim = await this.prisma.announcement.updateMany({
        where: {
          id: dueAnnouncement.id,
          publishedAt: null,
          scheduledFor: {
            lte: now,
          },
        },
        data: {
          publishedAt,
        },
      });

      if (claim.count === 0) {
        continue;
      }

      const announcement = await this.prisma.announcement.findUnique({
        where: {
          id: dueAnnouncement.id,
        },
        include: {
          authorEmployee: true,
          group: true,
          department: true,
          location: true,
          targetEmployee: true,
          groupTargets: true,
          employeeTargets: true,
        },
      });

      if (!announcement) {
        continue;
      }

      const normalizedGroupIds =
        announcement.groupTargets.length > 0
          ? announcement.groupTargets.map((target) => target.groupId)
          : announcement.groupId
            ? [announcement.groupId]
            : [];
      const normalizedTargetEmployeeIds =
        announcement.employeeTargets.length > 0
          ? announcement.employeeTargets.map((target) => target.employeeId)
          : announcement.targetEmployeeId
            ? [announcement.targetEmployeeId]
            : [];

      await this.completeAnnouncementPublication({
        actorUserId: announcement.authorEmployee?.userId ?? undefined,
        announcement,
        auditAction: "announcement.published",
        authorEmployeeId: announcement.authorEmployeeId,
        authorUserId: announcement.authorEmployee?.userId ?? null,
        departmentId: announcement.departmentId,
        locationId: announcement.locationId,
        normalizedGroupIds,
        normalizedTargetEmployeeIds,
        reason: "announcement.published",
        tenantId: announcement.tenantId,
      });
      publishedCount += 1;
    }

    return publishedCount;
  }

  async createTask(userId: string, dto: CreateTaskDto) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    if (!dto.assigneeEmployeeId && !dto.groupId) {
      throw new BadRequestException(
        "Task must target either an employee or a group.",
      );
    }

    if (dto.assigneeEmployeeId && dto.groupId) {
      throw new BadRequestException(
        "Task cannot target both an employee and a group at the same time.",
      );
    }

    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;

    if (dueAt && (Number.isNaN(dueAt.getTime()) || dueAt < new Date())) {
      throw new BadRequestException("Task due date cannot be in the past.");
    }

    const checklist = (dto.checklist ?? [])
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const assignees = dto.groupId
      ? await this.resolveGroupAssignees(manager.tenantId, dto.groupId)
      : await this.resolveDirectAssignee(
          manager.tenantId,
          dto.assigneeEmployeeId!,
        );

    if (assignees.length === 0) {
      throw new BadRequestException("Task has no assignees.");
    }

    const normalizedTitle = dto.title.trim();
    if (dueAt && normalizedTitle) {
      const duplicateConflict = await this.findTaskCreationConflict(
        manager.tenantId,
        assignees.map((assignee) => assignee.id),
        normalizedTitle,
        dueAt,
      );

      if (duplicateConflict) {
        throw new BadRequestException(
          `Task "${normalizedTitle}" already exists for ${duplicateConflict.employeeName} on the selected day.`,
        );
      }
    }

    const tasks = await this.prisma.$transaction(async (tx) => {
      const createdTasks = [];
      const groupThread =
        dto.groupId && assignees.length > 0
          ? await this.ensureGroupChatThread(
              tx,
              manager.tenantId,
              manager.id,
              dto.groupId,
            )
          : null;

      for (const assignee of assignees) {
        const task = await tx.task.create({
          data: {
            tenantId: manager.tenantId,
            managerEmployeeId: manager.id,
            assigneeEmployeeId: assignee.id,
            groupId: dto.groupId ?? null,
            title: dto.title,
            description: dto.description,
            priority: dto.priority ?? TaskPriority.MEDIUM,
            requiresPhoto: dto.requiresPhoto ?? false,
            dueAt,
            checklistItems: {
              create: checklist.map((title, index) => ({
                tenantId: manager.tenantId,
                title,
                sortOrder: index + 1,
              })),
            },
            activities: {
              create: {
                tenantId: manager.tenantId,
                actorEmployeeId: manager.id,
                kind: TaskActivityKind.CREATED,
                body: dto.groupId
                  ? `Assigned via group ${dto.groupId}.`
                  : "Assigned directly.",
              },
            },
          },
          include: this.taskInclude(),
        });

        createdTasks.push(task);

        const chatThread = dto.groupId
          ? groupThread!
          : await this.ensureDirectChatThread(
              tx,
              manager.tenantId,
              manager.id,
              assignee.id,
            );

        await tx.chatMessage.create({
          data: {
            tenantId: manager.tenantId,
            threadId: chatThread.id,
            authorEmployeeId: manager.id,
            body: `New task assigned: ${task.title}`,
          },
        });

        await tx.chatThread.update({
          where: { id: chatThread.id },
          data: { updatedAt: new Date() },
        });
      }

      return createdTasks;
    });

    await this.auditService.log({
      tenantId: manager.tenantId,
      actorUserId: userId,
      entityType: "task_batch",
      entityId: dto.groupId ?? dto.assigneeEmployeeId ?? tasks[0]?.id ?? "task",
      action: "task.created",
      metadata: {
        taskCount: tasks.length,
        title: dto.title,
        groupId: dto.groupId ?? null,
        groupName: tasks[0]?.group?.name ?? null,
        assigneeEmployeeId: dto.assigneeEmployeeId ?? null,
        assigneeEmployeeIds: Array.from(
          new Set(
            tasks
              .map((task) => task.assigneeEmployeeId)
              .filter((value): value is string => Boolean(value)),
          ),
        ),
      },
    });

    this.queueTranslationPrewarm(
      this.collectTaskTranslationTexts({
        title: dto.title,
        description: dto.description,
        checklist,
      }),
    );

    for (const task of tasks) {
      if (task.assigneeEmployee?.userId) {
        await this.notificationsService.createForUser({
          tenantId: manager.tenantId,
          userId: task.assigneeEmployee.userId,
          type: NotificationType.OPERATIONS_ALERT,
          title: `New task: ${task.title}`,
          body: `${manager.firstName} ${manager.lastName} assigned you a task.`,
          actionUrl: "/employee/tasks",
          metadata: {
            taskId: task.id,
            groupId: task.groupId,
          },
        });
        void this.collaborationRealtimeService.fanoutThreadUpdated(
          task.assigneeEmployee.userId,
          {
            taskId: task.id,
          },
        );
      }
    }

    await this.emitWorkspaceRefreshForTasks(tasks, "task.created");

    return tasks.map((task) => this.serializeTaskWithPhotoProofUrls(task));
  }

  async listTaskTemplates(userId: string) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    return this.prisma.taskTemplate.findMany({
      where: {
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
      },
      include: {
        group: true,
        department: true,
        location: true,
        assigneeEmployee: true,
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  }

  async createTaskTemplate(userId: string, dto: CreateTaskTemplateDto) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    await this.validateTaskTemplateTarget(manager.tenantId, dto);
    const checklist = this.normalizeChecklist(dto.checklist);

    const template = await this.prisma.taskTemplate.create({
      data: {
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
        assigneeEmployeeId: dto.assigneeEmployeeId ?? null,
        groupId: dto.groupId ?? null,
        departmentId: dto.departmentId ?? null,
        locationId: dto.locationId ?? null,
        title: dto.title,
        description: dto.description,
        priority: dto.priority ?? TaskPriority.MEDIUM,
        requiresPhoto: dto.requiresPhoto ?? false,
        expandOnDemand: dto.expandOnDemand ?? false,
        frequency: dto.frequency,
        weekDaysJson: dto.weekDays?.length
          ? JSON.stringify(Array.from(new Set(dto.weekDays)).sort())
          : null,
        dayOfMonth: dto.dayOfMonth ?? null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        dueAfterDays: dto.dueAfterDays ?? 0,
        dueTimeLocal: dto.dueTimeLocal ?? null,
        checklistJson: checklist.length ? JSON.stringify(checklist) : null,
        isActive: dto.isActive ?? true,
      },
      include: {
        group: true,
        department: true,
        location: true,
        assigneeEmployee: true,
      },
    });

    await this.auditService.log({
      tenantId: manager.tenantId,
      actorUserId: userId,
      entityType: "task_template",
      entityId: template.id,
      action: "task_template.created",
      metadata: {
        frequency: template.frequency,
        requiresPhoto: template.requiresPhoto,
        expandOnDemand: template.expandOnDemand,
        groupId: template.groupId,
        assigneeEmployeeId: template.assigneeEmployeeId,
        departmentId: template.departmentId,
        locationId: template.locationId,
      },
    });

    this.queueTranslationPrewarm(
      this.collectTaskTranslationTexts({
        title: template.title,
        description: template.description,
        checklist,
      }),
    );

    return template;
  }

  async updateTaskTemplate(
    userId: string,
    templateId: string,
    dto: UpdateTaskTemplateDto,
  ) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const template = await this.prisma.taskTemplate.findFirst({
      where: {
        id: templateId,
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
      },
    });

    if (!template) {
      throw new NotFoundException("Task template not found.");
    }

    await this.validateTaskTemplateTarget(manager.tenantId, dto);
    const checklist = this.normalizeChecklist(dto.checklist);

    const updated = await this.prisma.taskTemplate.update({
      where: { id: template.id },
      data: {
        assigneeEmployeeId: dto.assigneeEmployeeId ?? null,
        groupId: dto.groupId ?? null,
        departmentId: dto.departmentId ?? null,
        locationId: dto.locationId ?? null,
        title: dto.title,
        description: dto.description,
        priority: dto.priority ?? TaskPriority.MEDIUM,
        requiresPhoto: dto.requiresPhoto ?? template.requiresPhoto,
        expandOnDemand: dto.expandOnDemand ?? template.expandOnDemand,
        frequency: dto.frequency,
        weekDaysJson: dto.weekDays?.length
          ? JSON.stringify(Array.from(new Set(dto.weekDays)).sort())
          : null,
        dayOfMonth: dto.dayOfMonth ?? null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        dueAfterDays: dto.dueAfterDays ?? 0,
        dueTimeLocal: dto.dueTimeLocal ?? null,
        checklistJson: checklist.length ? JSON.stringify(checklist) : null,
        isActive: dto.isActive ?? template.isActive,
      },
      include: {
        group: true,
        department: true,
        location: true,
        assigneeEmployee: true,
      },
    });

    await this.auditService.log({
      tenantId: manager.tenantId,
      actorUserId: userId,
      entityType: "task_template",
      entityId: template.id,
      action: "task_template.updated",
      metadata: {
        frequency: updated.frequency,
        requiresPhoto: updated.requiresPhoto,
        expandOnDemand: updated.expandOnDemand,
        groupId: updated.groupId,
        assigneeEmployeeId: updated.assigneeEmployeeId,
        departmentId: updated.departmentId,
        locationId: updated.locationId,
      },
    });

    this.queueTranslationPrewarm(
      this.collectTaskTranslationTexts({
        title: updated.title,
        description: updated.description,
        checklist,
      }),
    );

    return updated;
  }

  async toggleTaskTemplate(
    userId: string,
    templateId: string,
    dto: ToggleTaskTemplateDto,
  ) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const template = await this.prisma.taskTemplate.findFirst({
      where: {
        id: templateId,
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
      },
    });

    if (!template) {
      throw new NotFoundException("Task template not found.");
    }

    const updated = await this.prisma.taskTemplate.update({
      where: { id: template.id },
      data: {
        isActive: dto.isActive,
      },
      include: {
        group: true,
        department: true,
        location: true,
        assigneeEmployee: true,
      },
    });

    await this.auditService.log({
      tenantId: manager.tenantId,
      actorUserId: userId,
      entityType: "task_template",
      entityId: template.id,
      action: dto.isActive ? "task_template.activated" : "task_template.paused",
    });

    return updated;
  }

  async runDueTaskTemplates(userId: string) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    return this.runDueTaskTemplatesForScope({
      tenantId: manager.tenantId,
      managerEmployeeId: manager.id,
      actorUserId: userId,
    });
  }

  async deleteTaskTemplate(userId: string, templateId: string) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const template = await this.prisma.taskTemplate.findFirst({
      where: {
        id: templateId,
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
      },
    });

    if (!template) {
      throw new NotFoundException("Task template not found.");
    }

    await this.prisma.taskTemplate.delete({
      where: { id: template.id },
    });

    await this.auditService.log({
      tenantId: manager.tenantId,
      actorUserId: userId,
      entityType: "task_template",
      entityId: template.id,
      action: "task_template.deleted",
    });

    return { success: true };
  }

  async runDueTaskTemplatesForAllTenants() {
    const templates = await this.prisma.taskTemplate.findMany({
      where: {
        isActive: true,
      },
      select: {
        tenantId: true,
        managerEmployeeId: true,
      },
      distinct: ["tenantId", "managerEmployeeId"],
    });

    for (const scope of templates) {
      await this.runDueTaskTemplatesForScope({
        tenantId: scope.tenantId,
        managerEmployeeId: scope.managerEmployeeId,
      });
    }
  }

  async listManagerTasks(userId: string, query: ListManagerTasksQueryDto) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const now = new Date();
    const taskWindow = this.resolveTaskWindow(query);
    const onlyOverdue = query.onlyOverdue === "true";

    const tasks = await this.prisma.task.findMany({
      where: {
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
        title: query.search
          ? {
              contains: query.search,
              mode: "insensitive",
            }
          : undefined,
        status:
          query.status ??
          (onlyOverdue
            ? {
                notIn: [TaskStatus.DONE, TaskStatus.CANCELLED],
              }
            : undefined),
        priority: query.priority,
        groupId: query.groupId,
        assigneeEmployeeId: query.assigneeEmployeeId,
        dueAt: onlyOverdue && !taskWindow ? { lt: now } : undefined,
        assigneeEmployee:
          query.departmentId || query.locationId
            ? {
                departmentId: query.departmentId,
                primaryLocationId: query.locationId,
              }
            : undefined,
        ...this.buildTaskDateWhere(taskWindow),
      },
      include: this.taskListInclude(),
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    });

    const serializedTasks = tasks.map((task) =>
      this.serializeTaskWithPhotoProofUrls(task),
    );
    let boardTasks: Array<
      | (typeof serializedTasks)[number]
      | Awaited<ReturnType<typeof this.buildRecurringTasksForManager>>[number]
    > = serializedTasks;

    if (taskWindow) {
      const recurringTasks = await this.buildRecurringTasksForManager(
        manager,
        taskWindow.start,
        taskWindow.end,
        query,
      );
      boardTasks = [...boardTasks, ...recurringTasks].sort((left, right) => {
        const leftDone =
          left.status === TaskStatus.DONE || left.status === TaskStatus.CANCELLED
            ? 1
            : 0;
        const rightDone =
          right.status === TaskStatus.DONE ||
          right.status === TaskStatus.CANCELLED
            ? 1
            : 0;
        if (leftDone !== rightDone) {
          return leftDone - rightDone;
        }

        const leftDueAt = left.dueAt
          ? new Date(left.dueAt).getTime()
          : Number.POSITIVE_INFINITY;
        const rightDueAt = right.dueAt
          ? new Date(right.dueAt).getTime()
          : Number.POSITIVE_INFINITY;
        if (leftDueAt !== rightDueAt) {
          return leftDueAt - rightDueAt;
        }

        return (
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        );
      });
    }

    const statusFilteredTasks = query.status
      ? boardTasks.filter((task) => task.status === query.status)
      : boardTasks;

    const filteredTasks =
      query.onlyOverdue === "true"
        ? statusFilteredTasks.filter(
            (task) =>
              task.status !== TaskStatus.DONE &&
              task.status !== TaskStatus.CANCELLED &&
              task.dueAt &&
              new Date(task.dueAt) < now,
          )
        : statusFilteredTasks;

    return {
      totals: {
        total: filteredTasks.length,
        overdue: filteredTasks.filter(
          (task) =>
            task.status !== TaskStatus.DONE &&
            task.status !== TaskStatus.CANCELLED &&
            task.dueAt &&
            new Date(task.dueAt) < now,
        ).length,
        active: filteredTasks.filter(
          (task) =>
            task.status !== TaskStatus.DONE &&
            task.status !== TaskStatus.CANCELLED,
        ).length,
        done: filteredTasks.filter((task) => task.status === TaskStatus.DONE)
          .length,
      },
      tasks: filteredTasks,
    };
  }

  async getTaskAutomationPolicy(userId: string) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    return this.prisma.taskAutomationPolicy.upsert({
      where: { tenantId: manager.tenantId },
      update: {},
      create: {
        tenantId: manager.tenantId,
      },
    });
  }

  async updateTaskAutomationPolicy(
    userId: string,
    dto: UpdateTaskAutomationPolicyDto,
  ) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const policy = await this.prisma.taskAutomationPolicy.upsert({
      where: { tenantId: manager.tenantId },
      update: dto,
      create: {
        tenantId: manager.tenantId,
        ...dto,
      },
    });

    await this.auditService.log({
      tenantId: manager.tenantId,
      actorUserId: userId,
      entityType: "task_automation_policy",
      entityId: policy.id,
      action: "task_automation_policy.updated",
      metadata: { ...dto },
    });

    return policy;
  }

  async runTaskAutomation(userId: string) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const policy = await this.getTaskAutomationPolicy(userId);
    return this.runTaskAutomationForManager(manager, policy, userId);
  }

  async runTaskAutomationForAllManagers() {
    const scopes = await this.prisma.task.findMany({
      where: {
        status: {
          in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
        },
      },
      select: {
        tenantId: true,
        managerEmployeeId: true,
      },
      distinct: ["tenantId", "managerEmployeeId"],
    });

    for (const scope of scopes) {
      const manager = await this.prisma.employee.findUnique({
        where: { id: scope.managerEmployeeId },
      });
      if (!manager) continue;

      const policy = await this.prisma.taskAutomationPolicy.upsert({
        where: { tenantId: scope.tenantId },
        update: {},
        create: { tenantId: scope.tenantId },
      });
      await this.runTaskAutomationForManager(manager, policy);
    }
  }

  private async runTaskAutomationForManager(
    manager: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string;
      userId: string | null;
    },
    policy: {
      tenantId: string;
      reminderLeadDays: number;
      reminderRepeatHours: number;
      escalationDelayDays: number;
      escalateToManager: boolean;
      notifyAssignee: boolean;
      sendChatMessages: boolean;
    },
    actorUserId?: string,
  ) {
    const now = new Date();
    const reminderBoundary = new Date(now);
    reminderBoundary.setDate(
      reminderBoundary.getDate() + policy.reminderLeadDays,
    );
    const escalationBoundary = new Date(now);
    escalationBoundary.setDate(
      escalationBoundary.getDate() - policy.escalationDelayDays,
    );
    const repeatBoundary = new Date(
      now.getTime() - policy.reminderRepeatHours * 60 * 60 * 1000,
    );

    const tasks = await this.prisma.task.findMany({
      where: {
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
        status: {
          in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
        },
        dueAt: {
          not: null,
        },
      },
      include: this.taskInclude(),
    });

    const reminderTasks = tasks.filter(
      (task) =>
        task.dueAt &&
        new Date(task.dueAt) >= now &&
        new Date(task.dueAt) <= reminderBoundary &&
        (!task.lastReminderAt ||
          new Date(task.lastReminderAt) <= repeatBoundary),
    );
    const escalationTasks = tasks.filter(
      (task) =>
        task.dueAt &&
        new Date(task.dueAt) <= escalationBoundary &&
        (!task.lastEscalatedAt ||
          new Date(task.lastEscalatedAt) <= repeatBoundary),
    );

    const remindedTaskIds: string[] = [];
    const escalatedTaskIds: string[] = [];

    for (const task of reminderTasks) {
      await this.triggerTaskReminder(manager, task, {
        notifyAssignee: policy.notifyAssignee,
        sendChatMessages: policy.sendChatMessages,
        markReminderAt: true,
        escalation: false,
      });
      remindedTaskIds.push(task.id);
    }

    for (const task of escalationTasks) {
      await this.triggerTaskReminder(manager, task, {
        notifyAssignee: policy.notifyAssignee,
        sendChatMessages: policy.sendChatMessages,
        markReminderAt: true,
        escalation: true,
        escalateToManager: policy.escalateToManager,
      });
      escalatedTaskIds.push(task.id);
    }

    if (actorUserId) {
      await this.auditService.log({
        tenantId: manager.tenantId,
        actorUserId,
        entityType: "task_automation",
        entityId: manager.id,
        action: "task_automation.run",
        metadata: {
          reminderCount: remindedTaskIds.length,
          escalationCount: escalatedTaskIds.length,
        },
      });
    }

    return {
      success: true,
      reminderCount: remindedTaskIds.length,
      escalationCount: escalatedTaskIds.length,
      remindedTaskIds,
      escalatedTaskIds,
    };
  }

  private async validateTaskTemplateTarget(
    tenantId: string,
    dto: Pick<
      CreateTaskTemplateDto,
      | "assigneeEmployeeId"
      | "groupId"
      | "departmentId"
      | "locationId"
      | "frequency"
      | "weekDays"
      | "dayOfMonth"
    >,
  ) {
    const selectedTargets = [
      dto.assigneeEmployeeId,
      dto.groupId,
      dto.departmentId,
      dto.locationId,
    ].filter((value) => Boolean(value));

    if (selectedTargets.length === 0) {
      throw new BadRequestException(
        "Template must target an employee, group, department, or location.",
      );
    }

    if (selectedTargets.length > 1) {
      throw new BadRequestException(
        "Template cannot target more than one scope at the same time.",
      );
    }

    if (
      dto.frequency === "WEEKLY" &&
      (!dto.weekDays || dto.weekDays.length === 0)
    ) {
      throw new BadRequestException(
        "Weekly template requires at least one weekday.",
      );
    }

    if (dto.frequency === "MONTHLY" && !dto.dayOfMonth) {
      throw new BadRequestException("Monthly template requires dayOfMonth.");
    }

    if (dto.groupId) {
      const group = await this.prisma.workGroup.findFirst({
        where: {
          id: dto.groupId,
          tenantId,
        },
      });

      if (!group) {
        throw new NotFoundException("Group not found.");
      }
    }

    if (dto.assigneeEmployeeId) {
      const employee = await this.prisma.employee.findFirst({
        where: {
          id: dto.assigneeEmployeeId,
          tenantId,
        },
      });

      if (!employee) {
        throw new NotFoundException("Assignee not found.");
      }
    }

    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: dto.departmentId,
          tenantId,
        },
      });

      if (!department) {
        throw new NotFoundException("Department not found.");
      }
    }

    if (dto.locationId) {
      const location = await this.prisma.location.findFirst({
        where: {
          id: dto.locationId,
          tenantId,
        },
      });

      if (!location) {
        throw new NotFoundException("Location not found.");
      }
    }
  }

  private normalizeChecklist(checklist?: string[]) {
    return (checklist ?? [])
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  async remindTask(userId: string, taskId: string) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
      },
      include: this.taskInclude(),
    });

    if (!task || !task.assigneeEmployee) {
      throw new NotFoundException("Task not found.");
    }

    await this.triggerTaskReminder(manager, task, {
      notifyAssignee: true,
      sendChatMessages: true,
      markReminderAt: true,
      escalation: false,
    });

    return { success: true };
  }

  async remindOverdueTasks(userId: string, dto: BulkRemindTasksDto) {
    const manager = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const now = new Date();
    const tasks = await this.prisma.task.findMany({
      where: {
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
        groupId: dto.groupId,
        status: {
          in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
        },
        dueAt: {
          lt: now,
        },
        assigneeEmployee:
          dto.departmentId || dto.locationId
            ? {
                departmentId: dto.departmentId,
                primaryLocationId: dto.locationId,
              }
            : undefined,
      },
      include: this.taskInclude(),
    });

    for (const task of tasks) {
      await this.remindTask(userId, task.id);
    }

    return {
      success: true,
      remindedCount: tasks.length,
    };
  }

  async listMyTasks(
    userId: string,
    query?: { date?: string; dateFrom?: string; dateTo?: string },
  ) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: {
        department: true,
        primaryLocation: true,
        groupMemberships: {
          select: {
            groupId: true,
          },
        },
      },
    });
    return this.listEmployeeTasksForResolvedEmployee(employee, query);
  }

  async listEmployeeTasksForRange(
    employeeId: string,
    query?: { date?: string; dateFrom?: string; dateTo?: string },
  ) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
      include: {
        department: true,
        primaryLocation: true,
        groupMemberships: {
          select: {
            groupId: true,
          },
        },
      },
    });

    return this.listEmployeeTasksForResolvedEmployee(employee, query);
  }

  private async listEmployeeTasksForResolvedEmployee(
    employee: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
      departmentId: string;
      primaryLocationId: string;
      department: { id: string; name: string };
      primaryLocation: { id: string; name: string };
      groupMemberships: Array<{ groupId: string }>;
    },
    query?: { date?: string; dateFrom?: string; dateTo?: string },
  ) {
    const taskWindow = this.resolveTaskWindow(query);

    const tasks = await this.prisma.task.findMany({
      where: {
        tenantId: employee.tenantId,
        assigneeEmployeeId: employee.id,
        ...this.buildTaskDateWhere(taskWindow),
      },
      include: this.taskListInclude(),
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    });

    if (!taskWindow) {
      return this.collapseEmployeeVisibleTasks(
        tasks.map((task) => this.serializeTaskWithPhotoProofUrls(task)),
      );
    }

    const recurringTasks = await this.buildRecurringTasksForEmployee(
      employee,
      taskWindow.start,
      taskWindow.end,
    );
    return this.collapseEmployeeVisibleTasks(
      [
        ...tasks.map((task) => this.serializeTaskWithPhotoProofUrls(task)),
        ...recurringTasks,
      ].sort((left, right) => {
        const leftDone =
          left.status === TaskStatus.DONE || left.status === TaskStatus.CANCELLED
            ? 1
            : 0;
        const rightDone =
          right.status === TaskStatus.DONE ||
          right.status === TaskStatus.CANCELLED
            ? 1
            : 0;
        if (leftDone !== rightDone) {
          return leftDone - rightDone;
        }

        const leftDueAt = left.dueAt
          ? new Date(left.dueAt).getTime()
          : Number.POSITIVE_INFINITY;
        const rightDueAt = right.dueAt
          ? new Date(right.dueAt).getTime()
          : Number.POSITIVE_INFINITY;
        if (leftDueAt !== rightDueAt) {
          return leftDueAt - rightDueAt;
        }

        return (
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
        );
      }),
    );
  }

  async getEmployeeInbox(userId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    const [notifications, tasks, chats, announcements] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          userId,
        },
        orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
        take: 40,
      }),
      this.prisma.task.findMany({
        where: {
          tenantId: employee.tenantId,
          assigneeEmployeeId: employee.id,
        },
        include: this.taskInclude(),
        orderBy: [{ updatedAt: "desc" }],
        take: 20,
      }),
      this.listChats(userId),
      this.listMyAnnouncements(userId),
    ]);

    const summary = {
      unreadNotifications: notifications.filter((item) => !item.isRead).length,
      unreadChats: chats.reduce(
        (total, thread) => total + (thread.unreadCount ?? 0),
        0,
      ),
      pendingTasks: tasks.filter(
        (task) =>
          task.status !== TaskStatus.DONE &&
          task.status !== TaskStatus.CANCELLED,
      ).length,
      pinnedAnnouncements: announcements.filter((item) => item.isPinned).length,
      totalAttention: 0,
    };

    summary.totalAttention =
      summary.unreadNotifications + summary.unreadChats + summary.pendingTasks;

    const items = [
      ...notifications.map((notification) => ({
        id: `notification:${notification.id}`,
        kind: "NOTIFICATION" as const,
        entityId: notification.id,
        title: notification.title,
        preview: notification.body,
        createdAt: notification.createdAt.toISOString(),
        actionUrl: notification.actionUrl ?? "/employee/notifications",
        isUnread: !notification.isRead,
        isActionRequired: !notification.isRead,
        badge: notification.type,
        actor: null,
      })),
      ...tasks.map((task) => ({
        id: `task:${task.id}`,
        kind: "TASK" as const,
        entityId: task.id,
        title: task.title,
        preview:
          task.description ??
          (task.group ? `Group: ${task.group.name}` : "Task assignment"),
        createdAt: task.updatedAt.toISOString(),
        actionUrl: `/employee/tasks?taskId=${task.id}`,
        isUnread: task.status === TaskStatus.TODO,
        isActionRequired:
          task.status !== TaskStatus.DONE &&
          task.status !== TaskStatus.CANCELLED,
        badge: task.status,
        actor: {
          id: task.managerEmployee.id,
          firstName: task.managerEmployee.firstName,
          lastName: task.managerEmployee.lastName,
        },
      })),
      ...chats.map((thread) => {
        const lastMessage = thread.messages[thread.messages.length - 1] ?? null;
        return {
          id: `chat:${thread.id}`,
          kind: "CHAT" as const,
          entityId: thread.id,
          title:
            thread.title ??
            thread.group?.name ??
            thread.participants
              .map(
                (participant) =>
                  `${participant.employee.firstName} ${participant.employee.lastName}`,
              )
              .join(", "),
          preview: lastMessage?.body ?? null,
          createdAt: lastMessage?.createdAt ?? thread.updatedAt.toISOString(),
          actionUrl: `/employee/chats?threadId=${thread.id}`,
          isUnread: (thread.unreadCount ?? 0) > 0,
          isActionRequired: (thread.unreadCount ?? 0) > 0,
          badge: thread.kind,
          actor: lastMessage
            ? {
                id: lastMessage.authorEmployee.id,
                firstName: lastMessage.authorEmployee.firstName,
                lastName: lastMessage.authorEmployee.lastName,
              }
            : null,
        };
      }),
      ...announcements.map((announcement) => ({
        id: `announcement:${announcement.id}`,
        kind: "ANNOUNCEMENT" as const,
        entityId: announcement.id,
        title: announcement.title,
        preview: announcement.body,
        createdAt: announcement.createdAt.toISOString(),
        actionUrl: "/employee/announcements",
        isUnread: false,
        isActionRequired: false,
        badge: announcement.isPinned ? "PINNED" : announcement.audience,
        actor: {
          id: announcement.authorEmployee.id,
          firstName: announcement.authorEmployee.firstName,
          lastName: announcement.authorEmployee.lastName,
        },
      })),
    ].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );

    return {
      summary,
      items,
    };
  }

  async getEmployeeInboxSummary(userId: string) {
    const inbox = await this.getEmployeeInbox(userId);
    return inbox.summary;
  }

  async listChats(userId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    const participations = await this.prisma.chatParticipant.findMany({
      where: {
        employeeId: employee.id,
      },
      include: {
        thread: {
          include: this.chatInclude(),
        },
      },
      orderBy: {
        thread: {
          updatedAt: "desc",
        },
      },
    });

    return participations.map((participant) => ({
      ...participant.thread,
      unreadCount: participant.lastReadAt
        ? participant.thread.messages.filter(
            (message) =>
              new Date(message.createdAt) >
                new Date(participant.lastReadAt as Date) &&
              message.authorEmployeeId !== employee.id,
          ).length
        : participant.thread.messages.filter(
            (message) => message.authorEmployeeId !== employee.id,
          ).length,
      lastReadAt: participant.lastReadAt,
    }));
  }

  async createChat(userId: string, dto: CreateChatThreadDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    if (!dto.employeeId && !dto.groupId) {
      throw new BadRequestException("Chat must target an employee or a group.");
    }

    if (dto.employeeId && dto.groupId) {
      throw new BadRequestException(
        "Chat cannot target both an employee and a group.",
      );
    }

    if (dto.employeeId) {
      const target = await this.prisma.employee.findFirst({
        where: {
          id: dto.employeeId,
          tenantId: employee.tenantId,
        },
      });

      if (!target) {
        throw new NotFoundException("Employee not found.");
      }

      const existing = await this.prisma.chatThread.findFirst({
        where: {
          tenantId: employee.tenantId,
          kind: ChatThreadKind.DIRECT,
          participants: {
            some: { employeeId: employee.id },
          },
          AND: [
            { participants: { some: { employeeId: target.id } } },
            {
              participants: {
                every: { employeeId: { in: [employee.id, target.id] } },
              },
            },
          ],
        },
        include: this.chatInclude(),
      });

      if (existing) {
        return existing;
      }

      return this.prisma.chatThread.create({
        data: {
          tenantId: employee.tenantId,
          createdByEmployeeId: employee.id,
          kind: ChatThreadKind.DIRECT,
          title: dto.title ?? null,
          participants: {
            create: [
              { tenantId: employee.tenantId, employeeId: employee.id },
              { tenantId: employee.tenantId, employeeId: target.id },
            ],
          },
        },
        include: this.chatInclude(),
      });
    }

    const group = await this.prisma.workGroup.findFirst({
      where: {
        id: dto.groupId,
        tenantId: employee.tenantId,
      },
      include: {
        memberships: true,
      },
    });

    if (!group) {
      throw new NotFoundException("Group not found.");
    }

    const existing = await this.prisma.chatThread.findFirst({
      where: {
        tenantId: employee.tenantId,
        kind: ChatThreadKind.GROUP,
        groupId: group.id,
      },
      include: this.chatInclude(),
    });

    if (existing) {
      return existing;
    }

    const participantIds = Array.from(
      new Set([
        employee.id,
        ...group.memberships.map((item) => item.employeeId),
      ]),
    );

    return this.prisma.chatThread.create({
      data: {
        tenantId: employee.tenantId,
        createdByEmployeeId: employee.id,
        kind: ChatThreadKind.GROUP,
        title: dto.title ?? group.name,
        groupId: group.id,
        participants: {
          create: participantIds.map((employeeId) => ({
            tenantId: employee.tenantId,
            employeeId,
          })),
        },
      },
      include: this.chatInclude(),
    });
  }

  async getChat(userId: string, threadId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const participation = await this.prisma.chatParticipant.findFirst({
      where: {
        tenantId: employee.tenantId,
        employeeId: employee.id,
        threadId,
      },
    });

    if (!participation) {
      throw new ForbiddenException("Current user cannot access this chat.");
    }

    return this.prisma.chatThread.findUniqueOrThrow({
      where: { id: threadId },
      include: this.chatInclude(),
    });
  }

  async sendChatMessage(
    userId: string,
    threadId: string,
    dto: SendChatMessageDto,
  ) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const thread = await this.prisma.chatThread.findFirst({
      where: {
        id: threadId,
        tenantId: employee.tenantId,
        participants: {
          some: {
            employeeId: employee.id,
          },
        },
      },
      include: this.chatInclude(),
    });

    if (!thread) {
      throw new ForbiddenException(
        "Current user cannot send messages to this chat.",
      );
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          tenantId: employee.tenantId,
          threadId: thread.id,
          authorEmployeeId: employee.id,
          body: dto.body,
        },
        include: {
          authorEmployee: true,
        },
      });

      await tx.chatThread.update({
        where: { id: thread.id },
        data: { updatedAt: new Date() },
      });

      await tx.chatParticipant.updateMany({
        where: {
          threadId: thread.id,
          employeeId: employee.id,
        },
        data: {
          lastReadAt: new Date(),
        },
      });

      return created;
    });

    for (const participant of thread.participants) {
      if (
        participant.employee.userId &&
        participant.employeeId !== employee.id
      ) {
        await this.notificationsService.createForUser({
          tenantId: employee.tenantId,
          userId: participant.employee.userId,
          type: NotificationType.OPERATIONS_ALERT,
          title: `${employee.firstName} ${employee.lastName} sent a message`,
          body: dto.body,
          actionUrl: "/employee/chats",
          metadata: {
            threadId: thread.id,
            messageId: message.id,
          },
        });
      }
    }

    void this.collaborationRealtimeService.fanoutThreadMessage(thread.id, {
      threadId: thread.id,
      message,
    });

    for (const participant of thread.participants) {
      if (participant.employee.userId) {
        void this.collaborationRealtimeService.fanoutThreadUpdated(
          participant.employee.userId,
          {
            threadId: thread.id,
            updatedAt: new Date().toISOString(),
          },
        );
      }
    }

    return this.getChat(userId, threadId);
  }

  async markChatRead(userId: string, threadId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    await this.prisma.chatParticipant.updateMany({
      where: {
        employeeId: employee.id,
        threadId,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    if (employee.userId) {
      void this.collaborationRealtimeService.fanoutThreadUpdated(employee.userId, {
        threadId,
        readAt: new Date().toISOString(),
      });
    }

    return { success: true };
  }

  async setTaskStatus(userId: string, taskId: string, dto: SetTaskStatusDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: {
        department: true,
        primaryLocation: true,
        groupMemberships: {
          select: {
            groupId: true,
          },
        },
      },
    });
    const recurringTaskRef = this.parseRecurringTaskId(taskId);
    if (recurringTaskRef) {
      return this.setRecurringTaskStatus(
        userId,
        employee,
        recurringTaskRef,
        dto,
      );
    }

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        tenantId: employee.tenantId,
      },
      include: this.taskInclude(),
    });

    if (!task) {
      throw new NotFoundException("Task not found.");
    }

    if (!this.canAccessTask(employee.id, task)) {
      throw new ForbiddenException("Current user cannot update this task.");
    }

    if (
      dto.status === TaskStatus.DONE &&
      task.requiresPhoto &&
      task.photoProofs.filter(
        (proof) => !proof.deletedAt && !proof.supersededByProofId,
      ).length === 0
    ) {
      throw new BadRequestException(
        "Photo proof is required before completing this task.",
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.taskActivity.create({
        data: {
          tenantId: employee.tenantId,
          taskId: task.id,
          actorEmployeeId: employee.id,
          kind: TaskActivityKind.STATUS_CHANGED,
          body: dto.comment ?? `Status changed to ${dto.status}.`,
        },
      });

      await tx.task.update({
        where: { id: task.id },
        data: {
          status: dto.status,
          completedAt: dto.status === TaskStatus.DONE ? new Date() : null,
        },
      });

      return tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: this.taskInclude(),
      });
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: "task",
      entityId: task.id,
      action: "task.status_updated",
      metadata: {
        status: dto.status,
      },
    });

    await this.emitWorkspaceRefreshForTasks([updated], "task.status_updated");

    return this.serializeTaskWithPhotoProofUrls(updated);
  }

  async rescheduleTask(userId: string, taskId: string, dto: RescheduleTaskDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: {
        department: true,
        primaryLocation: true,
        groupMemberships: {
          select: {
            groupId: true,
          },
        },
      },
    });
    const nextDueAt = new Date(dto.dueAt);

    if (Number.isNaN(nextDueAt.getTime()) || nextDueAt < new Date()) {
      throw new BadRequestException("Task due date cannot be in the past.");
    }

    const recurringTaskRef = this.parseRecurringTaskId(taskId);
    if (recurringTaskRef) {
      return this.rescheduleRecurringTask(
        userId,
        employee,
        recurringTaskRef,
        nextDueAt,
        dto,
      );
    }

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        tenantId: employee.tenantId,
      },
      include: this.taskInclude(),
    });

    if (!task) {
      throw new NotFoundException("Task not found.");
    }

    if (!this.canAccessTask(employee.id, task)) {
      throw new ForbiddenException("Current user cannot reschedule this task.");
    }

    if (
      task.status === TaskStatus.DONE ||
      task.status === TaskStatus.CANCELLED
    ) {
      throw new BadRequestException("Only open tasks can be rescheduled.");
    }

    const previousDueAt = task.dueAt?.toISOString() ?? null;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.taskActivity.create({
        data: {
          tenantId: employee.tenantId,
          taskId: task.id,
          actorEmployeeId: employee.id,
          kind: TaskActivityKind.COMMENT,
          body:
            dto.comment ??
            `Task moved from ${previousDueAt ?? "unscheduled"} to ${nextDueAt.toISOString()}.`,
        },
      });

      await tx.task.update({
        where: { id: task.id },
        data: {
          dueAt: nextDueAt,
        },
      });

      return tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: this.taskInclude(),
      });
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: "task",
      entityId: task.id,
      action: "task.rescheduled",
      metadata: {
        from: previousDueAt,
        to: nextDueAt.toISOString(),
      },
    });

    await this.emitWorkspaceRefreshForTasks([updated], "task.rescheduled");

    return {
      task: this.serializeTaskWithPhotoProofUrls(updated),
      replacedTaskId: null,
    };
  }

  async toggleChecklistItem(userId: string, taskId: string, itemId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const item = await this.prisma.taskChecklistItem.findFirst({
      where: {
        id: itemId,
        taskId,
        tenantId: employee.tenantId,
      },
      include: {
        task: {
          include: this.taskInclude(),
        },
      },
    });

    if (!item) {
      throw new NotFoundException("Checklist item not found.");
    }

    if (!this.canAccessTask(employee.id, item.task)) {
      throw new ForbiddenException(
        "Current user cannot update this checklist item.",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.taskChecklistItem.update({
        where: { id: item.id },
        data: {
          isCompleted: !item.isCompleted,
          completedAt: item.isCompleted ? null : new Date(),
          completedByEmployeeId: item.isCompleted ? null : employee.id,
        },
      });

      await tx.taskActivity.create({
        data: {
          tenantId: employee.tenantId,
          taskId: taskId,
          actorEmployeeId: employee.id,
          kind: TaskActivityKind.CHECKLIST_TOGGLED,
          body: `${item.title}: ${item.isCompleted ? "unchecked" : "completed"}.`,
        },
      });
    });

    const updated = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: this.taskInclude(),
    });

    await this.emitWorkspaceRefreshForTasks([updated], "task.checklist_toggled");

    return this.serializeTaskWithPhotoProofUrls(updated);
  }

  private resolveAnnouncementAssetUrl(storageKey: string) {
    if (this.isDataUrl(storageKey) || /^https?:\/\//i.test(storageKey)) {
      return storageKey;
    }

    return this.storageService.getObjectUrl(storageKey);
  }

  private isDataUrl(value: string) {
    return /^data:.+;base64,/i.test(value);
  }

  private parseDataUrlMetadata(dataUrl: string) {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);

    if (!match) {
      throw new BadRequestException("Announcement asset is not a valid data URL.");
    }

    return {
      contentType: match[1],
      sizeBytes: Buffer.byteLength(match[2], "base64"),
    };
  }

  async addTaskComment(userId: string, taskId: string, body: string) {
    const dto: AddTaskCommentDto = { body };
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        tenantId: employee.tenantId,
      },
      include: this.taskInclude(),
    });

    if (!task) {
      throw new NotFoundException("Task not found.");
    }

    if (!this.canAccessTask(employee.id, task)) {
      throw new ForbiddenException("Current user cannot comment on this task.");
    }

    await this.prisma.taskActivity.create({
      data: {
        tenantId: employee.tenantId,
        taskId: task.id,
        actorEmployeeId: employee.id,
        kind: TaskActivityKind.COMMENT,
        body: dto.body,
      },
    });

    return this.serializeTaskWithPhotoProofUrls(
      await this.prisma.task.findUniqueOrThrow({
        where: { id: task.id },
        include: this.taskInclude(),
      }),
    );
  }

  async addTaskPhotoProof(
    userId: string,
    taskId: string,
    dto: CreateTaskPhotoProofDto,
  ) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: {
        department: true,
        primaryLocation: true,
        groupMemberships: {
          select: {
            groupId: true,
          },
        },
      },
    });
    const recurringTaskRef = this.parseRecurringTaskId(taskId);

    if (recurringTaskRef) {
      return this.addRecurringTaskPhotoProof(
        userId,
        employee,
        recurringTaskRef,
        dto,
      );
    }

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        tenantId: employee.tenantId,
      },
      include: this.taskInclude(),
    });

    if (!task) {
      throw new NotFoundException("Task not found.");
    }

    if (!this.canAccessTask(employee.id, task)) {
      throw new ForbiddenException("Current user cannot update this task.");
    }

    if (!task.requiresPhoto) {
      throw new BadRequestException("This task does not require photo proof.");
    }

    const activeProofs = task.photoProofs.filter(
      (proof) => !proof.deletedAt && !proof.supersededByProofId,
    );
    if (dto.action === "add" && activeProofs.length >= TASK_PHOTO_PROOF_LIMIT) {
      throw new BadRequestException(
        `Task photo proof limit is ${TASK_PHOTO_PROOF_LIMIT}.`,
      );
    }

    const targetProof =
      dto.action === "replace"
        ? activeProofs.find((proof) => proof.id === dto.targetProofId)
        : null;

    if (dto.action === "replace" && !targetProof) {
      throw new BadRequestException("Photo proof to replace was not found.");
    }

    const fileName = dto.fileName.trim() || "task-photo.jpg";
    const uploaded = await this.uploadTaskPhotoProof(
      employee.tenantId,
      task.id,
      employee.id,
      fileName,
      dto.dataUrl,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const createdProof = await tx.taskPhotoProof.create({
        data: {
          tenantId: employee.tenantId,
          taskId: task.id,
          uploadedByEmployeeId: employee.id,
          fileName,
          storageKey: uploaded.key,
        },
      });

      if (targetProof) {
        await tx.taskPhotoProof.update({
          where: { id: targetProof.id },
          data: {
            supersededByProofId: createdProof.id,
          },
        });
      }

      return tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: this.taskInclude(),
      });
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: "task",
      entityId: task.id,
      action:
        dto.action === "replace"
          ? "task.photo_proof_replaced"
          : "task.photo_proof_added",
      metadata: {
        proofStorageKey: uploaded.key,
        targetProofId: targetProof?.id ?? null,
      },
    });

    await this.emitWorkspaceRefreshForTasks([updated], "task.photo_proof_added");

    return this.serializeTaskWithPhotoProofUrls(updated);
  }

  async deleteTaskPhotoProof(userId: string, taskId: string, proofId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: {
        department: true,
        primaryLocation: true,
        groupMemberships: {
          select: {
            groupId: true,
          },
        },
      },
    });
    const recurringTaskRef = this.parseRecurringTaskId(taskId);

    if (recurringTaskRef) {
      return this.deleteRecurringTaskPhotoProof(
        userId,
        employee,
        recurringTaskRef,
        proofId,
      );
    }

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        tenantId: employee.tenantId,
      },
      include: this.taskInclude(),
    });

    if (!task) {
      throw new NotFoundException("Task not found.");
    }

    if (!this.canAccessTask(employee.id, task)) {
      throw new ForbiddenException("Current user cannot update this task.");
    }

    const targetProof = task.photoProofs.find(
      (proof) =>
        proof.id === proofId && !proof.deletedAt && !proof.supersededByProofId,
    );

    if (!targetProof) {
      throw new NotFoundException("Photo proof not found.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.taskPhotoProof.update({
        where: { id: targetProof.id },
        data: {
          deletedAt: new Date(),
        },
      });

      const nextTask = await tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: this.taskInclude(),
      });
      const remainingActive = nextTask.photoProofs.filter(
        (proof) => !proof.deletedAt && !proof.supersededByProofId,
      ).length;

      if (
        task.requiresPhoto &&
        task.status === TaskStatus.DONE &&
        remainingActive === 0
      ) {
        await tx.taskActivity.create({
          data: {
            tenantId: employee.tenantId,
            taskId: task.id,
            actorEmployeeId: employee.id,
            kind: TaskActivityKind.STATUS_CHANGED,
            body: "Status changed to TODO after removing the last photo proof.",
          },
        });

        await tx.task.update({
          where: { id: task.id },
          data: {
            status: TaskStatus.TODO,
            completedAt: null,
          },
        });
      }

      return tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: this.taskInclude(),
      });
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: "task",
      entityId: task.id,
      action: "task.photo_proof_deleted",
      metadata: {
        proofId,
      },
    });

    await this.emitWorkspaceRefreshForTasks([updated], "task.photo_proof_deleted");

    return this.serializeTaskWithPhotoProofUrls(updated);
  }

  private async resolveGroupAssignees(tenantId: string, groupId: string) {
    const group = await this.prisma.workGroup.findFirst({
      where: {
        id: groupId,
        tenantId,
      },
      include: {
        memberships: {
          include: {
            employee: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException("Group not found.");
    }

    return group.memberships.map((membership) => membership.employee);
  }

  private async resolveDirectAssignee(
    tenantId: string,
    assigneeEmployeeId: string,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: assigneeEmployeeId,
        tenantId,
      },
      include: {
        user: true,
      },
    });

    if (!employee) {
      throw new NotFoundException("Assignee not found.");
    }

    return [employee];
  }

  private async resolveDepartmentAssignees(
    tenantId: string,
    departmentId: string,
  ) {
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        departmentId,
      },
      include: {
        user: true,
      },
    });

    if (employees.length === 0) {
      throw new NotFoundException("Department has no employees.");
    }

    return employees;
  }

  private async resolveLocationAssignees(tenantId: string, locationId: string) {
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        primaryLocationId: locationId,
      },
      include: {
        user: true,
      },
    });

    if (employees.length === 0) {
      throw new NotFoundException("Location has no employees.");
    }

    return employees;
  }

  private async resolveAnnouncementRecipients(
    tenantId: string,
    audience: AnnouncementAudience,
    groupId: string | null | undefined,
    targetEmployeeId: string | null | undefined,
    groupIds: string[] | null | undefined,
    targetEmployeeIds: string[] | null | undefined,
    departmentId: string | null | undefined,
    locationId: string | null | undefined,
    authorEmployeeId: string,
  ) {
    const normalizedGroupIds = this.normalizeAnnouncementScopeIds(groupId, groupIds);
    const normalizedTargetEmployeeIds = this.normalizeAnnouncementScopeIds(
      targetEmployeeId,
      targetEmployeeIds,
    );

    if (audience === AnnouncementAudience.ALL) {
      return this.prisma.employee.findMany({
        where: {
          tenantId,
          id: { not: authorEmployeeId },
        },
        include: { user: true },
      });
    }

    if (
      (audience === AnnouncementAudience.GROUP ||
        audience === AnnouncementAudience.EMPLOYEE) &&
      (normalizedGroupIds.length > 0 || normalizedTargetEmployeeIds.length > 0)
    ) {
      const recipientsById = new Map<string, Prisma.EmployeeGetPayload<{ include: { user: true } }>>();

      if (normalizedGroupIds.length > 0) {
        const memberships = await this.prisma.workGroupMembership.findMany({
          where: {
            tenantId,
            groupId: { in: normalizedGroupIds },
          },
          include: {
            employee: {
              include: { user: true },
            },
          },
        });

        memberships.forEach((membership) => {
          if (membership.employee.id !== authorEmployeeId) {
            recipientsById.set(membership.employee.id, membership.employee);
          }
        });
      }

      if (normalizedTargetEmployeeIds.length > 0) {
        const directEmployees = await this.prisma.employee.findMany({
          where: {
            tenantId,
            id: {
              in: normalizedTargetEmployeeIds.filter(
                (employeeId) => employeeId !== authorEmployeeId,
              ),
            },
          },
          include: { user: true },
        });

        directEmployees.forEach((employee) => {
          recipientsById.set(employee.id, employee);
        });
      }

      return Array.from(recipientsById.values());
    }

    if (
      audience === AnnouncementAudience.EMPLOYEE &&
      normalizedTargetEmployeeIds.length > 0
    ) {
      return this.prisma.employee.findMany({
        where: {
          tenantId,
          id: { in: normalizedTargetEmployeeIds },
        },
        include: { user: true },
      });
    }

    if (audience === AnnouncementAudience.GROUP && normalizedGroupIds.length > 0) {
      const memberships = await this.prisma.workGroupMembership.findMany({
        where: {
          tenantId,
          groupId: { in: normalizedGroupIds },
        },
        include: {
          employee: {
            include: { user: true },
          },
        },
      });

      return memberships
        .map((membership) => membership.employee)
        .filter((employee) => employee.id !== authorEmployeeId);
    }

    if (audience === AnnouncementAudience.DEPARTMENT && departmentId) {
      return this.prisma.employee.findMany({
        where: {
          tenantId,
          departmentId,
          id: { not: authorEmployeeId },
        },
        include: { user: true },
      });
    }

    if (audience === AnnouncementAudience.LOCATION && locationId) {
      return this.prisma.employee.findMany({
        where: {
          tenantId,
          primaryLocationId: locationId,
          id: { not: authorEmployeeId },
        },
        include: { user: true },
      });
    }

    return [];
  }

  private async publishAnnouncement(
    author: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string;
      userId?: string | null;
    },
    dto: {
      audience: AnnouncementAudience;
      groupId?: string | null;
      targetEmployeeId?: string | null;
      groupIds?: string[] | null;
      targetEmployeeIds?: string[] | null;
      departmentId?: string | null;
      locationId?: string | null;
      title: string;
      body: string;
      isPinned?: boolean;
      linkUrl?: string;
      attachmentLocation?: {
        address: string;
        placeId?: string;
        latitude: number;
        longitude: number;
      };
      attachments?: Array<{
        fileName: string;
        dataUrl: string;
      }>;
      imageDataUrl?: string;
      imageAspectRatio?: string;
      scheduledFor?: string;
    },
    actorUserId?: string,
    metadata?: Record<string, unknown>,
  ) {
    if (
      (dto.imageDataUrl && !dto.imageAspectRatio) ||
      (!dto.imageDataUrl && dto.imageAspectRatio)
    ) {
      throw new BadRequestException(
        "Announcement image requires both imageDataUrl and imageAspectRatio.",
      );
    }

    if (
      dto.imageAspectRatio &&
      !ANNOUNCEMENT_IMAGE_ASPECT_RATIOS.has(dto.imageAspectRatio)
    ) {
      throw new BadRequestException("Unsupported announcement image aspect ratio.");
    }

    if ((dto.attachments?.length ?? 0) > ANNOUNCEMENT_ATTACHMENT_LIMIT) {
      throw new BadRequestException(
        `Announcement supports up to ${ANNOUNCEMENT_ATTACHMENT_LIMIT} attachments.`,
      );
    }

    const normalizedGroupIds = this.normalizeAnnouncementScopeIds(
      dto.groupId,
      dto.groupIds,
    );
    const normalizedTargetEmployeeIds = this.normalizeAnnouncementScopeIds(
      dto.targetEmployeeId,
      dto.targetEmployeeIds,
    );
    const scheduledFor = this.parseScheduledAnnouncementDate(dto.scheduledFor);
    const shouldSchedule = Boolean(
      scheduledFor && scheduledFor.getTime() > Date.now(),
    );
    const normalizedLinkUrl = dto.linkUrl?.trim() || null;

    let announcement = await this.prisma.announcement.create({
      data: {
        tenantId: author.tenantId,
        authorEmployeeId: author.id,
        audience: dto.audience,
        groupId: normalizedGroupIds.length === 1 ? normalizedGroupIds[0] : null,
        targetEmployeeId:
          normalizedTargetEmployeeIds.length === 1
            ? normalizedTargetEmployeeIds[0]
            : null,
        departmentId: dto.departmentId ?? null,
        locationId: dto.locationId ?? null,
        title: dto.title,
        body: dto.body,
        isPinned: dto.isPinned ?? false,
        linkUrl: normalizedLinkUrl,
        attachmentLocationAddress: dto.attachmentLocation?.address?.trim() || null,
        attachmentLocationPlaceId:
          dto.attachmentLocation?.placeId?.trim() || null,
        attachmentLocationLatitude: dto.attachmentLocation?.latitude ?? null,
        attachmentLocationLongitude: dto.attachmentLocation?.longitude ?? null,
        scheduledFor: shouldSchedule ? scheduledFor : null,
        publishedAt: shouldSchedule ? null : new Date(),
        ...(normalizedGroupIds.length > 0
          ? {
              groupTargets: {
                create: normalizedGroupIds.map((targetGroupId) => ({
                  groupId: targetGroupId,
                })),
              },
            }
          : {}),
        ...(normalizedTargetEmployeeIds.length > 0
          ? {
              employeeTargets: {
                create: normalizedTargetEmployeeIds.map((employeeTargetId) => ({
                  employeeId: employeeTargetId,
                })),
              },
            }
          : {}),
      },
      include: {
        authorEmployee: true,
        group: true,
        department: true,
        location: true,
        targetEmployee: true,
        groupTargets: true,
        employeeTargets: true,
      },
    });

    if (dto.imageDataUrl && dto.imageAspectRatio) {
      const uploaded = await this.uploadAnnouncementImage(
        author.tenantId,
        announcement.id,
        dto.imageDataUrl,
      );

      announcement = await this.prisma.announcement.update({
        where: { id: announcement.id },
        data: {
          imageStorageKey: uploaded.key,
          imageAspectRatio: dto.imageAspectRatio,
        },
        include: {
          authorEmployee: true,
          group: true,
          department: true,
          location: true,
          targetEmployee: true,
          groupTargets: true,
          employeeTargets: true,
        },
      });
    }

    if (dto.attachments?.length) {
      const uploadedAttachments = await Promise.all(
        dto.attachments.map((attachment, index) =>
          this.uploadAnnouncementAttachment(
            author.tenantId,
            announcement.id,
            attachment.fileName,
            attachment.dataUrl,
            index,
          ),
        ),
      );

      announcement = await this.prisma.announcement.update({
        where: { id: announcement.id },
        data: {
          attachmentsJson: JSON.stringify(uploadedAttachments),
        },
        include: {
          authorEmployee: true,
          group: true,
          department: true,
          location: true,
          targetEmployee: true,
          groupTargets: true,
          employeeTargets: true,
        },
      });
    }

    if (shouldSchedule) {
      await this.auditService.log({
        tenantId: author.tenantId,
        actorUserId,
        entityType: "announcement",
        entityId: announcement.id,
        action: "announcement.created",
        metadata: {
          title: announcement.title,
          isPinned: announcement.isPinned,
          audience: announcement.audience,
          groupId: announcement.groupId,
          targetEmployeeId: announcement.targetEmployeeId,
          groupIds: normalizedGroupIds,
          targetEmployeeIds: normalizedTargetEmployeeIds,
          departmentId: announcement.departmentId,
          locationId: announcement.locationId,
          linkUrl: announcement.linkUrl,
          scheduledFor: scheduledFor?.toISOString() ?? null,
          hasAttachmentLocation: Boolean(announcement.attachmentLocationAddress),
          attachmentCount: dto.attachments?.length ?? 0,
          ...metadata,
        },
      });

      this.queueTranslationPrewarm([announcement.title, announcement.body]);
      this.emitWorkspaceRefresh(
        [author.userId ?? actorUserId ?? ""].filter(Boolean),
        "announcement.scheduled",
      );

      return this.serializeAnnouncementWithImage(announcement);
    }

    return this.completeAnnouncementPublication({
      actorUserId,
      announcement,
      auditAction: metadata?.templateId
        ? "announcement.generated"
        : "announcement.created",
      authorEmployeeId: author.id,
      authorUserId: author.userId ?? actorUserId ?? null,
      departmentId: dto.departmentId ?? null,
      locationId: dto.locationId ?? null,
      metadata,
      normalizedGroupIds,
      normalizedTargetEmployeeIds,
      reason: metadata?.templateId
        ? "announcement.generated"
        : "announcement.created",
      tenantId: author.tenantId,
    });
  }

  private async completeAnnouncementPublication(
    params: {
      actorUserId?: string;
      announcement: Prisma.AnnouncementGetPayload<{
        include: {
          authorEmployee: true;
          group: true;
          department: true;
          location: true;
          targetEmployee: true;
          groupTargets: true;
          employeeTargets: true;
        };
      }>;
      auditAction: string;
      authorEmployeeId: string;
      authorUserId?: string | null;
      departmentId?: string | null;
      locationId?: string | null;
      metadata?: Record<string, unknown>;
      normalizedGroupIds: string[];
      normalizedTargetEmployeeIds: string[];
      reason: string;
      tenantId: string;
    },
  ) {
    const recipients = await this.resolveAnnouncementRecipients(
      params.tenantId,
      params.announcement.audience,
      params.normalizedGroupIds[0],
      params.normalizedTargetEmployeeIds[0],
      params.normalizedGroupIds,
      params.normalizedTargetEmployeeIds,
      params.departmentId,
      params.locationId,
      params.authorEmployeeId,
    );

    const refreshUserIds = new Set<string>();
    if (params.authorUserId) {
      refreshUserIds.add(params.authorUserId);
    }

    for (const recipient of recipients) {
      if (!recipient.userId) continue;

      refreshUserIds.add(recipient.userId);
      await this.notificationsService.createForUser({
        tenantId: params.tenantId,
        userId: recipient.userId,
        type: NotificationType.OPERATIONS_ALERT,
        title: `Announcement: ${params.announcement.title}`,
        body: params.announcement.body,
        actionUrl: "/employee/announcements",
        metadata: {
          announcementId: params.announcement.id,
          ...params.metadata,
        },
      });
    }

    await this.auditService.log({
      tenantId: params.tenantId,
      actorUserId: params.actorUserId,
      entityType: "announcement",
      entityId: params.announcement.id,
      action: params.auditAction,
      metadata: {
        title: params.announcement.title,
        isPinned: params.announcement.isPinned,
        audience: params.announcement.audience,
        groupId: params.announcement.groupId,
        targetEmployeeId: params.announcement.targetEmployeeId,
        groupIds: params.normalizedGroupIds,
        targetEmployeeIds: params.normalizedTargetEmployeeIds,
        departmentId: params.announcement.departmentId,
        locationId: params.announcement.locationId,
        linkUrl: params.announcement.linkUrl,
        scheduledFor: params.announcement.scheduledFor?.toISOString() ?? null,
        publishedAt: params.announcement.publishedAt?.toISOString() ?? null,
        hasAttachmentLocation: Boolean(params.announcement.attachmentLocationAddress),
        attachmentCount: this.parseAnnouncementAttachments(
          params.announcement.attachmentsJson ?? null,
        ).length,
        ...params.metadata,
      },
    });

    this.queueTranslationPrewarm([
      params.announcement.title,
      params.announcement.body,
    ]);
    this.emitWorkspaceRefresh(Array.from(refreshUserIds), params.reason);

    return this.serializeAnnouncementWithImage(params.announcement);
  }

  private async uploadAnnouncementImage(
    tenantId: string,
    announcementId: string,
    dataUrl: string,
  ) {
    const extension = this.getDataUrlImageExtension(dataUrl);

    if (!this.storageService.isConfigured()) {
      const metadata = this.parseDataUrlMetadata(dataUrl);

      return {
        key: dataUrl,
        contentType: metadata.contentType,
        sizeBytes: metadata.sizeBytes,
        url: dataUrl,
      };
    }

    const storageKey = `tenants/${tenantId}/announcements/${announcementId}/${Date.now()}-cover.${extension}`;
    return this.storageService.uploadDataUrl(storageKey, dataUrl);
  }

  private getDataUrlImageExtension(dataUrl: string) {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i);
    const mimeType = match?.[1]?.toLowerCase() ?? "image/jpeg";

    if (mimeType.includes("png")) return "png";
    if (mimeType.includes("webp")) return "webp";
    return "jpg";
  }

  private async uploadAnnouncementAttachment(
    tenantId: string,
    announcementId: string,
    fileName: string,
    dataUrl: string,
    index: number,
  ) {
    const sanitizedFileName =
      fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) ||
      `attachment-${index + 1}`;

    if (!this.storageService.isConfigured()) {
      const metadata = this.parseDataUrlMetadata(dataUrl);

      return {
        id: `${Date.now()}-${index}`,
        fileName,
        storageKey: dataUrl,
        contentType: metadata.contentType,
        sizeBytes: metadata.sizeBytes,
      };
    }

    const storageKey = `tenants/${tenantId}/announcements/${announcementId}/attachments/${Date.now()}-${index}-${sanitizedFileName}`;
    const uploaded = await this.storageService.uploadDataUrl(storageKey, dataUrl);

    return {
      id: `${Date.now()}-${index}`,
      fileName,
      storageKey: uploaded.key,
      contentType: uploaded.contentType,
      sizeBytes: uploaded.sizeBytes,
    };
  }

  private async validateAnnouncementTarget(
    tenantId: string,
    audience: AnnouncementAudience,
    groupId?: string | null,
    targetEmployeeId?: string | null,
    groupIds?: string[] | null,
    targetEmployeeIds?: string[] | null,
    departmentId?: string | null,
    locationId?: string | null,
  ) {
    const normalizedGroupIds = this.normalizeAnnouncementScopeIds(groupId, groupIds);
    const normalizedTargetEmployeeIds = this.normalizeAnnouncementScopeIds(
      targetEmployeeId,
      targetEmployeeIds,
    );
    const hasTargetedParticipants =
      normalizedGroupIds.length > 0 || normalizedTargetEmployeeIds.length > 0;
    const selectedTargetCount = [
      hasTargetedParticipants,
      Boolean(departmentId),
      Boolean(locationId),
    ].filter(Boolean).length;

    if (audience === AnnouncementAudience.ALL) {
      if (selectedTargetCount > 0) {
        throw new BadRequestException(
          "All-company announcement cannot include a scoped target.",
        );
      }
    } else if (selectedTargetCount !== 1) {
      throw new BadRequestException(
        "Announcement must include exactly one matching target scope.",
      );
    }

    if (audience === AnnouncementAudience.GROUP && normalizedGroupIds.length === 0) {
      throw new BadRequestException("Group announcement requires groupId.");
    }

    if (
      audience === AnnouncementAudience.EMPLOYEE &&
      normalizedTargetEmployeeIds.length === 0
    ) {
      throw new BadRequestException(
        "Employee announcement requires targetEmployeeId.",
      );
    }

    if (audience === AnnouncementAudience.DEPARTMENT && !departmentId) {
      throw new BadRequestException(
        "Department announcement requires departmentId.",
      );
    }

    if (audience === AnnouncementAudience.LOCATION && !locationId) {
      throw new BadRequestException(
        "Location announcement requires locationId.",
      );
    }

    if (normalizedGroupIds.length > 0) {
      const groups = await this.prisma.workGroup.findMany({
        where: {
          id: { in: normalizedGroupIds },
          tenantId,
        },
      });

      if (groups.length !== normalizedGroupIds.length) {
        throw new NotFoundException("Target group not found.");
      }
    }

    if (normalizedTargetEmployeeIds.length > 0) {
      const employees = await this.prisma.employee.findMany({
        where: {
          id: { in: normalizedTargetEmployeeIds },
          tenantId,
        },
      });

      if (employees.length !== normalizedTargetEmployeeIds.length) {
        throw new NotFoundException("Target employee not found.");
      }
    }

    if (departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: departmentId,
          tenantId,
        },
      });

      if (!department) {
        throw new NotFoundException("Target department not found.");
      }
    }

    if (locationId) {
      const location = await this.prisma.location.findFirst({
        where: {
          id: locationId,
          tenantId,
        },
      });

      if (!location) {
        throw new NotFoundException("Target location not found.");
      }
    }
  }

  private normalizeAnnouncementScopeIds(
    singleId?: string | null,
    multipleIds?: string[] | null,
  ) {
    return Array.from(
      new Set(
        [singleId ?? null, ...(multipleIds ?? [])]
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean),
      ),
    );
  }

  private collectTaskTranslationTexts(input: {
    title?: string | null;
    description?: string | null;
    checklist?: string[] | null;
  }) {
    const texts = new Set<string>();
    const title = input.title?.trim();
    if (title) {
      texts.add(title);
    }

    for (const checklistItem of input.checklist ?? []) {
      const normalizedChecklistItem = checklistItem.trim();
      if (normalizedChecklistItem) {
        texts.add(normalizedChecklistItem);
      }
    }

    const description = input.description?.trim() ?? "";
    if (!description) {
      return Array.from(texts);
    }

    const markerIndex = description.lastIndexOf(TASK_META_MARKER);
    if (markerIndex === -1) {
      texts.add(description);
      return Array.from(texts);
    }

    const body = description.slice(0, markerIndex).trim();
    if (body) {
      texts.add(body);
    }

    const rawMeta = description.slice(markerIndex + TASK_META_MARKER.length).trim();
    try {
      const parsed = JSON.parse(rawMeta) as {
        kind?: string;
        meetingLocation?: string | null;
      };

      if (parsed.kind === "meeting") {
        const meetingLocation = parsed.meetingLocation?.trim();
        if (meetingLocation) {
          texts.add(meetingLocation);
        }
      } else {
        texts.add(description);
      }
    } catch {
      texts.add(description);
    }

    return Array.from(texts);
  }

  private queueTranslationPrewarm(texts: Array<string | null | undefined>) {
    void this.translationService.prewarmTranslations(texts).catch(() => undefined);
  }

  private async ensureDirectChatThread(
    tx: Prisma.TransactionClient,
    tenantId: string,
    managerEmployeeId: string,
    assigneeEmployeeId: string,
  ) {
    const existing = await tx.chatThread.findFirst({
      where: {
        tenantId,
        kind: ChatThreadKind.DIRECT,
        participants: {
          some: { employeeId: managerEmployeeId },
        },
        AND: [
          { participants: { some: { employeeId: assigneeEmployeeId } } },
          {
            participants: {
              every: {
                employeeId: { in: [managerEmployeeId, assigneeEmployeeId] },
              },
            },
          },
        ],
      },
    });

    if (existing) {
      return existing;
    }

    return tx.chatThread.create({
      data: {
        tenantId,
        createdByEmployeeId: managerEmployeeId,
        kind: ChatThreadKind.DIRECT,
        participants: {
          create: [
            { tenantId, employeeId: managerEmployeeId },
            { tenantId, employeeId: assigneeEmployeeId },
          ],
        },
      },
    });
  }

  private async ensureGroupChatThread(
    tx: Prisma.TransactionClient,
    tenantId: string,
    managerEmployeeId: string,
    groupId: string,
  ) {
    const existing = await tx.chatThread.findFirst({
      where: {
        tenantId,
        kind: ChatThreadKind.GROUP,
        groupId,
      },
    });

    if (existing) {
      return existing;
    }

    const memberships = await tx.workGroupMembership.findMany({
      where: {
        tenantId,
        groupId,
      },
      select: {
        employeeId: true,
      },
    });

    const participantIds = Array.from(
      new Set([
        managerEmployeeId,
        ...memberships.map((item) => item.employeeId),
      ]),
    );

    return tx.chatThread.create({
      data: {
        tenantId,
        createdByEmployeeId: managerEmployeeId,
        kind: ChatThreadKind.GROUP,
        groupId,
        participants: {
          create: participantIds.map((employeeId) => ({
            tenantId,
            employeeId,
          })),
        },
      },
    });
  }

  private async runDueTaskTemplatesForScope(params: {
    tenantId: string;
    managerEmployeeId: string;
    actorUserId?: string;
  }) {
    const manager = await this.prisma.employee.findUnique({
      where: {
        id: params.managerEmployeeId,
      },
      include: {
        user: true,
      },
    });

    if (!manager) {
      return {
        success: true,
        generatedCount: 0,
        generatedTemplateIds: [],
      };
    }

    const now = new Date();
    const templates = await this.prisma.taskTemplate.findMany({
      where: {
        tenantId: params.tenantId,
        managerEmployeeId: params.managerEmployeeId,
        isActive: true,
        startDate: {
          lte: now,
        },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      include: {
        group: true,
        department: true,
        location: true,
        assigneeEmployee: true,
      },
    });

    const generatedTemplateIds: string[] = [];

    for (const template of templates) {
      if (!this.isTemplateDueNow(template, now)) {
        continue;
      }

      const alreadyGeneratedToday =
        template.lastGeneratedAt &&
        this.toDateKey(template.lastGeneratedAt) === this.toDateKey(now);
      if (alreadyGeneratedToday) {
        continue;
      }

      await this.instantiateTaskTemplate(manager, template, params.actorUserId);
      generatedTemplateIds.push(template.id);
    }

    return {
      success: true,
      generatedCount: generatedTemplateIds.length,
      generatedTemplateIds,
    };
  }

  private async runDueAnnouncementTemplatesForScope(
    manager: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string;
      userId: string | null;
      user?: { id: string } | null;
    },
    actorUserId?: string,
  ) {
    const now = new Date();
    const templates = await this.prisma.announcementTemplate.findMany({
      where: {
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
        isActive: true,
        startDate: {
          lte: now,
        },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      include: {
        group: true,
        targetEmployee: true,
      },
    });

    const generatedTemplateIds: string[] = [];

    for (const template of templates) {
      if (!this.isAnnouncementTemplateDueNow(template, now)) {
        continue;
      }

      const alreadyPublishedToday =
        template.lastPublishedAt &&
        this.toDateKey(template.lastPublishedAt) === this.toDateKey(now);
      if (alreadyPublishedToday) {
        continue;
      }

      await this.instantiateAnnouncementTemplate(
        manager,
        template,
        actorUserId,
      );
      generatedTemplateIds.push(template.id);
    }

    return generatedTemplateIds;
  }

  private isTemplateDueNow(
    template: {
      frequency: "DAILY" | "WEEKLY" | "MONTHLY";
      weekDaysJson: string | null;
      dayOfMonth: number | null;
      dueTimeLocal: string | null;
      startDate: Date;
      endDate: Date | null;
    },
    now: Date,
  ) {
    if (template.endDate && template.endDate < now) {
      return false;
    }

    if (template.startDate > now) {
      return false;
    }

    if (template.dueTimeLocal) {
      const [hoursRaw, minutesRaw] = template.dueTimeLocal.split(":");
      const hours = Number(hoursRaw);
      const minutes = Number(minutesRaw ?? "0");
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const templateMinutes = hours * 60 + minutes;
        if (currentMinutes < templateMinutes) {
          return false;
        }
      }
    }

    if (template.frequency === "DAILY") {
      return true;
    }

    if (template.frequency === "WEEKLY") {
      const weekdays = template.weekDaysJson
        ? (JSON.parse(template.weekDaysJson) as number[])
        : [];
      return weekdays.includes(now.getDay());
    }

    const targetDay = template.dayOfMonth ?? 1;
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    return now.getDate() === Math.min(targetDay, lastDayOfMonth);
  }

  private isAnnouncementTemplateDueNow(
    template: {
      frequency: AnnouncementTemplateFrequency;
      weekDaysJson: string | null;
      dayOfMonth: number | null;
      publishTimeLocal: string | null;
      startDate: Date;
      endDate: Date | null;
    },
    now: Date,
  ) {
    if (template.endDate && template.endDate < now) {
      return false;
    }

    if (template.startDate > now) {
      return false;
    }

    if (template.publishTimeLocal) {
      const [hoursRaw, minutesRaw] = template.publishTimeLocal.split(":");
      const hours = Number(hoursRaw);
      const minutes = Number(minutesRaw ?? "0");
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const templateMinutes = hours * 60 + minutes;
        if (currentMinutes < templateMinutes) {
          return false;
        }
      }
    }

    if (template.frequency === AnnouncementTemplateFrequency.DAILY) {
      return true;
    }

    if (template.frequency === AnnouncementTemplateFrequency.WEEKLY) {
      const weekdays = template.weekDaysJson
        ? (JSON.parse(template.weekDaysJson) as number[])
        : [];
      return weekdays.includes(now.getDay());
    }

    const targetDay = template.dayOfMonth ?? 1;
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    return now.getDate() === Math.min(targetDay, lastDayOfMonth);
  }

  private async instantiateTaskTemplate(
    manager: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string;
      userId: string | null;
      user?: { id: string } | null;
    },
    template: {
      id: string;
      tenantId: string;
      groupId: string | null;
      assigneeEmployeeId: string | null;
      departmentId: string | null;
      locationId: string | null;
      title: string;
      description: string | null;
      priority: TaskPriority;
      requiresPhoto: boolean;
      dueAfterDays: number;
      checklistJson: string | null;
    },
    actorUserId?: string,
  ) {
    const assignees = template.groupId
      ? await this.resolveGroupAssignees(manager.tenantId, template.groupId)
      : template.assigneeEmployeeId
        ? await this.resolveDirectAssignee(
            manager.tenantId,
            template.assigneeEmployeeId,
          )
        : template.departmentId
          ? await this.resolveDepartmentAssignees(
              manager.tenantId,
              template.departmentId,
            )
          : template.locationId
            ? await this.resolveLocationAssignees(
                manager.tenantId,
                template.locationId,
              )
            : [];

    if (assignees.length === 0) {
      return [];
    }

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + template.dueAfterDays);
    const checklist = template.checklistJson
      ? (JSON.parse(template.checklistJson) as string[])
      : [];

    const tasks = await this.prisma.$transaction(async (tx) => {
      const createdTasks = [];
      const groupThread =
        template.groupId && assignees.length > 0
          ? await this.ensureGroupChatThread(
              tx,
              manager.tenantId,
              manager.id,
              template.groupId,
            )
          : null;

      for (const assignee of assignees) {
        const task = await tx.task.create({
          data: {
            tenantId: manager.tenantId,
            managerEmployeeId: manager.id,
            assigneeEmployeeId: assignee.id,
            groupId: template.groupId,
            title: template.title,
            description: template.description,
            priority: template.priority,
            requiresPhoto: template.requiresPhoto,
            dueAt,
            checklistItems: {
              create: checklist.map((title, index) => ({
                tenantId: manager.tenantId,
                title,
                sortOrder: index + 1,
              })),
            },
            activities: {
              create: {
                tenantId: manager.tenantId,
                actorEmployeeId: manager.id,
                kind: TaskActivityKind.CREATED,
                body: `Generated from recurring template ${template.id}.`,
              },
            },
          },
          include: this.taskInclude(),
        });

        createdTasks.push(task);

        const chatThread = template.groupId
          ? groupThread!
          : await this.ensureDirectChatThread(
              tx,
              manager.tenantId,
              manager.id,
              assignee.id,
            );

        await tx.chatMessage.create({
          data: {
            tenantId: manager.tenantId,
            threadId: chatThread.id,
            authorEmployeeId: manager.id,
            body: `Recurring task generated: ${task.title}`,
          },
        });

        await tx.chatThread.update({
          where: { id: chatThread.id },
          data: { updatedAt: new Date() },
        });
      }

      await tx.taskTemplate.update({
        where: { id: template.id },
        data: {
          lastGeneratedAt: new Date(),
        },
      });

      return createdTasks;
    });

    this.queueTranslationPrewarm(
      this.collectTaskTranslationTexts({
        title: template.title,
        description: template.description,
        checklist,
      }),
    );

    for (const task of tasks) {
      if (task.assigneeEmployee?.userId) {
        await this.notificationsService.createForUser({
          tenantId: manager.tenantId,
          userId: task.assigneeEmployee.userId,
          type: NotificationType.OPERATIONS_ALERT,
          title: `New recurring task: ${task.title}`,
          body: `${manager.firstName} ${manager.lastName} assigned a recurring workflow task.`,
          actionUrl: "/employee/tasks",
          metadata: {
            taskId: task.id,
            templateId: template.id,
            recurring: true,
          },
        });
        void this.collaborationRealtimeService.fanoutThreadUpdated(
          task.assigneeEmployee.userId,
          {
            taskId: task.id,
            templateId: template.id,
            recurring: true,
          },
        );
      }
    }

    await this.emitWorkspaceRefreshForTasks(tasks, "task_template.generated");

    if (actorUserId) {
      await this.auditService.log({
        tenantId: manager.tenantId,
        actorUserId,
        entityType: "task_template",
        entityId: template.id,
        action: "task_template.generated",
        metadata: {
          generatedCount: tasks.length,
        },
      });
    }

    return tasks;
  }

  private async instantiateAnnouncementTemplate(
    manager: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string;
      userId: string | null;
      user?: { id: string } | null;
    },
    template: {
      id: string;
      audience: AnnouncementAudience;
      groupId: string | null;
      targetEmployeeId: string | null;
      departmentId: string | null;
      locationId: string | null;
      title: string;
      body: string;
      isPinned: boolean;
    },
    actorUserId?: string,
  ) {
    const announcement = await this.publishAnnouncement(
      manager,
      {
        audience: template.audience,
        groupId: template.groupId,
        targetEmployeeId: template.targetEmployeeId,
        departmentId: template.departmentId,
        locationId: template.locationId,
        title: template.title,
        body: template.body,
        isPinned: template.isPinned,
      },
      actorUserId,
      {
        templateId: template.id,
        recurring: true,
      },
    );

    await this.prisma.announcementTemplate.update({
      where: { id: template.id },
      data: {
        lastPublishedAt: new Date(),
      },
    });

    if (actorUserId) {
      await this.auditService.log({
        tenantId: manager.tenantId,
        actorUserId,
        entityType: "announcement_template",
        entityId: template.id,
        action: "announcement_template.generated",
        metadata: {
          announcementId: announcement.id,
        },
      });
    }

    return announcement;
  }

  private toDateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  private async triggerTaskReminder(
    manager: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string;
      userId: string | null;
    },
    task: {
      id: string;
      title: string;
      assigneeEmployee: {
        id: string;
        firstName: string;
        lastName: string;
        userId: string | null;
      } | null;
    },
    options: {
      notifyAssignee: boolean;
      sendChatMessages: boolean;
      markReminderAt: boolean;
      escalation: boolean;
      escalateToManager?: boolean;
    },
  ) {
    if (!task.assigneeEmployee) {
      return;
    }

    const reminderMessage = options.escalation
      ? `Escalation: task "${task.title}" is overdue and requires immediate attention.`
      : `Reminder: task "${task.title}" still requires attention.`;

    await this.prisma.taskActivity.create({
      data: {
        tenantId: manager.tenantId,
        taskId: task.id,
        actorEmployeeId: manager.id,
        kind: TaskActivityKind.COMMENT,
        body: reminderMessage,
      },
    });

    await this.prisma.task.update({
      where: { id: task.id },
      data: options.escalation
        ? {
            lastReminderAt: options.markReminderAt ? new Date() : undefined,
            lastEscalatedAt: new Date(),
          }
        : {
            lastReminderAt: options.markReminderAt ? new Date() : undefined,
          },
    });

    if (options.notifyAssignee && task.assigneeEmployee.userId) {
      await this.notificationsService.createForUser({
        tenantId: manager.tenantId,
        userId: task.assigneeEmployee.userId,
        type: NotificationType.OPERATIONS_ALERT,
        title: `${options.escalation ? "Escalation" : "Reminder"}: ${task.title}`,
        body: options.escalation
          ? `${manager.firstName} ${manager.lastName} escalated this overdue task.`
          : `${manager.firstName} ${manager.lastName} asked for an update.`,
        actionUrl: "/employee/tasks",
        metadata: {
          taskId: task.id,
          reminder: !options.escalation,
          escalation: options.escalation,
        },
      });
      void this.collaborationRealtimeService.fanoutThreadUpdated(
        task.assigneeEmployee.userId,
        {
          taskId: task.id,
          reminder: !options.escalation,
          escalation: options.escalation,
        },
      );
    }

    if (options.escalateToManager && manager.userId) {
      await this.notificationsService.createForUser({
        tenantId: manager.tenantId,
        userId: manager.userId,
        type: NotificationType.OPERATIONS_ALERT,
        title: `Escalated overdue task: ${task.title}`,
        body: `${task.assigneeEmployee.firstName} ${task.assigneeEmployee.lastName} still has an overdue task.`,
        actionUrl: "/collaboration",
        metadata: {
          taskId: task.id,
          escalation: true,
          managerAlert: true,
        },
      });
    }

    if (options.sendChatMessages) {
      const directThread = await this.prisma.chatThread.findFirst({
        where: {
          tenantId: manager.tenantId,
          kind: ChatThreadKind.DIRECT,
          participants: {
            some: {
              employeeId: manager.id,
            },
          },
          AND: [
            {
              participants: {
                some: {
                  employeeId: task.assigneeEmployee.id,
                },
              },
            },
            {
              participants: {
                every: {
                  employeeId: {
                    in: [manager.id, task.assigneeEmployee.id],
                  },
                },
              },
            },
          ],
        },
      });

      if (directThread) {
        const message = await this.prisma.chatMessage.create({
          data: {
            tenantId: manager.tenantId,
            threadId: directThread.id,
            authorEmployeeId: manager.id,
            body: reminderMessage,
          },
          include: {
            authorEmployee: true,
          },
        });

        await this.prisma.chatThread.update({
          where: { id: directThread.id },
          data: { updatedAt: new Date() },
        });

        void this.collaborationRealtimeService.fanoutThreadMessage(directThread.id, {
          threadId: directThread.id,
          message,
        });
      }
    }
  }

  private taskCompletionHours(createdAt: Date, completedAt: Date | null) {
    if (!completedAt) {
      return null;
    }

    return Number(
      ((completedAt.getTime() - createdAt.getTime()) / 1000 / 60 / 60).toFixed(
        1,
      ),
    );
  }

  private canAccessTask(
    employeeId: string,
    task: {
      managerEmployeeId: string;
      assigneeEmployeeId: string | null;
    },
  ) {
    return (
      task.managerEmployeeId === employeeId ||
      task.assigneeEmployeeId === employeeId
    );
  }

  private resolveTaskWindow(query?: {
    date?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    if (!query?.date && !query?.dateFrom && !query?.dateTo) {
      return null;
    }

    if (query?.date) {
      const occurrenceDate = this.parseOccurrenceDate(query.date);
      if (!occurrenceDate) {
        throw new BadRequestException("Task date must use YYYY-MM-DD format.");
      }

      return {
        start: occurrenceDate,
        end: occurrenceDate,
      };
    }

    const start = this.parseOccurrenceDate(
      query?.dateFrom ?? query?.dateTo ?? "",
    );
    const end = this.parseOccurrenceDate(
      query?.dateTo ?? query?.dateFrom ?? "",
    );

    if (!start || !end) {
      throw new BadRequestException(
        "Task date range must use YYYY-MM-DD format.",
      );
    }

    if (this.utcDayNumber(start) > this.utcDayNumber(end)) {
      throw new BadRequestException("Task date range is invalid.");
    }

    return { start, end };
  }

  private buildTaskDateWhere(taskWindow: { start: Date; end: Date } | null) {
    if (!taskWindow) {
      return {};
    }

    const dayStart = this.utcDayStart(taskWindow.start);
    const dayEnd = this.utcDayEnd(taskWindow.end);

    return {
      OR: [
        {
          dueAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        {
          dueAt: null,
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      ],
    };
  }

  private normalizeEmployeeVisibleTaskTitle(title: string) {
    return title
      .replace(/^Employee recurring:\s*/i, "")
      .replace(/^Owner recurring:\s*/i, "")
      .trim()
      .toLowerCase();
  }

  private getEmployeeVisibleTaskAnchorDate(task: {
    dueAt: string | Date | null;
    occurrenceDate?: string | Date | null;
    createdAt: string | Date;
  }) {
    const candidates = [task.dueAt, task.occurrenceDate, task.createdAt];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }

  private getEmployeeVisibleTaskDuplicateKey(task: {
    title: string;
    dueAt: string | Date | null;
    occurrenceDate?: string | Date | null;
    createdAt: string | Date;
    requiresPhoto: boolean;
  }) {
    const anchorDate = this.getEmployeeVisibleTaskAnchorDate(task);
    const anchorKey = anchorDate
      ? this.formatDateKey(anchorDate)
      : "no-date";
    const kindKey = /^(встреча|meeting):/i.test(task.title)
      ? "meeting"
      : "task";
    const photoKey = task.requiresPhoto ? "photo" : "plain";

    return `${kindKey}|${photoKey}|${this.normalizeEmployeeVisibleTaskTitle(task.title)}|${anchorKey}`;
  }

  private choosePreferredEmployeeVisibleTask<
    T extends {
      status: TaskStatus;
      requiresPhoto: boolean;
      isRecurring?: boolean;
      updatedAt: string | Date;
      photoProofs?: Array<{
        deletedAt?: string | Date | null;
        supersededByProofId?: string | null;
      }>;
    },
  >(current: T, candidate: T) {
    const currentHasPhotos = (current.photoProofs ?? []).some(
      (proof) => !proof.deletedAt && !proof.supersededByProofId,
    );
    const candidateHasPhotos = (candidate.photoProofs ?? []).some(
      (proof) => !proof.deletedAt && !proof.supersededByProofId,
    );

    const currentScore =
      (current.requiresPhoto ? 100 : 0) +
      (currentHasPhotos ? 40 : 0) +
      (!current.isRecurring ? 20 : 0) +
      (current.status !== TaskStatus.DONE &&
      current.status !== TaskStatus.CANCELLED
        ? 10
        : 0);

    const candidateScore =
      (candidate.requiresPhoto ? 100 : 0) +
      (candidateHasPhotos ? 40 : 0) +
      (!candidate.isRecurring ? 20 : 0) +
      (candidate.status !== TaskStatus.DONE &&
      candidate.status !== TaskStatus.CANCELLED
        ? 10
        : 0);

    if (candidateScore !== currentScore) {
      return candidateScore > currentScore ? candidate : current;
    }

    return new Date(candidate.updatedAt).getTime() >=
      new Date(current.updatedAt).getTime()
      ? candidate
      : current;
  }

  private collapseEmployeeVisibleTasks<
    T extends {
      title: string;
      dueAt: string | Date | null;
      occurrenceDate?: string | Date | null;
      createdAt: string | Date;
      status: TaskStatus;
      requiresPhoto: boolean;
      isRecurring?: boolean;
      updatedAt: string | Date;
      photoProofs?: Array<{
        deletedAt?: string | Date | null;
        supersededByProofId?: string | null;
      }>;
    },
  >(tasks: T[]) {
    const byKey = new Map<string, T>();

    for (const task of tasks) {
      const key = this.getEmployeeVisibleTaskDuplicateKey(task);
      const current = byKey.get(key);

      if (!current) {
        byKey.set(key, task);
        continue;
      }

      byKey.set(key, this.choosePreferredEmployeeVisibleTask(current, task));
    }

    return Array.from(byKey.values());
  }

  private async buildRecurringTasksForEmployee(
    employee: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
      departmentId: string;
      primaryLocationId: string;
      department: { id: string; name: string };
      primaryLocation: { id: string; name: string };
      groupMemberships: Array<{ groupId: string }>;
    },
    start: Date,
    end: Date,
  ) {
    const groupIds = employee.groupMemberships.map(
      (membership) => membership.groupId,
    );
    const targetConditions: Prisma.TaskTemplateWhereInput[] = [
      { assigneeEmployeeId: employee.id },
    ];

    if (groupIds.length > 0) {
      targetConditions.push({ groupId: { in: groupIds } });
    }

    if (employee.departmentId) {
      targetConditions.push({ departmentId: employee.departmentId });
    }

    if (employee.primaryLocationId) {
      targetConditions.push({ locationId: employee.primaryLocationId });
    }

    const templates = await this.prisma.taskTemplate.findMany({
      where: {
        tenantId: employee.tenantId,
        isActive: true,
        expandOnDemand: true,
        startDate: {
          lte: this.utcDayEnd(end),
        },
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: this.utcDayStart(start) } },
            ],
          },
          {
            OR: targetConditions,
          },
        ],
      },
      include: {
        managerEmployee: true,
        group: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    if (templates.length === 0) {
      return [];
    }

    const completions = await this.prisma.taskCompletion.findMany({
      where: {
        tenantId: employee.tenantId,
        assigneeEmployeeId: employee.id,
        taskTemplateId: {
          in: templates.map((template) => template.id),
        },
        occurrenceDate: {
          gte: this.utcDayStart(start),
          lte: this.utcDayEnd(end),
        },
      },
      include: {
        photoProofs: {
          include: {
            uploadedByEmployee: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    const completionByKey = new Map(
      completions.map((completion) => [
        `${completion.taskTemplateId}:${this.formatDateKey(completion.occurrenceDate)}`,
        completion,
      ]),
    );

    const items = [];

    for (
      let cursor = new Date(start);
      this.utcDayNumber(cursor) <= this.utcDayNumber(end);
      cursor = this.addUtcDays(cursor, 1)
    ) {
      for (const template of templates) {
        if (!this.isTemplateDueOnOccurrence(template, cursor)) {
          continue;
        }

        const completion =
          completionByKey.get(`${template.id}:${this.formatDateKey(cursor)}`) ??
          null;
        items.push(
          this.buildRecurringTaskItem(template, employee, completion, cursor),
        );
      }
    }

    return items;
  }

  private async buildRecurringTasksForManager(
    manager: {
      id: string;
      tenantId: string;
    },
    start: Date,
    end: Date,
    query: ListManagerTasksQueryDto,
  ) {
    const templates = await this.prisma.taskTemplate.findMany({
      where: {
        tenantId: manager.tenantId,
        managerEmployeeId: manager.id,
        isActive: true,
        expandOnDemand: true,
        startDate: {
          lte: this.utcDayEnd(end),
        },
        title: query.search
          ? {
              contains: query.search,
              mode: "insensitive",
            }
          : undefined,
        priority: query.priority,
        groupId: query.groupId,
        OR: [
          { endDate: null },
          { endDate: { gte: this.utcDayStart(start) } },
        ],
      },
      include: {
        managerEmployee: true,
        group: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    if (templates.length === 0) {
      return [];
    }

    const candidateEmployees = await this.prisma.employee.findMany({
      where: {
        tenantId: manager.tenantId,
        id: query.assigneeEmployeeId,
        departmentId: query.departmentId,
        primaryLocationId: query.locationId,
      },
      include: {
        department: true,
        primaryLocation: true,
        groupMemberships: {
          select: {
            groupId: true,
          },
        },
      },
    });

    if (candidateEmployees.length === 0) {
      return [];
    }

    const matchedEmployeesByTemplate = new Map<
      string,
      typeof candidateEmployees
    >();

    for (const template of templates) {
      const matchedEmployees = candidateEmployees.filter((employee) => {
        if (
          template.assigneeEmployeeId &&
          employee.id === template.assigneeEmployeeId
        ) {
          return true;
        }

        if (
          template.groupId &&
          employee.groupMemberships.some(
            (membership) => membership.groupId === template.groupId,
          )
        ) {
          return true;
        }

        if (
          template.departmentId &&
          employee.departmentId === template.departmentId
        ) {
          return true;
        }

        if (
          template.locationId &&
          employee.primaryLocationId === template.locationId
        ) {
          return true;
        }

        return false;
      });

      if (matchedEmployees.length > 0) {
        matchedEmployeesByTemplate.set(template.id, matchedEmployees);
      }
    }

    if (matchedEmployeesByTemplate.size === 0) {
      return [];
    }

    const employeeIds = Array.from(
      new Set(
        Array.from(matchedEmployeesByTemplate.values()).flatMap((employees) =>
          employees.map((employee) => employee.id),
        ),
      ),
    );

    const completions = await this.prisma.taskCompletion.findMany({
      where: {
        tenantId: manager.tenantId,
        assigneeEmployeeId: {
          in: employeeIds,
        },
        taskTemplateId: {
          in: Array.from(matchedEmployeesByTemplate.keys()),
        },
        occurrenceDate: {
          gte: this.utcDayStart(start),
          lte: this.utcDayEnd(end),
        },
      },
      include: {
        photoProofs: {
          include: {
            uploadedByEmployee: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    const completionByKey = new Map(
      completions.map((completion) => [
        `${completion.taskTemplateId}:${completion.assigneeEmployeeId}:${this.formatDateKey(completion.occurrenceDate)}`,
        completion,
      ]),
    );

    const items = [];

    for (
      let cursor = new Date(start);
      this.utcDayNumber(cursor) <= this.utcDayNumber(end);
      cursor = this.addUtcDays(cursor, 1)
    ) {
      for (const template of templates) {
        if (!this.isTemplateDueOnOccurrence(template, cursor)) {
          continue;
        }

        const matchedEmployees =
          matchedEmployeesByTemplate.get(template.id) ?? [];

        for (const employee of matchedEmployees) {
          const completion =
            completionByKey.get(
              `${template.id}:${employee.id}:${this.formatDateKey(cursor)}`,
            ) ?? null;
          items.push(
            this.buildRecurringTaskItem(template, employee, completion, cursor),
          );
        }
      }
    }

    return items;
  }

  private async setRecurringTaskStatus(
    userId: string,
    employee: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
      departmentId: string;
      primaryLocationId: string;
      department: { id: string; name: string };
      primaryLocation: { id: string; name: string };
      groupMemberships: Array<{ groupId: string }>;
    },
    recurringTaskRef: {
      taskTemplateId: string;
      assigneeEmployeeId: string;
      dateKey: string;
    },
    dto: SetTaskStatusDto,
  ) {
    if (recurringTaskRef.assigneeEmployeeId !== employee.id) {
      throw new ForbiddenException(
        "Current user cannot update this recurring task.",
      );
    }

    const occurrenceDate = this.parseOccurrenceDate(recurringTaskRef.dateKey);
    if (!occurrenceDate) {
      throw new BadRequestException("Recurring task date is invalid.");
    }

    const template = await this.prisma.taskTemplate.findFirst({
      where: {
        id: recurringTaskRef.taskTemplateId,
        tenantId: employee.tenantId,
        isActive: true,
        expandOnDemand: true,
      },
      include: {
        managerEmployee: true,
        group: true,
      },
    });

    if (
      !template ||
      !this.isTemplateDueOnOccurrence(template, occurrenceDate)
    ) {
      throw new NotFoundException("Recurring task not found.");
    }

    const existingCompletion = await this.prisma.taskCompletion.findUnique({
      where: {
        taskTemplateId_assigneeEmployeeId_occurrenceDate: {
          taskTemplateId: template.id,
          assigneeEmployeeId: employee.id,
          occurrenceDate,
        },
      },
      include: {
        photoProofs: {
          include: {
            uploadedByEmployee: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (
      dto.status === TaskStatus.DONE &&
      template.requiresPhoto &&
      (existingCompletion?.photoProofs.filter(
        (proof) => !proof.deletedAt && !proof.supersededByProofId,
      ).length ?? 0) === 0
    ) {
      throw new BadRequestException(
        "Photo proof is required before completing this task.",
      );
    }

    const updatedCompletion = await this.prisma.taskCompletion.upsert({
      where: {
        taskTemplateId_assigneeEmployeeId_occurrenceDate: {
          taskTemplateId: template.id,
          assigneeEmployeeId: employee.id,
          occurrenceDate,
        },
      },
      update: {
        status: dto.status,
        completedAt: dto.status === TaskStatus.DONE ? new Date() : null,
      },
      create: {
        tenantId: employee.tenantId,
        taskTemplateId: template.id,
        assigneeEmployeeId: employee.id,
        occurrenceDate,
        status: dto.status,
        completedAt: dto.status === TaskStatus.DONE ? new Date() : null,
      },
      include: {
        photoProofs: {
          include: {
            uploadedByEmployee: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: "task_completion",
      entityId: updatedCompletion.id,
      action: "task_completion.status_updated",
      metadata: {
        taskTemplateId: template.id,
        occurrenceDate: occurrenceDate.toISOString(),
        status: dto.status,
      },
    });

    await this.emitWorkspaceRefreshForAudience({
      tenantId: employee.tenantId,
      managerUserId: template.managerEmployee.userId ?? null,
      assigneeUserId: userId,
      groupId: template.group?.id ?? null,
      reason: "task_completion.status_updated",
    });

    return this.buildRecurringTaskItem(
      template,
      employee,
      updatedCompletion,
      occurrenceDate,
    );
  }

  private async rescheduleRecurringTask(
    userId: string,
    employee: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
      departmentId: string;
      primaryLocationId: string;
      department: { id: string; name: string };
      primaryLocation: { id: string; name: string };
      groupMemberships: Array<{ groupId: string }>;
    },
    recurringTaskRef: {
      taskTemplateId: string;
      assigneeEmployeeId: string;
      dateKey: string;
    },
    nextDueAt: Date,
    dto: RescheduleTaskDto,
  ) {
    if (recurringTaskRef.assigneeEmployeeId !== employee.id) {
      throw new ForbiddenException(
        "Current user cannot reschedule this recurring task.",
      );
    }

    const occurrenceDate = this.parseOccurrenceDate(recurringTaskRef.dateKey);
    if (!occurrenceDate) {
      throw new BadRequestException("Recurring task date is invalid.");
    }

    const template = await this.prisma.taskTemplate.findFirst({
      where: {
        id: recurringTaskRef.taskTemplateId,
        tenantId: employee.tenantId,
        isActive: true,
        expandOnDemand: true,
      },
      include: {
        managerEmployee: true,
        group: true,
      },
    });

    if (
      !template ||
      !this.isTemplateDueOnOccurrence(template, occurrenceDate)
    ) {
      throw new NotFoundException("Recurring task not found.");
    }

    const originalRecurringTaskId = this.composeRecurringTaskId(
      template.id,
      employee.id,
      recurringTaskRef.dateKey,
    );
    const movedTask = await this.prisma.$transaction(async (tx) => {
      await tx.taskCompletion.upsert({
        where: {
          taskTemplateId_assigneeEmployeeId_occurrenceDate: {
            taskTemplateId: template.id,
            assigneeEmployeeId: employee.id,
            occurrenceDate,
          },
        },
        update: {
          status: TaskStatus.CANCELLED,
          completedAt: null,
        },
        create: {
          tenantId: employee.tenantId,
          taskTemplateId: template.id,
          assigneeEmployeeId: employee.id,
          occurrenceDate,
          status: TaskStatus.CANCELLED,
          completedAt: null,
        },
      });

      const task = await tx.task.create({
        data: {
          tenantId: employee.tenantId,
          managerEmployeeId: template.managerEmployee.id,
          assigneeEmployeeId: employee.id,
          groupId: template.group?.id ?? null,
          title: template.title,
          description: template.description,
          priority: template.priority,
          requiresPhoto: template.requiresPhoto,
          dueAt: nextDueAt,
          activities: {
            create: {
              tenantId: employee.tenantId,
              actorEmployeeId: employee.id,
              kind: TaskActivityKind.CREATED,
              body: `Created from recurring overdue task ${originalRecurringTaskId}.`,
            },
          },
        },
        include: this.taskInclude(),
      });

      await tx.taskActivity.create({
        data: {
          tenantId: employee.tenantId,
          taskId: task.id,
          actorEmployeeId: employee.id,
          kind: TaskActivityKind.COMMENT,
          body:
            dto.comment ??
            `Recurring overdue task moved to ${nextDueAt.toISOString()}.`,
        },
      });

      return tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: this.taskInclude(),
      });
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: "task",
      entityId: movedTask.id,
      action: "task.rescheduled_from_recurring",
      metadata: {
        taskTemplateId: template.id,
        fromOccurrenceDate: occurrenceDate.toISOString(),
        toDueAt: nextDueAt.toISOString(),
      },
    });

    await this.emitWorkspaceRefreshForTasks([movedTask], "task.rescheduled_from_recurring");

    return {
      task: this.serializeTaskWithPhotoProofUrls(movedTask),
      replacedTaskId: originalRecurringTaskId,
    };
  }

  private buildRecurringTaskItem(
    template: {
      id: string;
      title: string;
      description: string | null;
      priority: TaskPriority;
      requiresPhoto: boolean;
      dueTimeLocal: string | null;
      createdAt: Date;
      updatedAt: Date;
      managerEmployee: {
        id: string;
        firstName: string;
        lastName: string;
      };
      group: {
        id: string;
        name: string;
      } | null;
    },
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
      department: { id: string; name: string };
      primaryLocation: { id: string; name: string };
    },
    completion: {
      status: TaskStatus;
      completedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      photoProofs: Array<{
        id: string;
        fileName: string;
        storageKey: string;
        deletedAt: Date | null;
        supersededByProofId: string | null;
        createdAt: Date;
        uploadedByEmployee: {
          id: string;
          firstName: string;
          lastName: string;
        };
      }>;
    } | null,
    occurrenceDate: Date,
  ) {
    return {
      id: this.composeRecurringTaskId(
        template.id,
        employee.id,
        this.formatDateKey(occurrenceDate),
      ),
      title: template.title,
      description: template.description,
      status: completion?.status ?? TaskStatus.TODO,
      priority: template.priority,
      requiresPhoto: template.requiresPhoto,
      isRecurring: true,
      taskTemplateId: template.id,
      occurrenceDate: occurrenceDate.toISOString(),
      dueAt: this.buildOccurrenceDueAt(occurrenceDate, template.dueTimeLocal),
      completedAt: completion?.completedAt?.toISOString() ?? null,
      createdAt: (completion?.createdAt ?? template.createdAt).toISOString(),
      updatedAt: (completion?.updatedAt ?? template.updatedAt).toISOString(),
      groupId: template.group?.id ?? null,
      assigneeEmployeeId: employee.id,
      managerEmployee: {
        id: template.managerEmployee.id,
        firstName: template.managerEmployee.firstName,
        lastName: template.managerEmployee.lastName,
      },
      assigneeEmployee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeNumber: employee.employeeNumber,
        department: employee.department
          ? {
              id: employee.department.id,
              name: employee.department.name,
            }
          : null,
        primaryLocation: employee.primaryLocation
          ? {
              id: employee.primaryLocation.id,
              name: employee.primaryLocation.name,
            }
          : null,
      },
      group: template.group
        ? {
            id: template.group.id,
            name: template.group.name,
          }
        : null,
      checklistItems: [],
      activities: [],
      photoProofs: (completion?.photoProofs ?? []).map((proof) => ({
        id: proof.id,
        fileName: proof.fileName,
        storageKey: proof.storageKey,
        url: this.storageService.getObjectUrl(proof.storageKey),
        deletedAt: proof.deletedAt?.toISOString() ?? null,
        supersededByProofId: proof.supersededByProofId ?? null,
        createdAt: proof.createdAt.toISOString(),
        uploadedByEmployee: {
          id: proof.uploadedByEmployee.id,
          firstName: proof.uploadedByEmployee.firstName,
          lastName: proof.uploadedByEmployee.lastName,
        },
      })),
    };
  }

  private parseRecurringTaskId(taskId: string) {
    const match = /^recurring:([^:]+):([^:]+):(\d{4}-\d{2}-\d{2})$/.exec(
      taskId,
    );
    if (!match) {
      return null;
    }

    return {
      taskTemplateId: match[1],
      assigneeEmployeeId: match[2],
      dateKey: match[3],
    };
  }

  private composeRecurringTaskId(
    taskTemplateId: string,
    assigneeEmployeeId: string,
    dateKey: string,
  ) {
    return `recurring:${taskTemplateId}:${assigneeEmployeeId}:${dateKey}`;
  }

  private parseOccurrenceDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const parsed = new Date(`${value}T12:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private isTemplateDueOnOccurrence(
    template: {
      frequency: "DAILY" | "WEEKLY" | "MONTHLY";
      weekDaysJson: string | null;
      dayOfMonth: number | null;
      startDate: Date;
      endDate: Date | null;
    },
    occurrenceDate: Date,
  ) {
    const occurrenceDay = this.utcDayNumber(occurrenceDate);

    if (this.utcDayNumber(template.startDate) > occurrenceDay) {
      return false;
    }

    if (
      template.endDate &&
      this.utcDayNumber(template.endDate) < occurrenceDay
    ) {
      return false;
    }

    if (template.frequency === "DAILY") {
      return true;
    }

    if (template.frequency === "WEEKLY") {
      const weekdays = template.weekDaysJson
        ? (JSON.parse(template.weekDaysJson) as number[])
        : [];
      return weekdays.includes(occurrenceDate.getUTCDay());
    }

    const targetDay = template.dayOfMonth ?? 1;
    const lastDayOfMonth = new Date(
      Date.UTC(
        occurrenceDate.getUTCFullYear(),
        occurrenceDate.getUTCMonth() + 1,
        0,
      ),
    ).getUTCDate();
    return occurrenceDate.getUTCDate() === Math.min(targetDay, lastDayOfMonth);
  }

  private buildOccurrenceDueAt(
    occurrenceDate: Date,
    dueTimeLocal: string | null,
  ) {
    const result = new Date(occurrenceDate);

    if (dueTimeLocal) {
      const [hoursRaw, minutesRaw] = dueTimeLocal.split(":");
      const hours = Number(hoursRaw);
      const minutes = Number(minutesRaw ?? "0");

      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        result.setUTCHours(hours, minutes, 0, 0);
        return result.toISOString();
      }
    }

    result.setUTCHours(12, 0, 0, 0);
    return result.toISOString();
  }

  private async findTaskCreationConflict(
    tenantId: string,
    assigneeEmployeeIds: string[],
    title: string,
    dueAt: Date,
  ) {
    const dayStart = this.utcDayStart(dueAt);
    const dayEnd = this.utcDayEnd(dueAt);
    const occurrenceDate = this.parseOccurrenceDate(this.formatDateKey(dueAt));

    const directTaskConflict = await this.prisma.task.findFirst({
      where: {
        tenantId,
        assigneeEmployeeId: {
          in: assigneeEmployeeIds,
        },
        title: {
          equals: title,
          mode: "insensitive",
        },
        status: {
          not: TaskStatus.CANCELLED,
        },
        dueAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: {
        assigneeEmployee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (directTaskConflict?.assigneeEmployee) {
      return {
        employeeName: `${directTaskConflict.assigneeEmployee.firstName} ${directTaskConflict.assigneeEmployee.lastName}`.trim(),
      };
    }

    if (!occurrenceDate) {
      return null;
    }

    const recurringTemplateConflict = await this.prisma.taskTemplate.findFirst({
      where: {
        tenantId,
        isActive: true,
        assigneeEmployeeId: {
          in: assigneeEmployeeIds,
        },
        title: {
          equals: title,
          mode: "insensitive",
        },
        startDate: {
          lte: dayEnd,
        },
        OR: [{ endDate: null }, { endDate: { gte: dayStart } }],
      },
      select: {
        frequency: true,
        weekDaysJson: true,
        dayOfMonth: true,
        startDate: true,
        endDate: true,
        assigneeEmployee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    if (
      recurringTemplateConflict &&
      this.isTemplateDueOnOccurrence(recurringTemplateConflict, occurrenceDate) &&
      recurringTemplateConflict.assigneeEmployee
    ) {
      return {
        employeeName: `${recurringTemplateConflict.assigneeEmployee.firstName} ${recurringTemplateConflict.assigneeEmployee.lastName}`.trim(),
      };
    }

    return null;
  }

  private formatDateKey(date: Date) {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
    const day = `${date.getUTCDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private addUtcDays(date: Date, days: number) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private utcDayNumber(date: Date) {
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
  }

  private utcDayStart(date: Date) {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
  }

  private utcDayEnd(date: Date) {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  }

  private serializeTaskWithPhotoProofUrls<
    T extends {
      activities?: Array<{
        id: string;
        kind: TaskActivityKind;
        body: string | null;
        createdAt: Date;
        actorEmployee: {
          id: string;
          firstName: string;
          lastName: string;
        };
      }>;
      photoProofs: Array<{
        id: string;
        fileName: string;
        storageKey: string;
        deletedAt: Date | null;
        supersededByProofId: string | null;
        createdAt: Date;
        uploadedByEmployee: {
          id: string;
          firstName: string;
          lastName: string;
        };
      }>;
    },
  >(task: T) {
    return {
      ...task,
      activities: Array.isArray(task.activities)
        ? task.activities.map((activity) => ({
            ...activity,
            createdAt: activity.createdAt.toISOString(),
          }))
        : [],
      photoProofs: task.photoProofs.map((proof) => ({
        id: proof.id,
        fileName: proof.fileName,
        storageKey: proof.storageKey,
        url: this.storageService.getObjectUrl(proof.storageKey),
        deletedAt: proof.deletedAt?.toISOString() ?? null,
        supersededByProofId: proof.supersededByProofId ?? null,
        createdAt: proof.createdAt.toISOString(),
        uploadedByEmployee: proof.uploadedByEmployee,
      })),
    };
  }

  private async uploadTaskPhotoProof(
    tenantId: string,
    taskKey: string,
    employeeId: string,
    fileName: string,
    dataUrl: string,
  ) {
    const sanitizedFileName =
      fileName
        .replace(/[^a-z0-9.\-_]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "photo.jpg";
    const storageKey = `tenants/${tenantId}/tasks/${taskKey.replace(/[^a-z0-9.\-_]+/gi, "-").toLowerCase()}/${employeeId}/${Date.now()}-${sanitizedFileName}`;
    return this.storageService.uploadDataUrl(storageKey, dataUrl);
  }

  private async addRecurringTaskPhotoProof(
    userId: string,
    employee: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
      departmentId: string;
      primaryLocationId: string;
      department: { id: string; name: string };
      primaryLocation: { id: string; name: string };
      groupMemberships: Array<{ groupId: string }>;
    },
    recurringTaskRef: {
      taskTemplateId: string;
      assigneeEmployeeId: string;
      dateKey: string;
    },
    dto: CreateTaskPhotoProofDto,
  ) {
    if (recurringTaskRef.assigneeEmployeeId !== employee.id) {
      throw new ForbiddenException(
        "Current user cannot update this recurring task.",
      );
    }

    const occurrenceDate = this.parseOccurrenceDate(recurringTaskRef.dateKey);
    if (!occurrenceDate) {
      throw new BadRequestException("Recurring task date is invalid.");
    }

    const template = await this.prisma.taskTemplate.findFirst({
      where: {
        id: recurringTaskRef.taskTemplateId,
        tenantId: employee.tenantId,
        isActive: true,
        expandOnDemand: true,
      },
      include: {
        managerEmployee: true,
        group: true,
      },
    });

    if (
      !template ||
      !this.isTemplateDueOnOccurrence(template, occurrenceDate)
    ) {
      throw new NotFoundException("Recurring task not found.");
    }

    if (!template.requiresPhoto) {
      throw new BadRequestException("This task does not require photo proof.");
    }

    const completion = await this.prisma.taskCompletion.upsert({
      where: {
        taskTemplateId_assigneeEmployeeId_occurrenceDate: {
          taskTemplateId: template.id,
          assigneeEmployeeId: employee.id,
          occurrenceDate,
        },
      },
      update: {},
      create: {
        tenantId: employee.tenantId,
        taskTemplateId: template.id,
        assigneeEmployeeId: employee.id,
        occurrenceDate,
        status: TaskStatus.TODO,
      },
      include: {
        photoProofs: {
          include: {
            uploadedByEmployee: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const activeProofs = completion.photoProofs.filter(
      (proof) => !proof.deletedAt && !proof.supersededByProofId,
    );
    if (dto.action === "add" && activeProofs.length >= TASK_PHOTO_PROOF_LIMIT) {
      throw new BadRequestException(
        `Task photo proof limit is ${TASK_PHOTO_PROOF_LIMIT}.`,
      );
    }

    const targetProof =
      dto.action === "replace"
        ? activeProofs.find((proof) => proof.id === dto.targetProofId)
        : null;

    if (dto.action === "replace" && !targetProof) {
      throw new BadRequestException("Photo proof to replace was not found.");
    }

    const fileName = dto.fileName.trim() || "task-photo.jpg";
    const uploaded = await this.uploadTaskPhotoProof(
      employee.tenantId,
      `recurring-${template.id}-${recurringTaskRef.dateKey}`,
      employee.id,
      fileName,
      dto.dataUrl,
    );

    const updatedCompletion = await this.prisma.$transaction(async (tx) => {
      const createdProof = await tx.taskPhotoProof.create({
        data: {
          tenantId: employee.tenantId,
          taskCompletionId: completion.id,
          uploadedByEmployeeId: employee.id,
          fileName,
          storageKey: uploaded.key,
        },
      });

      if (targetProof) {
        await tx.taskPhotoProof.update({
          where: { id: targetProof.id },
          data: {
            supersededByProofId: createdProof.id,
          },
        });
      }

      return tx.taskCompletion.findUniqueOrThrow({
        where: { id: completion.id },
        include: {
          photoProofs: {
            include: {
              uploadedByEmployee: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: "task_completion",
      entityId: updatedCompletion.id,
      action:
        dto.action === "replace"
          ? "task_completion.photo_proof_replaced"
          : "task_completion.photo_proof_added",
      metadata: {
        taskTemplateId: template.id,
        occurrenceDate: occurrenceDate.toISOString(),
        proofStorageKey: uploaded.key,
        targetProofId: targetProof?.id ?? null,
      },
    });

    await this.emitWorkspaceRefreshForAudience({
      tenantId: employee.tenantId,
      managerUserId: template.managerEmployee.userId ?? null,
      assigneeUserId: userId,
      groupId: template.group?.id ?? null,
      reason:
        dto.action === "replace"
          ? "task_completion.photo_proof_replaced"
          : "task_completion.photo_proof_added",
    });

    return this.buildRecurringTaskItem(
      template,
      employee,
      updatedCompletion,
      occurrenceDate,
    );
  }

  private async deleteRecurringTaskPhotoProof(
    userId: string,
    employee: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
      departmentId: string;
      primaryLocationId: string;
      department: { id: string; name: string };
      primaryLocation: { id: string; name: string };
      groupMemberships: Array<{ groupId: string }>;
    },
    recurringTaskRef: {
      taskTemplateId: string;
      assigneeEmployeeId: string;
      dateKey: string;
    },
    proofId: string,
  ) {
    if (recurringTaskRef.assigneeEmployeeId !== employee.id) {
      throw new ForbiddenException(
        "Current user cannot update this recurring task.",
      );
    }

    const occurrenceDate = this.parseOccurrenceDate(recurringTaskRef.dateKey);
    if (!occurrenceDate) {
      throw new BadRequestException("Recurring task date is invalid.");
    }

    const template = await this.prisma.taskTemplate.findFirst({
      where: {
        id: recurringTaskRef.taskTemplateId,
        tenantId: employee.tenantId,
        isActive: true,
        expandOnDemand: true,
      },
      include: {
        managerEmployee: true,
        group: true,
      },
    });

    if (
      !template ||
      !this.isTemplateDueOnOccurrence(template, occurrenceDate)
    ) {
      throw new NotFoundException("Recurring task not found.");
    }

    const completion = await this.prisma.taskCompletion.findUnique({
      where: {
        taskTemplateId_assigneeEmployeeId_occurrenceDate: {
          taskTemplateId: template.id,
          assigneeEmployeeId: employee.id,
          occurrenceDate,
        },
      },
      include: {
        photoProofs: {
          include: {
            uploadedByEmployee: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!completion) {
      throw new NotFoundException("Photo proof not found.");
    }

    const targetProof = completion.photoProofs.find(
      (proof) =>
        proof.id === proofId && !proof.deletedAt && !proof.supersededByProofId,
    );

    if (!targetProof) {
      throw new NotFoundException("Photo proof not found.");
    }

    const updatedCompletion = await this.prisma.$transaction(async (tx) => {
      await tx.taskPhotoProof.update({
        where: { id: targetProof.id },
        data: {
          deletedAt: new Date(),
        },
      });

      const nextCompletion = await tx.taskCompletion.findUniqueOrThrow({
        where: { id: completion.id },
        include: {
          photoProofs: {
            include: {
              uploadedByEmployee: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
      const remainingActive = nextCompletion.photoProofs.filter(
        (proof) => !proof.deletedAt && !proof.supersededByProofId,
      ).length;

      if (
        template.requiresPhoto &&
        nextCompletion.status === TaskStatus.DONE &&
        remainingActive === 0
      ) {
        return tx.taskCompletion.update({
          where: { id: completion.id },
          data: {
            status: TaskStatus.TODO,
            completedAt: null,
          },
          include: {
            photoProofs: {
              include: {
                uploadedByEmployee: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        });
      }

      return nextCompletion;
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: "task_completion",
      entityId: updatedCompletion.id,
      action: "task_completion.photo_proof_deleted",
      metadata: {
        taskTemplateId: template.id,
        occurrenceDate: occurrenceDate.toISOString(),
        proofId,
      },
    });

    await this.emitWorkspaceRefreshForAudience({
      tenantId: employee.tenantId,
      managerUserId: template.managerEmployee.userId ?? null,
      assigneeUserId: userId,
      groupId: template.group?.id ?? null,
      reason: "task_completion.photo_proof_deleted",
    });

    return this.buildRecurringTaskItem(
      template,
      employee,
      updatedCompletion,
      occurrenceDate,
    );
  }

  private async emitWorkspaceRefreshForTasks(
    tasks: Array<{
      tenantId: string;
      groupId: string | null;
      managerEmployee?: { userId?: string | null } | null;
      assigneeEmployee?: { userId?: string | null } | null;
    }>,
    reason: string,
  ) {
    const userIds = new Set<string>();
    const tenantIds = new Set<string>();
    const groupIds = new Set<string>();

    for (const task of tasks) {
      tenantIds.add(task.tenantId);

      if (task.managerEmployee?.userId) {
        userIds.add(task.managerEmployee.userId);
      }

      if (task.assigneeEmployee?.userId) {
        userIds.add(task.assigneeEmployee.userId);
      }

      if (task.groupId) {
        groupIds.add(task.groupId);
      }
    }

    if (groupIds.size > 0) {
      const memberships = await this.prisma.workGroupMembership.findMany({
        where: {
          groupId: {
            in: Array.from(groupIds),
          },
          employee: {
            tenantId: {
              in: Array.from(tenantIds),
            },
          },
        },
        select: {
          employee: {
            select: {
              userId: true,
            },
          },
        },
      });

      for (const membership of memberships) {
        if (membership.employee.userId) {
          userIds.add(membership.employee.userId);
        }
      }
    }

    this.emitWorkspaceRefresh(Array.from(userIds), reason);
  }

  private async emitWorkspaceRefreshForAudience(params: {
    tenantId: string;
    groupId?: string | null;
    managerUserId?: string | null;
    assigneeUserId?: string | null;
    reason: string;
  }) {
    const audience = await this.resolveWorkspaceRefreshAudience(params);
    this.emitWorkspaceRefresh(audience, params.reason);
  }

  private emitWorkspaceRefresh(userIds: string[], reason: string) {
    if (userIds.length === 0) {
      return;
    }

    const refreshedAt = new Date().toISOString();

    for (const userId of userIds) {
      void this.collaborationRealtimeService.fanoutWorkspaceRefresh(userId, {
        reason,
        refreshedAt,
      });
    }
  }

  private async resolveWorkspaceRefreshAudience(params: {
    tenantId: string;
    groupId?: string | null;
    managerUserId?: string | null;
    assigneeUserId?: string | null;
  }) {
    const userIds = new Set<string>();

    if (params.managerUserId) {
      userIds.add(params.managerUserId);
    }

    if (params.assigneeUserId) {
      userIds.add(params.assigneeUserId);
    }

    if (params.groupId) {
      const memberships = await this.prisma.workGroupMembership.findMany({
        where: {
          groupId: params.groupId,
          employee: {
            tenantId: params.tenantId,
          },
        },
        select: {
          employee: {
            select: {
              userId: true,
            },
          },
        },
      });

      for (const membership of memberships) {
        if (membership.employee.userId) {
          userIds.add(membership.employee.userId);
        }
      }
    }

    return Array.from(userIds);
  }

  private taskInclude() {
    return {
      managerEmployee: true,
      assigneeEmployee: {
        include: {
          department: true,
          primaryLocation: true,
        },
      },
      group: true,
      checklistItems: {
        include: {
          completedByEmployee: true,
        },
        orderBy: { sortOrder: "asc" as const },
      },
      activities: {
        include: {
          actorEmployee: true,
        },
        orderBy: { createdAt: "desc" as const },
      },
      photoProofs: {
        include: {
          uploadedByEmployee: true,
        },
        orderBy: { createdAt: "asc" as const },
      },
    } satisfies Prisma.TaskInclude;
  }

  private taskListInclude() {
    return {
      managerEmployee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      assigneeEmployee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          primaryLocation: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      checklistItems: {
        select: {
          id: true,
          title: true,
          sortOrder: true,
          isCompleted: true,
          completedAt: true,
          completedByEmployee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" as const },
      },
      photoProofs: {
        select: {
          id: true,
          fileName: true,
          storageKey: true,
          deletedAt: true,
          supersededByProofId: true,
          createdAt: true,
          uploadedByEmployee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "asc" as const },
      },
    } satisfies Prisma.TaskInclude;
  }

  private chatInclude() {
    return {
      createdByEmployee: true,
      group: true,
      participants: {
        include: {
          employee: {
            include: {
              user: true,
            },
          },
        },
        orderBy: { createdAt: "asc" as const },
      },
      messages: {
        include: {
          authorEmployee: true,
        },
        orderBy: { createdAt: "asc" as const },
      },
    } satisfies Prisma.ChatThreadInclude;
  }
}
