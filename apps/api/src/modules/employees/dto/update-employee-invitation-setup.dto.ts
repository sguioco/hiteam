import { IsOptional, IsString } from 'class-validator';

export class UpdateEmployeeInvitationSetupDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  shiftTemplateId!: string;

  @IsOptional()
  @IsString()
  groupId?: string;
}
