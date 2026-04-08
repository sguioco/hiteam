import { useSyncExternalStore } from 'react';
import { getCachedDemoSession, hasCachedDemoSession, resetDemoSession } from './api';
import type { AppLanguage } from './i18n';

export type AuthMethod = 'phone' | 'email';

export type CountryOption = {
  isoCode: string;
  dialCode: string;
  flag: string;
  names: {
    ru: string;
    en: string;
  };
};

type AuthFlowState = {
  authMethod: AuthMethod;
  countryIsoCode: string;
  isAuthenticated: boolean;
  roleCodes: string[];
  workspaceAccessAllowed: boolean;
};

const MANAGER_ROLE_CODES = ['tenant_owner', 'hr_admin', 'operations_admin', 'manager'] as const;

export const countryOptions: CountryOption[] = [
  {
    isoCode: 'RU',
    dialCode: '+7',
    flag: '🇷🇺',
    names: { ru: 'Россия', en: 'Russia' },
  },
  {
    isoCode: 'US',
    dialCode: '+1',
    flag: '🇺🇸',
    names: { ru: 'США', en: 'United States' },
  },
  {
    isoCode: 'AZ',
    dialCode: '+994',
    flag: '🇦🇿',
    names: { ru: 'Азербайджан', en: 'Azerbaijan' },
  },
  {
    isoCode: 'AM',
    dialCode: '+374',
    flag: '🇦🇲',
    names: { ru: 'Армения', en: 'Armenia' },
  },
  {
    isoCode: 'KZ',
    dialCode: '+7',
    flag: '🇰🇿',
    names: { ru: 'Казахстан', en: 'Kazakhstan' },
  },
  {
    isoCode: 'UZ',
    dialCode: '+998',
    flag: '🇺🇿',
    names: { ru: 'Узбекистан', en: 'Uzbekistan' },
  },
  {
    isoCode: 'UA',
    dialCode: '+380',
    flag: '🇺🇦',
    names: { ru: 'Украина', en: 'Ukraine' },
  },
  {
    isoCode: 'FR',
    dialCode: '+33',
    flag: '🇫🇷',
    names: { ru: 'Франция', en: 'France' },
  },
  {
    isoCode: 'GE',
    dialCode: '+995',
    flag: '🇬🇪',
    names: { ru: 'Грузия', en: 'Georgia' },
  },
  {
    isoCode: 'AE',
    dialCode: '+971',
    flag: '🇦🇪',
    names: { ru: 'ОАЭ', en: 'United Arab Emirates' },
  },
  {
    isoCode: 'IN',
    dialCode: '+91',
    flag: '🇮🇳',
    names: { ru: 'Индия', en: 'India' },
  },
  {
    isoCode: 'PK',
    dialCode: '+92',
    flag: '🇵🇰',
    names: { ru: 'Пакистан', en: 'Pakistan' },
  },
  {
    isoCode: 'BD',
    dialCode: '+880',
    flag: '🇧🇩',
    names: { ru: 'Бангладеш', en: 'Bangladesh' },
  },
  {
    isoCode: 'ID',
    dialCode: '+62',
    flag: '🇮🇩',
    names: { ru: 'Индонезия', en: 'Indonesia' },
  },
  {
    isoCode: 'MY',
    dialCode: '+60',
    flag: '🇲🇾',
    names: { ru: 'Малайзия', en: 'Malaysia' },
  },
  {
    isoCode: 'PH',
    dialCode: '+63',
    flag: '🇵🇭',
    names: { ru: 'Филиппины', en: 'Philippines' },
  },
  {
    isoCode: 'NP',
    dialCode: '+977',
    flag: '🇳🇵',
    names: { ru: 'Непал', en: 'Nepal' },
  },
  {
    isoCode: 'VN',
    dialCode: '+84',
    flag: '🇻🇳',
    names: { ru: 'Вьетнам', en: 'Vietnam' },
  },
];

const defaultCountryIsoCode = detectCountryIsoCode();

let state: AuthFlowState = {
  authMethod: 'phone',
  countryIsoCode: defaultCountryIsoCode,
  isAuthenticated: hasCachedDemoSession(),
  roleCodes: getCachedDemoSession()?.user.roleCodes ?? [],
  workspaceAccessAllowed: getCachedDemoSession()?.user.workspaceAccessAllowed ?? false,
};

const listeners = new Set<() => void>();

function detectCountryIsoCode() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const [, region] = locale.split('-');
    const normalizedRegion = region?.toUpperCase();

    if (normalizedRegion && countryOptions.some((country) => country.isoCode === normalizedRegion)) {
      return normalizedRegion;
    }

    if (locale.startsWith('en')) {
      return 'US';
    }
  } catch {
    return 'RU';
  }

  return 'RU';
}

export function getAuthFlowState() {
  return state;
}

export function updateAuthFlowState(patch: Partial<AuthFlowState>) {
  state = {
    ...state,
    ...patch,
  };

  listeners.forEach((listener) => listener());
}

export function useAuthFlowState() {
  return useSyncExternalStore(subscribe, getAuthFlowState, getAuthFlowState);
}

export function signInLocally() {
  updateAuthFlowState({
    isAuthenticated: true,
    roleCodes: getCachedDemoSession()?.user.roleCodes ?? [],
    workspaceAccessAllowed: getCachedDemoSession()?.user.workspaceAccessAllowed ?? false,
  });
}

export function signOutLocally() {
  resetDemoSession();
  updateAuthFlowState({ isAuthenticated: false, roleCodes: [], workspaceAccessAllowed: false });
}

export function hasManagerAccess(roleCodes: string[]) {
  return roleCodes.some((roleCode) => MANAGER_ROLE_CODES.includes(roleCode as (typeof MANAGER_ROLE_CODES)[number]));
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getCountryByIsoCode(isoCode: string) {
  return countryOptions.find((country) => country.isoCode === isoCode) ?? countryOptions[0];
}

function getIntlLocale(language: AppLanguage) {
  switch (language) {
    case 'ru':
      return 'ru-RU';
    case 'ar':
      return 'ar-AE';
    case 'hi':
      return 'hi-IN';
    case 'ur':
      return 'ur-PK';
    case 'bn':
      return 'bn-BD';
    case 'id':
      return 'id-ID';
    case 'ms':
      return 'ms-MY';
    case 'tl':
      return 'fil-PH';
    default:
      return 'en-US';
  }
}

export function getCountryDisplayName(country: CountryOption, language: AppLanguage) {
  try {
    const displayNames = new Intl.DisplayNames([getIntlLocale(language)], {
      type: 'region',
    });
    return (
      displayNames.of(country.isoCode) ??
      (language === 'ru' ? country.names.ru : country.names.en)
    );
  } catch {
    return language === 'ru' ? country.names.ru : country.names.en;
  }
}

export function searchCountryOptions(query: string, language: AppLanguage) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return countryOptions;
  }

  return countryOptions.filter((country) => {
    const localizedName = getCountryDisplayName(country, language).toLowerCase();
    const englishName = country.names.en.toLowerCase();
    return (
      localizedName.includes(normalizedQuery) ||
      englishName.includes(normalizedQuery) ||
      country.dialCode.includes(normalizedQuery) ||
      country.isoCode.toLowerCase().includes(normalizedQuery)
    );
  });
}
