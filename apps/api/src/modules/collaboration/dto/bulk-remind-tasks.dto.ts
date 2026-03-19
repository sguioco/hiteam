import { IsOptional, IsString } from 'class-validator';

export class BulkRemindTasksDto {
  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
