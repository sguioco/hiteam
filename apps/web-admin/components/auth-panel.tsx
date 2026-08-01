'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Building2, Eye, EyeOff, Globe } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Swirling } from '@/components/ui/swirling';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest } from '@/lib/api';
import {
  readBrowserStorageItem,
  writeBrowserStorageItem,
} from '@/lib/browser-storage';
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
  disableDemoMode,
  getDemoRoleByCredentials,
  isDemoModeAvailable,
} from '@/lib/demo-mode';
import {
  AuthSession,
  clearSession,
  getExplicitTenantSlug,
  getTenantSlug,
  persistSession,
  resolvePostLoginRoute,
  saveTenantSlug,
} from '@/lib/auth';
import {
  type AltegioOnboardingPreview,
  captureAltegioMarketplaceParams,
  resolvePostLoginRouteWithAltegio,
  saveAltegioOnboardingPreview,
} from '@/lib/altegio-marketplace';
import { BrandWordmark } from './brand-wordmark';

gsap.registerPlugin(useGSAP);

type SupportedLang = 'en' | 'ru' | 'ar';
type AuthTab = 'signin' | 'join';
type RegistrationMode = 'create' | 'join';
type CompanyLookupResult = {
  token: string;
  email: string;
  status: string;
  registrationCompleted: boolean;
  companyName: string;
  tenantName: string;
  tenantSlug: string;
};
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

function toBackendLocale(lang: SupportedLang): 'en' | 'ru' {
  return lang === 'ru' ? 'ru' : 'en';
}

