import { Injectable, NotFoundException } from "@nestjs/common";
import { EmployeeInvitationStatus, EmployeeWorkMode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { KommoService } from "../kommo/kommo.service";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpsertOrgSetupDto } from "./dto/upsert-org-setup.dto";

const DEFAULT_GEOFENCE_RADIUS_METERS = 100;
const SEEDED_PLACEHOLDER_COMPANY_NAME = 'Beauty Life';
const SEEDED_PLACEHOLDER_ADDRESS = 'Demo address';

const COMPANY_SETUP_SELECT = {
  id: true,
  name: true,
  logoUrl: true,
  googlePlaceId: true,
  createdAt: true,
} as const;

const LOCATION_SETUP_SELECT = {
  id: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  geofenceRadiusMeters: true,
  timezone: true,
  createdAt: true,
} as const;

const TENANT_SETUP_SELECT = {
  attendanceTrackingEnabled: true,
} as const;

function normalizeGeofenceRadius(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_GEOFENCE_RADIUS_METERS;
  }

  return Math.max(DEFAULT_GEOFENCE_RADIUS_METERS, value);
}

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

  async getSetup(tenantId: string) {
    const [tenant, company] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: TENANT_SETUP_SELECT,
      }),
      this.prisma.company.findFirst({
        where: { tenantId },
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
          },
          select: LOCATION_SETUP_SELECT,
          orderBy: { createdAt: "desc" },
        })
      : null;

    if (this.isPlaceholderSetup({ company, location })) {
      return {
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
      configured,
      company,
      location,
      attendanceTrackingEnabled,
      defaultGeofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
    };
  }

  listLocations(tenantId: string) {
    return this.prisma.location.findMany({
      where: { tenantId },
      select: LOCATION_SETUP_SELECT,
      orderBy: { createdAt: "desc" },
    });
  }

  async createLocation(tenantId: string, dto: CreateLocationDto) {
    const location = await this.prisma.location.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        name: dto.name,
        code: dto.code,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        geofenceRadiusMeters: normalizeGeofenceRadius(dto.geofenceRadiusMeters),
        timezone: dto.timezone,
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
          where: { tenantId },
          orderBy: { createdAt: "desc" },
        }),
        tx.location.findMany({
          where: { tenantId },
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
          where: { tenantId, userId: { not: null } },
          select: { userId: true },
        });

        if (employeeUsers.length > 0) {
          await tx.userRole.createMany({
            data: employeeUsers.map((employee) => ({
              userId: employee.userId!,
              roleId: managerRole.id,
              scopeType: "tenant",
              scopeId: tenantId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return {
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

    await this.prisma.company.delete({
      where: { id: company.id },
    });

    this.kommoService.recordOrganizationUpdated(tenantId, 'setup_deleted');

    return {
      deleted: true,
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

  listCompanies(tenantId: string) {
    return this.prisma.company.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  listPositions(tenantId: string) {
    return this.prisma.position.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }
}
