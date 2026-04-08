import { IsIn, IsOptional, IsString } from 'class-validator';
import type { DevicePlatform } from '@prisma/client';
import { DEVICE_PLATFORMS } from '../../../common/constants/prisma-enum-values';

export class RegisterDeviceDto {
  @IsIn(DEVICE_PLATFORMS)
  platform!: DevicePlatform;

  @IsString()
  deviceFingerprint!: string;

  @IsOptional()
  @IsString()
  deviceName?: string;
}
