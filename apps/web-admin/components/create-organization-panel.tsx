'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/api';
import { AuthSession, persistSession, resolvePostLoginRoute, saveTenantSlug } from '@/lib/auth';
import {
  readBrowserStorageItem,
  removeBrowserStorageItem,
  writeBrowserStorageItem,
} from '@/lib/browser-storage';
import { BrandWordmark } from './brand-wordmark';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Swirling } from './ui/swirling';

type SupportedLang = 'en' | 'ru' | 'ar';
type RegisterOwnerResponse = {
  tenantId: string;
  tenantSlug: string;
  userId: string;
};

const langs: { code: SupportedLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
];

const texts = {
  en: {
    title: 'Create organization',
    organizationName: 'Organization name',
    timezone: 'Timezone',
    firstName: 'Your first name',
    lastName: 'Your last name',
    email: 'Your email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submit: 'Create organization',
    creating: 'Creating...',
    passwordMismatch: 'Passwords do not match.',
    passwordMinLength: 'Password must be at least 8 characters.',
    error: 'Unable to create organization.',
    signIn: 'Back to sign in',
  },
  ru: {
    title: 'Создать организацию',
    organizationName: 'Название организации',
    timezone: 'Часовой пояс',
    firstName: 'Ваше имя',
    lastName: 'Ваша фамилия',
    email: 'Ваш email',
    password: 'Пароль',
    confirmPassword: 'Подтвердите пароль',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    submit: 'Создать организацию',
    creating: 'Создаём...',
    passwordMismatch: 'Пароли не совпадают.',
    passwordMinLength: 'Пароль должен быть не короче 8 символов.',
    error: 'Не удалось создать организацию.',
    signIn: 'Вернуться ко входу',
  },
  ar: {
    title: 'إنشاء مؤسسة',
    organizationName: 'اسم المؤسسة',
    timezone: 'المنطقة الزمنية',
    firstName: 'اسمك الأول',
    lastName: 'اسم عائلتك',
    email: 'بريدك الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    submit: 'إنشاء المؤسسة',
    creating: 'جارٍ الإنشاء...',
    passwordMismatch: 'كلمتا المرور غير متطابقتين.',
    passwordMinLength: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.',
    error: 'تعذّر إنشاء المؤسسة.',
    signIn: 'العودة إلى تسجيل الدخول',
  },
};

const PREFERRED_TIME_ZONES = [
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Tashkent',
  'Asia/Almaty',
  'Asia/Bangkok',
  'Asia/Novosibirsk',
  'Asia/Tokyo',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
];

const TIME_ZONE_LABEL_OVERRIDES: Record<string, string> = {
  'Asia/Bangkok': 'Bangkok, Thailand',
};

const TIME_ZONE_OFFSET_LABEL_OVERRIDES: Record<string, string> = {
  'UTC+07:00': 'Bangkok, Thailand',
};

function getTimeZoneOffsetLabel(timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(new Date());
    const zoneName = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+0';
    const normalized = zoneName.replace('GMT', 'UTC');
    if (normalized === 'UTC') return 'UTC+00:00';
    const match = normalized.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!match) return normalized;
    const [, sign, hours, minutes] = match;
    return `UTC${sign}${hours.padStart(2, '0')}:${(minutes ?? '00').padStart(2, '0')}`;
  } catch {
    return 'UTC+00:00';
  }
}

