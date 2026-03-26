import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpsertOrgSetupDto } from "./dto/upsert-org-setup.dto";

const DEFAULT_GEOFENCE_RADIUS_METERS = 100;
const SEEDED_PLACEHOLDER_COMPANY_NAME = 'Beauty Life';
const SEEDED_PLACEHOLDER_ADDRESS = 'Demo address';

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

function buildUniqueCompanyCode(
  existingCodes: string[],
  value: string,
  fallback: string,
): string {
  const baseCode = buildInternalCode(value, fallback).slice(0, 21);

  let nextCode = "";
  do {
    const suffix = String(Math.floor(Math.random() * 900) + 100);
    nextCode = `${baseCode}${suffix}`;
  } while (existingCodes.includes(nextCode));

  return nextCode;
}

function isLegacyGeneratedCompanyCode(code: string, value: string, fallback: string) {
  return code === buildInternalCode(value, fallback);
}

@Injectable()
export class OrgService {
  constructor(private readonly prisma: PrismaService) {}

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
    const company = await this.prisma.company.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    const location = company
      ? await this.prisma.location.findFirst({
          where: {
            tenantId,
            companyId: company.id,
          },
          orderBy: { createdAt: "desc" },
        })
      : null;

    if (this.isPlaceholderSetup({ company, location })) {
      return {
        configured: false,
        company: null,
        location: null,
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
      defaultGeofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
    };
  }

  listLocations(tenantId: string) {
    return this.prisma.location.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  createLocation(tenantId: string, dto: CreateLocationDto) {
    return this.prisma.location.create({
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
  }

  async upsertSetup(tenantId: string, dto: UpsertOrgSetupDto) {
    return this.prisma.$transaction(async (tx) => {
      const [existingCompanies, existingLocations, globalCompanies] = await Promise.all([
        tx.company.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
        }),
        tx.location.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
        }),
        tx.company.findMany({
          select: { id: true, code: true },
        }),
      ]);

      const shouldCreateNew = existingCompanies.length === 0;

      const existingCompany = shouldCreateNew ? null : existingCompanies[0];
      const existingLocation = existingCompany
        ? (existingLocations.find(
            (location) => location.companyId === existingCompany.id,
          ) ?? null)
        : null;

      const shouldRefreshLegacyCompanyCode = Boolean(
        existingCompany?.code &&
          !/\d{3}$/.test(existingCompany.code) &&
          (isLegacyGeneratedCompanyCode(existingCompany.code, existingCompany.name, "ORG") ||
            isLegacyGeneratedCompanyCode(existingCompany.code, dto.companyName, "ORG")),
      );

      const companyCode =
        existingCompany?.code && !shouldRefreshLegacyCompanyCode
          ? existingCompany.code
          : buildUniqueCompanyCode(
              globalCompanies
                .filter((company) => company.id !== existingCompany?.id)
                .map((company) => company.code),
              dto.companyName,
              "ORG",
            );

      const company = existingCompany
        ? await tx.company.update({
            where: { id: existingCompany.id },
            data: {
              code: companyCode,
              name: dto.companyName,
              logoUrl: dto.companyLogoUrl ?? null,
              googlePlaceId: dto.googlePlaceId ?? null,
            },
          })
        : await tx.company.create({
            data: {
              tenantId,
              name: dto.companyName,
              code: companyCode,
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

      return {
        configured: true,
        company,
        location,
        defaultGeofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
      };
    });
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
