import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class BulkJobActionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];
}
