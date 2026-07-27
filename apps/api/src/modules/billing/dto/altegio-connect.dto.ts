import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AltegioConnectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  locationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  applicationId?: string;
}
