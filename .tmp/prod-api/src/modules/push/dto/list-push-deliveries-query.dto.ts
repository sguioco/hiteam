import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListPushDeliveriesQueryDto {
  @IsOptional()
  @IsIn(['QUEUED', 'PROCESSING', 'DELIVERED', 'FAILED'])
  status?: 'QUEUED' | 'PROCESSING' | 'DELIVERED' | 'FAILED';

  @IsOptional()
  @IsIn(['PENDING', 'OK', 'ERROR'])
  receiptStatus?: 'PENDING' | 'OK' | 'ERROR';

  @IsOptional()
  @IsString()
  search?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
