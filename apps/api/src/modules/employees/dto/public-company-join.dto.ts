import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PublicCompanyCodeDto } from './public-company-code.dto';

export class PublicCompanyJoinDto extends PublicCompanyCodeDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsDateString()
  birthDate!: string;

  @IsOptional()
  @IsString()
  avatarDataUrl?: string;
}
