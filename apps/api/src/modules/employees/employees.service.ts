import {
  BadRequestException,
  ConflictException,
  Injectable,
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
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { PublicCompanyJoinDto } from './dto/public-company-join.dto';
import { RegisterEmployeeInvitationDto } from './dto/register-employee-invitation.dto';
import { ReviewEmployeeInvitationDto } from './dto/review-employee-invitation.dto';

type PrismaTx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class EmployeesService {
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
        user: true,
        company: true,
        department: true,
        primaryLocation: true,
        position: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getById(tenantId: string, employeeId: string) {
    return this.prisma.employee.findFirstOrThrow({
      where: { tenantId, id: employeeId },
      include: {
        user: true,
        company: true,
        department: true,
        primaryLocation: true,
        position: true,
        devices: true,
      },
    });
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
      const employeeRole = await tx.role.upsert({
        where: { code: 'employee' },
        update: {},
        create: {
          code: 'employee',
          name: 'Employee',
          description: 'Standard employee access',
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId,
          email: dto.email.toLowerCase(),
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: employeeRole.id,
          scopeType: 'tenant',
          scopeId: tenantId,
        },
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

    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId: company.tenantId,
        email,
      },
    });

    if (existingUser) {
      throw new ConflictException('Такой email уже зарегистрирован в компании.');
    }

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
        email,
        invitedByUserId: inviterUserId,
        tokenHash: this.hashToken(token),
        expiresAt,
        status: EmployeeInvitationStatus.PENDING_APPROVAL,
        submittedAt: new Date(),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone.trim(),
      },
      update: {
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
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        middleName: null,
        birthDate: null,
        gender: null,
        phone: dto.phone.trim(),
        avatarStorageKey: null,
        avatarUrl: null,
      },
    });

    const recipients = await this.listApprovalRecipientIds(company.tenantId);
    await Promise.all(
      recipients.map((userId) =>
        this.notificationsService.createForUser({
          tenantId: company.tenantId,
          userId,
          type: NotificationType.EMPLOYEE_APPROVAL_ACTION_REQUIRED,
          title: 'Новая заявка на присоединение по коду компании',
          body: `${dto.firstName.trim()} ${dto.lastName.trim()} отправил(а) заявку для ${company.name}.`,
          actionUrl: '/app/employees',
          metadata: { invitationId: invitation.id, email, companyCode: company.code },
        }),
      ),
    );

    await this.auditService.log({
      tenantId: company.tenantId,
      actorUserId: inviterUserId,
      entityType: 'employee_invitation',
      entityId: invitation.id,
      action: 'employee.public_join_requested',
      metadata: {
        email,
        companyCode: company.code,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
      },
    });

    return {
      id: invitation.id,
      status: invitation.status,
      tenantName: company.tenant.name,
      companyName: company.name,
    };
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
      include: { tenant: true },
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
      throw new BadRequestException('Invitation is no longer available for registration.');
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

    const assignedRole = await this.prisma.role.upsert({
      where: { code: roleCode },
      update: {},
      create: {
        code: roleCode,
        name: roleName,
        description: isFirstUser ? 'Owner of the workspace' : 'Standard employee access',
      },
    });

    const avatar = dto.avatarDataUrl
      ? await this.uploadAvatar(invitation.tenantId, invitation.email, dto.avatarDataUrl)
      : null;

    const result = await this.prisma.$transaction(async (tx) => {
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

      const companyId = await this.resolveDefaultCompanyId(tx, invitation.tenantId);
      const departmentId = await this.resolveDefaultDepartmentId(tx, invitation.tenantId);
      const primaryLocationId = await this.resolveDefaultLocationId(tx, invitation.tenantId, companyId);
      const positionId = await this.resolveDefaultPositionId(tx, invitation.tenantId);

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

    if (!invitation.userId) {
      throw new BadRequestException('The employee has not completed registration yet.');
    }

    const avatar = dto.avatarDataUrl
      ? await this.uploadAvatar(tenantId, invitation.email, dto.avatarDataUrl)
      : null;

    const updatePayload = {
      firstName: dto.firstName?.trim() ?? invitation.firstName,
      lastName: dto.lastName?.trim() ?? invitation.lastName,
      middleName: dto.middleName?.trim() ?? invitation.middleName,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : invitation.birthDate,
      gender: dto.gender ?? invitation.gender,
      phone: dto.phone?.trim() ?? invitation.phone,
      avatarStorageKey: avatar?.key ?? invitation.avatarStorageKey,
      avatarUrl: avatar?.url ?? invitation.avatarUrl,
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
      const approved = await this.prisma.employeeInvitation.update({
        where: { id: invitation.id },
        data: {
          ...updatePayload,
          status: EmployeeInvitationStatus.APPROVED,
          approvedAt: new Date(),
          approvedByUserId: actorUserId,
          rejectedAt: null,
          rejectedReason: null,
          tokenHash: this.hashToken(token),
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      });

      await this.employeeInvitationsMailerService.sendInvitationEmail({
        email: invitation.email,
        companyName: tenant.companies[0]?.name ?? tenant.name,
        tenantName: tenant.name,
        token,
      });

      await this.auditService.log({
        tenantId,
        actorUserId,
        entityType: 'employee_invitation',
        entityId: invitation.id,
        action: 'employee.review_approved_invite_sent',
        metadata: { email: invitation.email },
      });

      return { id: approved.id, status: approved.status, employeeId: approved.employeeId, inviteSent: true };
    }

    const approved = await this.prisma.$transaction(async (tx) => {
      const existingEmployee = await tx.employee.findUnique({
        where: { userId: invitation.userId! },
      });

      const companyId = await this.resolveDefaultCompanyId(tx, tenantId);
      const departmentId = await this.resolveDefaultDepartmentId(tx, tenantId);
      const primaryLocationId = await this.resolveDefaultLocationId(tx, tenantId, companyId);
      const positionId = await this.resolveDefaultPositionId(tx, tenantId);

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

      await tx.user.update({
        where: { id: invitation.userId! },
        data: { workspaceAccessAllowed: true },
      });

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
    });

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
      metadata: { employeeId: approved.employeeId },
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
}
