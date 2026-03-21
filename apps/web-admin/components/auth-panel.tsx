'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Hand, Loader2 } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/api';
import { getDemoSessionForRole, resetDemoState } from '@/lib/demo-api';
import {
  disableDemoMode,
  enableDemoMode,
  getDemoRoleByCredentials,
  isDemoModeAvailable,
} from '@/lib/demo-mode';
import {
  AuthSession,
  resolveHomeRoute,
  saveSession,
} from '@/lib/auth';
import { BrandWordmark } from './brand-wordmark';

type SupportedLang = 'en' | 'ru' | 'ar';

const langs: { code: SupportedLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
];

const texts = {
  en: {
    welcome: 'Welcome back',
    welcomeDesc: 'Sign in to your HiTeam workspace',
    emailOrPhone: 'Email or phone',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in...',
    demoAdmin: 'Demo admin',
    demoEmployee: 'Demo employee',
    demoHint: 'Quick access without backend',
  },
  ru: {
    welcome: 'С возвращением',
    welcomeDesc: 'Войдите в рабочее пространство HiTeam',
    emailOrPhone: 'Email или телефон',
    password: 'Пароль',
    signIn: 'Войти',
    signingIn: 'Входим...',
    demoAdmin: 'Демо админ',
    demoEmployee: 'Демо сотрудник',
    demoHint: 'Быстрый вход без backend',
  },
  ar: {
    welcome: 'مرحباً بعودتك',
    welcomeDesc: 'سجّل الدخول إلى مساحة عمل HiTeam',
    emailOrPhone: 'البريد الإلكتروني أو الهاتف',
    password: 'كلمة المرور',
    signIn: 'تسجيل الدخول',
    signingIn: 'جارٍ تسجيل الدخول...',
    demoAdmin: 'مشرف تجريبي',
    demoEmployee: 'موظف تجريبي',
    demoHint: 'دخول سريع بدون خلفية',
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

export function AuthPanel() {
  const router = useRouter();
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
  const t = texts[lang];

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const demoRole = getDemoRoleByCredentials(identifier, password);
      if (demoRole) {
        enableDemoMode();
        resetDemoState();
        const session = getDemoSessionForRole(demoRole);
        saveSession(session);
        if (lang !== 'en') localStorage.setItem('smart-admin-locale', lang);
        router.push(resolveHomeRoute(session.user.roleCodes));
        return;
      }

      const session = await apiRequest<AuthSession>('/auth/login', {
        method: 'POST',
        realBackend: true,
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      disableDemoMode();
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
          <CardTitle className="text-center text-xl font-bold">{t.welcome}</CardTitle>
          <CardDescription className="mt-2 text-center">{t.welcomeDesc}</CardDescription>
        </CardHeader>

        <CardContent>
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
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <LanguagePicker lang={lang} setLang={setLang} />
      </div>
    </div>
  );
}
