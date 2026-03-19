import { ConflictException, Injectable } from '@nestjs/common';
import { Device, DevicePlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { AuditService } from '../audit/audit.service';

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

    if (dto.platform === DevicePlatform.WEB && existingWebDevices.length >= 2) {
      throw new ConflictException('Maximum of 2 web or desktop devices is allowed for this employee.');
    }

    if (dto.platform !== DevicePlatform.WEB && existingMobileDevices.length >= 1) {
      throw new ConflictException('A mobile device is already registered for this employee.');
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
