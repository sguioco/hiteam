import {
  BadRequestException,
  ConflictException,
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
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateEmployeeInvitationDto } from './dto/create-employee-invitation.dto';
import { EmployeeStatsQueryDto } from './dto/employee-stats-query.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { RegisterEmployeeInvitationDto } from './dto/register-employee-invitation.dto';
import { ReviewEmployeeInvitationDto } from './dto/review-employee-invitation.dto';
import { UpdateEmployeeInvitationSetupDto } from './dto/update-employee-invitation-setup.dto';
import { UpdateMyPreferencesDto } from './dto/update-my-preferences.dto';
import { EmployeeInvitationsMailerService } from './employee-invitations.mailer';

type PrismaTx = Prisma.TransactionClient | PrismaService;

const EMPLOYEE_REVIEW_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

const EMPLOYEE_LIST_INCLUDE = {
  user: {
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  },
  company: true,
  department: true,
  primaryLocation: true,
  position: true,
  biometricProfile: {
    select: {
      enrollmentStatus: true,
    },
  },
} satisfies Prisma.EmployeeInclude;

type EmployeeWorkModeInput = 'STATIONARY' | 'FIELD' | null | undefined;

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly billingService: BillingService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
    private readonly invitationsMailer: EmployeeInvitationsMailerService,
  ) {}

  async list(tenantId: string, query: ListEmployeesQueryDto = {}, actorUserId?: string) {
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        OR: query.search
          ? [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { employeeNumber: { contains: query.search, mode: 'insensitive' } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } },
            ]
          : undefined,
      },
      include: EMPLOYEE_LIST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    if (!actorUserId || query.search?.trim()) {
      return employees;
    }

    const currentEmployeeIndex = employees.findIndex(
      (employee) => employee.userId === actorUserId,
    );

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
      include: EMPLOYEE_LIST_INCLUDE,
    });

    if (!currentEmployee || currentEmployee.tenantId !== tenantId) {
      return employees;
    }

    return [currentEmployee, ...employees];
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
        company: true,
        department: true,
        primaryLocation: true,
        position: true,
        devices: true,
      },
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

  async updateManagerAccess(
    tenantId: string,
    actorUserId: string,
    employeeId: string,
    grantManagerAccess: boolean,
  ) {
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
      await tx.session.deleteMany({
        where: { userId: employee.userId! },
      });
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

    return this.getManagerAccess(tenantId, employeeId);
  }

  async updateBreaksAccess(
    tenantId: string,
    actorUserId: string,
    employeeId: string,
    breaksEnabled: boolean,
  ) {
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

    return this.getById(tenantId, employeeId);
  }

  async updateWorkMode(
    tenantId: string,
    actorUserId: string,
    employeeId: string,
    workMode: EmployeeWorkModeInput,
  ) {
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

    return this.getById(tenantId, employeeId);
  }

  async getMe(user: JwtUser) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        tenantId: user.tenantId,
        userId: user.sub,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            bannerTheme: true,
          },
        },
        company: true,
        department: true,
        primaryLocation: true,
        position: true,
        devices: true,
        invitation: {
          select: {
            avatarStorageKey: true,
            avatarUrl: true,
          },
        },
      },
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

    return this.prisma.$transaction(async (tx) => {
      const employeeRole = await this.ensureEmployeeRole(tx);
      const managerRole = dto.grantManagerAccess ? await this.ensureManagerRole(tx) : null;

      const user = await tx.user.create({
        data: {
          tenantId,
          email: dto.email.toLowerCase(),
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.userRole.createMany({
        data: [
          {
            userId: user.id,
            roleId: employeeRole.id,
            scopeType: 'tenant',
            scopeId: tenantId,
          },
          ...(managerRole
            ? [
                {
                  userId: user.id,
                  roleId: managerRole.id,
                  scopeType: 'tenant',
                  scopeId: tenantId,
                },
              ]
            : []),
        ],
      });

      return tx.employee.create({
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
          workMode: this.normalizeWorkMode(dto.workMode),
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
    });
  }

  async listPendingInvitations(tenantId: string) {
    return this.prisma.employeeInvitation.findMany({
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

    const token = randomBytes(24).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const workMode = this.normalizeWorkMode(dto.workMode);

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
      lastSentAt: new Date(),
      resentCount: 0,
      submittedAt: null,
      approvedAt: null,
      approvedByUserId: null,
      rejectedAt: null,
      rejectedReason: null,
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

    if (email) {
      await this.invitationsMailer.sendInvitationEmail({
        email,
        companyName: tenant.companies[0]?.name ?? tenant.name,
        tenantName: tenant.name,
        token,
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
      metadata: { email, phone, expiresAt: expiresAt.toISOString(), workMode },
    });

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
      workMode: invitation.workMode,
      companyName: tenant.companies[0]?.name ?? tenant.name,
      tenantName: tenant.name,
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
    const workMode = this.normalizeWorkMode(dto.workMode ?? invitation.workMode);
    const shiftTemplateId = dto.shiftTemplateId?.trim() ?? '';

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

    const rawGroupId = dto.groupId?.trim();
    const requestedGroupId = rawGroupId ? rawGroupId : null;

    if (requestedGroupId) {
      const approvedGroup = await this.prisma.workGroup.findFirst({
        where: { tenantId, id: requestedGroupId },
        select: { id: true },
      });

      if (!approvedGroup) {
        throw new BadRequestException('Selected work group was not found.');
      }
    }

    const updated = await this.prisma.employeeInvitation.update({
      where: { id: invitation.id },
      data: {
        firstName,
        lastName,
        middleName,
        workMode,
        approvedShiftTemplateId: shiftTemplate?.id ?? null,
        approvedGroupId: requestedGroupId,
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
        email: updated.email,
        phone: updated.phone,
      },
    });

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
      workMode: updated.workMode,
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
    const updated = await this.prisma.employeeInvitation.update({
      where: { id: invitation.id },
      data: {
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        lastSentAt: new Date(),
        resentCount: { increment: 1 },
      },
    });

    if (updated.email) {
      await this.invitationsMailer.sendInvitationEmail({
        email: updated.email,
        companyName: invitation.tenant.companies[0]?.name ?? invitation.tenant.name,
        tenantName: invitation.tenant.name,
        token,
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
      metadata: { email: invitation.email, phone: invitation.phone, resentCount: updated.resentCount },
    });

    return {
      id: updated.id,
      status: updated.status,
      expiresAt: updated.expiresAt.toISOString(),
      resentCount: updated.resentCount,
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
      phone: invitation.phone ?? null,
      workMode: invitation.workMode,
    };
  }

  async registerFromInvitation(token: string, dto: RegisterEmployeeInvitationDto) {
    const invitation = await this.prisma.employeeInvitation.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }

    const canRegisterApprovedInvitation =
      invitation.status === EmployeeInvitationStatus.APPROVED && !invitation.userId;
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
    
    const realUserCount = await this.prisma.user.count({
      where: {
        tenantId: invitation.tenantId,
        email: { not: { startsWith: 'system+' } },
      },
    });

    const isFirstUser = realUserCount === 0;
    const isPreApproved = invitation.status === EmployeeInvitationStatus.APPROVED && !invitation.userId;
    const roleCode = isFirstUser ? 'tenant_owner' : 'employee';
    const roleName = isFirstUser ? 'Tenant Owner' : 'Employee';
    const shouldAutoApprove =
      invitation.status === EmployeeInvitationStatus.INVITED ||
      invitation.status === EmployeeInvitationStatus.PENDING_APPROVAL ||
      invitation.status === EmployeeInvitationStatus.APPROVED ||
      isFirstUser ||
      isPreApproved;

    if (isFirstUser && !dto.avatarDataUrl?.trim() && !invitation.avatarUrl) {
      throw new BadRequestException('Добавьте фото профиля.');
    }

    const assignedRole = await this.prisma.role.upsert({
      where: { code: roleCode },
      update: {},
      create: {
        code: roleCode,
        name: roleName,
        description: isFirstUser ? 'Owner of the workspace' : 'Standard employee access',
      },
    });

    const avatar = await this.uploadOptionalAvatarSafely(
      invitation.tenantId,
      registrationEmail,
      dto.avatarDataUrl,
      'registerFromInvitation',
    );

    let result: { user: { id: string }; invitation: { id: string } };

    try {
      result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            tenantId: invitation.tenantId,
            email: registrationEmail,
            passwordHash,
            status: UserStatus.ACTIVE,
            workspaceAccessAllowed: shouldAutoApprove,
          },
        });

        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: assignedRole.id,
            scopeType: 'tenant',
            scopeId: invitation.tenantId,
          },
        });

        const companyId = await this.resolveInvitationCompanyId(tx, invitation.tenantId, invitation.companyId);
        const departmentId = await this.resolveDefaultDepartmentId(tx, invitation.tenantId);
        const approvedShiftTemplate =
          invitation.workMode === EmployeeWorkMode.STATIONARY && invitation.approvedShiftTemplateId
          ? await tx.shiftTemplate.findFirst({
              where: { tenantId: invitation.tenantId, id: invitation.approvedShiftTemplateId },
            })
          : null;
        const primaryLocationId = approvedShiftTemplate?.locationId ?? await this.resolveDefaultLocationId(tx, invitation.tenantId, companyId);
        const positionId = approvedShiftTemplate?.positionId ?? await this.resolveDefaultPositionId(tx, invitation.tenantId);

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
            workMode: this.normalizeWorkMode(invitation.workMode),
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

        if (
          invitation.workMode === EmployeeWorkMode.STATIONARY &&
          invitation.approvedShiftTemplateId
        ) {
          await this.createInitialShiftFromTemplate(tx, invitation.tenantId, employee.id, invitation.approvedShiftTemplateId);
        }

        const updatedInvitation = await tx.employeeInvitation.update({
          where: { id: invitation.id },
          data: {
            email: registrationEmail,
            userId: user.id,
            employeeId: employee.id,
            status: EmployeeInvitationStatus.APPROVED,
            submittedAt: new Date(),
            approvedAt: invitation.approvedAt ?? new Date(),
            approvedByUserId: invitation.approvedByUserId ?? invitation.invitedByUserId,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            middleName: dto.middleName?.trim() || null,
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

    return {
      invitationId: invitation.id,
      status: EmployeeInvitationStatus.APPROVED,
      accessGranted: true,
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
      include: { user: true },
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

    const grantManagerAccess = dto.decision === 'APPROVE' && dto.grantManagerAccess === true;
    const workMode = this.normalizeWorkMode(dto.workMode ?? invitation.workMode);
    const requestedShiftTemplateId =
      dto.decision === 'APPROVE' && workMode === EmployeeWorkMode.STATIONARY
        ? dto.shiftTemplateId?.trim() || invitation.approvedShiftTemplateId || null
        : null;
    const approvedShiftTemplate =
      requestedShiftTemplateId
        ? await this.prisma.shiftTemplate.findFirst({
            where: { tenantId, id: requestedShiftTemplateId },
          })
        : null;

    if (
      dto.decision === 'APPROVE' &&
      workMode === EmployeeWorkMode.STATIONARY &&
      !approvedShiftTemplate
    ) {
      throw new BadRequestException('Пожалуйста, выберите смену перед подтверждением анкеты.');
    }

    const rawGroupId = typeof dto.groupId === 'string' ? dto.groupId.trim() : undefined;
    const requestedGroupId =
      dto.decision === 'APPROVE'
        ? rawGroupId === undefined
          ? invitation.approvedGroupId || null
          : rawGroupId || null
        : invitation.approvedGroupId || null;

    if (requestedGroupId) {
      const approvedGroup = await this.prisma.workGroup.findFirst({
        where: { tenantId, id: requestedGroupId },
        select: { id: true },
      });

      if (!approvedGroup) {
        throw new BadRequestException('Selected work group was not found.');
      }
    }

    if (dto.decision === 'APPROVE' && !invitation.userId && !invitation.email) {
      throw new BadRequestException('У сотрудника не указан email. Попросите сотрудника завершить регистрацию по ссылке.');
    }

    const invitationEmail = invitation.email;
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
      birthDate: dto.birthDate ? new Date(dto.birthDate) : invitation.birthDate,
      gender: dto.gender ?? invitation.gender,
      phone: dto.phone?.trim() ?? invitation.phone,
      avatarStorageKey: avatar?.key ?? invitation.avatarStorageKey,
      avatarUrl: avatar?.url ?? invitation.avatarUrl,
      workMode,
      companyId: invitation.companyId ?? null,
      approvedShiftTemplateId: approvedShiftTemplate?.id ?? null,
      approvedGroupId: requestedGroupId,
    };

    if (!updatePayload.firstName || !updatePayload.lastName || !updatePayload.birthDate || !updatePayload.gender || !updatePayload.phone) {
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

      return { id: rejected.id, status: rejected.status };
    }

    if (!invitation.userId) {
      if (!invitationEmail) {
        throw new BadRequestException('У сотрудника не указан email. Попросите сотрудника завершить регистрацию по ссылке.');
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

        const employeeRole = await this.ensureEmployeeRole(tx);
        const managerRole = grantManagerAccess ? await this.ensureManagerRole(tx) : null;
        const companyId = await this.resolveInvitationCompanyId(tx, tenantId, updatePayload.companyId);
        const departmentId = await this.resolveDefaultDepartmentId(tx, tenantId);
        const primaryLocationId =
          approvedShiftTemplate?.locationId ?? (await this.resolveDefaultLocationId(tx, tenantId, companyId));
        const positionId = approvedShiftTemplate?.positionId ?? (await this.resolveDefaultPositionId(tx, tenantId));

        const user = await tx.user.create({
          data: {
            tenantId,
            email: invitationEmail,
            passwordHash,
            status: UserStatus.ACTIVE,
            workspaceAccessAllowed: true,
          },
        });

        await tx.userRole.createMany({
          data: [
            {
              userId: user.id,
              roleId: employeeRole.id,
              scopeType: 'tenant',
              scopeId: tenantId,
            },
            ...(managerRole
              ? [
                  {
                    userId: user.id,
                    roleId: managerRole.id,
                    scopeType: 'tenant',
                    scopeId: tenantId,
                  },
                ]
              : []),
          ],
        });

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
          grantManagerAccess,
        },
      });

      return {
        id: approved.id,
        status: approved.status,
        employeeId: approved.employeeId,
        email: invitationEmail,
        generatedPassword,
      };
    }

    const approved = await this.prisma.$transaction(async (tx) => {
      const existingEmployee = await tx.employee.findUnique({
        where: { userId: invitation.userId! },
      });

      const companyId = await this.resolveInvitationCompanyId(tx, tenantId, updatePayload.companyId);
      const departmentId = await this.resolveDefaultDepartmentId(tx, tenantId);
      const primaryLocationId = approvedShiftTemplate?.locationId ?? await this.resolveDefaultLocationId(tx, tenantId, companyId);
      const positionId = approvedShiftTemplate?.positionId ?? await this.resolveDefaultPositionId(tx, tenantId);

      const employee =
        existingEmployee
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

      await this.syncManagerRole(tx, invitation.userId!, tenantId, grantManagerAccess);

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
        grantManagerAccess,
      },
    });

    return { id: approved.id, status: approved.status, employeeId: approved.employeeId };
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

  private async createInitialShiftFromTemplate(
    tx: PrismaTx,
    tenantId: string,
    employeeId: string,
    templateId: string,
  ) {
    const template = await tx.shiftTemplate.findFirst({
      where: { tenantId, id: templateId },
      select: {
        id: true,
        locationId: true,
        positionId: true,
        startsAtLocal: true,
        endsAtLocal: true,
        weekDaysJson: true,
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
    return workMode === EmployeeWorkMode.FIELD || workMode === 'FIELD'
      ? EmployeeWorkMode.FIELD
      : EmployeeWorkMode.STATIONARY;
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

      if (
        invitation.status === EmployeeInvitationStatus.INVITED &&
        invitation.expiresAt.getTime() <= Date.now()
      ) {
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
      throw new ConflictException('Этот email найден в нескольких организациях. Попросите менеджера отправить точную ссылку.');
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
