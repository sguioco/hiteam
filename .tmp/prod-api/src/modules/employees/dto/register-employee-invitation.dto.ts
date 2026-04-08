import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterEmployeeInvitationDto {
  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsDateString()
  birthDate!: string;

  @IsString()
  @IsIn(['male', 'female'])
  gender!: 'male' | 'female';

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  avatarDataUrl?: string;
}
