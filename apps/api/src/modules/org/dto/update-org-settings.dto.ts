import { IsBoolean } from 'class-validator';

export class UpdateOrgSettingsDto {
  @IsBoolean()
  attendanceTrackingEnabled!: boolean;
}
