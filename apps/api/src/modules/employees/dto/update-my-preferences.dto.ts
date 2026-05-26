import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional } from 'class-validator';

export class UpdateMyPreferencesDto {
  @IsOptional()
  @IsIn(['blue', 'green', 'red', 'black'])
  bannerTheme?: 'blue' | 'green' | 'red' | 'black';

  @IsOptional()
  @IsBoolean()
  notificationAssignmentAlertsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  notificationTaskDeadlineRemindersEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([15, 30, 60])
  notificationTaskDeadlineReminderMinutes?: number;

  @IsOptional()
  @IsBoolean()
  notificationMeetingRemindersEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([15, 30, 60])
  notificationMeetingReminderMinutes?: number;

  @IsOptional()
  @IsBoolean()
  notificationShiftRemindersEnabled?: boolean;
}
