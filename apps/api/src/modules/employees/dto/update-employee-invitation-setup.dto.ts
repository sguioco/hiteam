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
  @IsIn(['STATIONARY', 'FIELD'])
  workMode?: 'STATIONARY' | 'FIELD';
}
