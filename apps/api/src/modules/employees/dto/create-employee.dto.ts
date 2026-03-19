import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeDto {
  @IsEmail()
  email!: string;

  @IsString()
  temporaryPassword!: string;

  @IsString()
  employeeNumber!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  companyId!: string;

  @IsString()
  departmentId!: string;

  @IsString()
  primaryLocationId!: string;

  @IsString()
  positionId!: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsDateString()
  hireDate!: string;
}
