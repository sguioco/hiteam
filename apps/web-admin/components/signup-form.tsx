'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import {
  readBrowserStorageItem,
  removeBrowserStorageItem,
  writeBrowserStorageItem,
} from '@/lib/browser-storage';
import { AuthSession, persistSession, resolvePostLoginRoute } from '@/lib/auth';
import { Globe, Hand, Loader2 } from 'lucide-react';
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
    title: 'Create your account',
    desc: 'Join HiTeam and start managing your team',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    signUp: 'Create account',
    signingUp: 'Creating…',
    hasAccount: 'Already have an account?',
    signIn: 'Sign in',
    terms: 'By continuing, you agree to our',
    termsLink: 'Terms of Service',
    and: 'and',
    privacyLink: 'Privacy Policy',
    error: 'Unable to create account.',
    passwordMismatch: 'Passwords do not match.',
  },
  ru: {
    title: 'Создайте аккаунт',
    desc: 'Присоединяйтесь к HiTeam',
    firstName: 'Имя',
    lastName: 'Фамилия',
    email: 'Электронная почта',
    password: 'Пароль',
    confirmPassword: 'Подтвердите пароль',
    signUp: 'Создать аккаунт',
    signingUp: 'Создаём…',
    hasAccount: 'Уже есть аккаунт?',
    signIn: 'Войти',
    terms: 'Продолжая, вы принимаете',
    termsLink: 'Условия использования',
    and: 'и',
    privacyLink: 'Политику конфиденциальности',
    error: 'Не удалось создать аккаунт.',
    passwordMismatch: 'Пароли не совпадают.',
  },
  ar: {
    title: 'أنشئ حسابك',
    desc: 'انضم إلى HiTeam وابدأ إدارة فريقك',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    signUp: 'إنشاء حساب',
    signingUp: 'جاري الإنشاء…',
    hasAccount: 'لديك حساب بالفعل؟',
    signIn: 'تسجيل الدخول',
    terms: 'بالمتابعة، أنت توافق على',
    termsLink: 'شروط الخدمة',
    and: 'و',
    privacyLink: 'سياسة الخصوصية',
    error: 'تعذّر إنشاء الحساب.',
    passwordMismatch: 'كلمتا المرور غير متطابقتين.',
  },
};

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

export function SignupForm({ className, ...props }: React.ComponentProps<'div'>) {
  const [lang, setLang] = useState<SupportedLang>('en');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const t = texts[lang];

  useEffect(() => {
    const saved = readBrowserStorageItem('smart-admin-locale');
    if (saved === 'ru' || saved === 'ar') {
      setLang(saved);
    }
  }, []);

  useEffect(() => {
    if (lang === 'en') {
      removeBrowserStorageItem('smart-admin-locale');
      return;
    }

    writeBrowserStorageItem('smart-admin-locale', lang);
  }, [lang]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    setLoading(true);
    let navigationStarted = false;
    try {
      const session = await apiRequest<AuthSession>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      const nextRoute = resolvePostLoginRoute(session);
      await persistSession(session);
      navigationStarted = true;
      window.location.replace(nextRoute);
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
          <CardTitle className="text-xl font-bold">{t.title}</CardTitle>
          <CardDescription>{t.desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="signup-first" className="text-sm font-medium">{t.firstName}</label>
                <Input id="signup-first" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="signup-last" className="text-sm font-medium">{t.lastName}</label>
                <Input id="signup-last" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-email" className="text-sm font-medium">{t.email}</label>
              <Input id="signup-email" type="email" placeholder="you@company.com" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-password" className="text-sm font-medium">{t.password}</label>
              <Input id="signup-password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-confirm" className="text-sm font-medium">{t.confirmPassword}</label>
              <Input id="signup-confirm" type="password" required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? t.signingUp : t.signUp}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t.hasAccount}{' '}
              <a href="/login" className="font-medium text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline">{t.signIn}</a>
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
