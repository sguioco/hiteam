import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class AssignLocationEmployeesDto {
  @IsArray()
  @IsString({ each: true })
  employeeIds!: string[];

  @IsOptional()
  @IsBoolean()
  makePrimary?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
