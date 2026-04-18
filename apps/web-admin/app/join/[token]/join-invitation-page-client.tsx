"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import {
  type AuthSession,
  persistSession,
  resolvePostLoginRoute,
  saveTenantSlug,
} from "@/lib/auth";
import { DateOfBirthField } from "@/components/ui/date-of-birth-field";
import { AppSelectField } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import type { PublicInvitationPayload } from "../invitation-types";

type JoinInvitationPageClientProps = {
  initialError?: string | null;
  initialInvitation: PublicInvitationPayload | null;
  token: string;
};

export default function JoinInvitationPageClient({
  initialError = null,
  initialInvitation,
  token,
}: JoinInvitationPageClientProps) {
  const router = useRouter();
  const { locale } = useI18n();
  const [invitation] = useState<PublicInvitationPayload | null>(initialInvitation);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [step, setStep] = useState<"password" | "profile">("password");
  const requiredMark = <span className="ml-1 text-[color:var(--destructive)]">*</span>;
  const [form, setForm] = useState(() => ({
    password: "",
    firstName: initialInvitation?.firstName ?? "",
    lastName: initialInvitation?.lastName ?? "",
    middleName: "",
    birthDate: "",
    gender: "male",
    phone: initialInvitation?.phone ?? "",
  }));

  const invitationStatus = invitation?.status;
  const isAlreadySubmitted = useMemo(
    () => Boolean(invitation?.registrationCompleted),
    [invitation?.registrationCompleted],
  );

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarDataUrl(null);
      return;
    }

    const nextDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(locale === "ru" ? "Не удалось прочитать файл." : "Failed to read the file."));
      reader.readAsDataURL(file);
    });

    setAvatarDataUrl(nextDataUrl);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest(`/employees/invitations/public/${token}/register`, {
        method: "POST",
        realBackend: true,
        body: JSON.stringify({
          ...form,
          avatarDataUrl: avatarDataUrl ?? undefined,
        }),
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : locale === "ru"
            ? "Не удалось завершить регистрацию."
            : "Failed to complete registration.",
      );
      setSubmitting(false);
      return;
    }

    try {
      const session = await apiRequest<AuthSession>("/auth/login", {
        method: "POST",
        realBackend: true,
        body: JSON.stringify({
          tenantSlug: invitation?.tenantSlug,
          email: invitation?.email,
          password: form.password,
        }),
      });

      await persistSession(session);
      saveTenantSlug(invitation?.tenantSlug ?? "");
      setSuccess(
        locale === "ru"
          ? "Аккаунт создан. Открываем рабочее пространство."
          : "Your account is ready. Opening the workspace.",
      );
      window.setTimeout(() => {
        window.location.replace(resolvePostLoginRoute(session));
      }, 500);
    } catch {
      if (!invitation) {
        setError(
          locale === "ru"
            ? "Аккаунт создан, но автоматический вход не выполнился."
            : "The account is ready, but automatic sign-in failed.",
        );
        setSubmitting(false);
        return;
      }

      setSuccess(
        locale === "ru"
          ? "Профиль создан, но автоматический вход не выполнился. Откроем обычный вход."
          : "The profile is ready, but automatic sign-in failed. Opening the regular sign-in.",
      );
      setError(null);
      window.setTimeout(() => {
        router.replace(`/login?tenant=${encodeURIComponent(invitation.tenantSlug)}`);
      }, 900);
    } finally {
      setSubmitting(false);
    }
  }

  function handleContinueToProfile() {
    if (form.password.trim().length < 8) {
      setError(
        locale === "ru"
          ? "Пароль должен быть не короче 8 символов."
          : "Password must be at least 8 characters long.",
      );
      return;
    }

    setError(null);
    setStep("profile");
  }

  if (error && !invitation) {
    return (
      <main className="auth-gate">
        <div className="auth-gate-card max-w-[520px] text-left">
          <h1 className="text-2xl font-heading font-bold text-[color:var(--foreground)]">
            {locale === "ru" ? "Приглашение недоступно" : "Invitation unavailable"}
          </h1>
          <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">{error}</p>
          <Link className="solid-button mt-6 inline-flex" href="/login">
            {locale === "ru" ? "На страницу входа" : "Go to sign-in"}
          </Link>
        </div>
      </main>
    );
  }

  if (!invitation) {
    return null;
  }

  if (isAlreadySubmitted) {
    return (
      <main className="auth-gate">
        <div className="auth-gate-card max-w-[520px] text-left">
          <h1 className="text-2xl font-heading font-bold text-[color:var(--foreground)]">
            {locale === "ru" ? "Профиль уже отправлен" : "Profile already submitted"}
          </h1>
          <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
            {locale === "ru"
              ? `Для ${invitation.email} аккаунт уже создан. Просто войдите в систему.`
              : `An account for ${invitation.email} has already been created. Just sign in.`}
          </p>
          <Link className="solid-button mt-6 inline-flex" href="/login">
            {locale === "ru" ? "Войти" : "Sign in"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-panel max-w-[1080px]">
        <div className="login-copy">
          <div className="login-topline">
            <span className="eyebrow">{locale === "ru" ? "Приглашение" : "Invitation"}</span>
          </div>
          <h1>
            {locale === "ru" ? "Присоединение к команде" : "Join the team"}
          </h1>
          <p>
            {step === "password" ? (
              <>
                {locale === "ru" ? (
                  <>
                    Компания <strong>{invitation.tenantName}</strong> уже добавила ваш email. Сначала придумайте пароль,
                    затем заполните профиль.
                  </>
                ) : (
                  <>
                    <strong>{invitation.tenantName}</strong> has already added your email. Start by creating a password,
                    then fill in your profile.
                  </>
                )}
              </>
            ) : (
              <>
                {locale === "ru" ? (
                  <>
                    Пароль готов. Теперь заполните обязательные поля, и мы сразу откроем ваше рабочее пространство.
                  </>
                ) : (
                  <>
                    Your password is set. Complete the required fields and we will open your workspace right away.
                  </>
                )}
              </>
            )}
          </p>
          <div className="preview-card mt-6">
            <span className="section-kicker">Email</span>
            <strong>{invitation.email}</strong>
            <p>
              {locale === "ru" ? "Ссылка действует до " : "The link is valid until "}
              {new Date(invitation.expiresAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}.
            </p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input disabled value={invitation.email} />
          </label>

          {step === "password" ? (
            <>
              <label>
                <span>{locale === "ru" ? "Пароль" : "Password"}{requiredMark}</span>
                <input
                  minLength={8}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                  type="password"
                  value={form.password}
                />
              </label>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
                {locale === "ru"
                  ? "После этого шага вы перейдёте к личным данным и сразу завершите вход в команду."
                  : "After this step, you will move to personal details and finish joining the team right away."}
              </div>
            </>
          ) : (
            <>
              <label>
                <span>{locale === "ru" ? "Имя" : "First name"}{requiredMark}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, firstName: event.target.value }))
                  }
                  required
                  value={form.firstName}
                />
              </label>
              <label>
                <span>{locale === "ru" ? "Фамилия" : "Last name"}{requiredMark}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, lastName: event.target.value }))
                  }
                  required
                  value={form.lastName}
                />
              </label>
              <label>
                <span>{locale === "ru" ? "Отчество" : "Middle name"}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, middleName: event.target.value }))
                  }
                  value={form.middleName}
                />
              </label>
              <label>
                <span>{locale === "ru" ? "Дата рождения" : "Date of birth"}{requiredMark}</span>
                <DateOfBirthField
                  value={form.birthDate}
                  onChange={(nextValue) =>
                    setForm((current) => ({ ...current, birthDate: nextValue }))
                  }
                  triggerClassName="rounded-2xl px-4 py-3"
                />
              </label>
              <label>
                <span>{locale === "ru" ? "Пол" : "Gender"}{requiredMark}</span>
                <AppSelectField
                  value={form.gender}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, gender: value }))
                  }
                  options={[
                    { value: "male", label: locale === "ru" ? "Мужской" : "Male" },
                    { value: "female", label: locale === "ru" ? "Женский" : "Female" },
                  ]}
                  triggerClassName="rounded-2xl px-4 py-3"
                />
              </label>
              <label>
                <span>{locale === "ru" ? "Телефон" : "Phone"}{requiredMark}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  required
                  value={form.phone}
                />
              </label>
              <label>
                <span>{locale === "ru" ? "Аватар" : "Avatar"}</span>
                <input accept="image/*" onChange={handleAvatarChange} type="file" />
              </label>
            </>
          )}
          {error ? <div className="error-box">{error}</div> : null}
          {success ? <div className="success-box">{success}</div> : null}
          {step === "password" ? (
            <button
              className="solid-button"
              disabled={submitting}
              onClick={handleContinueToProfile}
              type="button"
            >
              {locale === "ru" ? "Далее" : "Continue"}
            </button>
          ) : (
            <button className="solid-button" disabled={submitting} type="submit">
              {submitting
                ? locale === "ru"
                  ? "Создаём аккаунт..."
                  : "Creating account..."
                : locale === "ru"
                  ? "Создать аккаунт"
                  : "Create account"}
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
