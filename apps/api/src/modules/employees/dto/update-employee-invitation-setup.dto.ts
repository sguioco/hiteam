import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateEmployeeInvitationSetupDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  shiftTemplateId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['owner', 'team_leader', 'employee'])
  role?: 'owner' | 'team_leader' | 'employee';

  @IsOptional()
  @IsString()
  positionTitle?: string;

  @IsOptional()
  @IsString()
  @IsIn(['STATIONARY', 'FIELD'])
  workMode?: 'STATIONARY' | 'FIELD';
}
