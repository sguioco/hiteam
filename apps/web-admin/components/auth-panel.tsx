'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Hand, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/api';
import { getDemoSessionForRole, resetDemoState } from '@/lib/demo-api';
import { enableDemoMode, isDemoModeAvailable } from '@/lib/demo-mode';
import {
  AuthSession,
  resolveHomeRoute,
  saveSession,
} from '@/lib/auth';
import { BrandWordmark } from './brand-wordmark';

type AuthMode = 'login' | 'signup';
type SupportedLang = 'en' | 'ru' | 'ar';

type CompanyLookup = {
  companyName: string;
  companyCode: string;
  tenantName: string;
  tenantSlug: string;
};

const langs: { code: SupportedLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
];

const texts = {
  en: {
    loginTab: 'Login',
    signupTab: 'Join company',
    welcome: 'Welcome back',
    welcomeDesc: 'Sign in to your HiTeam workspace',
    emailOrPhone: 'Email or phone',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in...',
    demoAdmin: 'Demo admin',
    demoEmployee: 'Demo employee',
    demoHint: 'Quick access without backend',
    joinTitle: 'Join by company code',
    joinDesc: 'Enter the company code first. If the code is valid, continue with your profile.',
    codeLabel: 'Company code',
    codePlaceholder: 'BEAUTY-HQ',
    checkCode: 'Check code',
    checkingCode: 'Checking...',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone',
    continue: 'Continue',
    sending: 'Sending...',
    companyMatched: 'Code verified',
    companyMatchedDesc: 'You are joining',
    requestSent: 'Request sent',
    requestSentDesc:
      'Your request was sent to the company. After approval, you will receive an invitation email to finish account setup.',
  },
  ru: {
    loginTab: 'Вход',
    signupTab: 'Присоединиться',
    welcome: 'С возвращением',
    welcomeDesc: 'Войдите в рабочее пространство HiTeam',
    emailOrPhone: 'Email или телефон',
    email: 'Электронная почта',
    password: 'Пароль',
    signIn: 'Войти',
    signingIn: 'Входим...',
    demoAdmin: 'Демо админ',
    demoEmployee: 'Демо сотрудник',
    demoHint: 'Быстрый вход без backend',
    joinTitle: 'Войти в компанию по коду',
    joinDesc: 'Сначала введите код компании. Если код верный, заполните профиль без пароля.',
    codeLabel: 'Код компании',
    codePlaceholder: 'BEAUTY-HQ',
    checkCode: 'Проверить код',
    checkingCode: 'Проверяем...',
    firstName: 'Имя',
    lastName: 'Фамилия',
    phone: 'Телефон',
    continue: 'Продолжить',
    sending: 'Отправляем...',
    companyMatched: 'Код подтверждён',
    companyMatchedDesc: 'Вы присоединяетесь к компании',
    requestSent: 'Заявка отправлена',
    requestSentDesc:
      'Компания получила вашу заявку. После подтверждения вам придёт приглашение на email для завершения доступа.',
  },
  ar: {
    loginTab: 'تسجيل الدخول',
    signupTab: 'الانضمام',
    welcome: 'مرحباً بعودتك',
    welcomeDesc: 'سجّل الدخول إلى مساحة عمل HiTeam',
    emailOrPhone: 'البريد الإلكتروني أو الهاتف',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'تسجيل الدخول',
    signingIn: 'جارٍ تسجيل الدخول...',
    demoAdmin: 'مشرف تجريبي',
    demoEmployee: 'موظف تجريبي',
    demoHint: 'دخول سريع بدون خلفية',
    joinTitle: 'الانضمام برمز الشركة',
    joinDesc: 'أدخل رمز الشركة أولاً، ثم أكمل بياناتك بدون كلمة مرور.',
    codeLabel: 'رمز الشركة',
    codePlaceholder: 'BEAUTY-HQ',
    checkCode: 'تحقق من الرمز',
    checkingCode: 'جارٍ التحقق...',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    phone: 'الهاتف',
    continue: 'متابعة',
    sending: 'جارٍ الإرسال...',
    companyMatched: 'تم التحقق من الرمز',
    companyMatchedDesc: 'أنت تنضم إلى',
    requestSent: 'تم إرسال الطلب',
    requestSentDesc:
      'تم إرسال طلبك إلى الشركة. بعد الموافقة سيصلك بريد دعوة لإكمال إعداد الحساب.',
  },
};

