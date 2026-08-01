import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  EmployeeInvitationStatus,
  EmployeeWorkMode,
  Prisma,
} from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { KommoService } from "../kommo/kommo.service";
import { AssignLocationEmployeesDto } from "./dto/assign-location-employees.dto";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { UpdateOrgSettingsDto } from "./dto/update-org-settings.dto";
import { UpsertOrgSetupDto } from "./dto/upsert-org-setup.dto";
import {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  normalizeGeofenceRadius,
} from "./geofence-radius";

const SEEDED_PLACEHOLDER_COMPANY_NAME = 'Beauty Life';
const SEEDED_PLACEHOLDER_ADDRESS = 'Demo address';

const COMPANY_SETUP_SELECT = {
  id: true,
  name: true,
  logoUrl: true,
  googlePlaceId: true,
  archivedAt: true,
  createdAt: true,
} as const;

const LOCATION_SETUP_SELECT = {
  id: true,
  companyId: true,
  name: true,
  code: true,
  address: true,
  country: true,
  latitude: true,
  longitude: true,
  geofenceRadiusMeters: true,
  timezone: true,
  archivedAt: true,
  createdAt: true,
} as const;

const TENANT_SETUP_SELECT = {
  businessId: true,
  attendanceTrackingEnabled: true,
} as const;

function buildInternalCode(value: string, fallback: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .toUpperCase()
    .slice(0, 24);

  return normalized || fallback;
}

function buildUniqueCode(
  existingCodes: string[],
  value: string,
  fallback: string,
): string {
  const baseCode = buildInternalCode(value, fallback);

  if (!existingCodes.includes(baseCode)) {
    return baseCode;
  }

  let index = 2;
  while (existingCodes.includes(`${baseCode}-${index}`)) {
    index += 1;
  }

  return `${baseCode}-${index}`;
}

function inferCountryFromAddress(address: string) {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return parts[parts.length - 1] || null;
}

