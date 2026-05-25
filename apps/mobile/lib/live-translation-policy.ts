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

export function shouldHideTranslatedSourceText(text: string, language: AppLanguage) {
  const normalized = text.trim();

  if (!normalized || language === 'ru') {
    return false;
  }

  if (containsCyrillic(normalized)) {
    return true;
  }

  if (language !== 'en' && containsLatin(normalized)) {
    return true;
  }

  return false;
}
