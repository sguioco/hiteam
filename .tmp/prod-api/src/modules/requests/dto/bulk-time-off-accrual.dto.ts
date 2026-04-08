import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class BulkTimeOffAccrualDto {
  @IsIn(['VACATION', 'PERSONAL_DAY_OFF'])
  kind!: 'VACATION' | 'PERSONAL_DAY_OFF';

  @IsNumber()
  deltaDays!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];

  @IsOptional()
  @IsBoolean()
  applyToAll?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
