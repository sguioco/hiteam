import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class BulkAssignEmployeesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employee_ids?: string[];

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  team_id?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['owner', 'team_leader', 'employee'])
  role?: 'owner' | 'team_leader' | 'employee';
}
