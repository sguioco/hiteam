import { IsArray, IsString } from 'class-validator';

export class SetGroupMembersDto {
  @IsArray()
  @IsString({ each: true })
  employeeIds!: string[];
}
