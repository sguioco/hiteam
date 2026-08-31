import type { AppLanguage } from './i18n';

export function containsCyrillic(text: string) {
  return /[А-Яа-яЁё]/.test(text);
}

export function containsLatin(text: string) {
  return /[A-Za-z]/.test(text);
}

export function shouldRequestLiveTextTranslation(
  text: string,
  language: AppLanguage,
) {
  const normalized = text.trim();

  if (!normalized) {
    return false;
  }

  const hasCyrillic = containsCyrillic(normalized);
  const hasLatin = containsLatin(normalized);

  if (language === 'ru') {
    return hasLatin && !hasCyrillic;
  }

  if (language === 'en') {
    return hasCyrillic;
  }

  return hasCyrillic || hasLatin;
}

export function shouldHideTranslatedSourceText(
  _text: string,
  _language: AppLanguage,
) {
  // Keep the last available source visible while an optional live translation
  // is prepared. Blank content causes visible flashes across task/news screens.
  return false;
}
