import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTaskPhotoProofDto {
  @IsIn(['add', 'replace'])
  action!: 'add' | 'replace';

  @IsString()
  @MaxLength(180)
  fileName!: string;

  @IsString()
  dataUrl!: string;

  @IsOptional()
  @IsString()
  targetProofId?: string;
}
