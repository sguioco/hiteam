import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateEmployeeAccessDto {
  @IsOptional()
  @IsString()
  @IsIn(['owner', 'team_leader', 'employee'])
  role?: 'owner' | 'team_leader' | 'employee';

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  team_id?: string;

  @IsOptional()
  @IsString()
  groupId?: string;
}
