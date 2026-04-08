import { Type } from 'class-transformer';
import type { RequestType } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { REQUEST_TYPES } from '../../../common/constants/prisma-enum-values';

class CreateRequestAttachmentDto {
  @IsString()
  @MaxLength(180)
  fileName!: string;

  @IsString()
  dataUrl!: string;
}

export class CreateRequestDto {
  @IsIn(REQUEST_TYPES)
  requestType!: RequestType;

  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @IsDateString()
  startsOn!: string;

  @IsDateString()
  endsOn!: string;

  @IsOptional()
  @IsString()
  relatedRequestId?: string;

  @IsOptional()
  @IsDateString()
  previousStartsOn?: string;

  @IsOptional()
  @IsDateString()
  previousEndsOn?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => CreateRequestAttachmentDto)
  attachments?: CreateRequestAttachmentDto[];
}
