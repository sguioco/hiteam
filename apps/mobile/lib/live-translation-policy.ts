import type { AppLanguage } from './i18n';

function containsCyrillic(text: string) {
  return /[А-Яа-яЁё]/.test(text);
}

function containsLatin(text: string) {
  return /[A-Za-z]/.test(text);
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
