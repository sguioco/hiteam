import { IsOptional, IsString } from 'class-validator';

export class ListEmployeesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
