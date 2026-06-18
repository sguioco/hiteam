"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Swirling } from "@/components/ui/swirling";
import { apiRequest } from "@/lib/api";
import { readBrowserStorageItem } from "@/lib/browser-storage";

type ResetPasswordResponse = {
  success: boolean;
  tenantSlug?: string;
};

function resolveLocale() {
  if (typeof window === "undefined") {
    return "en";
  }

  return readBrowserStorageItem("smart-admin-locale") === "ru" ? "ru" : "en";
}

const copy = {
  en: {
    title: "Reset password",
    description: "Choose a new password for your HiTeam account.",
    password: "New password",
    confirmPassword: "Confirm password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    submit: "Save new password",
    submitting: "Saving...",
    missingToken: "This reset link is missing a token. Request a new password reset email.",
    shortPassword: "Password must be at least 8 characters.",
    mismatch: "Passwords do not match.",
    success: "Password updated. You can sign in with the new password.",
    login: "Back to sign in",
  },
  ru: {
    title: "Восстановление пароля",
    description: "Задайте новый пароль для аккаунта HiTeam.",
    password: "Новый пароль",
    confirmPassword: "Повторите пароль",
    showPassword: "Показать пароль",
    hidePassword: "Скрыть пароль",
    submit: "Сохранить пароль",
    submitting: "Сохраняем...",
    missingToken: "В ссылке нет токена. Запросите новое письмо для восстановления пароля.",
    shortPassword: "Пароль должен быть не короче 8 символов.",
    mismatch: "Пароли не совпадают.",
    success: "Пароль обновлён. Теперь можно войти с новым паролем.",
    login: "Вернуться ко входу",
  },
} as const;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const locale = useMemo(resolveLocale, []);
  const t = copy[locale];
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tenantSlug, setTenantSlug] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError(t.missingToken);
      return;
    }

    if (password.length < 8) {
      setError(t.shortPassword);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.mismatch);
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest<ResetPasswordResponse>(
        "/auth/password-reset/confirm",
        {
          method: "POST",
          realBackend: true,
          body: JSON.stringify({ token, password }),
        },
      );

      setTenantSlug(response.tenantSlug ?? "");
      setSuccess(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.missingToken);
    } finally {
      setLoading(false);
    }
  }

  const loginHref = tenantSlug
    ? `/login?tenant=${encodeURIComponent(tenantSlug)}`
    : "/login";

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <section className="w-full max-w-md rounded-[28px] border border-white/70 bg-white p-8 shadow-[0_30px_90px_rgba(79,109,245,0.14)]">
        <div className="mb-8 flex justify-center">
          <BrandWordmark className="text-[2.35rem]" />
        </div>

        <div className="mb-6 text-center">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            {t.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {success ? t.success : t.description}
          </p>
        </div>

        {success ? (
          <Button asChild className="w-full" type="button">
            <Link href={loginHref}>{t.login}</Link>
          </Button>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error ? (
              <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">
                {t.password}
              </span>
              <div className="relative">
                <Input
                  autoComplete="new-password"
                  className="h-12 pr-12"
                  onChange={(event) => setPassword(event.target.value)}
                  type={passwordVisible ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={passwordVisible ? t.hidePassword : t.showPassword}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setPasswordVisible((current) => !current)}
                  type="button"
                >
                  {passwordVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">
                {t.confirmPassword}
              </span>
              <div className="relative">
                <Input
                  autoComplete="new-password"
                  className="h-12 pr-12"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type={confirmPasswordVisible ? "text" : "password"}
                  value={confirmPassword}
                />
                <button
                  aria-label={
                    confirmPasswordVisible ? t.hidePassword : t.showPassword
                  }
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() =>
                    setConfirmPasswordVisible((current) => !current)
                  }
                  type="button"
                >
                  {confirmPasswordVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            <Button className="w-full" disabled={loading} type="submit">
              {loading ? <Swirling className="mr-2 h-4 w-4" /> : null}
              {loading ? t.submitting : t.submit}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center bg-muted p-6">
          <Swirling className="h-6 w-6 text-primary" />
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
