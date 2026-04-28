import { IsEmail, IsOptional, IsString } from 'class-validator';

export class RegisterOrganizationDto {
  @IsString()
  organizationName!: string;

  @IsEmail()
  managerEmail!: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
