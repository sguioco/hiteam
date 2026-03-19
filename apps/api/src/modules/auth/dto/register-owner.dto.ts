import { IsDateString, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterOwnerDto {
  @IsString()
  tenantName!: string;

  @IsString()
  tenantSlug!: string;

  @IsString()
  companyName!: string;

  @IsString()
  companyCode!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  employeeNumber!: string;

  @IsDateString()
  hireDate!: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
