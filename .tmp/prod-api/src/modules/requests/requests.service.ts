import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  Prisma,
  ApprovalPolicy,
  NotificationType,
  RequestStatus,
  RequestType,
  TimeOffBalanceKind,
  TimeOffTransactionType,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { BulkTimeOffAccrualDto } from './dto/bulk-time-off-accrual.dto';
import { CreateApprovalPolicyDto } from './dto/create-approval-policy.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestCalendarQueryDto } from './dto/request-calendar-query.dto';
import { RequestActionDto } from './dto/request-action.dto';
import { TimeOffBalanceUpsertDto } from './dto/time-off-balance-upsert.dto';

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
  ) {}

  async create(userId: string, dto: CreateRequestDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    const startsOn = new Date(dto.startsOn);
    const endsOn = new Date(dto.endsOn);
    startsOn.setHours(0, 0, 0, 0);
    endsOn.setHours(0, 0, 0, 0);

    if (endsOn < startsOn) {
      throw new BadRequestException('Request end date must be on or after the start date.');
    }

    const relatedRequest =
      dto.requestType === RequestType.VACATION_CHANGE
        ? await this.prisma.employeeRequest.findFirst({
            where: {
              id: dto.relatedRequestId,
              tenantId: employee.tenantId,
              employeeId: employee.id,
              requestType: RequestType.LEAVE,
              status: RequestStatus.APPROVED,
            },
          })
        : null;

    if (dto.requestType === RequestType.VACATION_CHANGE && !relatedRequest) {
      throw new BadRequestException('Vacation change request must reference an approved vacation request.');
    }

    const approvers = await this.resolveApprovers(employee.tenantId, employee, dto.requestType);
    const requestedDays = this.diffDays(startsOn, endsOn);
    const previousRequestedDays = relatedRequest ? this.diffDays(relatedRequest.startsOn, relatedRequest.endsOn) : 0;
    const reservationDays =
      dto.requestType === RequestType.LEAVE
        ? requestedDays
        : dto.requestType === RequestType.VACATION_CHANGE
          ? Math.max(requestedDays - previousRequestedDays, 0)
          : 0;
    const requestContextJson =
      dto.requestType === RequestType.VACATION_CHANGE
        ? JSON.stringify({
            previousStartsOn: dto.previousStartsOn ?? relatedRequest?.startsOn.toISOString(),
            previousEndsOn: dto.previousEndsOn ?? relatedRequest?.endsOn.toISOString(),
            previousRequestedDays,
          })
        : null;

    const uploadedAttachments =
      dto.attachments && dto.attachments.length > 0
        ? await Promise.all(
            dto.attachments.map((attachment, index) =>
              this.uploadRequestAttachment(employee.tenantId, employee.id, attachment.fileName, attachment.dataUrl, index),
            ),
          )
        : [];

    const request = await this.prisma.$transaction(async (tx) => {
      const reservedTransactionId =
        reservationDays > 0
          ? await this.reserveBalanceDays(
              tx,
              employee.tenantId,
              userId,
              employee.id,
              TimeOffBalanceKind.VACATION,
              reservationDays,
              null,
              dto.requestType === RequestType.LEAVE
                ? 'Vacation request submitted.'
                : 'Vacation change request submitted with additional days.',
            )
          : null;

      const created = await tx.employeeRequest.create({
        data: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          managerEmployeeId: approvers[0]?.id ?? null,
          relatedRequestId: relatedRequest?.id ?? null,
          requestType: dto.requestType,
          title: dto.title,
          reason: dto.reason,
          startsOn,
          endsOn,
          requestedDays,
          requestContextJson,
          approvalSteps: {
            create: approvers.map((approver, index) => ({
              tenantId: employee.tenantId,
              approverEmployeeId: approver.id,
              sequence: index + 1,
            })),
          },
          attachments: {
            create: uploadedAttachments.map((attachment) => ({
              tenantId: employee.tenantId,
              uploadedByEmployeeId: employee.id,
              fileName: attachment.fileName,
              contentType: attachment.contentType,
              sizeBytes: attachment.sizeBytes,
              storageKey: attachment.storageKey,
            })),
          },
        },
        include: {
          approvalSteps: {
            include: {
              approverEmployee: true,
            },
            orderBy: { sequence: 'asc' },
          },
          attachments: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (reservedTransactionId) {
        await tx.employeeTimeOffTransaction.update({
          where: { id: reservedTransactionId },
          data: { requestId: created.id },
        });
      }

      return created;
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: 'employee_request',
      entityId: request.id,
      action: 'request.created',
      metadata: {
        requestType: request.requestType,
        requestedDays,
        attachmentCount: request.attachments.length,
        relatedRequestId: relatedRequest?.id ?? null,
        approverEmployeeIds: request.approvalSteps.map((step) => step.approverEmployeeId),
      },
    });

    const firstApprover = request.approvalSteps[0]?.approverEmployee;
    if (firstApprover?.userId) {
      await this.notificationsService.createForUser({
        tenantId: employee.tenantId,
        userId: firstApprover.userId,
        type: NotificationType.REQUEST_ACTION_REQUIRED,
        title: `Approval required: ${request.title}`,
        body: `${employee.firstName} ${employee.lastName} submitted a ${request.requestType.toLowerCase()} request.`,
        actionUrl: '/requests',
        metadata: {
          requestId: request.id,
          employeeId: employee.id,
          sequence: 1,
        },
      });
    }

    return {
      ...request,
      attachments: request.attachments.map((attachment) => ({
        ...attachment,
        url: this.storageService.getObjectUrl(attachment.storageKey),
      })),
    };
  }

  async getMyBalances(userId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId } });

    const [balances, sickLeaveStats] = await Promise.all([
      this.prisma.employeeTimeOffBalance.findMany({
        where: { employeeId: employee.id },
        orderBy: { kind: 'asc' },
      }),
      this.prisma.employeeRequest.aggregate({
        where: {
          employeeId: employee.id,
          requestType: RequestType.SICK_LEAVE,
          status: RequestStatus.APPROVED,
        },
        _count: { _all: true },
        _sum: { requestedDays: true },
      }),
    ]);

    return {
      employeeId: employee.id,
      balances: this.mapBalancesSummary(balances),
      sickLeave: {
        approvedRequests: sickLeaveStats._count._all,
        approvedDays: sickLeaveStats._sum.requestedDays ?? 0,
      },
    };
  }

  async getMyCalendar(userId: string, query: RequestCalendarQueryDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId } });
    const { dateFrom, dateTo } = this.resolveCalendarWindow(query.dateFrom, query.dateTo);

    const requests = await this.prisma.employeeRequest.findMany({
      where: {
        employeeId: employee.id,
        startsOn: { lte: dateTo },
        endsOn: { gte: dateFrom },
      },
      include: {
        attachments: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ startsOn: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      dateFrom,
      dateTo,
      requests: requests.map((request) => ({
        ...request,
        attachments: request.attachments.map((attachment) => ({
          ...attachment,
          url: this.storageService.getObjectUrl(attachment.storageKey),
        })),
      })),
    };
  }

  async listBalances(tenantId: string, search?: string) {
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        department: true,
        position: true,
        user: {
          select: {
            email: true,
          },
        },
        timeOffBalances: {
          orderBy: { kind: 'asc' },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    const sickLeaveStats = await this.prisma.employeeRequest.groupBy({
      by: ['employeeId'],
      where: {
        tenantId,
        requestType: RequestType.SICK_LEAVE,
        status: RequestStatus.APPROVED,
      },
      _count: { _all: true },
      _sum: { requestedDays: true },
    });

    const sickLeaveStatsMap = new Map(
      sickLeaveStats.map((row) => [
        row.employeeId,
        {
          approvedRequests: row._count._all,
          approvedDays: row._sum.requestedDays ?? 0,
        },
      ]),
    );

    return employees.map((employee) => ({
      employeeId: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.user.email,
      department: employee.department ? { id: employee.department.id, name: employee.department.name } : null,
      position: employee.position ? { id: employee.position.id, name: employee.position.name } : null,
      balances: this.mapBalancesSummary(employee.timeOffBalances),
      sickLeave: sickLeaveStatsMap.get(employee.id) ?? {
        approvedRequests: 0,
        approvedDays: 0,
      },
    }));
  }

  async upsertEmployeeBalance(
    tenantId: string,
    actorUserId: string,
    employeeId: string,
    dto: TimeOffBalanceUpsertDto,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    const balances = await this.prisma.$transaction(async (tx) => {
      if (dto.vacationAllowanceDays !== undefined) {
        await this.setBalanceAllowance(
          tx,
          tenantId,
          actorUserId,
          employee.id,
          TimeOffBalanceKind.VACATION,
          dto.vacationAllowanceDays,
          dto.note ?? 'Vacation allowance updated.',
        );
      }

      if (dto.personalDayOffAllowanceDays !== undefined) {
        await this.setBalanceAllowance(
          tx,
          tenantId,
          actorUserId,
          employee.id,
          TimeOffBalanceKind.PERSONAL_DAY_OFF,
          dto.personalDayOffAllowanceDays,
          dto.note ?? 'Personal day off allowance updated.',
        );
      }

      return tx.employeeTimeOffBalance.findMany({
        where: { employeeId: employee.id },
        orderBy: { kind: 'asc' },
      });
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'employee_time_off_balance',
      entityId: employee.id,
      action: 'time_off_balance.updated',
      metadata: { ...dto },
    });

    return {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      balances: this.mapBalancesSummary(balances),
    };
  }

  async applyBulkAccrual(tenantId: string, actorUserId: string, dto: BulkTimeOffAccrualDto) {
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        ...(dto.applyToAll ? {} : { id: { in: dto.employeeIds ?? [] } }),
      },
      select: { id: true },
    });

    if (employees.length === 0) {
      throw new BadRequestException('No employees selected for bulk accrual.');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const employee of employees) {
        await this.adjustBalanceAllowance(
          tx,
          tenantId,
          actorUserId,
          employee.id,
          dto.kind as TimeOffBalanceKind,
          dto.deltaDays,
          dto.note ?? 'Bulk accrual applied.',
          TimeOffTransactionType.ACCRUAL,
        );
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'employee_time_off_balance_bulk',
      entityId: dto.kind,
      action: 'time_off_balance.bulk_accrual',
      metadata: {
        employeeCount: employees.length,
        deltaDays: dto.deltaDays,
        applyToAll: dto.applyToAll ?? false,
        employeeIds: dto.employeeIds ?? [],
      },
    });

    return {
      success: true,
      employeeCount: employees.length,
      kind: dto.kind,
      deltaDays: dto.deltaDays,
    };
  }

  async listMine(userId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId } });

    const requests = await this.prisma.employeeRequest.findMany({
      where: { employeeId: employee.id },
      include: {
        relatedRequest: true,
        approvalSteps: {
          include: {
            approverEmployee: true,
          },
          orderBy: { sequence: 'asc' },
        },
        comments: {
          include: {
            authorEmployee: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((request) => this.serializeRequestWithUrls(request));
  }

  async inbox(userId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId } });

    const steps = await this.prisma.requestApprovalStep.findMany({
      where: {
        approverEmployeeId: employee.id,
        status: ApprovalStatus.PENDING,
        request: {
          status: RequestStatus.PENDING,
        },
      },
      include: {
        request: {
          include: {
            employee: true,
            relatedRequest: true,
            approvalSteps: {
              include: {
                approverEmployee: true,
              },
              orderBy: { sequence: 'asc' },
            },
            comments: {
              include: {
                authorEmployee: true,
              },
              orderBy: { createdAt: 'asc' },
            },
            attachments: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return steps.map((step) => ({
      ...step,
      request: this.serializeRequestWithUrls(step.request),
    }));
  }

  async getDetails(userId: string, requestId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId } });
    const request = await this.prisma.employeeRequest.findFirst({
      where: {
        id: requestId,
        tenantId: employee.tenantId,
      },
      include: {
        employee: true,
        relatedRequest: true,
        approvalSteps: {
          include: {
            approverEmployee: true,
          },
          orderBy: { sequence: 'asc' },
        },
        comments: {
          include: {
            authorEmployee: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found.');
    }

    if (!this.canAccessRequest(employee.id, request)) {
      throw new ForbiddenException('Current user cannot access this request.');
    }

    return this.serializeRequestWithUrls(request);
  }

  async addComment(userId: string, requestId: string, body: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId } });
    const request = await this.prisma.employeeRequest.findFirst({
      where: {
        id: requestId,
        tenantId: employee.tenantId,
      },
      include: {
        employee: true,
        approvalSteps: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found.');
    }

    if (!this.canAccessRequest(employee.id, request)) {
      throw new ForbiddenException('Current user cannot comment on this request.');
    }

    const comment = await this.prisma.requestComment.create({
      data: {
        tenantId: employee.tenantId,
        requestId: request.id,
        authorEmployeeId: employee.id,
        body,
      },
      include: {
        authorEmployee: true,
      },
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: 'employee_request_comment',
      entityId: comment.id,
      action: 'request.comment_added',
      metadata: {
        requestId: request.id,
      },
    });

    if (request.employee.id !== employee.id) {
      await this.notificationsService.createForUser({
        tenantId: employee.tenantId,
        userId: request.employee.userId,
        type: NotificationType.REQUEST_ACTION_REQUIRED,
        title: `New comment on request: ${request.title}`,
        body,
        actionUrl: '/employee/requests',
        metadata: {
          requestId: request.id,
          commentId: comment.id,
        },
      });
    }

    const approverUserIds = await this.prisma.employee.findMany({
      where: {
        id: {
          in: request.approvalSteps
            .map((step) => step.approverEmployeeId)
            .filter((approverEmployeeId) => approverEmployeeId !== employee.id),
        },
      },
      select: { userId: true },
    });

    for (const approver of approverUserIds) {
      await this.notificationsService.createForUser({
        tenantId: employee.tenantId,
        userId: approver.userId,
        type: NotificationType.REQUEST_ACTION_REQUIRED,
        title: `New comment on request: ${request.title}`,
        body,
        actionUrl: '/requests',
        metadata: {
          requestId: request.id,
          commentId: comment.id,
        },
      });
    }

    return comment;
  }

  async approve(userId: string, requestId: string, dto: RequestActionDto) {
    return this.actOnRequest(userId, requestId, dto, ApprovalStatus.APPROVED);
  }

  async reject(userId: string, requestId: string, dto: RequestActionDto) {
    return this.actOnRequest(userId, requestId, dto, ApprovalStatus.REJECTED);
  }

  async listPolicies(tenantId: string) {
    const policies = await this.prisma.approvalPolicy.findMany({
      where: { tenantId },
      include: {
        approverEmployee: true,
        department: true,
        location: true,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    const grouped = new Map<
      string,
      {
        chainKey: string;
        requestType: RequestType | null;
        department: { id: string; name: string } | null;
        location: { id: string; name: string } | null;
        steps: Array<{
          id: string;
          priority: number;
          approverEmployee: {
            id: string;
            firstName: string;
            lastName: string;
          };
        }>;
      }
    >();

    for (const policy of policies) {
      const chainKey = this.buildChainKey(policy.requestType, policy.departmentId, policy.locationId);
      const existing = grouped.get(chainKey);

      if (existing) {
        existing.steps.push({
          id: policy.id,
          priority: policy.priority,
          approverEmployee: {
            id: policy.approverEmployee.id,
            firstName: policy.approverEmployee.firstName,
            lastName: policy.approverEmployee.lastName,
          },
        });
        continue;
      }

      grouped.set(chainKey, {
        chainKey,
        requestType: policy.requestType,
        department: policy.department ? { id: policy.department.id, name: policy.department.name } : null,
        location: policy.location ? { id: policy.location.id, name: policy.location.name } : null,
        steps: [
          {
            id: policy.id,
            priority: policy.priority,
            approverEmployee: {
              id: policy.approverEmployee.id,
              firstName: policy.approverEmployee.firstName,
              lastName: policy.approverEmployee.lastName,
            },
          },
        ],
      });
    }

    return Array.from(grouped.values()).sort((left, right) => left.chainKey.localeCompare(right.chainKey));
  }

  async createPolicy(tenantId: string, actorUserId: string, dto: CreateApprovalPolicyDto) {
    const approvers = await this.prisma.employee.findMany({
      where: {
        tenantId,
        id: { in: dto.approverEmployeeIds },
      },
      select: { id: true },
    });

    if (approvers.length !== dto.approverEmployeeIds.length) {
      throw new BadRequestException('Approval chain contains approvers outside the current tenant.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.approvalPolicy.deleteMany({
        where: {
          tenantId,
          requestType: dto.requestType ?? null,
          departmentId: dto.departmentId ?? null,
          locationId: dto.locationId ?? null,
        },
      });

      for (const [index, approverEmployeeId] of dto.approverEmployeeIds.entries()) {
        await tx.approvalPolicy.create({
          data: {
            tenantId,
            requestType: dto.requestType,
            departmentId: dto.departmentId,
            locationId: dto.locationId,
            approverEmployeeId,
            priority: index + 1,
          },
        });
      }
    });

    const chainKey = this.buildChainKey(dto.requestType ?? null, dto.departmentId ?? null, dto.locationId ?? null);

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'approval_policy_chain',
      entityId: chainKey,
      action: 'approval_policy_chain.upserted',
      metadata: {
        requestType: dto.requestType ?? null,
        departmentId: dto.departmentId ?? null,
        locationId: dto.locationId ?? null,
        approverEmployeeIds: dto.approverEmployeeIds,
      },
    });

    return {
      success: true,
      chainKey,
      count: dto.approverEmployeeIds.length,
    };
  }

  async deletePolicy(tenantId: string, actorUserId: string, chainKey: string) {
    const scope = this.parseChainKey(chainKey);
    const result = await this.prisma.approvalPolicy.deleteMany({
      where: {
        tenantId,
        requestType: scope.requestType,
        departmentId: scope.departmentId,
        locationId: scope.locationId,
      },
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'approval_policy_chain',
      entityId: chainKey,
      action: 'approval_policy_chain.deleted',
      metadata: {
        deletedCount: result.count,
        ...scope,
      },
    });

    return { success: true, deletedCount: result.count };
  }

  private async actOnRequest(
    userId: string,
    requestId: string,
    dto: RequestActionDto,
    action: 'APPROVED' | 'REJECTED',
  ) {
    const approver = await this.prisma.employee.findUniqueOrThrow({ where: { userId } });

    const request = await this.prisma.employeeRequest.findFirst({
      where: {
        id: requestId,
        tenantId: approver.tenantId,
      },
      include: {
        employee: true,
        relatedRequest: true,
        approvalSteps: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found.');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Request is already finalized.');
    }

    const currentStep = request.approvalSteps.find((step) => step.sequence === request.currentStep);
    if (!currentStep) {
      throw new BadRequestException('Request approval chain is invalid.');
    }

    if (currentStep.approverEmployeeId !== approver.id) {
      throw new ForbiddenException('Current user is not the active approver for this request.');
    }

    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      await tx.requestApprovalStep.update({
        where: { id: currentStep.id },
        data: {
          status: action,
          comment: dto.comment,
          actedAt: new Date(),
        },
      });

      if (action === ApprovalStatus.REJECTED) {
        await this.releasePendingReservationForRequest(tx, request, userId);

        return tx.employeeRequest.update({
          where: { id: request.id },
          data: {
            status: RequestStatus.REJECTED,
            finalDecisionAt: new Date(),
          },
          include: {
            employee: true,
            relatedRequest: true,
            approvalSteps: {
              include: { approverEmployee: true },
              orderBy: { sequence: 'asc' },
            },
            attachments: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });
      }

      const nextStep = request.approvalSteps.find((step) => step.sequence === request.currentStep + 1);

      const finalizedRequest = await tx.employeeRequest.update({
        where: { id: request.id },
        data: nextStep
          ? { currentStep: request.currentStep + 1 }
          : {
              status: RequestStatus.APPROVED,
              finalDecisionAt: new Date(),
            },
        include: {
          employee: true,
          relatedRequest: true,
          approvalSteps: {
            include: { approverEmployee: true },
            orderBy: { sequence: 'asc' },
          },
          attachments: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!nextStep) {
        await this.applyApprovedRequestEffects(tx, userId, request);
      }

      return finalizedRequest;
    });

    await this.auditService.log({
      tenantId: approver.tenantId,
      actorUserId: userId,
      entityType: 'employee_request',
      entityId: request.id,
      action: action === ApprovalStatus.APPROVED ? 'request.approved' : 'request.rejected',
      metadata: {
        approverEmployeeId: approver.id,
        currentStep: currentStep.sequence,
        comment: dto.comment ?? null,
        finalStatus: updatedRequest.status,
      },
    });

    const nextStep = updatedRequest.approvalSteps.find(
      (step) => step.sequence === updatedRequest.currentStep && step.status === ApprovalStatus.PENDING,
    );

    if (updatedRequest.status === RequestStatus.PENDING && action === ApprovalStatus.APPROVED && nextStep) {
      await this.notificationsService.createForUser({
        tenantId: approver.tenantId,
        userId: nextStep.approverEmployee.userId,
        type: NotificationType.REQUEST_ACTION_REQUIRED,
        title: `Approval required: ${updatedRequest.title}`,
        body: `${updatedRequest.employee.firstName} ${updatedRequest.employee.lastName} request moved to step ${nextStep.sequence}.`,
        actionUrl: '/requests',
        metadata: {
          requestId: updatedRequest.id,
          sequence: nextStep.sequence,
        },
      });
    }

    if (updatedRequest.status === RequestStatus.APPROVED) {
      await this.notificationsService.createForUser({
        tenantId: approver.tenantId,
        userId: updatedRequest.employee.userId,
        type: NotificationType.REQUEST_APPROVED,
        title: `Request approved: ${updatedRequest.title}`,
        body: 'Your request has been approved.',
        actionUrl: '/employee/requests',
        metadata: {
          requestId: updatedRequest.id,
        },
      });
    }

    if (updatedRequest.status === RequestStatus.REJECTED) {
      await this.notificationsService.createForUser({
        tenantId: approver.tenantId,
        userId: updatedRequest.employee.userId,
        type: NotificationType.REQUEST_REJECTED,
        title: `Request rejected: ${updatedRequest.title}`,
        body: dto.comment ?? 'Your request has been rejected.',
        actionUrl: '/employee/requests',
        metadata: {
          requestId: updatedRequest.id,
        },
      });
    }

    return this.serializeRequestWithUrls(updatedRequest);
  }

  private resolveCalendarWindow(dateFromRaw?: string, dateToRaw?: string) {
    const now = new Date();
    const dateFrom = dateFromRaw ? new Date(dateFromRaw) : new Date(now.getFullYear(), now.getMonth(), 1);
    const dateTo = dateToRaw ? new Date(dateToRaw) : new Date(now.getFullYear(), now.getMonth() + 2, 0);

    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);

    if (dateTo < dateFrom) {
      throw new BadRequestException('Calendar end date must be on or after the start date.');
    }

    return { dateFrom, dateTo };
  }

  private serializeRequestWithUrls<T extends { attachments?: Array<{ storageKey: string }> }>(request: T) {
    if (!request.attachments) {
      return request;
    }

    return {
      ...request,
      attachments: request.attachments.map((attachment) => ({
        ...attachment,
        url: this.storageService.getObjectUrl(attachment.storageKey),
      })),
    };
  }

  private mapBalancesSummary(
    balances: Array<{
      kind: TimeOffBalanceKind;
      allowanceDays: number;
      usedDays: number;
      pendingDays: number;
      updatedAt?: Date;
    }>,
  ) {
    return [TimeOffBalanceKind.VACATION, TimeOffBalanceKind.PERSONAL_DAY_OFF].map((kind) => {
      const balance = balances.find((item) => item.kind === kind);

      return {
        kind,
        allowanceDays: balance?.allowanceDays ?? 0,
        usedDays: balance?.usedDays ?? 0,
        pendingDays: balance?.pendingDays ?? 0,
        availableDays: Math.max(
          (balance?.allowanceDays ?? 0) - (balance?.usedDays ?? 0) - (balance?.pendingDays ?? 0),
          0,
        ),
        updatedAt: balance?.updatedAt ?? null,
      };
    });
  }

  private async uploadRequestAttachment(
    tenantId: string,
    employeeId: string,
    fileName: string,
    dataUrl: string,
    index: number,
  ) {
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120) || `attachment-${index + 1}`;
    const storageKey = `tenants/${tenantId}/requests/${employeeId}/${Date.now()}-${index}-${sanitizedFileName}`;
    const uploaded = await this.storageService.uploadDataUrl(storageKey, dataUrl);

    return {
      fileName,
      storageKey: uploaded.key,
      contentType: uploaded.contentType,
      sizeBytes: uploaded.sizeBytes,
    };
  }

  private async getOrCreateBalance(
    tx: Prisma.TransactionClient,
    tenantId: string,
    employeeId: string,
    kind: TimeOffBalanceKind,
  ) {
    return tx.employeeTimeOffBalance.upsert({
      where: {
        employeeId_kind: {
          employeeId,
          kind,
        },
      },
      update: {},
      create: {
        tenantId,
        employeeId,
        kind,
      },
    });
  }

  private async writeBalanceTransaction(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      employeeId: string;
      balanceId: string;
      kind: TimeOffBalanceKind;
      type: TimeOffTransactionType;
      deltaDays: number;
      balanceAfterAllowanceDays: number;
      balanceAfterUsedDays: number;
      balanceAfterPendingDays: number;
      note?: string | null;
      actorUserId?: string | null;
      requestId?: string | null;
    },
  ) {
    return tx.employeeTimeOffTransaction.create({
      data: {
        tenantId: params.tenantId,
        employeeId: params.employeeId,
        balanceId: params.balanceId,
        kind: params.kind,
        type: params.type,
        deltaDays: params.deltaDays,
        balanceAfterAllowanceDays: params.balanceAfterAllowanceDays,
        balanceAfterUsedDays: params.balanceAfterUsedDays,
        balanceAfterPendingDays: params.balanceAfterPendingDays,
        note: params.note ?? null,
        actorUserId: params.actorUserId ?? null,
        requestId: params.requestId ?? null,
      },
    });
  }

  private async setBalanceAllowance(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorUserId: string,
    employeeId: string,
    kind: TimeOffBalanceKind,
    allowanceDays: number,
    note: string,
  ) {
    const balance = await this.getOrCreateBalance(tx, tenantId, employeeId, kind);

    if (allowanceDays < balance.usedDays + balance.pendingDays) {
      throw new BadRequestException('Allowance cannot be lower than used and pending days.');
    }

    const updated = await tx.employeeTimeOffBalance.update({
      where: { id: balance.id },
      data: { allowanceDays },
    });

    await this.writeBalanceTransaction(tx, {
      tenantId,
      employeeId,
      balanceId: updated.id,
      kind,
      type: TimeOffTransactionType.SET,
      deltaDays: allowanceDays - balance.allowanceDays,
      balanceAfterAllowanceDays: updated.allowanceDays,
      balanceAfterUsedDays: updated.usedDays,
      balanceAfterPendingDays: updated.pendingDays,
      note,
      actorUserId,
    });

    return updated;
  }

  private async adjustBalanceAllowance(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorUserId: string,
    employeeId: string,
    kind: TimeOffBalanceKind,
    deltaDays: number,
    note: string,
    type: TimeOffTransactionType = TimeOffTransactionType.ADJUST,
  ) {
    const balance = await this.getOrCreateBalance(tx, tenantId, employeeId, kind);
    const nextAllowanceDays = balance.allowanceDays + deltaDays;

    if (nextAllowanceDays < balance.usedDays + balance.pendingDays) {
      throw new BadRequestException('Allowance adjustment would make the balance negative.');
    }

    const updated = await tx.employeeTimeOffBalance.update({
      where: { id: balance.id },
      data: { allowanceDays: nextAllowanceDays },
    });

    await this.writeBalanceTransaction(tx, {
      tenantId,
      employeeId,
      balanceId: updated.id,
      kind,
      type,
      deltaDays,
      balanceAfterAllowanceDays: updated.allowanceDays,
      balanceAfterUsedDays: updated.usedDays,
      balanceAfterPendingDays: updated.pendingDays,
      note,
      actorUserId,
    });

    return updated;
  }

  private async reserveBalanceDays(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorUserId: string,
    employeeId: string,
    kind: TimeOffBalanceKind,
    days: number,
    requestId: string | null,
    note: string,
  ) {
    if (days <= 0) {
      return null;
    }

    const balance = await this.getOrCreateBalance(tx, tenantId, employeeId, kind);
    const availableDays = balance.allowanceDays - balance.usedDays - balance.pendingDays;

    if (availableDays < days) {
      throw new BadRequestException('Insufficient available time-off balance.');
    }

    const updated = await tx.employeeTimeOffBalance.update({
      where: { id: balance.id },
      data: { pendingDays: balance.pendingDays + days },
    });

    const transaction = await this.writeBalanceTransaction(tx, {
      tenantId,
      employeeId,
      balanceId: updated.id,
      kind,
      type: TimeOffTransactionType.RESERVED,
      deltaDays: days,
      balanceAfterAllowanceDays: updated.allowanceDays,
      balanceAfterUsedDays: updated.usedDays,
      balanceAfterPendingDays: updated.pendingDays,
      note,
      actorUserId,
      requestId,
    });

    return transaction.id;
  }

  private async releasePendingBalanceDays(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorUserId: string | null,
    employeeId: string,
    kind: TimeOffBalanceKind,
    days: number,
    requestId: string | null,
    note: string,
  ) {
    if (days <= 0) {
      return;
    }

    const balance = await this.getOrCreateBalance(tx, tenantId, employeeId, kind);
    if (balance.pendingDays < days) {
      throw new BadRequestException('Pending time-off balance is lower than the release amount.');
    }

    const updated = await tx.employeeTimeOffBalance.update({
      where: { id: balance.id },
      data: { pendingDays: balance.pendingDays - days },
    });

    await this.writeBalanceTransaction(tx, {
      tenantId,
      employeeId,
      balanceId: updated.id,
      kind,
      type: TimeOffTransactionType.RELEASED,
      deltaDays: -days,
      balanceAfterAllowanceDays: updated.allowanceDays,
      balanceAfterUsedDays: updated.usedDays,
      balanceAfterPendingDays: updated.pendingDays,
      note,
      actorUserId,
      requestId,
    });
  }

  private async consumePendingBalanceDays(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorUserId: string | null,
    employeeId: string,
    kind: TimeOffBalanceKind,
    days: number,
    requestId: string | null,
    note: string,
  ) {
    if (days <= 0) {
      return;
    }

    const balance = await this.getOrCreateBalance(tx, tenantId, employeeId, kind);
    if (balance.pendingDays < days) {
      throw new BadRequestException('Pending time-off balance is lower than the consume amount.');
    }

    const updated = await tx.employeeTimeOffBalance.update({
      where: { id: balance.id },
      data: {
        pendingDays: balance.pendingDays - days,
        usedDays: balance.usedDays + days,
      },
    });

    await this.writeBalanceTransaction(tx, {
      tenantId,
      employeeId,
      balanceId: updated.id,
      kind,
      type: TimeOffTransactionType.CONSUMED,
      deltaDays: days,
      balanceAfterAllowanceDays: updated.allowanceDays,
      balanceAfterUsedDays: updated.usedDays,
      balanceAfterPendingDays: updated.pendingDays,
      note,
      actorUserId,
      requestId,
    });
  }

  private async releaseUsedBalanceDays(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorUserId: string | null,
    employeeId: string,
    kind: TimeOffBalanceKind,
    days: number,
    requestId: string | null,
    note: string,
  ) {
    if (days <= 0) {
      return;
    }

    const balance = await this.getOrCreateBalance(tx, tenantId, employeeId, kind);
    if (balance.usedDays < days) {
      throw new BadRequestException('Used time-off balance is lower than the release amount.');
    }

    const updated = await tx.employeeTimeOffBalance.update({
      where: { id: balance.id },
      data: { usedDays: balance.usedDays - days },
    });

    await this.writeBalanceTransaction(tx, {
      tenantId,
      employeeId,
      balanceId: updated.id,
      kind,
      type: TimeOffTransactionType.RELEASED,
      deltaDays: -days,
      balanceAfterAllowanceDays: updated.allowanceDays,
      balanceAfterUsedDays: updated.usedDays,
      balanceAfterPendingDays: updated.pendingDays,
      note,
      actorUserId,
      requestId,
    });
  }

  private async getReservedDaysForRequest(
    tx: Prisma.TransactionClient,
    requestId: string,
    employeeId: string,
    kind: TimeOffBalanceKind,
  ) {
    const aggregate = await tx.employeeTimeOffTransaction.aggregate({
      where: {
        requestId,
        employeeId,
        kind,
        type: TimeOffTransactionType.RESERVED,
      },
      _sum: {
        deltaDays: true,
      },
    });

    return aggregate._sum.deltaDays ?? 0;
  }

  private async releasePendingReservationForRequest(
    tx: Prisma.TransactionClient,
    request: {
      id: string;
      tenantId: string;
      employeeId: string;
    },
    actorUserId: string | null,
  ) {
    const reservedDays = await this.getReservedDaysForRequest(
      tx,
      request.id,
      request.employeeId,
      TimeOffBalanceKind.VACATION,
    );

    if (reservedDays > 0) {
      await this.releasePendingBalanceDays(
        tx,
        request.tenantId,
        actorUserId,
        request.employeeId,
        TimeOffBalanceKind.VACATION,
        reservedDays,
        request.id,
        'Reserved vacation days released.',
      );
    }
  }

  private async applyApprovedRequestEffects(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    request: {
      id: string;
      tenantId: string;
      employeeId: string;
      requestType: RequestType;
      requestedDays: number;
      relatedRequestId: string | null;
      relatedRequest: { id: string; startsOn: Date; endsOn: Date } | null;
      startsOn: Date;
      endsOn: Date;
      requestContextJson: string | null;
    },
  ) {
    if (request.requestType === RequestType.LEAVE) {
      const reservedDays =
        (await this.getReservedDaysForRequest(tx, request.id, request.employeeId, TimeOffBalanceKind.VACATION)) ||
        request.requestedDays;

      await this.consumePendingBalanceDays(
        tx,
        request.tenantId,
        actorUserId,
        request.employeeId,
        TimeOffBalanceKind.VACATION,
        reservedDays,
        request.id,
        'Vacation request approved.',
      );
      return;
    }

    if (request.requestType === RequestType.VACATION_CHANGE) {
      await this.applyVacationChangeApproval(tx, actorUserId, request);
    }
  }

  private async applyVacationChangeApproval(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    request: {
      id: string;
      tenantId: string;
      employeeId: string;
      requestedDays: number;
      relatedRequestId: string | null;
      relatedRequest: { id: string; startsOn: Date; endsOn: Date } | null;
      startsOn: Date;
      endsOn: Date;
      requestContextJson: string | null;
    },
  ) {
    if (!request.relatedRequestId || !request.relatedRequest) {
      throw new BadRequestException('Vacation change request is missing the original approved vacation.');
    }

    const context = this.parseRequestContext(request.requestContextJson);
    const previousRequestedDays =
      typeof context.previousRequestedDays === 'number'
        ? context.previousRequestedDays
        : this.diffDays(request.relatedRequest.startsOn, request.relatedRequest.endsOn);
    const deltaDays = request.requestedDays - previousRequestedDays;

    if (deltaDays > 0) {
      const reservedDays =
        (await this.getReservedDaysForRequest(tx, request.id, request.employeeId, TimeOffBalanceKind.VACATION)) ||
        deltaDays;

      await this.consumePendingBalanceDays(
        tx,
        request.tenantId,
        actorUserId,
        request.employeeId,
        TimeOffBalanceKind.VACATION,
        reservedDays,
        request.id,
        'Vacation change approved with additional days.',
      );
    }

    if (deltaDays < 0) {
      await this.releaseUsedBalanceDays(
        tx,
        request.tenantId,
        actorUserId,
        request.employeeId,
        TimeOffBalanceKind.VACATION,
        Math.abs(deltaDays),
        request.id,
        'Vacation change approved with fewer days.',
      );
    }

    await tx.employeeRequest.update({
      where: { id: request.relatedRequestId },
      data: {
        startsOn: request.startsOn,
        endsOn: request.endsOn,
        requestedDays: request.requestedDays,
      },
    });
  }

  private parseRequestContext(requestContextJson: string | null) {
    if (!requestContextJson) {
      return {} as Record<string, unknown>;
    }

    try {
      return JSON.parse(requestContextJson) as Record<string, unknown>;
    } catch {
      return {} as Record<string, unknown>;
    }
  }

  private async resolveApprovers(
    tenantId: string,
    employee: {
      id: string;
      managerEmployeeId: string | null;
      departmentId: string;
      primaryLocationId: string;
    },
    requestType: RequestType,
  ) {
    const policies = await this.prisma.approvalPolicy.findMany({
      where: {
        tenantId,
        OR: [{ requestType }, { requestType: null }],
        AND: [
          {
            OR: [{ departmentId: employee.departmentId }, { departmentId: null }],
          },
          {
            OR: [{ locationId: employee.primaryLocationId }, { locationId: null }],
          },
        ],
      },
      select: {
        requestType: true,
        departmentId: true,
        locationId: true,
        approverEmployeeId: true,
        priority: true,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    if (policies.length > 0) {
      const chains = new Map<
        string,
        Array<Pick<ApprovalPolicy, 'approverEmployeeId'> & { requestType: RequestType | null; departmentId: string | null; locationId: string | null; priority: number }>
      >();

      for (const policy of policies) {
        const chainKey = this.buildChainKey(policy.requestType, policy.departmentId, policy.locationId);
        const existing = chains.get(chainKey) ?? [];
        existing.push(policy);
        chains.set(chainKey, existing);
      }

      const selectedChain = Array.from(chains.values()).sort((left, right) => {
        const leftScore = this.policySpecificity(left[0]);
        const rightScore = this.policySpecificity(right[0]);
        return rightScore - leftScore;
      })[0];

      return selectedChain
        .sort((left, right) => left.priority - right.priority)
        .map((item: Pick<ApprovalPolicy, 'approverEmployeeId'>) => ({ id: item.approverEmployeeId }))
        .filter(
          (
            item: { id: string },
            index: number,
            array: Array<{ id: string }>,
          ) => array.findIndex((candidate: { id: string }) => candidate.id === item.id) === index,
        );
    }

    const approvers: Array<{ id: string }> = [];

    if (employee.managerEmployeeId) {
      approvers.push({ id: employee.managerEmployeeId });
    }

    const owner = await this.prisma.employee.findFirst({
      where: {
        tenantId,
        user: {
          roles: {
            some: {
              role: {
                code: 'tenant_owner',
              },
            },
          },
        },
      },
      select: { id: true },
    });

    if (owner && !approvers.some((item) => item.id === owner.id)) {
      approvers.push(owner);
    }

    if (approvers.length === 0) {
      throw new BadRequestException('No approver chain is configured for this employee.');
    }

    return approvers;
  }

  private diffDays(startsOn: Date, endsOn: Date) {
    return Math.floor((endsOn.getTime() - startsOn.getTime()) / 86400000) + 1;
  }

  private buildChainKey(
    requestType: RequestType | null,
    departmentId: string | null,
    locationId: string | null,
  ) {
    return [requestType ?? '*', departmentId ?? '*', locationId ?? '*'].join('|');
  }

  private parseChainKey(chainKey: string) {
    const [requestTypeRaw, departmentIdRaw, locationIdRaw] = chainKey.split('|');

    return {
      requestType: requestTypeRaw && requestTypeRaw !== '*' ? (requestTypeRaw as RequestType) : null,
      departmentId: departmentIdRaw && departmentIdRaw !== '*' ? departmentIdRaw : null,
      locationId: locationIdRaw && locationIdRaw !== '*' ? locationIdRaw : null,
    };
  }

  private policySpecificity(policy: {
    requestType: RequestType | null;
    departmentId: string | null;
    locationId: string | null;
  }) {
    return (policy.requestType ? 4 : 0) + (policy.departmentId ? 2 : 0) + (policy.locationId ? 1 : 0);
  }

  private canAccessRequest(
    employeeId: string,
    request: {
      employeeId: string;
      managerEmployeeId: string | null;
      approvalSteps: Array<{ approverEmployeeId: string }>;
    },
  ) {
    return (
      request.employeeId === employeeId ||
      request.managerEmployeeId === employeeId ||
      request.approvalSteps.some((step) => step.approverEmployeeId === employeeId)
    );
  }
}
