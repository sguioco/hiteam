import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Device, DevicePlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { AuditService } from '../audit/audit.service';

const MAX_DEVICES_PER_PLATFORM = 5;

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async register(employeeId: string, dto: RegisterDeviceDto): Promise<Device> {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { id: employeeId } });

    const existing = await this.prisma.device.findUnique({
      where: {
        employeeId_deviceFingerprint: {
          employeeId,
          deviceFingerprint: dto.deviceFingerprint,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.device.update({
        where: { id: existing.id },
        data: {
          deviceName: dto.deviceName,
          platform: dto.platform,
        },
      });

      await this.auditService.log({
        tenantId: employee.tenantId,
        actorUserId: employee.userId,
        entityType: 'device',
        entityId: updated.id,
        action: 'device.updated',
        metadata: { fingerprint: dto.deviceFingerprint, platform: dto.platform },
      });

      return updated;
    }

    const existingDevices = await this.prisma.device.findMany({
      where: { employeeId },
    });

    const existingMobileDevices = existingDevices.filter((device) => device.platform !== DevicePlatform.WEB);
    const existingWebDevices = existingDevices.filter((device) => device.platform === DevicePlatform.WEB);

    if (dto.platform === DevicePlatform.WEB && existingWebDevices.length >= MAX_DEVICES_PER_PLATFORM) {
      throw new ConflictException(`Maximum of ${MAX_DEVICES_PER_PLATFORM} web or desktop devices is allowed for this employee.`);
    }

    if (dto.platform !== DevicePlatform.WEB && existingMobileDevices.length >= MAX_DEVICES_PER_PLATFORM) {
      throw new ConflictException(`Maximum of ${MAX_DEVICES_PER_PLATFORM} mobile devices is allowed for this employee.`);
    }

    if (dto.platform !== DevicePlatform.WEB) {
      await this.prisma.device.updateMany({
        where: {
          employeeId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const created = await this.prisma.device.create({
      data: {
        employeeId,
        platform: dto.platform,
        deviceFingerprint: dto.deviceFingerprint,
        deviceName: dto.deviceName,
        isPrimary: dto.platform !== DevicePlatform.WEB,
      },
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: employee.userId,
      entityType: 'device',
      entityId: created.id,
      action: 'device.registered',
      metadata: { fingerprint: dto.deviceFingerprint, platform: dto.platform, isPrimary: created.isPrimary },
    });

    return created;
  }

  async listForEmployee(employeeId: string): Promise<Device[]> {
    return this.prisma.device.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async detachForEmployee(tenantId: string, actorUserId: string, employeeId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: {
        id: deviceId,
        employeeId,
        employee: {
          tenantId,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found for this employee.');
    }

    let replacementPrimaryDeviceId: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      await tx.device.delete({
        where: { id: device.id },
      });

      if (!device.isPrimary) {
        return;
      }

      const replacement =
        (await tx.device.findFirst({
          where: {
            employeeId,
            platform: {
              not: DevicePlatform.WEB,
            },
          },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        })) ??
        (await tx.device.findFirst({
          where: { employeeId },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        }));

      if (!replacement) {
        return;
      }

      await tx.device.update({
        where: { id: replacement.id },
        data: {
          isPrimary: true,
        },
      });

      replacementPrimaryDeviceId = replacement.id;
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'device',
      entityId: device.id,
      action: 'device.removed',
      metadata: {
        employeeId,
        deviceName: device.deviceName,
        platform: device.platform,
        wasPrimary: device.isPrimary,
        replacementPrimaryDeviceId,
      },
    });

    return {
      success: true,
      removedDeviceId: device.id,
      replacementPrimaryDeviceId,
    };
  }

  async resolveActiveDevice(employeeId: string, fingerprint: string): Promise<Device | null> {
    return this.prisma.device.findUnique({
      where: {
        employeeId_deviceFingerprint: {
          employeeId,
          deviceFingerprint: fingerprint,
        },
      },
    });
  }
}
