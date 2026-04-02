'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/api';
import { AuthSession, persistSession, resolveHomeRoute } from '@/lib/auth';
import { Eye, EyeOff, Globe, Hand, Loader2 } from 'lucide-react';
import { BrandWordmark } from './brand-wordmark';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type SupportedLang = 'en' | 'ru' | 'ar';

const langs: { code: SupportedLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
];

const texts = {
  en: {
    welcome: 'Welcome back',
    desc: 'Sign in to your HiTeam workspace',
    emailOrPhone: 'Email or phone',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    forgot: 'Forgot password?',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    orContinue: 'Or continue with',
    loginGoogle: 'Continue with Google',
    loginApple: 'Continue with Apple',
    terms: 'By continuing, you agree to our',
    termsLink: 'Terms of Service',
    and: 'and',
    privacyLink: 'Privacy Policy',
    error: 'Unable to sign in. Check your credentials.',
  },
  ru: {
    welcome: 'С возвращением',
    desc: 'Войдите в рабочее пространство HiTeam',
    emailOrPhone: 'Email или телефон',
    password: 'Пароль',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    signIn: 'Войти',
    signingIn: 'Входим…',
    forgot: 'Забыли пароль?',
    noAccount: 'Нет аккаунта?',
    signUp: 'Зарегистрироваться',
    orContinue: 'Или продолжить через',
    loginGoogle: 'Продолжить с Google',
    loginApple: 'Продолжить с Apple',
    terms: 'Продолжая, вы принимаете',
    termsLink: 'Условия использования',
    and: 'и',
    privacyLink: 'Политику конфиденциальности',
    error: 'Не удалось войти. Проверьте учётные данные.',
  },
  ar: {
    welcome: 'مرحباً بعودتك',
    desc: 'سجّل الدخول إلى مساحة عمل HiTeam',
    emailOrPhone: 'البريد الإلكتروني أو الهاتف',
    password: 'كلمة المرور',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    signIn: 'تسجيل الدخول',
    signingIn: 'جاري الدخول…',
    forgot: 'نسيت كلمة المرور؟',
    noAccount: 'ليس لديك حساب؟',
    signUp: 'إنشاء حساب',
    orContinue: 'أو تابع عبر',
    loginGoogle: 'المتابعة مع Google',
    loginApple: 'المتابعة مع Apple',
    terms: 'بالمتابعة، أنت توافق على',
    termsLink: 'شروط الخدمة',
    and: 'و',
    privacyLink: 'سياسة الخصوصية',
    error: 'تعذّر تسجيل الدخول. تحقق من بياناتك.',
  },
};

/* ── Platform detection: show Apple only on macOS / iOS / iPad ── */
function useIsApplePlatform() {
  const [isApple, setIsApple] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    setIsApple(/Mac|iPhone|iPad|iPod/i.test(ua));
  }, []);
  return isApple;
}

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
    </svg>
  );
}

function LanguagePicker({ lang, setLang }: { lang: SupportedLang; setLang: (l: SupportedLang) => void }) {
  const current = langs.find((l) => l.code === lang)!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span className="text-sm">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {langs.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)} className={cn(l.code === lang && 'font-semibold')}>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const router = useRouter();
  const isApple = useIsApplePlatform();

  const [lang, setLang] = useState<SupportedLang>('en');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const t = texts[lang];

  useEffect(() => {
    const saved = window.localStorage.getItem('smart-admin-locale');
    if (saved === 'ru' || saved === 'ar') {
      setLang(saved);
    }
  }, []);

  useEffect(() => {
    if (lang === 'en') {
      window.localStorage.removeItem('smart-admin-locale');
      return;
    }

    window.localStorage.setItem('smart-admin-locale', lang);
  }, [lang]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    let navigationStarted = false;
    try {
      const session = await apiRequest<AuthSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      await persistSession(session);
      navigationStarted = true;
      router.push(resolveHomeRoute(session.user.roleCodes));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      if (!navigationStarted) {
        setLoading(false);
      }
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      {/* Brand */}
      <a href="#" className="flex items-center gap-2.5 self-center font-medium text-lg">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
          <Hand className="size-4" />
        </div>
        <BrandWordmark className="text-[1.125rem]" />
      </a>

      {/* Card */}
      <Card className="shadow-lg border-border/40">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl font-bold">{t.welcome}</CardTitle>
          <CardDescription>{t.desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">

            {/* Social buttons */}
            <div className="flex flex-col gap-2">
              <Button variant="outline" type="button" className="w-full gap-2">
                <GoogleIcon />
                {t.loginGoogle}
              </Button>
              {isApple && (
                <Button variant="outline" type="button" className="w-full gap-2">
                  <AppleIcon />
                  {t.loginApple}
                </Button>
              )}
            </div>

            <div className="relative my-1">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                {t.orContinue}
              </span>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-identifier" className="text-sm font-medium">{t.emailOrPhone}</label>
              <Input
                id="login-identifier"
                type="text"
                placeholder="you@company.com / +7 999 000 00 00"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-medium">{t.password}</label>
                <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">{t.forgot}</a>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={passwordVisible ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={passwordVisible ? t.hidePassword : t.showPassword}
                  title={passwordVisible ? t.hidePassword : t.showPassword}
                  className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setPasswordVisible((current) => !current)}
                >
                  {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? t.signingIn : t.signIn}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t.noAccount}{' '}
              <a href="/signup" className="font-medium text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline">{t.signUp}</a>
            </p>
          </form>
        </CardContent>
      </Card>

      <p className="px-6 text-center text-xs text-muted-foreground">
        {t.terms}{' '}<a href="#" className="underline underline-offset-4 hover:text-foreground">{t.termsLink}</a>{' '}{t.and}{' '}<a href="#" className="underline underline-offset-4 hover:text-foreground">{t.privacyLink}</a>.
      </p>

      {/* Language picker — bottom center */}
      <div className="flex justify-center">
        <LanguagePicker lang={lang} setLang={setLang} />
      </div>
    </div>
  );
}
