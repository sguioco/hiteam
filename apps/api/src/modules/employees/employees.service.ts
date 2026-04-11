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
  NotificationType,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EmployeeInvitationsMailerService } from './employee-invitations.mailer';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateEmployeeInvitationDto } from './dto/create-employee-invitation.dto';
import { EmployeeStatsQueryDto } from './dto/employee-stats-query.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { PublicCompanyJoinDto } from './dto/public-company-join.dto';
import { RegisterEmployeeInvitationDto } from './dto/register-employee-invitation.dto';
import { ReviewEmployeeInvitationDto } from './dto/review-employee-invitation.dto';
import { UpdateMyPreferencesDto } from './dto/update-my-preferences.dto';

type PrismaTx = Prisma.TransactionClient | PrismaService;

const EMPLOYEE_REVIEW_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly employeeInvitationsMailerService: EmployeeInvitationsMailerService,
    private readonly storageService: StorageService,
  ) {}

  list(tenantId: string, query: ListEmployeesQueryDto) {
    return this.prisma.employee.findMany({
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
        biometricProfile: {
          select: {
            enrollmentStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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

  getMe(user: JwtUser) {
    return this.prisma.employee.findFirst({
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
      },
    });
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

  async lookupCompanyByCode(code: string) {
    const company = await this.findCompanyByJoinCode(code);

    return {
      companyName: company.name,
      companyCode: company.code,
      tenantName: company.tenant.name,
      tenantSlug: company.tenant.slug,
    };
  }

  async submitJoinRequestByCompanyCode(dto: PublicCompanyJoinDto) {
    const company = await this.findCompanyByJoinCode(dto.code);
    const email = dto.email.toLowerCase().trim();
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const phone = dto.phone.trim();

    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId: company.tenantId,
        email,
      },
    });

    if (existingUser) {
      throw new ConflictException('Такой email уже зарегистрирован в компании.');
    }

    let avatar: Awaited<ReturnType<typeof this.uploadOptionalAvatar>> = null;

    try {
      avatar = await this.uploadOptionalAvatar(company.tenantId, email, dto.avatarDataUrl);
    } catch (error) {
      this.logger.warn(
        `submitJoinRequestByCompanyCode avatar upload failed for ${email} in tenant ${company.tenantId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    try {
      const inviterUserId = await this.ensureSystemInviter(company.tenantId);
      const token = randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const invitation = await this.prisma.employeeInvitation.upsert({
        where: {
          tenantId_email: {
            tenantId: company.tenantId,
            email,
          },
        },
        create: {
          tenantId: company.tenantId,
          companyId: company.id,
          email,
          invitedByUserId: inviterUserId,
          tokenHash: this.hashToken(token),
          expiresAt,
          status: EmployeeInvitationStatus.PENDING_APPROVAL,
          submittedAt: new Date(),
          firstName,
          lastName,
          birthDate: new Date(dto.birthDate),
          phone,
          avatarStorageKey: avatar?.key ?? null,
          avatarUrl: avatar?.url ?? null,
        },
        update: {
          companyId: company.id,
          invitedByUserId: inviterUserId,
          tokenHash: this.hashToken(token),
          expiresAt,
          status: EmployeeInvitationStatus.PENDING_APPROVAL,
          submittedAt: new Date(),
          approvedAt: null,
          approvedByUserId: null,
          rejectedAt: null,
          rejectedReason: null,
          userId: null,
          employeeId: null,
          firstName,
          lastName,
          middleName: null,
          birthDate: new Date(dto.birthDate),
          gender: null,
          phone,
          avatarStorageKey: avatar?.key ?? null,
          avatarUrl: avatar?.url ?? null,
        },
      });

      const recipients = await this.listApprovalRecipientIds(company.tenantId);
      if (recipients.length > 0) {
        const notificationResults = await Promise.allSettled(
          recipients.map((userId) =>
            this.notificationsService.createForUser({
              tenantId: company.tenantId,
              userId,
              type: NotificationType.EMPLOYEE_APPROVAL_ACTION_REQUIRED,
              title: 'Новая заявка на присоединение по коду компании',
              body: `${firstName} ${lastName} отправил(а) заявку для ${company.name}.`,
              actionUrl: '/app/employees',
              metadata: { invitationId: invitation.id, email, companyCode: company.code },
            }),
          ),
        );
        const failedNotifications = notificationResults.filter((result) => result.status === 'rejected');

        if (failedNotifications.length > 0) {
          this.logger.warn(
            `submitJoinRequestByCompanyCode notifications partially failed for ${email} in tenant ${company.tenantId}: ${failedNotifications.length}/${notificationResults.length}`,
          );
        }
      }

      try {
        await this.auditService.log({
          tenantId: company.tenantId,
          actorUserId: inviterUserId,
          entityType: 'employee_invitation',
          entityId: invitation.id,
          action: 'employee.public_join_requested',
          metadata: {
            email,
            companyCode: company.code,
            firstName,
            lastName,
            birthDate: dto.birthDate,
          },
        });
      } catch (error) {
        this.logger.warn(
          `submitJoinRequestByCompanyCode audit log failed for ${email} in tenant ${company.tenantId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }

      return {
        id: invitation.id,
        status: invitation.status,
        tenantName: company.tenant.name,
        companyName: company.name,
      };
    } catch (error) {
      this.logger.error(
        `submitJoinRequestByCompanyCode failed for ${email} in tenant ${company.tenantId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Не удалось отправить заявку на вступление.');
    }
  }

  async createInvitation(tenantId: string, actorUserId: string, dto: CreateEmployeeInvitationDto) {
    const email = dto.email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findFirst({
      where: { tenantId, email },
    });

    if (existingUser) {
      throw new ConflictException('Такой email уже зарегистрирован.');
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
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.employeeInvitation.upsert({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
      create: {
        tenantId,
        email,
        invitedByUserId: actorUserId,
        tokenHash,
        expiresAt,
        status: EmployeeInvitationStatus.INVITED,
      },
      update: {
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
      },
    });

    const delivery = await this.employeeInvitationsMailerService.sendInvitationEmail({
      email,
      companyName: tenant.companies[0]?.name ?? tenant.name,
      tenantName: tenant.name,
      token,
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'employee_invitation',
      entityId: invitation.id,
      action: 'employee.invitation_created',
      metadata: { email, expiresAt: expiresAt.toISOString(), provider: delivery.provider },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      previewUrl: delivery.provider === 'log' ? delivery.inviteUrl : null,
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
      throw new BadRequestException('Invitation expired. Create a new invite.');
    }

    const token = randomBytes(24).toString('hex');
    const updated = await this.prisma.employeeInvitation.update({
      where: { id: invitation.id },
      data: {
        tokenHash: this.hashToken(token),
        lastSentAt: new Date(),
        resentCount: { increment: 1 },
      },
    });

    const delivery = await this.employeeInvitationsMailerService.sendInvitationEmail({
      email: invitation.email,
      companyName: invitation.tenant.companies[0]?.name ?? invitation.tenant.name,
      tenantName: invitation.tenant.name,
      token,
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'employee_invitation',
      entityId: invitation.id,
      action: 'employee.invitation_resent',
      metadata: { email: invitation.email, resentCount: updated.resentCount, provider: delivery.provider },
    });

    return {
      id: updated.id,
      status: updated.status,
      expiresAt: updated.expiresAt.toISOString(),
      resentCount: updated.resentCount,
      previewUrl: delivery.provider === 'log' ? delivery.inviteUrl : null,
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
            code: true,
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
      companyCode: invitation.company?.code ?? null,
      expiresAt: invitation.expiresAt.toISOString(),
      submittedAt: invitation.submittedAt?.toISOString() ?? null,
      registrationCompleted: Boolean(invitation.userId),
      firstName: invitation.firstName ?? null,
      lastName: invitation.lastName ?? null,
      phone: invitation.phone ?? null,
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

    if (invitation.status !== EmployeeInvitationStatus.INVITED && !canRegisterApprovedInvitation) {
      throw new BadRequestException('Этот invite уже использован. Войдите в систему.');
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      await this.markInvitationExpired(invitation.id);
      throw new BadRequestException('Invitation expired.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId: invitation.tenantId,
        email: invitation.email,
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
    const shouldAutoApprove = isFirstUser || isPreApproved;

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

    const avatar = await this.uploadOptionalAvatar(
      invitation.tenantId,
      invitation.email,
      dto.avatarDataUrl,
    );

    let result: { user: { id: string }; invitation: { id: string } };

    try {
      result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            tenantId: invitation.tenantId,
            email: invitation.email,
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
        const approvedShiftTemplate = invitation.approvedShiftTemplateId
          ? await tx.shiftTemplate.findFirst({
              where: { tenantId: invitation.tenantId, id: invitation.approvedShiftTemplateId },
            })
          : null;
        const primaryLocationId = approvedShiftTemplate?.locationId ?? await this.resolveDefaultLocationId(tx, invitation.tenantId, companyId);
        const positionId = approvedShiftTemplate?.positionId ?? await this.resolveDefaultPositionId(tx, invitation.tenantId);

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
            birthDate: new Date(dto.birthDate),
            gender: dto.gender,
            phone: dto.phone.trim(),
            avatarStorageKey: avatar?.key ?? null,
            avatarUrl: avatar?.url ?? null,
            status: shouldAutoApprove ? EmployeeStatus.ACTIVE : EmployeeStatus.INACTIVE,
            hireDate: new Date(),
          },
        });

        if (invitation.approvedGroupId) {
          await this.syncEmployeeGroupMembership(tx, invitation.tenantId, employee.id, invitation.approvedGroupId);
        }

        if (invitation.approvedShiftTemplateId) {
          await this.createInitialShiftFromTemplate(tx, invitation.tenantId, employee.id, invitation.approvedShiftTemplateId);
        }

        const updatedInvitation = await tx.employeeInvitation.update({
          where: { id: invitation.id },
          data: {
            userId: user.id,
            employeeId: employee.id,
            status: shouldAutoApprove ? EmployeeInvitationStatus.APPROVED : EmployeeInvitationStatus.PENDING_APPROVAL,
            submittedAt: new Date(),
            approvedAt: shouldAutoApprove ? invitation.approvedAt ?? new Date() : null,
            approvedByUserId: shouldAutoApprove ? invitation.approvedByUserId ?? null : null,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            middleName: dto.middleName?.trim() || null,
            birthDate: new Date(dto.birthDate),
            gender: dto.gender,
            phone: dto.phone.trim(),
            avatarStorageKey: avatar?.key ?? null,
            avatarUrl: avatar?.url ?? null,
          },
        });

        return { user, invitation: updatedInvitation };
      });
    } catch (error) {
      this.logger.error(
        `registerFromInvitation failed for invitation ${invitation.id} in tenant ${invitation.tenantId}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException('Failed to create the manager profile.');
    }

    if (!shouldAutoApprove) {
      await this.notificationsService.createForUser({
        tenantId: invitation.tenantId,
        userId: invitation.invitedByUserId,
        type: NotificationType.EMPLOYEE_APPROVAL_ACTION_REQUIRED,
        title: 'Новая заявка сотрудника ждёт подтверждения',
        body: `${dto.firstName.trim()} ${dto.lastName.trim()} заполнил(а) профиль и ждёт подтверждения.`,
        actionUrl: '/app/employees',
        metadata: { invitationId: invitation.id, email: invitation.email },
      });
    }

    await this.auditService.log({
      tenantId: invitation.tenantId,
      actorUserId: result.user.id,
      entityType: 'employee_invitation',
      entityId: invitation.id,
      action: 'employee.profile_submitted',
      metadata: { email: invitation.email, autoApproved: shouldAutoApprove, preApproved: isPreApproved },
    });

    return {
      invitationId: invitation.id,
      status: shouldAutoApprove ? EmployeeInvitationStatus.APPROVED : EmployeeInvitationStatus.PENDING_APPROVAL,
      accessGranted: shouldAutoApprove,
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
    const requestedShiftTemplateId =
      dto.decision === 'APPROVE'
        ? dto.shiftTemplateId?.trim() || invitation.approvedShiftTemplateId || null
        : invitation.approvedShiftTemplateId || null;
    const approvedShiftTemplate =
      requestedShiftTemplateId
        ? await this.prisma.shiftTemplate.findFirst({
            where: { tenantId, id: requestedShiftTemplateId },
          })
        : null;

    if (dto.decision === 'APPROVE' && !approvedShiftTemplate) {
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

    const avatar = await this.uploadOptionalAvatar(tenantId, invitation.email, dto.avatarDataUrl);

    const updatePayload = {
      firstName: dto.firstName?.trim() ?? invitation.firstName,
      lastName: dto.lastName?.trim() ?? invitation.lastName,
      middleName: dto.middleName?.trim() ?? invitation.middleName,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : invitation.birthDate,
      gender: dto.gender ?? invitation.gender,
      phone: dto.phone?.trim() ?? invitation.phone,
      avatarStorageKey: avatar?.key ?? invitation.avatarStorageKey,
      avatarUrl: avatar?.url ?? invitation.avatarUrl,
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
      const generatedPassword = this.generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(generatedPassword, 10);

      const approved = await this.prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findFirst({
          where: {
            tenantId,
            email: invitation.email,
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
            email: invitation.email,
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
          email: invitation.email,
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
        email: invitation.email,
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

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private normalizeCompanyJoinCode(code: string) {
    return code.trim().toUpperCase();
  }

  private async findCompanyByJoinCode(code: string) {
    const normalizedCode = this.normalizeCompanyJoinCode(code);
    const companies = await this.prisma.company.findMany({
      where: { code: normalizedCode },
      include: { tenant: true },
      take: 2,
    });

    if (companies.length === 0) {
      throw new NotFoundException('Компания с таким кодом не найдена.');
    }

    if (companies.length > 1) {
      throw new BadRequestException('Код компании неоднозначен. Обратитесь к администратору.');
    }

    return companies[0];
  }

  private async ensureSystemInviter(tenantId: string) {
    const email = `system+${tenantId}@smart.local`;
    const existing = await this.prisma.user.findFirst({
      where: {
        tenantId,
        email,
      },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    try {
      const created = await this.prisma.user.create({
        data: {
          tenantId,
          email,
          passwordHash: await bcrypt.hash(randomBytes(16).toString('hex'), 10),
          status: UserStatus.ACTIVE,
        },
        select: { id: true },
      });

      return created.id;
    } catch (error) {
      this.logger.warn(
        `ensureSystemInviter create failed for tenant ${tenantId}, trying fallback actor`,
        error instanceof Error ? error.stack : undefined,
      );

      const fallback = await this.findFallbackInvitationActor(tenantId);
      if (fallback) {
        return fallback;
      }

      throw error;
    }
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

  private async listApprovalRecipientIds(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: UserStatus.ACTIVE,
        email: { not: { startsWith: 'system+' } },
        roles: {
          some: {
            role: {
              code: {
                in: ['tenant_owner', 'hr_admin', 'operations_admin', 'manager'],
              },
            },
          },
        },
      },
      select: { id: true },
      distinct: ['id'],
    });

    return users.map((user) => user.id);
  }

  private async findFallbackInvitationActor(tenantId: string) {
    const privilegedUser = await this.prisma.user.findFirst({
      where: {
        tenantId,
        status: UserStatus.ACTIVE,
        email: { not: { startsWith: 'system+' } },
        roles: {
          some: {
            role: {
              code: {
                in: ['tenant_owner', 'hr_admin', 'operations_admin', 'manager'],
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (privilegedUser) {
      return privilegedUser.id;
    }

    const activeUser = await this.prisma.user.findFirst({
      where: {
        tenantId,
        status: UserStatus.ACTIVE,
        email: { not: { startsWith: 'system+' } },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    return activeUser?.id ?? null;
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
        code: `GENERAL-${tenantId.slice(0, 8).toUpperCase()}`,
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
