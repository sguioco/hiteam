import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateChatThreadDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}
