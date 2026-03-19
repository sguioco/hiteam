import { IsOptional, IsString } from 'class-validator';

export class BiometricHistoryQueryDto {
  @IsOptional()
  @IsString()
  limit?: string;
}
