import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmployeeInvitationDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @IsIn(['STATIONARY', 'FIELD'])
  workMode?: 'STATIONARY' | 'FIELD';

  @IsOptional()
  @IsString()
  @IsIn(['owner', 'team_leader', 'employee'])
  role?: 'owner' | 'team_leader' | 'employee';

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  positionTitle?: string;
}
