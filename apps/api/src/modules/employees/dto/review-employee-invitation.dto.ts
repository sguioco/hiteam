import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewEmployeeInvitationDto {
  @IsString()
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female'])
  gender?: 'male' | 'female';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatarDataUrl?: string;

  @IsOptional()
  @IsString()
  rejectedReason?: string;
}
