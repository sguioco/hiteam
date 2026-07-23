import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  EmployeeInvitationStatus,
  EmployeeStatus,
  EmployeeWorkMode,
  NotificationType,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { AuditService } from '../audit/audit.service';
import { BillingService } from '../billing/billing.service';
import { CollaborationRealtimeService } from '../collaboration/collaboration-realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { KommoService } from '../kommo/kommo.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { BulkAssignEmployeesDto } from './dto/bulk-assign-employees.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateEmployeeInvitationDto } from './dto/create-employee-invitation.dto';
import { EmployeeStatsQueryDto } from './dto/employee-stats-query.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { RegisterEmployeeInvitationDto } from './dto/register-employee-invitation.dto';
import { ReviewEmployeeInvitationDto } from './dto/review-employee-invitation.dto';
import { UpdateEmployeeInvitationSetupDto } from './dto/update-employee-invitation-setup.dto';
import { UpdateEmployeeAccessDto } from './dto/update-employee-access.dto';
import { UpdateMyPreferencesDto } from './dto/update-my-preferences.dto';
import {
  EmployeeEmailDeliveryResult,
  EmployeeInvitationsMailerService,
} from './employee-invitations.mailer';

type PrismaTx = Prisma.TransactionClient | PrismaService;

const EMPLOYEE_REVIEW_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

type EmployeeAccessRoleCode = 'OWNER' | 'TEAM_LEADER' | 'EMPLOYEE';
type EmployeeAccessRoleInput = 'owner' | 'team_leader' | 'employee';
type EmailLocale = 'en' | 'ru';

const NAMED_ENTITY_SELECT = {
  id: true,
  name: true,
} as const;

const COMPANY_SELECT = {
  id: true,
  name: true,
  logoUrl: true,
  createdAt: true,
} satisfies Prisma.CompanySelect;

const EMPLOYEE_USER_SELECT = {
  id: true,
  email: true,
  preferredLocale: true,
  roles: {
    include: {
      role: true,
    },
  },
} satisfies Prisma.UserSelect;

const EMPLOYEE_LIST_SELECT = {
  id: true,
  tenantId: true,
  userId: true,
  companyId: true,
  departmentId: true,
  primaryLocationId: true,
  positionId: true,
  managerEmployeeId: true,
  employeeNumber: true,
  firstName: true,
  lastName: true,
  middleName: true,
  birthDate: true,
  gender: true,
  phone: true,
  avatarStorageKey: true,
  avatarUrl: true,
  workMode: true,
  breaksEnabled: true,
  status: true,
  hireDate: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: EMPLOYEE_USER_SELECT,
  },
  company: {
    select: COMPANY_SELECT,
  },
  department: {
    select: NAMED_ENTITY_SELECT,
  },
  primaryLocation: {
    select: {
      id: true,
      name: true,
      timezone: true,
    },
  },
  position: {
    select: NAMED_ENTITY_SELECT,
  },
  biometricProfile: {
    select: {
      enrollmentStatus: true,
    },
  },
} satisfies Prisma.EmployeeSelect;

const EMPLOYEE_DETAIL_SELECT = {
  ...EMPLOYEE_LIST_SELECT,
  primaryLocation: {
    select: {
      id: true,
      name: true,
      timezone: true,
    },
  },
  devices: true,
} satisfies Prisma.EmployeeSelect;