function LanguagePicker({ lang, setLang }: { lang: SupportedLang; setLang: (lang: SupportedLang) => void }) {
  const current = langs.find((item) => item.code === lang)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span className="text-sm">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {langs.map((item) => (
          <DropdownMenuItem
            key={item.code}
            onClick={() => setLang(item.code)}
            className={cn(item.code === lang && 'font-semibold')}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AuthPanel({
  initialMode = 'login',
}: {
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [lang, setLang] = useState<SupportedLang>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smart-admin-locale');
      if (saved === 'ru' || saved === 'ar') return saved;
    }
    return 'en';
  });

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [companyCode, setCompanyCode] = useState('');
  const [joinInfo, setJoinInfo] = useState<CompanyLookup | null>(null);
  const [joinFirstName, setJoinFirstName] = useState('');
  const [joinLastName, setJoinLastName] = useState('');
  const [joinPhone, setJoinPhone] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  const t = texts[lang];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextPath = mode === 'login' ? '/login' : '/signup';
    if (window.location.pathname !== nextPath) {
      window.history.replaceState(window.history.state, '', nextPath);
    }
  }, [mode]);

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const session = await apiRequest<AuthSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      saveSession(session);
      if (lang !== 'en') localStorage.setItem('smart-admin-locale', lang);
      router.push(resolveHomeRoute(session.user.roleCodes));
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setLoginLoading(false);
    }
  }

  function handleDemoAccess(role: 'admin' | 'employee') {
    setLoginError('');
    enableDemoMode();
    resetDemoState();
    const session = getDemoSessionForRole(role);
    saveSession(session);
    if (lang !== 'en') localStorage.setItem('smart-admin-locale', lang);
    router.push(resolveHomeRoute(session.user.roleCodes));
  }

  async function handleCodeLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinError('');
    setJoinSuccess('');
    setCodeLoading(true);

    try {
      const result = await apiRequest<CompanyLookup>('/employees/public/join/code/lookup', {
        method: 'POST',
        body: JSON.stringify({ code: companyCode }),
      });
      setJoinInfo(result);
    } catch (error) {
      setJoinInfo(null);
      setJoinError(error instanceof Error ? error.message : 'Unable to validate the code.');
    } finally {
      setCodeLoading(false);
    }
  }

  async function handleJoinSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinError('');
    setJoinLoading(true);

    try {
      await apiRequest('/employees/public/join/code/submit', {
        method: 'POST',
        body: JSON.stringify({
          code: joinInfo?.companyCode ?? companyCode,
          firstName: joinFirstName,
          lastName: joinLastName,
          phone: joinPhone,
          email: joinEmail,
        }),
      });

      setJoinSuccess(t.requestSentDesc);
      setJoinInfo(null);
      setCompanyCode('');
      setJoinFirstName('');
      setJoinLastName('');
      setJoinPhone('');
      setJoinEmail('');
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Unable to send the request.');
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex items-center justify-center gap-2.5 font-medium text-lg">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
          <Hand className="size-4" />
        </div>
        <BrandWordmark className="text-[1.125rem]" />
      </div>

      <Card className="border-border/40 shadow-lg">
        <CardHeader className="pb-3">
          <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)} className="gap-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t.loginTab}</TabsTrigger>
              <TabsTrigger value="signup">{t.signupTab}</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <CardTitle className="text-center text-xl font-bold">{t.welcome}</CardTitle>
              <CardDescription className="mt-2 text-center">{t.welcomeDesc}</CardDescription>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <CardTitle className="text-center text-xl font-bold">{t.joinTitle}</CardTitle>
              <CardDescription className="mt-2 text-center">{t.joinDesc}</CardDescription>
            </TabsContent>
          </Tabs>
        </CardHeader>

        <CardContent>
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              {loginError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {loginError}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label htmlFor="login-identifier" className="text-sm font-medium">
                  {t.emailOrPhone}
                </label>
                <Input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="you@company.com / +7 999 000 00 00"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-sm font-medium">
                  {t.password}
                </label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
              >
                {loginLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loginLoading ? t.signingIn : t.signIn}
              </Button>

              {isDemoModeAvailable() ? (
                <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-3">
                  <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t.demoHint}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDemoAccess('admin')}
                    >
                      {t.demoAdmin}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDemoAccess('employee')}
                    >
                      {t.demoEmployee}
                    </Button>
                  </div>
                </div>
              ) : null}
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              {joinInfo ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <div className="flex items-center gap-2 font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    {t.companyMatched}
                  </div>
                  <p className="mt-2">
                    {t.companyMatchedDesc} <strong>{joinInfo.companyName}</strong> ({joinInfo.tenantName}).
                  </p>
                </div>
              ) : null}

              {joinError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {joinError}
                </div>
              ) : null}

              {joinSuccess ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                  <div className="font-medium">{t.requestSent}</div>
                  <div className="mt-1 text-emerald-800">{joinSuccess}</div>
                </div>
              ) : null}

              {!joinInfo ? (
                <form onSubmit={handleCodeLookup} className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="company-code" className="text-sm font-medium">
                      {t.codeLabel}
                    </label>
                    <Input
                      id="company-code"
                      value={companyCode}
                      onChange={(event) => setCompanyCode(event.target.value.toUpperCase())}
                      placeholder={t.codePlaceholder}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={codeLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                  >
                    {codeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {codeLoading ? t.checkingCode : t.checkCode}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="join-first-name" className="text-sm font-medium">
                        {t.firstName}
                      </label>
                      <Input
                        id="join-first-name"
                        value={joinFirstName}
                        onChange={(event) => setJoinFirstName(event.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="join-last-name" className="text-sm font-medium">
                        {t.lastName}
                      </label>
                      <Input
                        id="join-last-name"
                        value={joinLastName}
                        onChange={(event) => setJoinLastName(event.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="join-phone" className="text-sm font-medium">
                      {t.phone}
                    </label>
                    <Input
                      id="join-phone"
                      value={joinPhone}
                      onChange={(event) => setJoinPhone(event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="join-email" className="text-sm font-medium">
                      {t.email}
                    </label>
                    <Input
                      id="join-email"
                      type="email"
                      value={joinEmail}
                      onChange={(event) => setJoinEmail(event.target.value)}
                      placeholder="you@company.com"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setJoinInfo(null);
                        setJoinError('');
                      }}
                    >
                      {t.codeLabel}
                    </Button>
                    <Button
                      type="submit"
                      disabled={joinLoading}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                    >
                      {joinLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {joinLoading ? t.sending : t.continue}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <LanguagePicker lang={lang} setLang={setLang} />
      </div>
    </div>
  );
}
