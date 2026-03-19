import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
