import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeInvitationDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
