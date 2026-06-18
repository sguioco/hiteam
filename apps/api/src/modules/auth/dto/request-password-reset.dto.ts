import { IsEmail, IsOptional, IsString } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  tenantSlug?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
