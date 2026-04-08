import { IsBoolean } from 'class-validator';

export class ToggleTaskTemplateDto {
  @IsBoolean()
  isActive!: boolean;
}
