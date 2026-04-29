import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

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
}