@Injectable()
export class OrgService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kommoService: KommoService,
    private readonly auditService: AuditService,
  ) {}

  private isPlaceholderSetup(args: {
    company: {
      name: string;
      logoUrl: string | null;
      googlePlaceId: string | null;
    } | null;
    location: {
      address: string;
    } | null;
  }) {
    return Boolean(
      args.company &&
        args.location &&
        args.company.name === SEEDED_PLACEHOLDER_COMPANY_NAME &&
        args.location.address === SEEDED_PLACEHOLDER_ADDRESS &&
        !args.company.logoUrl &&
        !args.company.googlePlaceId,
    );
  }

  private async assertCanManageCompany(
    tenantId: string,
    actorUserId: string,
    companyId: string,
    locationId?: string,
  ) {
    const assignments = await this.prisma.userRole.findMany({
      where: { userId: actorUserId },
      select: {
        scopeId: true,
        scopeType: true,
        role: { select: { code: true } },
      },
    });

    if (
      assignments.some(
        ({ role, scopeId, scopeType }) =>
          role.code === 'tenant_owner' ||
          (role.code === 'operations_admin' &&
            scopeType === 'tenant' &&
            scopeId === tenantId),
      )
    ) {
      return;
    }

    const allowed = assignments.some(({ role, scopeId, scopeType }) => {
      if (role.code !== 'manager') {
        return false;
      }

      return (
        (scopeType === 'tenant' && scopeId === tenantId) ||
        (scopeType === 'company' && scopeId === companyId) ||
        (Boolean(locationId) &&
          scopeType === 'location' &&
          scopeId === locationId)
      );
    });

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have access to manage this location.',
      );
    }
  }

  private async resolveReadableScope(tenantId: string, actorUserId?: string) {
    if (!actorUserId) {
      return null;
    }
    const assignments = await this.prisma.userRole.findMany({
      where: { userId: actorUserId },
      select: {
        scopeId: true,
        scopeType: true,
        role: { select: { code: true } },
      },
    });

    if (
      assignments.some(
        ({ role, scopeId, scopeType }) =>
          role.code === 'tenant_owner' ||
          (['hr_admin', 'operations_admin'].includes(role.code) &&
            scopeType === 'tenant' &&
            scopeId === tenantId),
      ) ||
      assignments.some(
        ({ role, scopeId, scopeType }) =>
          role.code === 'manager' &&
          scopeType === 'tenant' &&
          scopeId === tenantId,
      )
    ) {
      return null;
    }

    return {
      companyIds: assignments
        .filter(({ scopeType }) => scopeType === 'company')
        .map(({ scopeId }) => scopeId),
      locationIds: assignments
        .filter(({ scopeType }) => scopeType === 'location')
        .map(({ scopeId }) => scopeId),
    };
  }

  private async assertEmployeesReadable(
    tenantId: string,
    actorUserId: string,
    employeeIds: string[] | undefined,
  ) {
    const uniqueIds = [...new Set(employeeIds ?? [])];
    if (uniqueIds.length === 0) return;
    const scope = await this.resolveReadableScope(tenantId, actorUserId);
    const visibleEmployees = await this.prisma.employee.count({
      where: {
        tenantId,
        id: { in: uniqueIds },
        ...(scope
          ? {
              OR: [
                { companyId: { in: scope.companyIds } },
                { primaryLocationId: { in: scope.locationIds } },
                {
                  locationAssignments: {
                    some: {
                      locationId: { in: scope.locationIds },
                      unassignedAt: null,
                    },
                  },
                },
              ],
            }
          : {}),
      },
    });
    if (visibleEmployees !== uniqueIds.length) {
      throw new ForbiddenException(
        'You cannot move employees outside your assigned locations.',
      );
    }
  }

  private async assignEmployeesInTransaction(
    tx: Prisma.TransactionClient,
    args: {
      tenantId: string;
      actorUserId: string;
      companyId: string;
      locationId: string;
      employeeIds: string[];
      makePrimary: boolean;
      reason?: string;
    },
  ) {
    const employeeIds = Array.from(new Set(args.employeeIds));
    if (!employeeIds.length) {
      return [];
    }

    const employees = await tx.employee.findMany({
      where: {
        tenantId: args.tenantId,
        id: { in: employeeIds },
      },
      select: {
        id: true,
        companyId: true,
        primaryLocationId: true,
      },
    });

    if (employees.length !== employeeIds.length) {
      throw new BadRequestException(
        'Some employees were not found in this workspace.',
      );
    }

    const existingAssignments = await tx.employeeLocationAssignment.findMany({
      where: {
        tenantId: args.tenantId,
        employeeId: { in: employeeIds },
        locationId: args.locationId,
        unassignedAt: null,
      },
      select: { employeeId: true, id: true, isPrimary: true },
    });
    const existingByEmployeeId = new Map(
      existingAssignments.map((assignment) => [
        assignment.employeeId,
        assignment,
      ]),
    );
    const now = new Date();
    const existingAssignmentIds = existingAssignments.map(({ id }) => id);
    const missingEmployeeIds = employees
      .filter(({ id }) => !existingByEmployeeId.has(id))
      .map(({ id }) => id);

    if (args.makePrimary) {
      await Promise.all([
        tx.employeeLocationAssignment.updateMany({
          where: {
            tenantId: args.tenantId,
            employeeId: { in: employeeIds },
            isPrimary: true,
            unassignedAt: null,
            locationId: { not: args.locationId },
          },
          data: { isPrimary: false, unassignedAt: now },
        }),
        tx.employee.updateMany({
          where: {
            tenantId: args.tenantId,
            id: { in: employeeIds },
          },
          data: {
            companyId: args.companyId,
            primaryLocationId: args.locationId,
          },
        }),
        existingAssignmentIds.length
          ? tx.employeeLocationAssignment.updateMany({
              where: { id: { in: existingAssignmentIds } },
              data: {
                isPrimary: true,
                assignedByUserId: args.actorUserId,
                reason: args.reason,
              },
            })
          : Promise.resolve(),
      ]);
    }

    if (missingEmployeeIds.length) {
      await tx.employeeLocationAssignment.createMany({
        data: missingEmployeeIds.map((employeeId) => ({
          tenantId: args.tenantId,
          companyId: args.companyId,
          employeeId,
          locationId: args.locationId,
          isPrimary: args.makePrimary,
          assignedByUserId: args.actorUserId,
          reason: args.reason,
        })),
      });
    }

    return employees;
  }

  async getSetup(tenantId: string) {
    const [tenant, company] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: TENANT_SETUP_SELECT,
      }),
      this.prisma.company.findFirst({
        where: { tenantId, archivedAt: null },
        select: COMPANY_SETUP_SELECT,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const attendanceTrackingEnabled =
      tenant?.attendanceTrackingEnabled ?? true;

    const location = company
      ? await this.prisma.location.findFirst({
          where: {
            tenantId,
            companyId: company.id,
            archivedAt: null,
          },
          select: LOCATION_SETUP_SELECT,
          orderBy: { createdAt: "desc" },
        })
      : null;

    if (this.isPlaceholderSetup({ company, location })) {
      return {
        organizationId: tenant?.businessId ?? null,
        configured: false,
        company: null,
        location: null,
        attendanceTrackingEnabled,
        defaultGeofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
      };
    }

    const configured = Boolean(
      company &&
      location &&
      location.address !== "Not set yet" &&
      !(location.latitude === 0 && location.longitude === 0),
    );

    return {
      organizationId: tenant?.businessId ?? null,
      configured,
      company,
      location,
      attendanceTrackingEnabled,
      defaultGeofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
    };
  }

  listLocations(
    tenantId: string,
    companyId?: string,
    includeArchived = false,
    actorUserId?: string,
  ) {
    return this.resolveReadableScope(tenantId, actorUserId).then((scope) =>
      this.prisma.location.findMany({
      where: {
        tenantId,
        ...(companyId ? { companyId } : {}),
        ...(includeArchived ? {} : { archivedAt: null }),
        ...(scope
          ? {
              OR: [
                { id: { in: scope.locationIds } },
                { companyId: { in: scope.companyIds } },
              ],
            }
          : {}),
      },
      select: {
        ...LOCATION_SETUP_SELECT,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            employeeAssignments: {
              where: { unassignedAt: null },
            },
          },
        },
      },
      orderBy: [{ archivedAt: 'asc' }, { createdAt: "desc" }],
      }),
    );
  }

  async createLocation(
    tenantId: string,
    actorUserId: string,
    dto: CreateLocationDto,
  ) {
    const company = await this.prisma.company.findFirst({
      where: {
        id: dto.companyId,
        tenantId,
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!company) {
      throw new BadRequestException(
        'Organization was not found in this workspace.',
      );
    }

    await Promise.all([
      this.assertCanManageCompany(tenantId, actorUserId, company.id),
      this.assertEmployeesReadable(tenantId, actorUserId, dto.employeeIds),
    ]);

    const location = await this.prisma.$transaction(async (tx) => {
      const created = await tx.location.create({
        data: {
          tenantId,
          companyId: company.id,
          name: dto.name.trim(),
          code: dto.code.trim(),
          address: dto.address.trim(),
          country:
            dto.country?.trim() || inferCountryFromAddress(dto.address),
          latitude: dto.latitude,
          longitude: dto.longitude,
          geofenceRadiusMeters: normalizeGeofenceRadius(
            dto.geofenceRadiusMeters,
          ),
          timezone: dto.timezone,
        },
      });

      if (dto.employeeIds?.length) {
        await this.assignEmployeesInTransaction(tx, {
          tenantId,
          actorUserId,
          companyId: company.id,
          locationId: created.id,
          employeeIds: dto.employeeIds,
          makePrimary: true,
          reason: 'Assigned while creating location',
        });
      }

      return created;
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'location',
      entityId: location.id,
      action: 'location.created',
      metadata: {
        companyId: company.id,
        locationId: location.id,
        locationName: location.name,
      },
    });
    this.kommoService.recordOrganizationUpdated(tenantId, 'location_created');
    return location;
  }

  async upsertSetup(tenantId: string, dto: UpsertOrgSetupDto) {
    const setup = await this.prisma.$transaction(async (tx) => {
      const nextAttendanceTrackingEnabled =
        typeof dto.attendanceTrackingEnabled === "boolean"
          ? dto.attendanceTrackingEnabled
          : undefined;
      const [existingCompanies, existingLocations] = await Promise.all([
        tx.company.findMany({
          where: { tenantId, archivedAt: null },
          orderBy: { createdAt: "desc" },
        }),
        tx.location.findMany({
          where: { tenantId, archivedAt: null },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      const tenant =
        nextAttendanceTrackingEnabled === undefined
          ? await tx.tenant.findUniqueOrThrow({
              where: { id: tenantId },
              select: TENANT_SETUP_SELECT,
            })
          : await tx.tenant.update({
              where: { id: tenantId },
              data: {
                attendanceTrackingEnabled: nextAttendanceTrackingEnabled,
              },
              select: TENANT_SETUP_SELECT,
            });

      const shouldCreateNew = existingCompanies.length === 0;

      const existingCompany = shouldCreateNew ? null : existingCompanies[0];
      const existingLocation = existingCompany
        ? (existingLocations.find(
            (location) => location.companyId === existingCompany.id,
          ) ?? null)
        : null;

      const company = existingCompany
        ? await tx.company.update({
            where: { id: existingCompany.id },
            data: {
              name: dto.companyName,
              logoUrl: dto.companyLogoUrl ?? null,
              googlePlaceId: dto.googlePlaceId ?? null,
            },
          })
        : await tx.company.create({
            data: {
              tenantId,
              name: dto.companyName,
              code: buildUniqueCode(
                existingCompanies.map((company) => company.code),
                dto.companyName,
                "COMPANY",
              ),
              logoUrl: dto.companyLogoUrl ?? null,
              googlePlaceId: dto.googlePlaceId ?? null,
            },
          });

      const locationCode = existingLocation?.code
        ? existingLocation.code
        : buildUniqueCode(
            existingLocations.map((location) => location.code),
            dto.companyName,
            "HQ",
          );

      const locationPayload = {
        companyId: company.id,
        name: dto.companyName,
        code: locationCode,
        address: dto.address,
        country: dto.country?.trim() || inferCountryFromAddress(dto.address),
        latitude: dto.latitude,
        longitude: dto.longitude,
        geofenceRadiusMeters: normalizeGeofenceRadius(dto.geofenceRadiusMeters),
        timezone: dto.timezone,
      };

      const location = existingLocation
        ? await tx.location.update({
            where: { id: existingLocation.id },
            data: locationPayload,
          })
        : await tx.location.create({
            data: {
              tenantId,
              ...locationPayload,
            },
          });

      if (tenant.attendanceTrackingEnabled === false) {
        await tx.employee.updateMany({
          where: { tenantId },
          data: { workMode: EmployeeWorkMode.FIELD },
        });
        await tx.employeeInvitation.updateMany({
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
          data: {
            workMode: EmployeeWorkMode.FIELD,
            approvedShiftTemplateId: null,
          },
        });

        const managerRole = await tx.role.upsert({
          where: { code: "manager" },
          update: {},
          create: {
            code: "manager",
            name: "Manager",
            description: "Can manage team attendance, approvals, and tasks",
          },
        });
        const employeeUsers = await tx.employee.findMany({
          where: { tenantId },
          select: { userId: true },
        });

        if (employeeUsers.length > 0) {
          await tx.userRole.createMany({
            data: employeeUsers.map((employee) => ({
              userId: employee.userId,
              roleId: managerRole.id,
              scopeType: "tenant",
              scopeId: tenantId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return {
        organizationId: tenant.businessId,
        configured: true,
        company,
        location,
        attendanceTrackingEnabled: tenant.attendanceTrackingEnabled,
        defaultGeofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
      };
    });

    this.kommoService.recordOrganizationUpdated(tenantId, 'setup_updated');
    return setup;
  }

  async createCompany(tenantId: string, dto: CreateCompanyDto) {
    const existingCodes = await this.prisma.company.findMany({
      where: { tenantId },
      select: { code: true },
    });
    const company = await this.prisma.company.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        code: buildUniqueCode(
          existingCodes.map(({ code }) => code),
          dto.name,
          'COMPANY',
        ),
        logoUrl: dto.logoUrl?.trim() || null,
        googlePlaceId: dto.googlePlaceId?.trim() || null,
      },
      select: COMPANY_SETUP_SELECT,
    });

    this.kommoService.recordOrganizationUpdated(tenantId, 'company_created');
    return company;
  }

  async updateSettings(tenantId: string, dto: UpdateOrgSettingsDto) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        attendanceTrackingEnabled: dto.attendanceTrackingEnabled,
      },
      select: TENANT_SETUP_SELECT,
    });

    if (!dto.attendanceTrackingEnabled) {
      await this.prisma.$transaction([
        this.prisma.employee.updateMany({
          where: { tenantId },
          data: { workMode: EmployeeWorkMode.FIELD },
        }),
        this.prisma.employeeInvitation.updateMany({
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
          data: {
            workMode: EmployeeWorkMode.FIELD,
            approvedShiftTemplateId: null,
          },
        }),
      ]);
    }

    return tenant;
  }

  async updateCompany(
    tenantId: string,
    actorUserId: string,
    companyId: string,
    dto: UpdateCompanyDto,
  ) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId, archivedAt: null },
      select: { id: true },
    });
    if (!company) {
      throw new NotFoundException('Organization not found.');
    }
    await this.assertCanManageCompany(tenantId, actorUserId, company.id);

    const updated = await this.prisma.company.update({
      where: { id: company.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.logoUrl !== undefined
          ? { logoUrl: dto.logoUrl?.trim() || null }
          : {}),
        ...(dto.googlePlaceId !== undefined
          ? { googlePlaceId: dto.googlePlaceId?.trim() || null }
          : {}),
      },
      select: COMPANY_SETUP_SELECT,
    });
    this.kommoService.recordOrganizationUpdated(tenantId, 'company_updated');
    return updated;
  }

  async archiveCompany(tenantId: string, companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId, archivedAt: null },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            employees: true,
            locations: { where: { archivedAt: null } },
          },
        },
      },
    });
    if (!company) {
      throw new NotFoundException('Organization not found.');
    }
    if (company._count.employees > 0) {
      throw new BadRequestException(
        'Move employees to another organization before archiving it.',
      );
    }

    const archivedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.location.updateMany({
        where: { tenantId, companyId, archivedAt: null },
        data: { archivedAt },
      }),
      this.prisma.company.update({
        where: { id: companyId },
        data: { archivedAt },
      }),
    ]);
    this.kommoService.recordOrganizationUpdated(tenantId, 'company_archived');
    return { archived: true, companyId, companyName: company.name };
  }

  async updateLocation(
    tenantId: string,
    actorUserId: string,
    locationId: string,
    dto: UpdateLocationDto,
  ) {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId, archivedAt: null },
      select: { id: true, companyId: true },
    });
    if (!location) {
      throw new NotFoundException('Location not found.');
    }
    await this.assertCanManageCompany(
      tenantId,
      actorUserId,
      location.companyId,
      location.id,
    );
    const updated = await this.prisma.location.update({
      where: { id: location.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() } : {}),
        ...(dto.country !== undefined
          ? { country: dto.country?.trim() || null }
          : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.geofenceRadiusMeters !== undefined
          ? {
              geofenceRadiusMeters: normalizeGeofenceRadius(
                dto.geofenceRadiusMeters,
              ),
            }
          : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
      },
      select: LOCATION_SETUP_SELECT,
    });

    this.kommoService.recordOrganizationUpdated(tenantId, 'location_updated');
    return updated;
  }

  async archiveLocation(tenantId: string, locationId: string) {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId, archivedAt: null },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            employees: true,
            employeeAssignments: { where: { unassignedAt: null } },
          },
        },
      },
    });
    if (!location) {
      throw new NotFoundException('Location not found.');
    }
    if (
      location._count.employees > 0 ||
      location._count.employeeAssignments > 0
    ) {
      throw new BadRequestException(
        'Move employees to another location before archiving it.',
      );
    }

    await this.prisma.location.update({
      where: { id: location.id },
      data: { archivedAt: new Date() },
    });
    this.kommoService.recordOrganizationUpdated(tenantId, 'location_archived');
    return { archived: true, locationId, locationName: location.name };
  }

  async assignEmployeesToLocation(
    tenantId: string,
    actorUserId: string,
    locationId: string,
    dto: AssignLocationEmployeesDto,
  ) {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId, archivedAt: null },
      select: { id: true, companyId: true, name: true },
    });
    if (!location) {
      throw new NotFoundException('Location not found.');
    }
    await this.assertCanManageCompany(
      tenantId,
      actorUserId,
      location.companyId,
      location.id,
    );
    await this.assertEmployeesReadable(
      tenantId,
      actorUserId,
      dto.employeeIds,
    );

    const employees = await this.prisma.$transaction((tx) =>
      this.assignEmployeesInTransaction(tx, {
        tenantId,
        actorUserId,
        companyId: location.companyId,
        locationId: location.id,
        employeeIds: dto.employeeIds,
        makePrimary: dto.makePrimary ?? true,
        reason: dto.reason,
      }),
    );

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'location',
      entityId: location.id,
      action: 'employee.location_assigned',
      metadata: {
        companyId: location.companyId,
        locationId: location.id,
        locationName: location.name,
        employeeIds: employees.map(({ id }) => id),
        makePrimary: dto.makePrimary ?? true,
      },
    });

    return {
      updated: employees.length,
      companyId: location.companyId,
      locationId: location.id,
    };
  }

  async deleteSetup(tenantId: string) {
    const company = await this.prisma.company.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            employees: true,
            locations: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException("Организация не найдена.");
    }

    if (company._count.employees > 0) {
      throw new BadRequestException(
        'Move employees before removing this organization.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.location.updateMany({
        where: { tenantId, companyId: company.id, archivedAt: null },
        data: { archivedAt: new Date() },
      }),
      this.prisma.company.update({
        where: { id: company.id },
        data: { archivedAt: new Date() },
      }),
    ]);

    this.kommoService.recordOrganizationUpdated(tenantId, 'setup_deleted');

    return {
      deleted: false,
      archived: true,
      companyId: company.id,
      companyName: company.name,
      deletedEmployeesCount: company._count.employees,
      deletedLocationsCount: company._count.locations,
    };
  }

  listDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  listCompanies(
    tenantId: string,
    includeArchived = false,
    actorUserId?: string,
  ) {
    return this.resolveReadableScope(tenantId, actorUserId).then((scope) =>
      this.prisma.company.findMany({
      where: {
        tenantId,
        ...(includeArchived ? {} : { archivedAt: null }),
        ...(scope
          ? {
              OR: [
                { id: { in: scope.companyIds } },
                {
                  locations: {
                    some: { id: { in: scope.locationIds } },
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        ...COMPANY_SETUP_SELECT,
        _count: {
          select: {
            employees: true,
            locations: { where: { archivedAt: null } },
          },
        },
      },
      orderBy: [{ archivedAt: 'asc' }, { createdAt: "desc" }],
      }),
    );
  }

  listPositions(tenantId: string) {
    return this.prisma.position.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }
}
