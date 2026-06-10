import { IsIn } from 'class-validator';

export class UpdatePreferredLocaleDto {
  @IsIn(['en', 'ru'])
  locale!: 'en' | 'ru';
}