const EMPLOYEE_PROFILE_SELECT = {
  ...EMPLOYEE_DETAIL_SELECT,
  user: {
    select: {
      id: true,
      email: true,
      bannerTheme: true,
      notificationAssignmentAlertsEnabled: true,
      notificationTaskDeadlineRemindersEnabled: true,
      notificationTaskDeadlineReminderMinutes: true,
      notificationMeetingRemindersEnabled: true,
      notificationMeetingReminderMinutes: true,
      notificationShiftRemindersEnabled: true,
    },
  },
  invitation: {
    select: {
      avatarStorageKey: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.EmployeeSelect;

type EmployeeWorkModeInput = 'STATIONARY' | 'FIELD' | null | undefined;

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly billingService: BillingService,
    private readonly collaborationRealtimeService: CollaborationRealtimeService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
    private readonly invitationsMailer: EmployeeInvitationsMailerService,
    private readonly kommoService: KommoService,
  ) {}

  private syncBillingSeatsInBackground(tenantId: string) {
    void this.billingService.syncStripeSeatQuantity(tenantId).catch((error) => {
      this.logger.warn(
        `Unable to sync Stripe seats for tenant ${tenantId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  private normalizeEmailLocale(locale?: string | null): EmailLocale {
    return locale?.trim().toLowerCase() === 'ru' ? 'ru' : 'en';
  }

  private async resolveActorEmailLocale(
    actorUserId: string,
    fallbackLocale?: string | null,
  ): Promise<EmailLocale> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { preferredLocale: true },
    });

    return this.normalizeEmailLocale(
      actor?.preferredLocale ?? fallbackLocale,
    );
  }

  private async sendInvitationStatusEmailSafely(params: {
    email: string;
    companyName: string;
    tenantName: string;
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    rejectedReason?: string | null;
    locale?: string | null;
  }): Promise<EmployeeEmailDeliveryResult> {
    try {
      return await this.invitationsMailer.sendInvitationStatusEmail(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Unable to send invitation ${params.status} email to ${params.email}: ${errorMessage}`);

      return {
        status: 'failed',
        provider: 'none',
        recipients: [params.email],
        recordedAt: new Date().toISOString(),
        errorMessage,
      };
    }
  }

  private async sendGeneratedCredentialsEmailSafely(params: {
    email: string;
    companyName: string;
    tenantName: string;
    password: string;
    locale?: string | null;
  }): Promise<EmployeeEmailDeliveryResult> {
    try {
      return await this.invitationsMailer.sendGeneratedCredentialsEmail(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Unable to send generated credentials email to ${params.email}: ${errorMessage}`);

      return {
        status: 'failed',
        provider: 'none',
        recipients: [params.email],
        recordedAt: new Date().toISOString(),
        errorMessage,
      };
    }
  }

  private async sendInvitationEmailSafely(params: {
    email: string;
    companyName: string;
    tenantName: string;
    token: string;
    locale?: string | null;
  }): Promise<EmployeeEmailDeliveryResult> {
    try {
      return await this.invitationsMailer.sendInvitationEmail(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Unable to send invitation email to ${params.email}: ${errorMessage}`);

      return {
        status: 'failed',
        provider: 'none',
        recipients: [params.email],
        recordedAt: new Date().toISOString(),
        errorMessage,
      };
    }
  }

  private emitWorkspaceRefreshForUser(userId: string, reason: string) {
    void this.collaborationRealtimeService
      .fanoutWorkspaceRefresh(userId, {
        authChanged: true,
        reason,
        refreshedAt: new Date().toISOString(),
      })
      .catch((error) => {
        this.logger.warn(
          `Unable to emit workspace refresh for user ${userId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }

  private async isAttendanceTrackingEnabled(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { attendanceTrackingEnabled: true },
    });

    return tenant?.attendanceTrackingEnabled ?? true;
  }

  private normalizeEmployeeAccessRole(
    value?: string | null,
    fallback: EmployeeAccessRoleCode = 'EMPLOYEE',
  ): EmployeeAccessRoleCode {
    const normalized = value?.trim().toUpperCase();
    if (!normalized) return fallback;
    if (normalized === 'OWNER') return 'OWNER';
    if (normalized === 'TEAM_LEADER') return 'TEAM_LEADER';
    if (normalized === 'EMPLOYEE') return 'EMPLOYEE';
    return fallback;
  }

  private toClientAccessRole(role?: string | null): EmployeeAccessRoleInput {
    const normalized = this.normalizeEmployeeAccessRole(role);
    if (normalized === 'OWNER') return 'owner';
    if (normalized === 'TEAM_LEADER') return 'team_leader';
    return 'employee';
  }

  private resolveAccessRoleFromAssignments(
    assignments?: Array<{ role?: { code?: string | null } | null }> | null,
  ): EmployeeAccessRoleCode {
    const roleCodes =
      assignments?.map((assignment) => assignment.role?.code).filter((code): code is string => Boolean(code)) ?? [];

    if (roleCodes.includes('tenant_owner')) return 'OWNER';
    if (roleCodes.includes('manager')) return 'TEAM_LEADER';
    return 'EMPLOYEE';
  }

  private normalizeRequestedTeamId(dto: { teamId?: string | null; team_id?: string | null; groupId?: string | null }) {
    const raw = dto.teamId ?? dto.team_id ?? dto.groupId;
    return typeof raw === 'string' ? raw.trim() || null : undefined;
  }

  private async assertTeamExists(tenantId: string, teamId: string | null) {
    if (!teamId) return null;

    const team = await this.prisma.workGroup.findFirst({
      where: { tenantId, id: teamId },
      select: { id: true },
    });

    if (!team) {
      throw new BadRequestException('Selected team was not found.');
    }

    return team.id;
  }

  private async resolveEmployeeTeamId(tenantId: string, employeeId: string) {
    const membership = await this.prisma.workGroupMembership.findFirst({
      where: { tenantId, employeeId },
      select: { groupId: true },
      orderBy: { createdAt: 'asc' },
    });

    return membership?.groupId ?? null;
  }

  async list(tenantId: string, query: ListEmployeesQueryDto = {}, actorUserId?: string) {
    const requestedRole = query.role ? this.normalizeEmployeeAccessRole(query.role, 'EMPLOYEE') : null;
    const roleCode =
      requestedRole === 'OWNER'
        ? 'tenant_owner'
        : requestedRole === 'TEAM_LEADER'
          ? 'manager'
          : requestedRole === 'EMPLOYEE'
            ? 'employee'
            : null;
    const requestedTeamId =
      this.normalizeRequestedTeamId({
        teamId: query.teamId,
        team_id: query.team_id,
        groupId: query.groupId,
      }) ?? null;
    const onlyUnassigned =
      requestedTeamId === '__none' || requestedTeamId === 'none' || requestedTeamId === 'unassigned';
    const teamId = requestedTeamId && !onlyUnassigned ? await this.assertTeamExists(tenantId, requestedTeamId) : null;

    const employeeRecords = await this.prisma.employee.findMany({
      where: {
        tenantId,
        ...(roleCode
          ? {
              user: {
                roles: {
                  some: {
                    role: {
                      code: roleCode,
                    },
                  },
                },
              },
            }
          : {}),
        ...(teamId
          ? {
              groupMemberships: {
                some: {
                  groupId: teamId,
                },
              },
            }
          : onlyUnassigned
            ? {
                groupMemberships: {
                  none: {},
                },
              }
            : {}),
        OR: query.search
          ? [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              {
                employeeNumber: { contains: query.search, mode: 'insensitive' },
              },
              {
                user: {
                  email: { contains: query.search, mode: 'insensitive' },
                },
              },
            ]
          : undefined,
      },
      select: EMPLOYEE_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    const employees = employeeRecords.map((employee) => ({
      ...employee,
      avatarUrl:
        employee.avatarUrl ??
        (employee.avatarStorageKey ? this.storageService.getObjectUrl(employee.avatarStorageKey) : null),
    }));

    if (!actorUserId || query.search?.trim()) {
      return employees;
    }

    const currentEmployeeIndex = employees.findIndex((employee) => employee.userId === actorUserId);

    if (currentEmployeeIndex >= 0) {
      if (currentEmployeeIndex === 0) {
        return employees;
      }

      const currentEmployee = employees[currentEmployeeIndex];
      if (!currentEmployee) {
        return employees;
      }

      return [
        currentEmployee,
        ...employees.slice(0, currentEmployeeIndex),
        ...employees.slice(currentEmployeeIndex + 1),
      ];
    }

    const currentEmployee = await this.prisma.employee.findUnique({
      where: { userId: actorUserId },
      select: EMPLOYEE_LIST_SELECT,
    });

    if (!currentEmployee || currentEmployee.tenantId !== tenantId) {
      return employees;
    }

    return [
      {
        ...currentEmployee,
        avatarUrl:
          currentEmployee.avatarUrl ??
          (currentEmployee.avatarStorageKey
            ? this.storageService.getObjectUrl(currentEmployee.avatarStorageKey)
            : null),
      },
      ...employees,
    ];
  }

  async stats(tenantId: string, query: EmployeeStatsQueryDto) {
    const total = await this.prisma.employee.count({
      where: {
        tenantId,
        companyId: query.companyId || undefined,
      },
    });

    return { total };
  }

  getById(tenantId: string, employeeId: string) {
    return this.prisma.employee.findFirstOrThrow({
      where: { tenantId, id: employeeId },
      select: EMPLOYEE_DETAIL_SELECT,
    });
  }

  async getManagerAccess(tenantId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirstOrThrow({
      where: { tenantId, id: employeeId },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    const roleCodes = employee.user?.roles.map((assignment) => assignment.role.code) ?? [];
    const hasAdminRole = roleCodes.some((roleCode) =>
      ['tenant_owner', 'hr_admin', 'operations_admin'].includes(roleCode),
    );

    return {
      employeeId: employee.id,
      roleCodes,
      hasAdminRole,
      hasManagerAccess: hasAdminRole || roleCodes.includes('manager'),
      canToggleManagerAccess: Boolean(employee.userId) && !hasAdminRole,
    };
  }

  async updateManagerAccess(tenantId: string, actorUserId: string, employeeId: string, grantManagerAccess: boolean) {
    const employee = await this.prisma.employee.findFirstOrThrow({
      where: { tenantId, id: employeeId },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!employee.userId || !employee.user) {
      throw new BadRequestException('Employee account is not linked to a user yet.');
    }

    if (employee.userId === actorUserId) {
      throw new BadRequestException('You cannot change your own manager access.');
    }

    const currentRoleCodes = employee.user.roles.map((assignment) => assignment.role.code);
    const hasAdminRole = currentRoleCodes.some((roleCode) =>
      ['tenant_owner', 'hr_admin', 'operations_admin'].includes(roleCode),
    );

    if (hasAdminRole) {
      throw new BadRequestException('Administrative roles cannot be changed here.');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.syncManagerRole(tx, employee.userId!, tenantId, grantManagerAccess);
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'employee',
      entityId: employee.id,
      action: grantManagerAccess ? 'employee.manager_access_granted' : 'employee.manager_access_revoked',
      metadata: {
        employeeId: employee.id,
        userId: employee.userId,
        email: employee.user.email,
      },
    });
    this.kommoService.recordEmployeeUpdated(tenantId, employee.id, 'manager_access_updated');
    this.emitWorkspaceRefreshForUser(
      employee.userId,
      grantManagerAccess ? 'manager_access_granted' : 'manager_access_revoked',
    );

    return this.getManagerAccess(tenantId, employeeId);
  }

  async updateEmployeeAccess(tenantId: string, actorUserId: string, employeeId: string, dto: UpdateEmployeeAccessDto) {
    const employee = await this.prisma.employee.findFirstOrThrow({
      where: { tenantId, id: employeeId },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });
    const requestedTeamInput = this.normalizeRequestedTeamId(dto);
    const currentTeamId =
      requestedTeamInput === undefined ? await this.resolveEmployeeTeamId(tenantId, employee.id) : requestedTeamInput;
    const requestedRole = dto.role ? this.normalizeEmployeeAccessRole(dto.role) : undefined;
    const finalRole = requestedRole ?? this.resolveAccessRoleFromAssignments(employee.user?.roles);

    if (requestedRole && employee.userId === actorUserId) {
      throw new BadRequestException('You cannot change your own access role.');
    }

    const finalTeamId = finalRole === 'OWNER' ? null : await this.assertTeamExists(tenantId, currentTeamId ?? null);

    if (finalRole === 'TEAM_LEADER' && !finalTeamId) {
      throw new BadRequestException('Team leader must be assigned to a team.');
    }

    await this.prisma.$transaction(async (tx) => {
      if (requestedTeamInput !== undefined || finalRole === 'OWNER') {
        await this.syncEmployeeGroupMembership(tx, tenantId, employee.id, finalTeamId);
      }

      if (requestedRole) {
        await this.syncEmployeeAccessRole(tx, employee.userId, tenantId, requestedRole);
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'employee',
      entityId: employee.id,
      action: 'employee.access_updated',
      metadata: {
        employeeId: employee.id,
        role: this.toClientAccessRole(finalRole),
        teamId: finalTeamId,
      },
    });

    this.kommoService.recordEmployeeUpdated(tenantId, employee.id, 'access_updated');
    this.emitWorkspaceRefreshForUser(employee.userId, 'employee_access_updated');

    return {
      employeeId: employee.id,
      role: this.toClientAccessRole(finalRole),
      teamId: finalTeamId,
    };
  }

  async bulkAssignEmployees(tenantId: string, actorUserId: string, dto: BulkAssignEmployeesDto) {
    const employeeIds = Array.from(new Set([...(dto.employeeIds ?? []), ...(dto.employee_ids ?? [])]));

    if (employeeIds.length === 0) {
      throw new BadRequestException('Select at least one employee.');
    }

    const requestedRole = dto.role ? this.normalizeEmployeeAccessRole(dto.role) : undefined;
    const requestedTeamInput = this.normalizeRequestedTeamId(dto);
    const finalTeamId =
      requestedRole === 'OWNER'
        ? null
        : requestedTeamInput === undefined
          ? undefined
          : await this.assertTeamExists(tenantId, requestedTeamInput);

    if (requestedRole === 'TEAM_LEADER' && !finalTeamId) {
      throw new BadRequestException('Team leader must be assigned to a team.');
    }

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, id: { in: employeeIds } },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (employees.length !== employeeIds.length) {
      throw new BadRequestException('Some employees were not found in this workspace.');
    }

    if (requestedRole && employees.some((employee) => employee.userId === actorUserId)) {
      throw new BadRequestException('You cannot change your own access role.');
    }

    if (
      requestedRole === undefined &&
      finalTeamId !== undefined &&
      employees.some((employee) => this.resolveAccessRoleFromAssignments(employee.user?.roles) === 'OWNER')
    ) {
      throw new BadRequestException('Owner does not need a team assignment.');
    }

    await this.prisma.$transaction(async (tx) => {
      if (finalTeamId !== undefined) {
        await tx.workGroupMembership.deleteMany({
          where: { tenantId, employeeId: { in: employeeIds } },
        });

        if (finalTeamId) {
          await tx.workGroupMembership.createMany({
            data: employeeIds.map((employeeId) => ({
              tenantId,
              groupId: finalTeamId,
              employeeId,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (requestedRole) {
        for (const employee of employees) {
          await this.syncEmployeeAccessRole(tx, employee.userId, tenantId, requestedRole);
        }
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'employee',
      entityId: 'bulk',
      action: 'employee.bulk_access_updated',
      metadata: {
        employeeIds,
        teamId: finalTeamId ?? null,
        role: requestedRole ? this.toClientAccessRole(requestedRole) : null,
      },
    });

    for (const employee of employees) {
      this.kommoService.recordEmployeeUpdated(tenantId, employee.id, 'bulk_access_updated');
      this.emitWorkspaceRefreshForUser(employee.userId, 'employee_access_updated');
    }

    return {
      updated: employees.length,
      teamId: finalTeamId ?? null,
      role: requestedRole ? this.toClientAccessRole(requestedRole) : null,
    };
  }

  async updateBreaksAccess(tenantId: string, actorUserId: string, employeeId: string, breaksEnabled: boolean) {
    const employee = await this.prisma.employee.findFirstOrThrow({
      where: { tenantId, id: employeeId },
      select: { id: true, breaksEnabled: true },
    });

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { breaksEnabled },
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'employee',
      entityId: employee.id,
      action: breaksEnabled ? 'employee.breaks_enabled' : 'employee.breaks_disabled',
      metadata: {
        employeeId: employee.id,
        previousBreaksEnabled: employee.breaksEnabled,
        breaksEnabled,
      },
    });
    this.kommoService.recordEmployeeUpdated(tenantId, employee.id, 'breaks_access_updated');

    return this.getById(tenantId, employeeId);
  }

  async updateWorkMode(tenantId: string, actorUserId: string, employeeId: string, workMode: EmployeeWorkModeInput) {
    const employee = await this.prisma.employee.findFirstOrThrow({
      where: { tenantId, id: employeeId },
      select: { id: true, workMode: true },
    });
    const nextWorkMode = this.normalizeWorkMode(workMode);

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { workMode: nextWorkMode },
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'employee',
      entityId: employee.id,
      action: 'employee.work_mode_updated',
      metadata: {
        employeeId: employee.id,
        previousWorkMode: employee.workMode,
        workMode: nextWorkMode,
      },
    });
    this.kommoService.recordEmployeeUpdated(tenantId, employee.id, 'work_mode_updated');
    const refreshedEmployee = await this.prisma.employee.findUnique({
      where: { id: employee.id },
      select: { userId: true },
    });

    if (refreshedEmployee?.userId) {
      this.emitWorkspaceRefreshForUser(refreshedEmployee.userId, 'employee_work_mode_updated');
    }

    return this.getById(tenantId, employeeId);
  }

  async getMe(user: JwtUser) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        tenantId: user.tenantId,
        userId: user.sub,
      },
      select: EMPLOYEE_PROFILE_SELECT,
    });

    if (!employee) {
      return null;
    }

    const { invitation, ...employeeProfile } = employee;
    const resolvedAvatarUrl =
      employee.avatarUrl ??
      (employee.avatarStorageKey ? this.storageService.getObjectUrl(employee.avatarStorageKey) : null) ??
      invitation?.avatarUrl ??
      (invitation?.avatarStorageKey ? this.storageService.getObjectUrl(invitation.avatarStorageKey) : null) ??
      null;

    return {
      ...employeeProfile,
      avatarUrl: resolvedAvatarUrl,
    };
  }

  async updateMyPreferences(user: JwtUser, dto: UpdateMyPreferencesDto) {
    await this.prisma.user.update({
      where: { id: user.sub },
      data: {
        ...(dto.bannerTheme ? { bannerTheme: dto.bannerTheme } : {}),
        ...(dto.notificationAssignmentAlertsEnabled !== undefined
          ? {
              notificationAssignmentAlertsEnabled: dto.notificationAssignmentAlertsEnabled,
            }
          : {}),
        ...(dto.notificationTaskDeadlineRemindersEnabled !== undefined
          ? {
              notificationTaskDeadlineRemindersEnabled: dto.notificationTaskDeadlineRemindersEnabled,
            }
          : {}),
        ...(dto.notificationTaskDeadlineReminderMinutes !== undefined
          ? {
              notificationTaskDeadlineReminderMinutes: dto.notificationTaskDeadlineReminderMinutes,
            }
          : {}),
        ...(dto.notificationMeetingRemindersEnabled !== undefined
          ? {
              notificationMeetingRemindersEnabled: dto.notificationMeetingRemindersEnabled,
            }
          : {}),
        ...(dto.notificationMeetingReminderMinutes !== undefined
          ? {
              notificationMeetingReminderMinutes: dto.notificationMeetingReminderMinutes,
            }
          : {}),
        ...(dto.notificationShiftRemindersEnabled !== undefined
          ? {
              notificationShiftRemindersEnabled: dto.notificationShiftRemindersEnabled,
            }
          : {}),
      },
    });

    return this.getMe(user);
  }

  async create(tenantId: string, dto: CreateEmployeeDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId,
        email: dto.email.toLowerCase(),
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    await this.billingService.assertCanAddSeatOccupant(tenantId);

    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 10);
    const attendanceTrackingEnabled = await this.isAttendanceTrackingEnabled(tenantId);
    const accessRole = this.normalizeEmployeeAccessRole(
      dto.role,
      !attendanceTrackingEnabled || dto.grantManagerAccess ? 'TEAM_LEADER' : 'EMPLOYEE',
    );
    const requestedTeamId =
      this.normalizeRequestedTeamId({
        teamId: dto.teamId,
        groupId: dto.groupId,
      }) ?? null;
    const teamId = accessRole === 'OWNER' ? null : await this.assertTeamExists(tenantId, requestedTeamId);

    if (accessRole === 'TEAM_LEADER' && !teamId) {
      throw new BadRequestException('Team leader must be assigned to a team.');
    }

    const employee = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          email: dto.email.toLowerCase(),
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      });

      await this.syncEmployeeAccessRole(tx, user.id, tenantId, accessRole);

      const employee = await tx.employee.create({
        data: {
          tenantId,
          userId: user.id,
          companyId: dto.companyId,
          departmentId: dto.departmentId,
          primaryLocationId: dto.primaryLocationId,
          positionId: dto.positionId,
          employeeNumber: dto.employeeNumber,
          firstName: dto.firstName,
          lastName: dto.lastName,
          workMode: attendanceTrackingEnabled ? this.normalizeWorkMode(dto.workMode) : EmployeeWorkMode.FIELD,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          status: EmployeeStatus.ACTIVE,
          hireDate: new Date(dto.hireDate),
        },
        include: {
          user: true,
          company: true,
          department: true,
          primaryLocation: true,
          position: true,
        },
      });

      await this.syncEmployeeGroupMembership(tx, tenantId, employee.id, teamId);

      return employee;
    });
    this.syncBillingSeatsInBackground(tenantId);
    this.kommoService.recordEmployeeCreated(tenantId, employee.id);

    return employee;
  }

  async listPendingInvitations(tenantId: string) {
    const invitations = await this.prisma.employeeInvitation.findMany({
      where: {
        tenantId,
        status: {
          in: [
            EmployeeInvitationStatus.INVITED,
            EmployeeInvitationStatus.PENDING_APPROVAL,
            EmployeeInvitationStatus.REJECTED,
          ],
        },
      },
      orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    return invitations.map((invitation) => ({
      ...invitation,
      expiresAt: invitation.expiresAt.toISOString(),
      submittedAt: invitation.submittedAt?.toISOString() ?? null,
      role: this.toClientAccessRole(invitation.approvedRole),
    }));
  }

  async lookupInvitationByEmail(rawEmail: string) {
    const invitation = await this.findInvitationByJoinEmail(rawEmail);
    const refreshed = await this.refreshInvitationJoinToken(invitation.id);

    return {
      token: refreshed.token,
      email: refreshed.invitation.email ?? rawEmail.trim().toLowerCase(),
      status: refreshed.invitation.status,
      registrationCompleted: Boolean(refreshed.invitation.userId),
      companyName: refreshed.invitation.company?.name ?? refreshed.invitation.tenant.name,
      tenantName: refreshed.invitation.tenant.name,
      tenantSlug: refreshed.invitation.tenant.slug,
    };
  }

  async lookupInvitationByPhone(rawPhone: string) {
    const invitation = await this.findInvitationByJoinPhone(rawPhone);
    const refreshed = await this.refreshInvitationJoinToken(invitation.id);

    return {
      token: refreshed.token,
      email: refreshed.invitation.email,
      phone: refreshed.invitation.phone ?? this.normalizePhone(rawPhone),
      status: refreshed.invitation.status,
      registrationCompleted: Boolean(refreshed.invitation.userId),
      companyName: refreshed.invitation.company?.name ?? refreshed.invitation.tenant.name,
      tenantName: refreshed.invitation.tenant.name,
      tenantSlug: refreshed.invitation.tenant.slug,
    };
  }

  async createInvitation(tenantId: string, actorUserId: string, dto: CreateEmployeeInvitationDto) {
    const email = dto.email?.toLowerCase().trim() || null;
    const phone = this.normalizePhone(dto.phone);

    if (!email && !phone) {
      throw new BadRequestException('Укажите email или телефон сотрудника.');
    }

    if (email && phone) {
      throw new BadRequestException('Укажите только email или только телефон сотрудника.');
    }

    if (email) {
      const existingUser = await this.prisma.user.findFirst({
        where: { tenantId, email },
      });

      if (existingUser) {
        throw new ConflictException('Такой email уже зарегистрирован.');
      }
    }

    if (phone) {
      const existingEmployee = await this.prisma.employee.findFirst({
        where: { tenantId, phone },
        select: { id: true },
      });

      if (existingEmployee) {
        throw new ConflictException('Сотрудник с таким телефоном уже зарегистрирован.');
      }
    }

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: {
        companies: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const invitationLocale = await this.resolveActorEmailLocale(
      actorUserId,
      tenant.locale,
    );

    const token = randomBytes(24).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const workMode = tenant.attendanceTrackingEnabled ? this.normalizeWorkMode(dto.workMode) : EmployeeWorkMode.FIELD;
    const approvedRole = this.normalizeEmployeeAccessRole(dto.role);
    const requestedTeamId =
      this.normalizeRequestedTeamId({
        teamId: dto.teamId,
        groupId: dto.groupId,
      }) ?? null;
    const approvedGroupId = approvedRole === 'OWNER' ? null : await this.assertTeamExists(tenantId, requestedTeamId);

    if (approvedRole === 'TEAM_LEADER' && !approvedGroupId) {
      throw new BadRequestException('Team leader must be assigned to a team.');
    }

    const existingInvitation = await this.prisma.employeeInvitation.findFirst({
      where: {
        tenantId,
        ...(email ? { email } : { phone }),
      },
    });

    if (!existingInvitation) {
      await this.billingService.assertCanAddSeatOccupant(tenantId);
    }

    const invitationPayload = {
      companyId: tenant.companies[0]?.id ?? null,
      email,
      phone,
      invitedByUserId: actorUserId,
      tokenHash,
      expiresAt,
      status: EmployeeInvitationStatus.INVITED,
      locale: invitationLocale,
      lastSentAt: new Date(),
      resentCount: 0,
      submittedAt: null,
      approvedAt: null,
      approvedByUserId: null,
      rejectedAt: null,
      rejectedReason: null,
      firstName: dto.firstName?.trim() || null,
      lastName: dto.lastName?.trim() || null,
      positionTitle: dto.positionTitle?.trim() || null,
      approvedGroupId,
      approvedRole,
      userId: null,
      employeeId: null,
      workMode,
    };

    const invitation = existingInvitation
      ? await this.prisma.employeeInvitation.update({
          where: { id: existingInvitation.id },
          data: invitationPayload,
        })
      : await this.prisma.employeeInvitation.create({
          data: {
            tenantId,
            ...invitationPayload,
          },
        });

    let emailDeliveryResult: EmployeeEmailDeliveryResult = {
      status: 'no_recipient',
      provider: 'none',
      recipients: [],
      recordedAt: new Date().toISOString(),
    };

    if (email) {
      emailDeliveryResult = await this.sendInvitationEmailSafely({
        email,
        companyName: tenant.companies[0]?.name ?? tenant.name,
        tenantName: tenant.name,
        token,
        locale: invitationLocale,
      });
    } else if (phone) {
      await this.invitationsMailer.sendInvitationSms({
        phone,
        companyName: tenant.companies[0]?.name ?? tenant.name,
        tenantName: tenant.name,
        token,
      });
    }

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'employee_invitation',
      entityId: invitation.id,
      action: email ? 'employee.join_email_registered' : 'employee.join_phone_registered',
      metadata: {
        email,
        phone,
        expiresAt: expiresAt.toISOString(),
        workMode,
        role: this.toClientAccessRole(approvedRole),
        teamId: approvedGroupId,
        emailDeliveryStatus: emailDeliveryResult.status,
        emailDeliveryProvider: emailDeliveryResult.provider,
        emailDeliveryError: emailDeliveryResult.errorMessage ?? null,
      },
    });
    this.syncBillingSeatsInBackground(tenantId);
    this.kommoService.recordEmployeeInvited(tenantId, invitation.id, emailDeliveryResult);

    return {
      id: invitation.id,
      email: invitation.email,
      phone: invitation.phone,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      submittedAt: invitation.submittedAt?.toISOString() ?? null,
      resentCount: invitation.resentCount,
      firstName: invitation.firstName ?? null,
      lastName: invitation.lastName ?? null,
      middleName: invitation.middleName ?? null,
      approvedShiftTemplateId: invitation.approvedShiftTemplateId ?? null,
      approvedGroupId: invitation.approvedGroupId ?? null,
      role: this.toClientAccessRole(invitation.approvedRole),
      positionTitle: invitation.positionTitle ?? null,
      workMode: invitation.workMode,
      companyName: tenant.companies[0]?.name ?? tenant.name,
      tenantName: tenant.name,
      emailDeliveryStatus: emailDeliveryResult.status,
      emailDeliveryProvider: emailDeliveryResult.provider,
    };
  }

  async updateInvitationSetup(
    tenantId: string,
    actorUserId: string,
    invitationId: string,
    dto: UpdateEmployeeInvitationSetupDto,
  ) {
    const invitation = await this.prisma.employeeInvitation.findFirst({
      where: { id: invitationId, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }

    if (
      invitation.status !== EmployeeInvitationStatus.INVITED &&
      invitation.status !== EmployeeInvitationStatus.PENDING_APPROVAL &&
      invitation.status !== EmployeeInvitationStatus.REJECTED
    ) {
      throw new BadRequestException('Invitation setup can no longer be changed.');
    }

    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const middleName = dto.middleName?.trim() || null;
    const positionTitle = dto.positionTitle?.trim() || null;
    const attendanceTrackingEnabled = await this.isAttendanceTrackingEnabled(tenantId);
    const workMode = attendanceTrackingEnabled
      ? this.normalizeWorkMode(dto.workMode ?? invitation.workMode)
      : EmployeeWorkMode.FIELD;
    const shiftTemplateId = attendanceTrackingEnabled ? (dto.shiftTemplateId?.trim() ?? '') : '';

    if (!firstName || !lastName) {
      throw new BadRequestException('Укажите имя и фамилию сотрудника.');
    }

    if (workMode === EmployeeWorkMode.STATIONARY && !shiftTemplateId) {
      throw new BadRequestException('Выберите смену для сотрудника.');
    }

    const shiftTemplate =
      workMode === EmployeeWorkMode.STATIONARY
        ? await this.prisma.shiftTemplate.findFirst({
            where: { tenantId, id: shiftTemplateId },
            select: { id: true },
          })
        : null;

    if (workMode === EmployeeWorkMode.STATIONARY && !shiftTemplate) {
      throw new BadRequestException('Selected shift template was not found.');
    }

    const approvedRole = this.normalizeEmployeeAccessRole(dto.role, invitation.approvedRole);
    const requestedTeamInput = this.normalizeRequestedTeamId({
      teamId: dto.teamId,
      groupId: dto.groupId,
    });
    const requestedGroupId =
      approvedRole === 'OWNER'
        ? null
        : await this.assertTeamExists(
            tenantId,
            requestedTeamInput === undefined ? (invitation.approvedGroupId ?? null) : requestedTeamInput,
          );

    if (approvedRole === 'TEAM_LEADER' && !requestedGroupId) {
      throw new BadRequestException('Team leader must be assigned to a team.');
    }

    const updated = await this.prisma.employeeInvitation.update({
      where: { id: invitation.id },
      data: {
        firstName,
        lastName,
        middleName,
        positionTitle,
        workMode,
        approvedShiftTemplateId: shiftTemplate?.id ?? null,
        approvedGroupId: requestedGroupId,
        approvedRole,
      },
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'employee_invitation',
      entityId: invitation.id,
      action: 'employee.invitation_setup_updated',
      metadata: {
        workMode,
        shiftTemplateId: shiftTemplate?.id ?? null,
        groupId: requestedGroupId,
        role: this.toClientAccessRole(approvedRole),
        email: updated.email,
        phone: updated.phone,
      },
    });
    this.kommoService.recordEmployeeInvited(tenantId, invitation.id);

    return {
      id: updated.id,
      email: updated.email,
      phone: updated.phone,
      status: updated.status,
      expiresAt: updated.expiresAt.toISOString(),
      submittedAt: updated.submittedAt?.toISOString() ?? null,
      resentCount: updated.resentCount,
      firstName: updated.firstName ?? null,
      lastName: updated.lastName ?? null,
      middleName: updated.middleName ?? null,
      approvedShiftTemplateId: updated.approvedShiftTemplateId ?? null,
      approvedGroupId: updated.approvedGroupId ?? null,
      role: this.toClientAccessRole(updated.approvedRole),
      positionTitle: updated.positionTitle ?? null,
      workMode: updated.workMode,
    };
  }

  async deleteInvitationAndEmployee(tenantId: string, actorUserId: string, invitationId: string) {
    const invitation = await this.prisma.employeeInvitation.findFirst({
      where: { id: invitationId, tenantId },
      select: {
        id: true,
        status: true,
        email: true,
        phone: true,
        userId: true,
        employeeId: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }

    if (
      invitation.status !== EmployeeInvitationStatus.INVITED &&
      invitation.status !== EmployeeInvitationStatus.PENDING_APPROVAL &&
      invitation.status !== EmployeeInvitationStatus.REJECTED
    ) {
      throw new BadRequestException('Only pending invitations can be deleted here.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.employeeInvitation.delete({
        where: { id: invitation.id },
      });

      if (invitation.userId) {
        await tx.user.deleteMany({
          where: {
            id: invitation.userId,
            tenantId,
          },
        });
        return;
      }

      if (invitation.employeeId) {
        await tx.employee.deleteMany({
          where: {
            id: invitation.employeeId,
            tenantId,
          },
        });
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'employee_invitation',
      entityId: invitation.id,
      action: 'employee.invitation_deleted',
      metadata: {
        email: invitation.email,
        phone: invitation.phone,
        userId: invitation.userId,
        employeeId: invitation.employeeId,
      },
    });
    this.syncBillingSeatsInBackground(tenantId);
    this.kommoService.recordEmployeeInvitationDeleted(tenantId, invitation);

    return {
      deleted: true,
      invitationId: invitation.id,
      employeeId: invitation.employeeId,
    };
  }

  async resendInvitation(tenantId: string, actorUserId: string, invitationId: string) {
    const invitation = await this.prisma.employeeInvitation.findFirst({
      where: { id: invitationId, tenantId },
      include: {
        tenant: {
          include: {
            companies: {
              take: 1,
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }

    if (invitation.status !== EmployeeInvitationStatus.INVITED) {
      throw new BadRequestException('Invitation can only be resent before profile submission.');
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      await this.markInvitationExpired(invitation.id);
      throw new BadRequestException('Приглашение истекло. Добавьте email заново.');
    }

    const token = randomBytes(24).toString('hex');
    const invitationLocale = await this.resolveActorEmailLocale(
      actorUserId,
      invitation.tenant.locale,
    );
    const updated = await this.prisma.employeeInvitation.update({
      where: { id: invitation.id },
      data: {
        tokenHash: this.hashToken(token),
        locale: invitationLocale,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        lastSentAt: new Date(),
        resentCount: { increment: 1 },
      },
    });

    let emailDeliveryResult: EmployeeEmailDeliveryResult = {
      status: 'no_recipient',
      provider: 'none',
      recipients: [],
      recordedAt: new Date().toISOString(),
    };

    if (updated.email) {
      emailDeliveryResult = await this.sendInvitationEmailSafely({
        email: updated.email,
        companyName: invitation.tenant.companies[0]?.name ?? invitation.tenant.name,
        tenantName: invitation.tenant.name,
        token,
        locale: invitationLocale,
      });
    } else if (updated.phone) {
      await this.invitationsMailer.sendInvitationSms({
        phone: updated.phone,
        companyName: invitation.tenant.companies[0]?.name ?? invitation.tenant.name,
        tenantName: invitation.tenant.name,
        token,
      });
    }

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'employee_invitation',
      entityId: invitation.id,
      action: 'employee.join_email_refreshed',
      metadata: {
        email: invitation.email,
        phone: invitation.phone,
        resentCount: updated.resentCount,
        emailDeliveryStatus: emailDeliveryResult.status,
        emailDeliveryProvider: emailDeliveryResult.provider,
        emailDeliveryError: emailDeliveryResult.errorMessage ?? null,
      },
    });
    this.kommoService.recordEmployeeInvited(tenantId, invitation.id, emailDeliveryResult);

    return {
      id: updated.id,
      status: updated.status,
      expiresAt: updated.expiresAt.toISOString(),
      resentCount: updated.resentCount,
      emailDeliveryStatus: emailDeliveryResult.status,
      emailDeliveryProvider: emailDeliveryResult.provider,
    };
  }

  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.employeeInvitation.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: {
        tenant: true,
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }

    if (invitation.expiresAt.getTime() <= Date.now() && invitation.status === EmployeeInvitationStatus.INVITED) {
      await this.markInvitationExpired(invitation.id);
      throw new BadRequestException('Invitation expired.');
    }

    return {
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      tenantName: invitation.tenant.name,
      tenantSlug: invitation.tenant.slug,
      companyName: invitation.company?.name ?? null,
      expiresAt: invitation.expiresAt.toISOString(),
      submittedAt: invitation.submittedAt?.toISOString() ?? null,
      registrationCompleted: Boolean(invitation.userId),
      firstName: invitation.firstName ?? null,
      lastName: invitation.lastName ?? null,
      positionTitle: invitation.positionTitle ?? null,
      phone: invitation.phone ?? null,
      approvedGroupId: invitation.approvedGroupId ?? null,
      role: this.toClientAccessRole(invitation.approvedRole),
      workMode: invitation.workMode,
    };
  }

  async registerFromInvitation(token: string, dto: RegisterEmployeeInvitationDto) {
    const invitation = await this.prisma.employeeInvitation.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: {
        tenant: {
          include: {
            companies: {
              take: 1,
              orderBy: { createdAt: 'asc' },
              select: { name: true },
            },
          },
        },
        company: {
          select: { name: true },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }

    const canRegisterApprovedInvitation = invitation.status === EmployeeInvitationStatus.APPROVED && !invitation.userId;
    const canRegisterPendingInvitation =
      invitation.status === EmployeeInvitationStatus.PENDING_APPROVAL && !invitation.userId;

    if (
      invitation.status !== EmployeeInvitationStatus.INVITED &&
      !canRegisterApprovedInvitation &&
      !canRegisterPendingInvitation
    ) {
      throw new BadRequestException('Этот invite уже использован. Войдите в систему.');
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      await this.markInvitationExpired(invitation.id);
      throw new BadRequestException('Invitation expired.');
    }

    const submittedEmail = dto.email?.trim().toLowerCase() || null;
    const registrationEmail = invitation.email?.trim().toLowerCase() || submittedEmail;

    if (!registrationEmail) {
      throw new BadRequestException('Укажите email сотрудника.');
    }

    if (invitation.email && submittedEmail && invitation.email.trim().toLowerCase() !== submittedEmail) {
      throw new BadRequestException('Email не совпадает с приглашением.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId: invitation.tenantId,
        email: registrationEmail,
      },
    });

    if (existingUser) {
      throw new ConflictException('Такой email уже зарегистрирован.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const preferredLocale = this.normalizeEmailLocale(
      dto.locale ?? invitation.locale,
    );
    const attendanceTrackingEnabled = await this.isAttendanceTrackingEnabled(invitation.tenantId);
    const effectiveWorkMode = attendanceTrackingEnabled
      ? this.normalizeWorkMode(invitation.workMode)
      : EmployeeWorkMode.FIELD;

    const realUserCount = await this.prisma.user.count({
      where: {
        tenantId: invitation.tenantId,
        email: { not: { startsWith: 'system+' } },
      },
    });

    const isFirstUser = realUserCount === 0;
    const isPreApproved = invitation.status === EmployeeInvitationStatus.APPROVED && !invitation.userId;
    const approvedRole = isFirstUser ? 'OWNER' : this.normalizeEmployeeAccessRole(invitation.approvedRole);
    const shouldAutoApprove =
      invitation.status === EmployeeInvitationStatus.INVITED ||
      invitation.status === EmployeeInvitationStatus.PENDING_APPROVAL ||
      invitation.status === EmployeeInvitationStatus.APPROVED ||
      isFirstUser ||
      isPreApproved;

    if (isFirstUser && !dto.avatarDataUrl?.trim() && !invitation.avatarUrl) {
      throw new BadRequestException('Добавьте фото профиля.');
    }

    if (approvedRole === 'TEAM_LEADER' && !invitation.approvedGroupId) {
      throw new BadRequestException('Team leader must be assigned to a team.');
    }

    const avatar = await this.uploadOptionalAvatarSafely(
      invitation.tenantId,
      registrationEmail,
      dto.avatarDataUrl,
      'registerFromInvitation',
    );

    let result: {
      user: { id: string };
      invitation: { id: string; employeeId: string | null };
    };

    try {
      result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            tenantId: invitation.tenantId,
            email: registrationEmail,
            passwordHash,
            status: UserStatus.ACTIVE,
            preferredLocale,
            workspaceAccessAllowed: shouldAutoApprove,
          },
        });

        await this.syncEmployeeAccessRole(tx, user.id, invitation.tenantId, approvedRole);

        const companyId = await this.resolveInvitationCompanyId(tx, invitation.tenantId, invitation.companyId);
        const departmentId = await this.resolveDefaultDepartmentId(tx, invitation.tenantId);
        const approvedShiftTemplate =
          effectiveWorkMode === EmployeeWorkMode.STATIONARY && invitation.approvedShiftTemplateId
            ? await tx.shiftTemplate.findFirst({
                where: {
                  tenantId: invitation.tenantId,
                  id: invitation.approvedShiftTemplateId,
                },
              })
            : null;
        const primaryLocationId =
          approvedShiftTemplate?.locationId ??
          (await this.resolveDefaultLocationId(tx, invitation.tenantId, companyId));
        const positionId =
          approvedShiftTemplate?.positionId ??
          (await this.resolvePositionIdByTitle(tx, invitation.tenantId, invitation.positionTitle)) ??
          (await this.resolveDefaultPositionId(tx, invitation.tenantId));

        const employeeAvatarStorageKey = avatar?.key ?? invitation.avatarStorageKey ?? null;
        const employeeAvatarUrl = avatar?.url ?? invitation.avatarUrl ?? null;

        const employee = await tx.employee.create({
          data: {
            tenantId: invitation.tenantId,
            userId: user.id,
            companyId,
            departmentId,
            primaryLocationId,
            positionId,
            employeeNumber: await this.generateEmployeeNumber(tx, invitation.tenantId),
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            middleName: dto.middleName?.trim() || null,
            workMode: effectiveWorkMode,
            birthDate: new Date(dto.birthDate),
            gender: dto.gender,
            phone: dto.phone.trim(),
            avatarStorageKey: employeeAvatarStorageKey,
            avatarUrl: employeeAvatarUrl,
            status: shouldAutoApprove ? EmployeeStatus.ACTIVE : EmployeeStatus.INACTIVE,
            hireDate: new Date(),
          },
        });

        if (invitation.approvedGroupId) {
          await this.syncEmployeeGroupMembership(tx, invitation.tenantId, employee.id, invitation.approvedGroupId);
        }

        if (effectiveWorkMode === EmployeeWorkMode.STATIONARY && invitation.approvedShiftTemplateId) {
          await this.createInitialShiftFromTemplate(
            tx,
            invitation.tenantId,
            employee.id,
            invitation.approvedShiftTemplateId,
          );
        }

        const updatedInvitation = await tx.employeeInvitation.update({
          where: { id: invitation.id },
          data: {
            email: registrationEmail,
            userId: user.id,
            employeeId: employee.id,
            status: EmployeeInvitationStatus.APPROVED,
            workMode: effectiveWorkMode,
            approvedShiftTemplateId:
              effectiveWorkMode === EmployeeWorkMode.STATIONARY ? invitation.approvedShiftTemplateId : null,
            submittedAt: new Date(),
            approvedAt: invitation.approvedAt ?? new Date(),
            approvedByUserId: invitation.approvedByUserId ?? invitation.invitedByUserId,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            middleName: dto.middleName?.trim() || null,
            positionTitle: invitation.positionTitle ?? null,
            birthDate: new Date(dto.birthDate),
            gender: dto.gender,
            phone: dto.phone.trim(),
            avatarStorageKey: employeeAvatarStorageKey,
            avatarUrl: employeeAvatarUrl,
          },
        });

        return { user, invitation: updatedInvitation };
      }, EMPLOYEE_REVIEW_TRANSACTION_OPTIONS);
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof Prisma.PrismaClientKnownRequestError ||
        error instanceof Prisma.PrismaClientValidationError
      ) {
        throw error;
      }

      this.logger.error(
        `registerFromInvitation failed for invitation ${invitation.id} in tenant ${invitation.tenantId}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException('Failed to create the manager profile.');
    }

    await this.auditService.log({
      tenantId: invitation.tenantId,
      actorUserId: result.user.id,
      entityType: 'employee_invitation',
      entityId: invitation.id,
      action: 'employee.profile_submitted',
      metadata: {
        email: registrationEmail,
        autoApproved: shouldAutoApprove,
        preApproved: isPreApproved,
        migratedFromPendingApproval: canRegisterPendingInvitation,
      },
    });
    const companyName = invitation.company?.name ?? invitation.tenant.companies[0]?.name ?? invitation.tenant.name;
    const statusEmailResult = await this.sendInvitationStatusEmailSafely({
      email: registrationEmail,
      companyName,
      tenantName: invitation.tenant.name,
      status: 'APPROVED',
      locale: preferredLocale,
    });

    if (result.invitation.employeeId) {
      this.kommoService.recordEmployeeUpdated(
        invitation.tenantId,
        result.invitation.employeeId,
        'profile_submitted',
        statusEmailResult,
      );
    } else {
      this.kommoService.recordEmployeeInvited(invitation.tenantId, invitation.id, statusEmailResult);
    }

    return {
      invitationId: invitation.id,
      status: EmployeeInvitationStatus.APPROVED,
      accessGranted: true,
      emailDeliveryStatus: statusEmailResult.status,
      emailDeliveryProvider: statusEmailResult.provider,
    };
  }

  async reviewInvitation(
    tenantId: string,
    actorUserId: string,
    invitationId: string,
    dto: ReviewEmployeeInvitationDto,
  ) {
    const invitation = await this.prisma.employeeInvitation.findFirst({
      where: { id: invitationId, tenantId },
      include: {
        user: true,
        tenant: {
          include: {
            companies: {
              take: 1,
              orderBy: { createdAt: 'asc' },
              select: { name: true },
            },
          },
        },
        company: {
          select: { name: true },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }

    if (
      invitation.status !== EmployeeInvitationStatus.PENDING_APPROVAL &&
      invitation.status !== EmployeeInvitationStatus.REJECTED
    ) {
      throw new BadRequestException('Invitation is not waiting for review.');
    }

    const attendanceTrackingEnabled = await this.isAttendanceTrackingEnabled(tenantId);
    const approvedRole = this.normalizeEmployeeAccessRole(dto.role, invitation.approvedRole);
    const grantManagerAccess =
      dto.decision === 'APPROVE' &&
      (approvedRole === 'TEAM_LEADER' ||
        (!attendanceTrackingEnabled && approvedRole !== 'OWNER') ||
        dto.grantManagerAccess === true);
    const workMode = attendanceTrackingEnabled
      ? this.normalizeWorkMode(dto.workMode ?? invitation.workMode)
      : EmployeeWorkMode.FIELD;
    const requestedShiftTemplateId =
      dto.decision === 'APPROVE' && workMode === EmployeeWorkMode.STATIONARY
        ? dto.shiftTemplateId?.trim() || invitation.approvedShiftTemplateId || null
        : null;
    const approvedShiftTemplate = requestedShiftTemplateId
      ? await this.prisma.shiftTemplate.findFirst({
          where: { tenantId, id: requestedShiftTemplateId },
        })
      : null;

    if (dto.decision === 'APPROVE' && workMode === EmployeeWorkMode.STATIONARY && !approvedShiftTemplate) {
      throw new BadRequestException('Пожалуйста, выберите смену перед подтверждением анкеты.');
    }

    const rawGroupId = this.normalizeRequestedTeamId({
      teamId: dto.teamId,
      groupId: dto.groupId,
    });
    const requestedGroupId =
      approvedRole === 'OWNER'
        ? null
        : dto.decision === 'APPROVE'
          ? await this.assertTeamExists(
              tenantId,
              rawGroupId === undefined ? invitation.approvedGroupId || null : rawGroupId,
            )
          : invitation.approvedGroupId || null;

    if (dto.decision === 'APPROVE' && approvedRole === 'TEAM_LEADER' && !requestedGroupId) {
      throw new BadRequestException('Team leader must be assigned to a team.');
    }

    if (dto.decision === 'APPROVE' && !invitation.userId && !invitation.email) {
      throw new BadRequestException(
        'У сотрудника не указан email. Попросите сотрудника завершить регистрацию по ссылке.',
      );
    }

    const invitationEmail = invitation.email ?? invitation.user?.email ?? null;
    const reviewCompanyName = invitation.company?.name ?? invitation.tenant.companies[0]?.name ?? invitation.tenant.name;
    const avatar = await this.uploadOptionalAvatarSafely(
      tenantId,
      invitationEmail ?? invitation.phone ?? invitation.id,
      dto.avatarDataUrl,
      'reviewInvitation',
    );

    const updatePayload = {
      firstName: dto.firstName?.trim() ?? invitation.firstName,
      lastName: dto.lastName?.trim() ?? invitation.lastName,
      middleName: dto.middleName?.trim() ?? invitation.middleName,
      positionTitle: dto.positionTitle?.trim() ?? invitation.positionTitle,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : invitation.birthDate,
      gender: dto.gender ?? invitation.gender,
      phone: dto.phone?.trim() ?? invitation.phone,
      avatarStorageKey: avatar?.key ?? invitation.avatarStorageKey,
      avatarUrl: avatar?.url ?? invitation.avatarUrl,
      workMode,
      companyId: invitation.companyId ?? null,
      approvedShiftTemplateId: approvedShiftTemplate?.id ?? null,
      approvedGroupId: requestedGroupId,
      approvedRole,
    };

    if (
      !updatePayload.firstName ||
      !updatePayload.lastName ||
      !updatePayload.birthDate ||
      !updatePayload.gender ||
      !updatePayload.phone
    ) {
      throw new BadRequestException('Employee profile is incomplete.');
    }

    if (dto.decision === 'REJECT') {
      const rejected = await this.prisma.employeeInvitation.update({
        where: { id: invitation.id },
        data: {
          ...updatePayload,
          status: EmployeeInvitationStatus.REJECTED,
          rejectedReason: dto.rejectedReason?.trim() || 'Заявка отклонена руководителем.',
          rejectedAt: new Date(),
          approvedAt: null,
          approvedByUserId: null,
        },
      });

      if (invitation.userId) {
        await this.notificationsService.createForUser({
          tenantId,
          userId: invitation.userId,
          type: NotificationType.EMPLOYEE_REJECTED,
          title: 'Заявка сотрудника отклонена',
          body: rejected.rejectedReason ?? 'Руководитель отклонил заявку.',
          actionUrl: '/employee',
          metadata: { invitationId: invitation.id },
        });
      }

      if (invitation.employeeId) {
        const employeeUpdateData: Prisma.EmployeeUpdateInput = {
          middleName: updatePayload.middleName ?? null,
          birthDate: updatePayload.birthDate ?? undefined,
          gender: updatePayload.gender ?? undefined,
          phone: updatePayload.phone ?? undefined,
          workMode: updatePayload.workMode,
          avatarStorageKey: updatePayload.avatarStorageKey ?? null,
          avatarUrl: updatePayload.avatarUrl ?? null,
          status: EmployeeStatus.INACTIVE,
        };

        if (updatePayload.firstName) {
          employeeUpdateData.firstName = updatePayload.firstName;
        }

        if (updatePayload.lastName) {
          employeeUpdateData.lastName = updatePayload.lastName;
        }

        await this.prisma.employee.update({
          where: { id: invitation.employeeId },
          data: employeeUpdateData,
        });
      }

      await this.auditService.log({
        tenantId,
        actorUserId,
        entityType: 'employee_invitation',
        entityId: invitation.id,
        action: 'employee.review_rejected',
        metadata: { reason: rejected.rejectedReason ?? null },
      });
      this.syncBillingSeatsInBackground(tenantId);
      const statusEmailResult = invitationEmail
        ? await this.sendInvitationStatusEmailSafely({
            email: invitationEmail,
            companyName: reviewCompanyName,
            tenantName: invitation.tenant.name,
            status: 'REJECTED',
            rejectedReason: rejected.rejectedReason,
            locale: invitation.user?.preferredLocale ?? invitation.locale,
          })
        : null;
      if (invitation.employeeId) {
        this.kommoService.recordEmployeeUpdated(tenantId, invitation.employeeId, 'review_rejected', statusEmailResult);
      } else {
        this.kommoService.recordEmployeeInvited(tenantId, invitation.id, statusEmailResult);
      }

      return {
        id: rejected.id,
        status: rejected.status,
        emailDeliveryStatus: statusEmailResult?.status ?? 'no_recipient',
        emailDeliveryProvider: statusEmailResult?.provider ?? 'none',
      };
    }

    if (!invitation.userId) {
      if (!invitationEmail) {
        throw new BadRequestException(
          'У сотрудника не указан email. Попросите сотрудника завершить регистрацию по ссылке.',
        );
      }

      const generatedPassword = this.generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(generatedPassword, 10);

      const approved = await this.prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findFirst({
          where: {
            tenantId,
            email: invitationEmail,
          },
          select: { id: true },
        });

        if (existingUser) {
          throw new ConflictException('Такой email уже зарегистрирован в компании.');
        }

        const companyId = await this.resolveInvitationCompanyId(tx, tenantId, updatePayload.companyId);
        const departmentId = await this.resolveDefaultDepartmentId(tx, tenantId);
        const primaryLocationId =
          approvedShiftTemplate?.locationId ?? (await this.resolveDefaultLocationId(tx, tenantId, companyId));
        const positionId =
          approvedShiftTemplate?.positionId ??
          (await this.resolvePositionIdByTitle(tx, tenantId, updatePayload.positionTitle)) ??
          (await this.resolveDefaultPositionId(tx, tenantId));

        const user = await tx.user.create({
          data: {
            tenantId,
            email: invitationEmail,
            passwordHash,
            status: UserStatus.ACTIVE,
            preferredLocale: this.normalizeEmailLocale(invitation.locale),
            workspaceAccessAllowed: true,
          },
        });

        await this.syncEmployeeAccessRole(tx, user.id, tenantId, approvedRole);

        const employee = await tx.employee.create({
          data: {
            tenantId,
            userId: user.id,
            companyId,
            departmentId,
            primaryLocationId,
            positionId,
            employeeNumber: await this.generateEmployeeNumber(tx, tenantId),
            firstName: updatePayload.firstName!,
            lastName: updatePayload.lastName!,
            middleName: updatePayload.middleName ?? null,
            workMode: updatePayload.workMode,
            birthDate: updatePayload.birthDate!,
            gender: updatePayload.gender!,
            phone: updatePayload.phone!,
            avatarStorageKey: updatePayload.avatarStorageKey ?? null,
            avatarUrl: updatePayload.avatarUrl ?? null,
            status: EmployeeStatus.ACTIVE,
            hireDate: new Date(),
          },
        });

        await this.syncEmployeeGroupMembership(tx, tenantId, employee.id, requestedGroupId);

        if (approvedShiftTemplate?.id) {
          await this.createInitialShiftFromTemplate(tx, tenantId, employee.id, approvedShiftTemplate.id);
        }

        return tx.employeeInvitation.update({
          where: { id: invitation.id },
          data: {
            ...updatePayload,
            userId: user.id,
            employeeId: employee.id,
            status: EmployeeInvitationStatus.APPROVED,
            approvedAt: new Date(),
            approvedByUserId: actorUserId,
            rejectedAt: null,
            rejectedReason: null,
          },
        });
      }, EMPLOYEE_REVIEW_TRANSACTION_OPTIONS);

      await this.auditService.log({
        tenantId,
        actorUserId,
        entityType: 'employee_invitation',
        entityId: invitation.id,
        action: 'employee.review_approved_credentials_generated',
        metadata: {
          email: invitationEmail,
          employeeId: approved.employeeId,
          shiftTemplateId: approvedShiftTemplate?.id ?? null,
          groupId: requestedGroupId,
          role: this.toClientAccessRole(approvedRole),
          grantManagerAccess,
        },
      });
      this.syncBillingSeatsInBackground(tenantId);
      const credentialsEmailResult = await this.sendGeneratedCredentialsEmailSafely({
        email: invitationEmail,
        companyName: reviewCompanyName,
        tenantName: invitation.tenant.name,
        password: generatedPassword,
        locale: invitation.locale,
      });
      if (approved.employeeId) {
        this.kommoService.recordEmployeeUpdated(tenantId, approved.employeeId, 'review_approved', credentialsEmailResult);
      }

      return {
        id: approved.id,
        status: approved.status,
        employeeId: approved.employeeId,
        email: invitationEmail,
        generatedPassword,
        emailDeliveryStatus: credentialsEmailResult.status,
        emailDeliveryProvider: credentialsEmailResult.provider,
      };
    }

    const approved = await this.prisma.$transaction(async (tx) => {
      const existingEmployee = await tx.employee.findUnique({
        where: { userId: invitation.userId! },
      });

      const companyId = await this.resolveInvitationCompanyId(tx, tenantId, updatePayload.companyId);
      const departmentId = await this.resolveDefaultDepartmentId(tx, tenantId);
      const primaryLocationId =
        approvedShiftTemplate?.locationId ?? (await this.resolveDefaultLocationId(tx, tenantId, companyId));
      const positionId =
        approvedShiftTemplate?.positionId ??
        (await this.resolvePositionIdByTitle(tx, tenantId, updatePayload.positionTitle)) ??
        (await this.resolveDefaultPositionId(tx, tenantId));

      const employee = existingEmployee
        ? await tx.employee.update({
            where: { id: existingEmployee.id },
            data: {
              companyId,
              departmentId,
              primaryLocationId,
              positionId,
              firstName: updatePayload.firstName!,
              lastName: updatePayload.lastName!,
              middleName: updatePayload.middleName ?? null,
              workMode: updatePayload.workMode,
              birthDate: updatePayload.birthDate!,
              gender: updatePayload.gender!,
              phone: updatePayload.phone!,
              avatarStorageKey: updatePayload.avatarStorageKey ?? null,
              avatarUrl: updatePayload.avatarUrl ?? null,
              status: EmployeeStatus.ACTIVE,
            },
          })
        : await tx.employee.create({
            data: {
              tenantId,
              userId: invitation.userId!,
              companyId,
              departmentId,
              primaryLocationId,
              positionId,
              employeeNumber: await this.generateEmployeeNumber(tx, tenantId),
              firstName: updatePayload.firstName!,
              lastName: updatePayload.lastName!,
              middleName: updatePayload.middleName ?? null,
              workMode: updatePayload.workMode,
              birthDate: updatePayload.birthDate!,
              gender: updatePayload.gender!,
              phone: updatePayload.phone!,
              avatarStorageKey: updatePayload.avatarStorageKey ?? null,
              avatarUrl: updatePayload.avatarUrl ?? null,
              status: EmployeeStatus.ACTIVE,
              hireDate: new Date(),
            },
          });

      await this.syncEmployeeGroupMembership(tx, tenantId, employee.id, requestedGroupId);

      if (approvedShiftTemplate?.id) {
        await this.createInitialShiftFromTemplate(tx, tenantId, employee.id, approvedShiftTemplate.id);
      }

      await tx.user.update({
        where: { id: invitation.userId! },
        data: { workspaceAccessAllowed: true },
      });

      await this.syncEmployeeAccessRole(tx, invitation.userId!, tenantId, approvedRole);

      return tx.employeeInvitation.update({
        where: { id: invitation.id },
        data: {
          ...updatePayload,
          employeeId: employee.id,
          status: EmployeeInvitationStatus.APPROVED,
          approvedAt: new Date(),
          approvedByUserId: actorUserId,
          rejectedAt: null,
          rejectedReason: null,
        },
      });
    }, EMPLOYEE_REVIEW_TRANSACTION_OPTIONS);

    await this.notificationsService.createForUser({
      tenantId,
      userId: invitation.userId,
      type: NotificationType.EMPLOYEE_APPROVED,
      title: 'Доступ к системе открыт',
      body: 'Руководитель подтвердил ваш профиль. Теперь у вас есть доступ к рабочим разделам.',
      actionUrl: '/employee',
      metadata: { invitationId: invitation.id },
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'employee_invitation',
      entityId: invitation.id,
      action: 'employee.review_approved',
      metadata: {
        employeeId: approved.employeeId,
        shiftTemplateId: approvedShiftTemplate?.id ?? null,
        groupId: requestedGroupId,
        role: this.toClientAccessRole(approvedRole),
        grantManagerAccess,
      },
    });
    this.syncBillingSeatsInBackground(tenantId);
    const statusEmailResult = invitationEmail
      ? await this.sendInvitationStatusEmailSafely({
          email: invitationEmail,
          companyName: reviewCompanyName,
          tenantName: invitation.tenant.name,
          status: 'APPROVED',
          locale: invitation.user?.preferredLocale ?? invitation.locale,
        })
      : null;
    if (approved.employeeId) {
      this.kommoService.recordEmployeeUpdated(tenantId, approved.employeeId, 'review_approved', statusEmailResult);
    }

    return {
      id: approved.id,
      status: approved.status,
      employeeId: approved.employeeId,
      emailDeliveryStatus: statusEmailResult?.status ?? 'no_recipient',
      emailDeliveryProvider: statusEmailResult?.provider ?? 'none',
    };
  }

  async getAccessStatus(user: JwtUser) {
    if (user.workspaceAccessAllowed) {
      return {
        workspaceAccessAllowed: true,
        invitationStatus: EmployeeInvitationStatus.APPROVED,
      };
    }

    const invitation = await this.prisma.employeeInvitation.findFirst({
      where: {
        tenantId: user.tenantId,
        userId: user.sub,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      workspaceAccessAllowed: false,
      invitationStatus: invitation?.status ?? EmployeeInvitationStatus.PENDING_APPROVAL,
      submittedAt: invitation?.submittedAt?.toISOString() ?? null,
      approvedAt: invitation?.approvedAt?.toISOString() ?? null,
      rejectedAt: invitation?.rejectedAt?.toISOString() ?? null,
      rejectedReason: invitation?.rejectedReason ?? null,
    };
  }

  private async syncEmployeeGroupMembership(
    tx: PrismaTx,
    tenantId: string,
    employeeId: string,
    groupId: string | null,
  ) {
    await tx.workGroupMembership.deleteMany({
      where: { tenantId, employeeId },
    });

    if (!groupId) {
      return;
    }

    await tx.workGroupMembership.create({
      data: {
        tenantId,
        groupId,
        employeeId,
      },
    });
  }

  private async resolvePositionIdByTitle(tx: PrismaTx, tenantId: string, rawTitle?: string | null) {
    const title = rawTitle?.trim();
    if (!title) {
      return null;
    }

    const existing = await tx.position.findFirst({
      where: {
        tenantId,
        name: {
          equals: title,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    const baseCode =
      title
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .toUpperCase()
        .replace(/[\s_]+/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 24) || 'POSITION';
    let code = baseCode;
    let suffix = 2;

    while (
      await tx.position.findFirst({
        where: { tenantId, code },
        select: { id: true },
      })
    ) {
      code = `${baseCode.slice(0, 20)}_${suffix}`;
      suffix += 1;
    }

    const created = await tx.position.create({
      data: {
        tenantId,
        name: title,
        code,
      },
      select: { id: true },
    });

    return created.id;
  }

  private async createInitialShiftFromTemplate(tx: PrismaTx, tenantId: string, employeeId: string, templateId: string) {
    const template = await tx.shiftTemplate.findFirst({
      where: { tenantId, id: templateId },
      select: {
        id: true,
        locationId: true,
        positionId: true,
        startsAtLocal: true,
        endsAtLocal: true,
        weekDaysJson: true,
        fixedBreakStartsAtLocal: true,
        fixedBreakDurationMinutes: true,
        fixedBreakIsPaid: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Approved shift template not found.');
    }

    const now = new Date();
    let shiftDate = new Date(now);
    shiftDate.setHours(0, 0, 0, 0);

    const todayEndsAt = this.mergeShiftEnd(shiftDate, template.startsAtLocal, template.endsAtLocal);
    if (now > todayEndsAt) {
      shiftDate.setDate(shiftDate.getDate() + 1);
    }

    const shiftHorizonDays = 30;
    const horizonEnd = new Date(shiftDate);
    horizonEnd.setDate(horizonEnd.getDate() + shiftHorizonDays - 1);
    horizonEnd.setHours(0, 0, 0, 0);

    const existingShifts = await tx.shift.findMany({
      where: {
        tenantId,
        employeeId,
        templateId: template.id,
        shiftDate: {
          gte: shiftDate,
          lte: horizonEnd,
        },
      },
      select: { shiftDate: true },
    });

    const existingDayKeys = new Set(
      existingShifts.map((item) => {
        const day = new Date(item.shiftDate);
        day.setHours(0, 0, 0, 0);
        return day.toISOString();
      }),
    );
    const allowedWeekDays = this.parseShiftTemplateWeekDays(template.weekDaysJson);

    const newShifts: Prisma.ShiftCreateManyInput[] = [];

    for (let dayOffset = 0; dayOffset < shiftHorizonDays; dayOffset += 1) {
      const nextShiftDate = new Date(shiftDate);
      nextShiftDate.setDate(nextShiftDate.getDate() + dayOffset);
      nextShiftDate.setHours(0, 0, 0, 0);
      const normalizedWeekDay = this.toTemplateWeekDay(nextShiftDate);

      if (allowedWeekDays !== null && !allowedWeekDays.has(normalizedWeekDay)) {
        continue;
      }

      if (existingDayKeys.has(nextShiftDate.toISOString())) {
        continue;
      }

      newShifts.push({
        tenantId,
        templateId: template.id,
        employeeId,
        locationId: template.locationId,
        positionId: template.positionId,
        shiftDate: nextShiftDate,
        startsAt: this.mergeDateAndTime(nextShiftDate, template.startsAtLocal),
        endsAt: this.mergeShiftEnd(nextShiftDate, template.startsAtLocal, template.endsAtLocal),
        fixedBreakStartsAt:
          template.fixedBreakDurationMinutes > 0 && template.fixedBreakStartsAtLocal
            ? this.mergeDateAndTime(nextShiftDate, template.fixedBreakStartsAtLocal)
            : null,
        fixedBreakDurationMinutes: template.fixedBreakDurationMinutes,
        fixedBreakIsPaid: template.fixedBreakIsPaid,
      });
    }

    if (newShifts.length === 0) {
      return;
    }

    await tx.shift.createMany({
      data: newShifts,
    });
  }

  private normalizeWorkMode(workMode: EmployeeWorkModeInput) {
    return workMode === EmployeeWorkMode.FIELD ? EmployeeWorkMode.FIELD : EmployeeWorkMode.STATIONARY;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private normalizeJoinEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizePhone(phone?: string | null) {
    const normalized = phone?.trim().replace(/[^\d+]/g, '') ?? '';
    return normalized || null;
  }

  private async findInvitationByJoinEmail(rawEmail: string) {
    const email = this.normalizeJoinEmail(rawEmail);
    if (!email) {
      throw new BadRequestException('Укажите email сотрудника.');
    }

    const invitations = await this.prisma.employeeInvitation.findMany({
      where: { email },
      include: {
        tenant: true,
        company: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 5,
    });

    const activeInvitations: typeof invitations = [];
    for (const invitation of invitations) {
      if (invitation.status === EmployeeInvitationStatus.EXPIRED) {
        continue;
      }

      if (invitation.status === EmployeeInvitationStatus.INVITED && invitation.expiresAt.getTime() <= Date.now()) {
        await this.markInvitationExpired(invitation.id).catch(() => undefined);
        continue;
      }

      if (
        invitation.status === EmployeeInvitationStatus.INVITED ||
        invitation.status === EmployeeInvitationStatus.APPROVED ||
        invitation.status === EmployeeInvitationStatus.PENDING_APPROVAL
      ) {
        activeInvitations.push(invitation);
      }
    }

    if (activeInvitations.length === 0) {
      throw new NotFoundException('Этот email не найден в списке сотрудников. Попросите менеджера добавить его.');
    }

    if (activeInvitations.length > 1) {
      throw new ConflictException(
        'Этот email найден в нескольких организациях. Попросите менеджера отправить точную ссылку.',
      );
    }

    return activeInvitations[0];
  }

  private async findInvitationByJoinPhone(rawPhone: string) {
    const phone = this.normalizePhone(rawPhone);
    if (!phone) {
      throw new BadRequestException('Укажите телефон сотрудника.');
    }

    const invitations = await this.prisma.employeeInvitation.findMany({
      where: { phone },
      include: {
        tenant: true,
        company: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 5,
    });

    const activeInvitations: typeof invitations = [];
    for (const invitation of invitations) {
      if (invitation.status === EmployeeInvitationStatus.EXPIRED) {
        continue;
      }

      if (invitation.status === EmployeeInvitationStatus.INVITED && invitation.expiresAt.getTime() <= Date.now()) {
        await this.markInvitationExpired(invitation.id).catch(() => undefined);
        continue;
      }

      if (
        invitation.status === EmployeeInvitationStatus.INVITED ||
        invitation.status === EmployeeInvitationStatus.APPROVED ||
        invitation.status === EmployeeInvitationStatus.PENDING_APPROVAL
      ) {
        activeInvitations.push(invitation);
      }
    }

    if (activeInvitations.length === 0) {
      throw new NotFoundException('Этот телефон не найден в списке сотрудников. Попросите менеджера добавить его.');
    }

    if (activeInvitations.length > 1) {
      throw new ConflictException(
        'Этот телефон найден в нескольких организациях. Попросите менеджера отправить точную ссылку.',
      );
    }

    return activeInvitations[0];
  }

  private async refreshInvitationJoinToken(invitationId: string) {
    const token = randomBytes(24).toString('hex');
    const invitation = await this.prisma.employeeInvitation.update({
      where: { id: invitationId },
      data: {
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastSentAt: new Date(),
      },
      include: {
        tenant: true,
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    return { token, invitation };
  }

  private async ensureEmployeeRole(tx: PrismaTx) {
    return tx.role.upsert({
      where: { code: 'employee' },
      update: {},
      create: {
        code: 'employee',
        name: 'Employee',
        description: 'Standard employee access',
      },
    });
  }

  private async ensureManagerRole(tx: PrismaTx) {
    return tx.role.upsert({
      where: { code: 'manager' },
      update: {},
      create: {
        code: 'manager',
        name: 'Manager',
        description: 'Can manage team attendance, approvals, and tasks',
      },
    });
  }

  private async ensureTenantOwnerRole(tx: PrismaTx) {
    return tx.role.upsert({
      where: { code: 'tenant_owner' },
      update: {},
      create: {
        code: 'tenant_owner',
        name: 'Tenant Owner',
        description: 'Full company access',
      },
    });
  }

  private async ensureRoleAssignment(tx: PrismaTx, userId: string, roleId: string, tenantId: string) {
    await tx.userRole.createMany({
      data: [
        {
          userId,
          roleId,
          scopeType: 'tenant',
          scopeId: tenantId,
        },
      ],
      skipDuplicates: true,
    });
  }

  private async removeRoleAssignment(tx: PrismaTx, userId: string, roleId: string, tenantId: string) {
    await tx.userRole.deleteMany({
      where: {
        userId,
        roleId,
        scopeType: 'tenant',
        scopeId: tenantId,
      },
    });
  }

  private async syncEmployeeAccessRole(tx: PrismaTx, userId: string, tenantId: string, role: EmployeeAccessRoleCode) {
    const employeeRole = await this.ensureEmployeeRole(tx);
    const managerRole = await this.ensureManagerRole(tx);

    if (role === 'OWNER') {
      const ownerRole = await this.ensureTenantOwnerRole(tx);
      await this.ensureRoleAssignment(tx, userId, ownerRole.id, tenantId);
      await this.removeRoleAssignment(tx, userId, managerRole.id, tenantId);
      return;
    }

    await this.ensureRoleAssignment(tx, userId, employeeRole.id, tenantId);

    if (role === 'TEAM_LEADER') {
      await this.ensureRoleAssignment(tx, userId, managerRole.id, tenantId);
      return;
    }

    await this.removeRoleAssignment(tx, userId, managerRole.id, tenantId);
  }

  private async syncManagerRole(tx: PrismaTx, userId: string, tenantId: string, grantManagerAccess: boolean) {
    const managerRole = await this.ensureManagerRole(tx);
    const existingAssignment = await tx.userRole.findFirst({
      where: {
        userId,
        roleId: managerRole.id,
        scopeType: 'tenant',
        scopeId: tenantId,
      },
      select: { id: true },
    });

    if (grantManagerAccess) {
      if (!existingAssignment) {
        await tx.userRole.create({
          data: {
            userId,
            roleId: managerRole.id,
            scopeType: 'tenant',
            scopeId: tenantId,
          },
        });
      }

      return;
    }

    if (existingAssignment) {
      await tx.userRole.delete({
        where: { id: existingAssignment.id },
      });
    }
  }

  private generateTemporaryPassword(length = 10) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    return Array.from(randomBytes(length), (byte) => alphabet[byte % alphabet.length]).join('');
  }

  private async markInvitationExpired(invitationId: string) {
    await this.prisma.employeeInvitation.update({
      where: { id: invitationId },
      data: { status: EmployeeInvitationStatus.EXPIRED },
    });
  }

  private async uploadAvatar(tenantId: string, email: string, dataUrl: string) {
    const storageKey = `employees/${tenantId}/avatars/${Date.now()}-${email.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    return this.storageService.uploadDataUrl(storageKey, dataUrl);
  }

  private async uploadOptionalAvatar(tenantId: string, email: string, dataUrl?: string | null) {
    if (!dataUrl?.trim()) {
      return null;
    }

    if (!this.storageService.isConfigured()) {
      return null;
    }

    return this.uploadAvatar(tenantId, email, dataUrl);
  }

  private async uploadOptionalAvatarSafely(
    tenantId: string,
    email: string,
    dataUrl: string | null | undefined,
    context: string,
  ) {
    try {
      return await this.uploadOptionalAvatar(tenantId, email, dataUrl);
    } catch (error) {
      this.logger.warn(
        `${context} avatar upload failed for ${email} in tenant ${tenantId}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  private async resolveInvitationCompanyId(tx: PrismaTx, tenantId: string, companyId: string | null | undefined) {
    if (companyId) {
      const company = await tx.company.findFirst({
        where: { tenantId, id: companyId },
        select: { id: true },
      });

      if (company) {
        return company.id;
      }
    }

    return this.resolveDefaultCompanyId(tx, tenantId);
  }

  private async resolveDefaultCompanyId(tx: PrismaTx, tenantId: string) {
    const company = await tx.company.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    if (company) {
      return company.id;
    }

    const created = await tx.company.create({
      data: {
        tenantId,
        name: 'General Company',
        code: 'GENERAL',
      },
    });

    return created.id;
  }

  private async resolveDefaultDepartmentId(tx: PrismaTx, tenantId: string) {
    const department = await tx.department.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    if (department) {
      return department.id;
    }

    const created = await tx.department.create({
      data: {
        tenantId,
        name: 'General',
        code: 'GENERAL',
      },
    });

    return created.id;
  }

  private async resolveDefaultPositionId(tx: PrismaTx, tenantId: string) {
    const position = await tx.position.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    if (position) {
      return position.id;
    }

    const created = await tx.position.create({
      data: {
        tenantId,
        name: 'Employee',
        code: 'EMPLOYEE',
      },
    });

    return created.id;
  }

  private async resolveDefaultLocationId(tx: PrismaTx, tenantId: string, companyId: string) {
    const location = await tx.location.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    if (location) {
      return location.id;
    }

    const created = await tx.location.create({
      data: {
        tenantId,
        companyId,
        name: 'Default location',
        code: `DEFAULT-${Date.now()}`,
        address: 'Not set yet',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
      },
    });

    return created.id;
  }

  private async generateEmployeeNumber(tx: PrismaTx, tenantId: string) {
    const count = await tx.employee.count({ where: { tenantId } });

    for (let sequence = count + 1; sequence < count + 500; sequence += 1) {
      const candidate = `EMP-${String(sequence).padStart(4, '0')}`;
      const existing = await tx.employee.findFirst({
        where: { tenantId, employeeNumber: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    return `EMP-${Date.now()}`;
  }

  private mergeDateAndTime(baseDate: Date, localTime: string) {
    const [hoursRaw, minutesRaw] = localTime.split(':');
    const merged = new Date(baseDate);
    merged.setHours(Number(hoursRaw), Number(minutesRaw), 0, 0);
    return merged;
  }

  private mergeShiftEnd(baseDate: Date, startsAtLocal: string, endsAtLocal: string) {
    const startsAt = this.mergeDateAndTime(baseDate, startsAtLocal);
    const endsAt = this.mergeDateAndTime(baseDate, endsAtLocal);

    if (endsAt <= startsAt) {
      endsAt.setDate(endsAt.getDate() + 1);
    }

    return endsAt;
  }

  private parseShiftTemplateWeekDays(weekDaysJson: string | null | undefined) {
    if (!weekDaysJson) {
      return null;
    }

    try {
      const parsed = JSON.parse(weekDaysJson) as unknown;
      if (!Array.isArray(parsed)) {
        return null;
      }

      const values = parsed
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= 7);

      if (values.length === 0) {
        return null;
      }

      return new Set(values);
    } catch {
      return null;
    }
  }

  private toTemplateWeekDay(date: Date) {
    const nativeDay = date.getDay();
    return nativeDay === 0 ? 7 : nativeDay;
  }
}
