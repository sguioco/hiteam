import { IsString, MinLength } from 'class-validator';

export class AddRequestCommentDto {
  @IsString()
  @MinLength(1)
  body!: string;
}
