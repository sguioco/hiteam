import type { RequestType } from '@prisma/client';
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { REQUEST_TYPES } from '../../../common/constants/prisma-enum-values';

export class CreateApprovalPolicyDto {
  @IsOptional()
  @IsIn(REQUEST_TYPES)
  requestType?: RequestType;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  approverEmployeeIds!: string[];
}
