import { IsBoolean } from 'class-validator';

export class ToggleAnnouncementTemplateDto {
  @IsBoolean()
  isActive!: boolean;
}
