import { ArrayMaxSize, IsArray, IsIn, IsString } from 'class-validator';

const SUPPORTED_TRANSLATION_LOCALES = [
  'ru',
  'en',
  'es',
  'ar',
  'hi',
  'ur',
  'bn',
  'id',
  'ms',
  'tl',
] as const;

export type SupportedTranslationLocale =
  (typeof SUPPORTED_TRANSLATION_LOCALES)[number];

export class TranslateTextsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  texts!: string[];

  @IsString()
  @IsIn(SUPPORTED_TRANSLATION_LOCALES)
  targetLocale!: SupportedTranslationLocale;
}

export { SUPPORTED_TRANSLATION_LOCALES };
