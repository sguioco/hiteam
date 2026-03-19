import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsEmail()
  managerEmail!: string;
}