const texts = {
  en: {
    signInTab: 'Sign in',
    joinTab: 'Registration',
    welcome: 'Welcome back',
    welcomeDesc: 'Enter your work email or phone to access your HiTeam workspace.',
    emailOrPhone: 'Email or phone',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    signIn: 'Sign in',
    signingIn: 'Signing in...',
    joinTitle: 'Join with work email',
    joinDesc: 'Ask your manager to add your work email to the team, then enter the same email here to continue registration.',
    joinLabel: 'Work email',
    joinPlaceholder: 'Enter your email',
    joinAction: 'Continue',
    joinChecking: 'Checking email...',
    joinRequired: 'Enter your work email.',
    companyFoundLabel: 'Employee found',
    companyFoundBody: 'We found {companyName}. Continue registration and create your password.',
    companyFoundExistingBody: 'An account for {email} already exists in {companyName}. Open sign-in and continue there.',
    continueInMobile: 'Continue registration',
    existingAccountAction: 'Open sign in',
    alreadyHaveAccount: 'I already have an account',
    useAnotherCode: 'Use another email',
    selectedWorkspace: 'Selected workspace',
    forgotPassword: 'Forgot password?',
    forgotTitle: 'Reset password',
    forgotDesc: 'Enter your work email and we will send password reset instructions.',
    forgotEmail: 'Work email',
    forgotPlaceholder: 'Enter your email',
    forgotRequired: 'Enter your work email.',
    forgotSend: 'Send instructions',
    forgotSending: 'Preparing...',
    forgotSuccess: 'If an account with this email exists, reset instructions have been sent.',
    close: 'Close',
    demoTitle: 'Quick access',
    demoAdmin: 'Demo admin',
    demoHint: 'Current demo flow without backend',
    createOrganizationLink: 'Create new organization',
    joinExistingTeamLink: 'Join existing team',
    createOrganizationTitle: 'Create organization',
    organizationName: 'Organization name',
    timezone: 'Timezone',
    ownerFirstName: 'Your first name',
    ownerLastName: 'Your last name',
    ownerEmail: 'Enter your email',
    promoCode: 'Promo code (optional)',
    ownerPassword: 'Password',
    ownerConfirmPassword: 'Confirm password',
    createOrganizationAction: 'Create organization',
    creatingOrganization: 'Creating...',
    createOrganizationError: 'Unable to create organization.',
    passwordMismatch: 'Passwords do not match.',
    passwordMinLength: 'Password must be at least 8 characters.',
  },
  ru: {
    signInTab: 'Вход',
    joinTab: 'Регистрация',
    welcome: 'С возвращением',
    welcomeDesc: 'Введите рабочий email или телефон, чтобы войти в пространство HiTeam.',
    emailOrPhone: 'Email или телефон',
    password: 'Пароль',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    signIn: 'Войти',
    signingIn: 'Входим...',
    joinTitle: 'Вступить по рабочему email',
    joinDesc: 'Попросите менеджера добавить ваш рабочий email в команду, затем введите этот email здесь и продолжите регистрацию.',
    joinLabel: 'Рабочий email',
    joinPlaceholder: 'Введите email',
    joinAction: 'Продолжить',
    joinChecking: 'Проверяем email...',
    joinRequired: 'Введите рабочий email.',
    companyFoundLabel: 'Сотрудник найден',
    companyFoundBody: 'Мы нашли {companyName}. Продолжите регистрацию и создайте пароль.',
    companyFoundExistingBody: 'Для {email} аккаунт в {companyName} уже создан. Откройте вход и продолжайте там.',
    continueInMobile: 'Продолжить регистрацию',
    existingAccountAction: 'Открыть вход',
    alreadyHaveAccount: 'У меня уже есть аккаунт',
    useAnotherCode: 'Ввести другой email',
    selectedWorkspace: 'Выбранное пространство',
    forgotPassword: 'Забыли пароль?',
    forgotTitle: 'Восстановление пароля',
    forgotDesc: 'Введите рабочий email, и мы отправим инструкцию для восстановления пароля.',
    forgotEmail: 'Рабочий email',
    forgotPlaceholder: 'Введите email',
    forgotRequired: 'Введите рабочий email.',
    forgotSend: 'Отправить инструкцию',
    forgotSending: 'Готовим...',
    forgotSuccess: 'Если аккаунт с таким email существует, инструкция по восстановлению отправлена.',
    close: 'Закрыть',
    demoTitle: 'Быстрый доступ',
    demoAdmin: 'Демо админ',
    demoHint: 'Текущий demo flow без backend',
    createOrganizationLink: 'Создать новую организацию',
    joinExistingTeamLink: 'Вступить в существующую команду',
    createOrganizationTitle: 'Создать организацию',
    organizationName: 'Название организации',
    timezone: 'Часовой пояс',
    ownerFirstName: 'Ваше имя',
    ownerLastName: 'Ваша фамилия',
    ownerEmail: 'Введите email',
    promoCode: 'Промокод (необязательно)',
    ownerPassword: 'Пароль',
    ownerConfirmPassword: 'Подтвердите пароль',
    createOrganizationAction: 'Создать организацию',
    creatingOrganization: 'Создаём...',
    createOrganizationError: 'Не удалось создать организацию.',
    passwordMismatch: 'Пароли не совпадают.',
    passwordMinLength: 'Пароль должен быть не короче 8 символов.',
  },
  ar: {
    signInTab: 'تسجيل الدخول',
    joinTab: 'التسجيل',
    welcome: 'مرحباً بعودتك',
    welcomeDesc: 'أدخل بريد العمل أو رقم الهاتف للوصول إلى مساحة HiTeam.',
    emailOrPhone: 'البريد الإلكتروني أو الهاتف',
    password: 'كلمة المرور',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    signIn: 'تسجيل الدخول',
    signingIn: 'جارٍ تسجيل الدخول...',
    joinTitle: 'الانضمام عبر بريد العمل',
    joinDesc: 'اطلب من المدير إضافة بريدك المهني إلى الفريق، ثم أدخل البريد نفسه هنا لمتابعة التسجيل.',
    joinLabel: 'بريد العمل',
    joinPlaceholder: 'أدخل بريدك الإلكتروني',
    joinAction: 'متابعة',
    joinChecking: 'جارٍ التحقق من البريد...',
    joinRequired: 'أدخل بريد العمل.',
    companyFoundLabel: 'تم العثور على الموظف',
    companyFoundBody: 'تم العثور على {companyName}. تابع التسجيل وأنشئ كلمة المرور.',
    companyFoundExistingBody: 'يوجد حساب بالفعل للبريد {email} في {companyName}. افتح شاشة تسجيل الدخول وتابع هناك.',
    continueInMobile: 'متابعة التسجيل',
    existingAccountAction: 'فتح تسجيل الدخول',
    alreadyHaveAccount: 'لدي حساب بالفعل',
    useAnotherCode: 'استخدام بريد آخر',
    selectedWorkspace: 'مساحة العمل المحددة',
    forgotPassword: 'هل نسيت كلمة المرور؟',
    forgotTitle: 'استعادة كلمة المرور',
    forgotDesc: 'أدخل بريد العمل وسنرسل تعليمات إعادة تعيين كلمة المرور.',
    forgotEmail: 'بريد العمل',
    forgotPlaceholder: 'أدخل بريدك الإلكتروني',
    forgotRequired: 'أدخل بريد العمل.',
    forgotSend: 'إرسال التعليمات',
    forgotSending: 'جارٍ التحضير...',
    forgotSuccess: 'إذا كان هذا البريد مرتبطاً بحساب، فقد تم إرسال تعليمات الاستعادة إليه.',
    close: 'إغلاق',
    demoTitle: 'وصول سريع',
    demoAdmin: 'مشرف تجريبي',
    demoHint: 'مسار تجريبي حالي بدون backend',
    createOrganizationLink: 'إنشاء مؤسسة جديدة',
    joinExistingTeamLink: 'الانضمام إلى فريق موجود',
    createOrganizationTitle: 'إنشاء مؤسسة',
    organizationName: 'اسم المؤسسة',
    timezone: 'المنطقة الزمنية',
    ownerFirstName: 'اسمك الأول',
    ownerLastName: 'اسم عائلتك',
    ownerEmail: 'أدخل بريدك الإلكتروني',
    promoCode: 'رمز ترويجي (اختياري)',
    ownerPassword: 'كلمة المرور',
    ownerConfirmPassword: 'تأكيد كلمة المرور',
    createOrganizationAction: 'إنشاء المؤسسة',
    creatingOrganization: 'جارٍ الإنشاء...',
    createOrganizationError: 'تعذّر إنشاء المؤسسة.',
    passwordMismatch: 'كلمتا المرور غير متطابقتين.',
    passwordMinLength: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.',
  },
};