function parseOffsetToMinutes(offsetLabel: string) {
  const match = offsetLabel.match(/^UTC([+-])(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const [, sign, hours, minutes] = match;
  const total = Number(hours) * 60 + Number(minutes);
  return sign === '-' ? -total : total;
}

function buildTimeZoneOptions(selectedTimeZone?: string) {
  const source = (() => {
    try {
      if (typeof Intl.supportedValuesOf === 'function') {
        const values = Intl.supportedValuesOf('timeZone');
        if (values.length) return values;
      }
    } catch {}
    return PREFERRED_TIME_ZONES;
  })();

  const uniqueByOffset = new Map<string, string>();
  for (const timeZone of [selectedTimeZone, ...PREFERRED_TIME_ZONES, ...source]) {
    if (!timeZone) continue;
    const offset = getTimeZoneOffsetLabel(timeZone);
    if (!uniqueByOffset.has(offset)) uniqueByOffset.set(offset, timeZone);
  }

  return Array.from(uniqueByOffset.entries())
    .sort(([leftOffset], [rightOffset]) => parseOffsetToMinutes(leftOffset) - parseOffsetToMinutes(rightOffset))
    .map(([offset, timeZone]) => ({
      label: `${offset} · ${TIME_ZONE_OFFSET_LABEL_OVERRIDES[offset] ?? TIME_ZONE_LABEL_OVERRIDES[timeZone] ?? timeZone}`,
      timeZone,
    }));
}

function getLocalDateInputValue() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function LanguagePicker({
  lang,
  setLang,
}: {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
}) {
  const current = langs.find((item) => item.code === lang)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-1.5 text-muted-foreground" size="sm" variant="ghost">
          <Globe className="h-4 w-4" />
          <span className="text-sm">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {langs.map((item) => (
          <DropdownMenuItem
            className={cn(item.code === lang && 'font-semibold')}
            key={item.code}
            onClick={() => setLang(item.code)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CreateOrganizationPanel() {
  const [lang, setLang] = useState<SupportedLang>('en');
  const [organizationName, setOrganizationName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const t = texts[lang];
  const timeZoneOptions = useMemo(() => buildTimeZoneOptions(timezone), [timezone]);

  useEffect(() => {
    const saved = readBrowserStorageItem('smart-admin-locale');
    if (saved === 'ru' || saved === 'ar') {
      setLang(saved);
    }

    setTimezone(getBrowserTimezone());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;

    if (lang === 'en') {
      removeBrowserStorageItem('smart-admin-locale');
      return;
    }

    writeBrowserStorageItem('smart-admin-locale', lang);
  }, [lang]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    setError('');

    if (password.length < 8) {
      setError(t.passwordMinLength);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setLoading(true);
    let navigationStarted = false;

    try {
      const registration = await apiRequest<RegisterOwnerResponse>('/auth/register-owner', {
        method: 'POST',
        realBackend: true,
        body: JSON.stringify({
          tenantName: organizationName.trim(),
          companyName: organizationName.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          password,
          employeeNumber: 'OWNER-0001',
          hireDate: getLocalDateInputValue(),
          timezone: timezone.trim() || 'UTC',
        }),
      });

      const session = await apiRequest<AuthSession>('/auth/login', {
        method: 'POST',
        realBackend: true,
        body: JSON.stringify({
          identifier: normalizedEmail,
          password,
          tenantSlug: registration.tenantSlug,
        }),
      });

      saveTenantSlug(registration.tenantSlug);
      const nextRoute = resolvePostLoginRoute(session);
      await persistSession(session);
      navigationStarted = true;
      window.location.replace(nextRoute);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.error);
    } finally {
      if (!navigationStarted) {
        setLoading(false);
      }
    }
  }

  return (
    <div className="flex w-full max-w-6xl flex-col gap-8">
      <div className="relative overflow-hidden rounded-[34px] border border-white/60 bg-[linear-gradient(180deg,#eff5ff_0%,#dfe9ff_100%)] shadow-[0_30px_90px_rgba(79,109,245,0.12)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.16),transparent_24%),radial-gradient(circle_at_82%_20%,rgba(99,102,241,0.12),transparent_30%),radial-gradient(circle_at_50%_82%,rgba(96,165,250,0.14),transparent_34%)]" />
        <div className="relative z-10 grid min-h-[640px] lg:grid-cols-[minmax(0,470px)_minmax(0,1fr)]">
          <div className="flex items-center justify-center px-6 py-8 md:px-10 lg:px-12">
            <div className="flex w-full max-w-sm flex-col">
              <div className="mb-5 flex justify-center">
                <BrandWordmark className="text-[2.25rem] md:text-[2.6rem]" />
              </div>

              <div className="mb-7 text-center">
                <h1 className="text-[2rem] font-light tracking-normal text-foreground">
                  {t.title}
                </h1>
              </div>

              <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
                {error ? (
                  <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <Input
                  aria-label={t.organizationName}
                  autoComplete="organization"
                  disabled={loading}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  placeholder={t.organizationName}
                  required
                  value={organizationName}
                />

                <Select disabled={loading} onValueChange={setTimezone} value={timezone}>
                  <SelectTrigger
                    aria-label={t.timezone}
                    className="org-timezone-trigger organization-studio-timezone-trigger rounded-xl border-[color:var(--border)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]"
                  >
                    <SelectValue placeholder={t.timezone} />
                  </SelectTrigger>
                  <SelectContent>
                    {timeZoneOptions.map((option) => (
                      <SelectItem key={option.timeZone} value={option.timeZone}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    aria-label={t.firstName}
                    autoComplete="given-name"
                    disabled={loading}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder={t.firstName}
                    required
                    value={firstName}
                  />
                  <Input
                    aria-label={t.lastName}
                    autoComplete="family-name"
                    disabled={loading}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder={t.lastName}
                    required
                    value={lastName}
                  />
                </div>

                <Input
                  aria-label={t.email}
                  autoComplete="email"
                  disabled={loading}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t.email}
                  required
                  type="email"
                  value={email}
                />

                <div className="relative">
                  <Input
                    aria-label={t.password}
                    autoComplete="new-password"
                    className="pr-11"
                    disabled={loading}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t.password}
                    required
                    type={passwordVisible ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    aria-label={passwordVisible ? t.hidePassword : t.showPassword}
                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    disabled={loading}
                    onClick={() => setPasswordVisible((current) => !current)}
                    type="button"
                  >
                    {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    aria-label={t.confirmPassword}
                    autoComplete="new-password"
                    className="pr-11"
                    disabled={loading}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={t.confirmPassword}
                    required
                    type={confirmPasswordVisible ? 'text' : 'password'}
                    value={confirmPassword}
                  />
                  <button
                    aria-label={confirmPasswordVisible ? t.hidePassword : t.showPassword}
                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    disabled={loading}
                    onClick={() => setConfirmPasswordVisible((current) => !current)}
                    type="button"
                  >
                    {confirmPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <Button
                  className="mt-2 h-12 w-full rounded-[16px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? <Swirling className="mr-2 h-4 w-4" /> : null}
                  {loading ? t.creating : t.submit}
                </Button>

                <Link
                  className="pt-1 text-center text-sm font-medium text-[#4f6df5] transition-colors hover:text-[#3553db]"
                  href="/login"
                >
                  {t.signIn}
                </Link>
              </form>
            </div>
          </div>

          <div className="relative hidden overflow-hidden border-l border-white/60 bg-white p-10 lg:flex lg:items-center lg:justify-center">
            <div className="flex w-full max-w-[520px] items-center justify-center">
              <img
                alt={lang === 'ru' ? 'Иллюстрация HiTeam' : 'HiTeam illustration'}
                className="block h-auto w-full max-w-[520px] origin-center object-contain transform-gpu"
                decoding="sync"
                fetchPriority="high"
                height={880}
                loading="eager"
                src="/illustration.svg?v=20260409"
                style={{ transform: 'scale(1.3)' }}
                width={880}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <LanguagePicker lang={lang} setLang={setLang} />
      </div>
    </div>
  );
}