const AUTH_HEADER_GROUP_OFFSET_Y = 20;
const AUTH_BRAND_OFFSET_Y = -18;
const AUTH_SWITCHER_OFFSET_Y = -8;
const AUTH_CONTENT_TOP_GAP = 26;
const AUTH_CONTENT_MIN_HEIGHT = 430;
const AUTH_TITLE_BLOCK_OFFSET_Y = 10;
const AUTH_TITLE_BLOCK_MIN_HEIGHT = 56;
const AUTH_FIELDS_BLOCK_OFFSET_Y = 60;
const AUTH_CREATE_FIELDS_BLOCK_OFFSET_Y = 24;
const AUTH_FIELDS_TO_ACTION_GAP = 28;
const AUTH_PRIMARY_ACTION_ANCHOR_BOTTOM = 10;
const AUTH_PRIMARY_ACTION_HEIGHT = 48;
const AUTH_ILLUSTRATION_SCALE = 1.3;
const AUTH_SIGNIN_FORM_ID = 'auth-signin-form';
const AUTH_JOIN_FORM_ID = 'auth-join-form';
const AUTH_CREATE_ORGANIZATION_FORM_ID = 'auth-create-organization-form';

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

export function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAnimatedAuthPanelRef = useRef(false);
  const [lang, setLang] = useState<SupportedLang>('en');
  const [tab, setTab] = useState<AuthTab>('signin');
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>('create');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [companyLookupLoading, setCompanyLookupLoading] = useState(false);
  const [companyLookupError, setCompanyLookupError] = useState('');
  const [companyLookupResult, setCompanyLookupResult] = useState<CompanyLookupResult | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationTimezone, setOrganizationTimezone] = useState('UTC');
  const [altegioPreview, setAltegioPreview] = useState<AltegioOnboardingPreview | null>(null);
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [organizationPromoCode, setOrganizationPromoCode] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerConfirmPassword, setOwnerConfirmPassword] = useState('');
  const [ownerPasswordVisible, setOwnerPasswordVisible] = useState(false);
  const [ownerConfirmPasswordVisible, setOwnerConfirmPasswordVisible] = useState(false);
  const [createOrganizationLoading, setCreateOrganizationLoading] = useState(false);
  const [createOrganizationError, setCreateOrganizationError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const authMotionScopeRef = useRef<HTMLDivElement | null>(null);
  const switcherTrackRef = useRef<HTMLDivElement | null>(null);
  const switcherIndicatorRef = useRef<HTMLDivElement | null>(null);
  const t = texts[lang];
  const timeZoneOptions = useMemo(
    () => buildTimeZoneOptions(organizationTimezone),
    [organizationTimezone],
  );
  const hasCompanyLookupResult = Boolean(companyLookupResult);
  const registrationSwitchVisible = tab === 'join';
  const sharedPrimaryActionReserve =
    AUTH_PRIMARY_ACTION_HEIGHT +
    AUTH_PRIMARY_ACTION_ANCHOR_BOTTOM +
    AUTH_FIELDS_TO_ACTION_GAP +
    (registrationSwitchVisible ? 32 : 0);
  const sharedPrimaryActionLabel =
    tab === 'signin'
      ? loginLoading
        ? t.signingIn
        : t.signIn
      : registrationMode === 'create'
        ? createOrganizationLoading
          ? t.creatingOrganization
          : t.createOrganizationAction
        : companyLookupResult
        ? companyLookupResult.registrationCompleted
          ? t.existingAccountAction
          : t.continueInMobile
        : companyLookupLoading
          ? t.joinChecking
          : t.joinAction;
  const sharedPrimaryActionDisabled =
    tab === 'signin'
      ? loginLoading
      : registrationMode === 'create'
        ? createOrganizationLoading
        : companyLookupResult
          ? false
          : companyLookupLoading;
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      if (!hasAnimatedAuthPanelRef.current) {
        hasAnimatedAuthPanelRef.current = true;
        return;
      }

      const timeline = gsap.timeline({
        defaults: {
          ease: 'power3.out',
        },
      });
      const registrationSwitchLinks = gsap.utils.toArray<HTMLElement>('.auth-registration-switch-link');

      timeline
        .fromTo(
          '.auth-tab-panel',
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.34 },
        )
        .fromTo(
          '.auth-panel-heading',
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.28 },
          0.02,
        )
        .fromTo(
          '.auth-panel-field',
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.24, stagger: 0.03 },
          0.05,
        );

      if (registrationSwitchLinks.length) {
        timeline.fromTo(
          registrationSwitchLinks,
          { autoAlpha: 0, y: 6, filter: 'blur(2px)' },
          { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.22 },
          0.08,
        );
      }

      timeline.fromTo(
        '.auth-shared-action-button',
        { autoAlpha: 0, y: 10, scale: 0.985 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.24 },
        0.11,
      );
    },
    {
      scope: authMotionScopeRef,
      dependencies: [tab, registrationMode, hasCompanyLookupResult],
      revertOnUpdate: true,
    },
  );

  useEffect(() => {
    const pending = captureAltegioMarketplaceParams();
    if (!pending?.locationId) {
      return;
    }

    setTab('join');
    setRegistrationMode('create');
    const query = new URLSearchParams({
      locationId: pending.locationId,
      ...(pending.applicationId ? { applicationId: pending.applicationId } : {}),
    });
    void apiRequest<AltegioOnboardingPreview>(
      `/altegio/onboarding/preview?${query.toString()}`,
      {
        realBackend: true,
        skipClientCache: true,
      },
    )
      .then((preview) => {
        setAltegioPreview(preview);
        saveAltegioOnboardingPreview(preview);
        setOrganizationName(preview.location.name);
        setOrganizationTimezone(preview.location.timezone || getBrowserTimezone());
      })
      .catch((error) => {
        setCreateOrganizationError(
          error instanceof Error
            ? error.message
            : 'Unable to read the Altegio location.',
        );
      });
  }, []);

  useEffect(() => {
    const switcherTrack = switcherTrackRef.current;
    const switcherIndicator = switcherIndicatorRef.current;

    if (!switcherTrack || !switcherIndicator) {
      return;
    }

    const offset = tab === 'signin' ? 0 : switcherTrack.clientWidth / 2 - 4;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(switcherIndicator, { x: offset });
      return;
    }

    const tween = gsap.to(switcherIndicator, {
      x: offset,
      duration: 0.42,
      ease: 'power3.out',
      overwrite: true,
    });

    return () => {
      tween.kill();
    };
  }, [tab]);

  useEffect(() => {
    const saved = readBrowserStorageItem('smart-admin-locale');
    if (saved === 'ru' || saved === 'ar') {
      setLang(saved);
    }

    setOrganizationTimezone(getBrowserTimezone());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    writeBrowserStorageItem('smart-admin-locale', lang);
    document.cookie = `smart-admin-locale=${lang}; path=/; max-age=31536000; samesite=lax`;
  }, [lang]);

  useEffect(() => {
    router.prefetch('/app');
  }, [router]);

  useEffect(() => {
    if (searchParams.get('force') !== '1') {
      return;
    }

    clearSession();
  }, [searchParams]);

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    let navigationStarted = false;

    try {
      const demoRole = getDemoRoleByCredentials(identifier, password);
      const session = await apiRequest<AuthSession>('/auth/login', {
        method: 'POST',
        realBackend: true,
        body: JSON.stringify({
          identifier:
            demoRole === 'admin'
              ? DEMO_ADMIN_EMAIL
              : identifier,
          password:
            demoRole === 'admin'
              ? DEMO_ADMIN_PASSWORD
              : password,
          ...(demoRole
            ? { tenantSlug: 'demo' }
            : companyLookupResult?.tenantSlug
            ? { tenantSlug: companyLookupResult.tenantSlug }
            : {}),
        }),
      });

      disableDemoMode();
      const nextRoute = resolvePostLoginRouteWithAltegio(resolvePostLoginRoute(session));
      await persistSession(session);
      navigationStarted = true;
      window.location.replace(nextRoute);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      if (!navigationStarted) {
        setLoginLoading(false);
      }
    }
  }

  async function handleJoinSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = joinEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      setCompanyLookupError(t.joinRequired);
      return;
    }

    setCompanyLookupError('');
    setCompanyLookupLoading(true);

    try {
      const payload = await apiRequest<CompanyLookupResult>('/employees/public/join/email/lookup', {
        method: 'POST',
        realBackend: true,
        body: JSON.stringify({ email: trimmedEmail }),
      });

      saveTenantSlug(payload.tenantSlug);
      setCompanyLookupResult(payload);
      setJoinEmail(payload.email);
    } catch (error) {
      setCompanyLookupResult(null);
      setCompanyLookupError(error instanceof Error ? error.message : t.joinRequired);
    } finally {
      setCompanyLookupLoading(false);
    }
  }

  async function handleCreateOrganizationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = ownerEmail.trim().toLowerCase();

    setCreateOrganizationError('');

    if (ownerPassword.length < 8) {
      setCreateOrganizationError(t.passwordMinLength);
      return;
    }

    if (ownerPassword !== ownerConfirmPassword) {
      setCreateOrganizationError(t.passwordMismatch);
      return;
    }

    setCreateOrganizationLoading(true);
    let navigationStarted = false;

    try {
      const registration = await apiRequest<RegisterOwnerResponse>('/auth/register-owner', {
        method: 'POST',
        realBackend: true,
        body: JSON.stringify({
          tenantName: organizationName.trim(),
          companyName: organizationName.trim(),
          firstName: ownerFirstName.trim(),
          lastName: ownerLastName.trim(),
          email: normalizedEmail,
          password: ownerPassword,
          employeeNumber: 'OWNER-0001',
          hireDate: getLocalDateInputValue(),
          timezone: organizationTimezone.trim() || 'UTC',
          locale: toBackendLocale(lang),
          promoCode: organizationPromoCode.trim() || undefined,
        }),
      });

      const session = await apiRequest<AuthSession>('/auth/login', {
        method: 'POST',
        realBackend: true,
        body: JSON.stringify({
          identifier: normalizedEmail,
          password: ownerPassword,
          tenantSlug: registration.tenantSlug,
        }),
      });

      saveTenantSlug(registration.tenantSlug);
      const nextRoute = resolvePostLoginRouteWithAltegio(resolvePostLoginRoute(session));
      await persistSession(session);
      navigationStarted = true;
      window.location.replace(nextRoute);
    } catch (error) {
      setCreateOrganizationError(error instanceof Error ? error.message : t.createOrganizationError);
    } finally {
      if (!navigationStarted) {
        setCreateOrganizationLoading(false);
      }
    }
  }

  async function handleForgotPasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = forgotEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      setForgotError(t.forgotRequired);
      return;
    }

    setForgotError('');
    setForgotLoading(true);

    try {
      const tenantSlug =
        companyLookupResult?.email.trim().toLowerCase() === trimmedEmail
          ? companyLookupResult.tenantSlug
          : getExplicitTenantSlug();
      await apiRequest('/auth/password-reset/request', {
        method: 'POST',
        realBackend: true,
        body: JSON.stringify({
          email: trimmedEmail,
          tenantSlug: tenantSlug || undefined,
          locale: toBackendLocale(lang),
        }),
      });
      setForgotSubmitted(true);
    } catch (error) {
      setForgotError(error instanceof Error ? error.message : t.forgotRequired);
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleDemoAccess() {
    setLoginError('');
    setLoginLoading(true);
    try {
      const session = await apiRequest<AuthSession>('/auth/login', {
        method: 'POST',
        realBackend: true,
        body: JSON.stringify({
          identifier: DEMO_ADMIN_EMAIL,
          password: DEMO_ADMIN_PASSWORD,
          tenantSlug: 'demo',
        }),
      });
      disableDemoMode();
      const nextRoute = resolvePostLoginRouteWithAltegio(resolvePostLoginRoute(session));
      await persistSession(session);
      window.location.replace(nextRoute);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unable to sign in.');
      setLoginLoading(false);
    }
  }

  function handleTabChange(nextTab: string) {
    setTab(nextTab as AuthTab);
    setLoginError('');
    setCompanyLookupError('');
    setCreateOrganizationError('');

    if (nextTab === 'join') {
      setRegistrationMode('create');
      setCompanyLookupResult(null);
    }
  }

  function handleRegistrationModeChange(nextMode: RegistrationMode) {
    setRegistrationMode(nextMode);
    setCompanyLookupError('');
    setCreateOrganizationError('');

    if (nextMode === 'create') {
      setCompanyLookupResult(null);
    }
  }

  function openCompanyJoinFlow() {
    if (!companyLookupResult) {
      return;
    }

    if (companyLookupResult.registrationCompleted) {
      setIdentifier(companyLookupResult.email);
      setLoginError('');
      setTab('signin');
      return;
    }

    router.push(`/join/${encodeURIComponent(companyLookupResult.token)}`);
  }

  function continueToWorkspaceLogin() {
    if (!companyLookupResult) {
      return;
    }

    setLoginError('');
    setTab('signin');
  }

  function resetCompanyLookup() {
    setCompanyLookupResult(null);
    setCompanyLookupError('');
    setJoinEmail('');
  }

  function handleForgotDialogChange(open: boolean) {
    setForgotOpen(open);

    if (!open) {
      setForgotLoading(false);
      setForgotError('');
      setForgotSubmitted(false);
    }
  }

  return (
    <div className="flex w-full max-w-6xl flex-col gap-8">
      <div className="relative overflow-hidden rounded-[34px] border border-white/60 bg-[linear-gradient(180deg,#eff5ff_0%,#dfe9ff_100%)] shadow-[0_30px_90px_rgba(79,109,245,0.12)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.16),transparent_24%),radial-gradient(circle_at_82%_20%,rgba(99,102,241,0.12),transparent_30%),radial-gradient(circle_at_50%_82%,rgba(96,165,250,0.14),transparent_34%)]" />
        <div className="relative z-10 grid min-h-[640px] lg:grid-cols-[minmax(0,470px)_minmax(0,1fr)]">
          <div className="flex items-center justify-center px-6 py-8 md:px-10 lg:px-12">
            <div className="flex w-full max-w-sm flex-col" ref={authMotionScopeRef}>
              <div
                className="flex-shrink-0"
                style={{ transform: `translateY(${AUTH_HEADER_GROUP_OFFSET_Y}px)` }}
              >
                <div
                  className="mb-4 flex justify-center"
                  style={{ transform: `translateY(${AUTH_BRAND_OFFSET_Y}px)` }}
                >
                  <BrandWordmark className="text-[2.25rem] md:text-[2.6rem]" />
                </div>

                <div
                  className="relative rounded-[20px] bg-[#edf3ff] p-1"
                  ref={switcherTrackRef}
                  style={{ transform: `translateY(${AUTH_SWITCHER_OFFSET_Y}px)` }}
                >
                  <div
                    className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-[16px] bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                    ref={switcherIndicatorRef}
                  />
                  <div className="relative z-10 grid grid-cols-2 gap-1">
                    <button
                      className={cn(
                        'h-11 rounded-[16px] px-4 text-sm font-semibold transition-all',
                        loginLoading && 'pointer-events-none opacity-60',
                        tab === 'signin'
                          ? 'text-foreground'
                          : 'bg-transparent text-[#7a88a6] hover:text-foreground',
                      )}
                      onClick={() => handleTabChange('signin')}
                      type="button"
                    >
                      {t.signInTab}
                    </button>
                    <button
                      className={cn(
                        'h-11 rounded-[16px] px-4 text-sm font-semibold transition-all',
                        loginLoading && 'pointer-events-none opacity-60',
                        tab === 'join'
                          ? 'text-foreground'
                          : 'bg-transparent text-[#7a88a6] hover:text-foreground',
                      )}
                      onClick={() => handleTabChange('join')}
                      type="button"
                    >
                      {t.joinTab}
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="relative flex-1"
                style={{ marginTop: AUTH_CONTENT_TOP_GAP, minHeight: AUTH_CONTENT_MIN_HEIGHT }}
              >
                {tab === 'signin' ? (
                  <div className="auth-tab-panel flex min-h-full flex-col" style={{ paddingBottom: sharedPrimaryActionReserve }}>
                    <div
                      className="auth-panel-heading flex-shrink-0 text-center"
                      style={{
                        height: AUTH_TITLE_BLOCK_MIN_HEIGHT,
                        paddingTop: AUTH_TITLE_BLOCK_OFFSET_Y,
                      }}
                    >
                      <h1 className="text-[2rem] font-light tracking-[-0.04em] text-foreground">
                        {t.welcome}
                      </h1>
                    </div>

                    <form className="flex flex-1 flex-col" id={AUTH_SIGNIN_FORM_ID} onSubmit={handleLoginSubmit}>
                      <div
                        className="space-y-4"
                        style={{
                          marginTop: AUTH_FIELDS_BLOCK_OFFSET_Y,
                        }}
                      >
                        {companyLookupResult ? (
                          <div className="auth-panel-field rounded-[22px] border border-[#d8e5ff] bg-[#f7faff] px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a88a6]">
                              {t.selectedWorkspace}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {companyLookupResult.companyName}
                            </p>
                          </div>
                        ) : null}

                        {loginError ? (
                          <div className="auth-panel-field rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {loginError}
                          </div>
                        ) : null}

                        <div className="auth-panel-field">
                          <Input
                            aria-label={t.emailOrPhone}
                            autoComplete="username"
                            disabled={loginLoading}
                            id="login-identifier"
                            onChange={(event) => setIdentifier(event.target.value)}
                            placeholder={t.emailOrPhone}
                            required
                            type="text"
                            value={identifier}
                          />
                        </div>

                        <div className="auth-panel-field space-y-2">
                          <div className="relative">
                            <Input
                              aria-label={t.password}
                              autoComplete="current-password"
                              className="pr-11"
                              disabled={loginLoading}
                              id="login-password"
                              onChange={(event) => setPassword(event.target.value)}
                              placeholder={t.password}
                              required
                              type={passwordVisible ? 'text' : 'password'}
                              value={password}
                            />
                            <button
                              aria-label={passwordVisible ? t.hidePassword : t.showPassword}
                              className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                              disabled={loginLoading}
                              onClick={() => setPasswordVisible((current) => !current)}
                              title={passwordVisible ? t.hidePassword : t.showPassword}
                              type="button"
                            >
                              {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <div className="flex justify-end">
                            <button
                              className="text-[8px] font-medium leading-none text-[#4f6df5] transition-colors hover:text-[#3553db] disabled:pointer-events-none disabled:opacity-50"
                              disabled={loginLoading}
                              onClick={() => {
                                setForgotEmail(identifier.includes('@') ? identifier : '');
                                setForgotError('');
                                setForgotSubmitted(false);
                                setForgotOpen(true);
                              }}
                              type="button"
                            >
                              {t.forgotPassword}
                            </button>
                          </div>
                        </div>

                      </div>

                    </form>

                    {isDemoModeAvailable() ? (
                      <div className="auth-panel-field mt-4 space-y-3 rounded-[24px] border border-[#d8e5ff] bg-[#f7faff] p-4">
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a88a6]">
                            {t.demoTitle}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t.demoHint}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <Button onClick={() => handleDemoAccess()} type="button" variant="outline">
                            {t.demoAdmin}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="auth-tab-panel flex min-h-full flex-col" style={{ paddingBottom: sharedPrimaryActionReserve }}>
                    <div
                      className="auth-panel-heading flex-shrink-0 text-center"
                      style={{
                        height: AUTH_TITLE_BLOCK_MIN_HEIGHT,
                        paddingTop: AUTH_TITLE_BLOCK_OFFSET_Y,
                      }}
                    >
                      <h2 className="text-[2rem] font-light tracking-[-0.04em] text-foreground">
                        {registrationMode === 'create' ? t.createOrganizationTitle : t.joinTitle}
                      </h2>
                    </div>

                    {registrationMode === 'create' ? (
                      <form
                        className="flex flex-1 flex-col"
                        id={AUTH_CREATE_ORGANIZATION_FORM_ID}
                        onSubmit={handleCreateOrganizationSubmit}
                      >
                        <div
                          className="space-y-3.5"
                          style={{
                            marginTop: AUTH_CREATE_FIELDS_BLOCK_OFFSET_Y,
                          }}
                        >
                          {createOrganizationError ? (
                            <div className="auth-panel-field rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              {createOrganizationError}
                            </div>
                          ) : null}

                          {altegioPreview ? (
                            <div className="auth-panel-field rounded-[18px] border border-[#d8e5ff] bg-[#f7faff] px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a88a6]">
                                {lang === 'ru' ? 'Найдена компания Altegio' : 'Altegio company found'}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-foreground">
                                {altegioPreview.location.name}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {altegioPreview.location.address ||
                                  altegioPreview.location.timezone}
                              </p>
                            </div>
                          ) : null}

                          <div className="auth-panel-field">
                            <Input
                              aria-label={t.organizationName}
                              autoComplete="organization"
                              disabled={createOrganizationLoading}
                              id="organization-name"
                              onChange={(event) => {
                                setOrganizationName(event.target.value);
                                setCreateOrganizationError('');
                              }}
                              placeholder={t.organizationName}
                              required
                              value={organizationName}
                            />
                          </div>

                          <div className="auth-panel-field">
                            <Select
                              disabled={createOrganizationLoading}
                              onValueChange={setOrganizationTimezone}
                              value={organizationTimezone}
                            >
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
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="auth-panel-field">
                              <Input
                                aria-label={t.ownerFirstName}
                                autoComplete="given-name"
                                disabled={createOrganizationLoading}
                                id="owner-first-name"
                                onChange={(event) => {
                                  setOwnerFirstName(event.target.value);
                                  setCreateOrganizationError('');
                                }}
                                placeholder={t.ownerFirstName}
                                required
                                value={ownerFirstName}
                              />
                            </div>
                            <div className="auth-panel-field">
                              <Input
                                aria-label={t.ownerLastName}
                                autoComplete="family-name"
                                disabled={createOrganizationLoading}
                                id="owner-last-name"
                                onChange={(event) => {
                                  setOwnerLastName(event.target.value);
                                  setCreateOrganizationError('');
                                }}
                                placeholder={t.ownerLastName}
                                required
                                value={ownerLastName}
                              />
                            </div>
                          </div>

                          <div className="auth-panel-field">
                            <Input
                              aria-label={t.ownerEmail}
                              autoCapitalize="none"
                              autoComplete="email"
                              disabled={createOrganizationLoading}
                              id="owner-email"
                              onChange={(event) => {
                                setOwnerEmail(event.target.value);
                                setCreateOrganizationError('');
                              }}
                              placeholder={t.ownerEmail}
                              required
                              type="email"
                              value={ownerEmail}
                            />
                          </div>

                          <div className="auth-panel-field">
                            <Input
                              aria-label={t.promoCode}
                              autoCapitalize="characters"
                              autoComplete="off"
                              disabled={createOrganizationLoading}
                              id="organization-promo-code"
                              onChange={(event) => {
                                setOrganizationPromoCode(event.target.value);
                                setCreateOrganizationError('');
                              }}
                              placeholder={t.promoCode}
                              value={organizationPromoCode}
                            />
                          </div>

                          <div className="auth-panel-field relative">
                            <Input
                              aria-label={t.ownerPassword}
                              autoComplete="new-password"
                              className="pr-11"
                              disabled={createOrganizationLoading}
                              id="owner-password"
                              onChange={(event) => {
                                setOwnerPassword(event.target.value);
                                setCreateOrganizationError('');
                              }}
                              placeholder={t.ownerPassword}
                              required
                              type={ownerPasswordVisible ? 'text' : 'password'}
                              value={ownerPassword}
                            />
                            <button
                              aria-label={ownerPasswordVisible ? t.hidePassword : t.showPassword}
                              className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                              disabled={createOrganizationLoading}
                              onClick={() => setOwnerPasswordVisible((current) => !current)}
                              title={ownerPasswordVisible ? t.hidePassword : t.showPassword}
                              type="button"
                            >
                              {ownerPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>

                          <div className="auth-panel-field relative">
                            <Input
                              aria-label={t.ownerConfirmPassword}
                              autoComplete="new-password"
                              className="pr-11"
                              disabled={createOrganizationLoading}
                              id="owner-confirm-password"
                              onChange={(event) => {
                                setOwnerConfirmPassword(event.target.value);
                                setCreateOrganizationError('');
                              }}
                              placeholder={t.ownerConfirmPassword}
                              required
                              type={ownerConfirmPasswordVisible ? 'text' : 'password'}
                              value={ownerConfirmPassword}
                            />
                            <button
                              aria-label={ownerConfirmPasswordVisible ? t.hidePassword : t.showPassword}
                              className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                              disabled={createOrganizationLoading}
                              onClick={() => setOwnerConfirmPasswordVisible((current) => !current)}
                              title={ownerConfirmPasswordVisible ? t.hidePassword : t.showPassword}
                              type="button"
                            >
                              {ownerConfirmPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                      </form>
                    ) : companyLookupResult ? (
                      <div className="auth-panel-field rounded-[28px] border border-[#d8e5ff] bg-[#f7faff] p-5">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-white text-[#4f6df5] shadow-[0_12px_24px_rgba(79,109,245,0.12)]">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a88a6]">
                              {t.companyFoundLabel}
                            </p>
                            <p className="text-base font-semibold text-foreground">
                              {companyLookupResult.companyName}
                            </p>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {companyLookupResult.registrationCompleted
                                ? t.companyFoundExistingBody
                                    .replace('{email}', companyLookupResult.email)
                                    .replace('{companyName}', companyLookupResult.companyName)
                                : t.companyFoundBody.replace('{companyName}', companyLookupResult.companyName)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 rounded-[18px] border border-[#d8e5ff] bg-white px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a88a6]">
                            {t.joinLabel}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {companyLookupResult.email}
                          </p>
                        </div>

                        <div className="mt-5 grid gap-2">
                          <Button className="h-12 rounded-[16px]" onClick={continueToWorkspaceLogin} type="button" variant="outline">
                            {t.alreadyHaveAccount}
                          </Button>
                          <button
                            className="pt-2 text-sm font-medium text-[#4f6df5] transition-colors hover:text-[#3553db]"
                            onClick={resetCompanyLookup}
                            type="button"
                          >
                            {t.useAnotherCode}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form className="flex flex-1 flex-col" id={AUTH_JOIN_FORM_ID} onSubmit={handleJoinSubmit}>
                        <div
                          className="space-y-4"
                          style={{
                            marginTop: AUTH_FIELDS_BLOCK_OFFSET_Y,
                          }}
                        >
                          {companyLookupError ? (
                            <div className="auth-panel-field rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              {companyLookupError}
                            </div>
                          ) : null}

                          <div className="auth-panel-field">
                            <Input
                              aria-label={t.joinLabel}
                              autoCapitalize="none"
                              autoComplete="off"
                              disabled={companyLookupLoading}
                              id="join-email"
                              onChange={(event) => {
                                setJoinEmail(event.target.value);
                                setCompanyLookupError('');
                              }}
                              placeholder={t.joinPlaceholder}
                              required
                              type="email"
                              value={joinEmail}
                            />
                          </div>
                        </div>

                      </form>
                    )}
                  </div>
                )}

                <div
                  className="absolute inset-x-0"
                  style={{ bottom: AUTH_PRIMARY_ACTION_ANCHOR_BOTTOM }}
                >
                  {registrationSwitchVisible ? (
                    <div className="auth-registration-switch-link mb-3 text-center">
                      <button
                        className="text-sm font-[100] text-[#4f6df5] transition-[color,opacity,transform] duration-200 hover:text-[#3553db] disabled:pointer-events-none disabled:opacity-50"
                        disabled={createOrganizationLoading || companyLookupLoading}
                        onClick={() =>
                          handleRegistrationModeChange(
                            registrationMode === 'create' ? 'join' : 'create',
                          )
                        }
                        style={{ fontWeight: 100 }}
                        type="button"
                      >
                        {registrationMode === 'create'
                          ? t.joinExistingTeamLink
                          : t.createOrganizationLink}
                      </button>
                    </div>
                  ) : null}
                  {tab === 'join' && registrationMode === 'join' && companyLookupResult ? (
                    <Button
                      className="auth-shared-action-button w-full rounded-[16px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                      onClick={openCompanyJoinFlow}
                      style={{ height: AUTH_PRIMARY_ACTION_HEIGHT }}
                      type="button"
                    >
                      {sharedPrimaryActionLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      className="auth-shared-action-button w-full rounded-[16px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                      disabled={sharedPrimaryActionDisabled}
                      form={
                        tab === 'signin'
                          ? AUTH_SIGNIN_FORM_ID
                          : registrationMode === 'create'
                            ? AUTH_CREATE_ORGANIZATION_FORM_ID
                            : AUTH_JOIN_FORM_ID
                      }
                      style={{ height: AUTH_PRIMARY_ACTION_HEIGHT }}
                      type="submit"
                    >
                      {(tab === 'signin' && loginLoading) ||
                      (tab === 'join' && registrationMode === 'join' && companyLookupLoading) ||
                      (tab === 'join' && registrationMode === 'create' && createOrganizationLoading) ? (
                        <Swirling className="mr-2 h-4 w-4" />
                      ) : null}
                      {sharedPrimaryActionLabel}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="relative hidden overflow-hidden border-l border-white/60 bg-white p-10 lg:flex lg:items-center lg:justify-center">
            <div className="flex w-full max-w-[520px] items-center justify-center">
              <img
                alt={lang === 'ru' ? 'Иллюстрация входа HiTeam' : 'HiTeam sign-in illustration'}
                className="block h-auto w-full max-w-[520px] origin-center object-contain transform-gpu"
                decoding="sync"
                fetchPriority="high"
                height={880}
                loading="eager"
                src="/illustration.svg?v=20260409"
                style={{ transform: `scale(${AUTH_ILLUSTRATION_SCALE})` }}
                width={880}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <LanguagePicker lang={lang} setLang={setLang} />
      </div>

      <Dialog onOpenChange={handleForgotDialogChange} open={forgotOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{t.forgotTitle}</DialogTitle>
            <DialogDescription>{t.forgotDesc}</DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleForgotPasswordSubmit}>
            {forgotSubmitted ? (
              <div className="rounded-[18px] border border-[#d8e5ff] bg-[#f7faff] px-4 py-3 text-sm leading-6 text-foreground">
                {t.forgotSuccess}
              </div>
            ) : (
              <>
                {forgotError ? (
                  <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {forgotError}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="forgot-email">
                    {t.forgotEmail}
                  </label>
                  <Input
                    autoComplete="email"
                    id="forgot-email"
                    onChange={(event) => {
                      setForgotEmail(event.target.value);
                      setForgotError('');
                    }}
                    placeholder={t.forgotPlaceholder}
                    type="email"
                    value={forgotEmail}
                  />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => handleForgotDialogChange(false)} type="button" variant="outline">
                {t.close}
              </Button>
              {!forgotSubmitted ? (
                <Button className="flex-1" disabled={forgotLoading} type="submit">
                  {forgotLoading ? <Swirling className="mr-2 h-4 w-4" /> : null}
                  {forgotLoading ? t.forgotSending : t.forgotSend}
                </Button>
              ) : null}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
