"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
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
    () =>
      invitationStatus === "PENDING_APPROVAL" ||
      (invitationStatus === "APPROVED" && invitation?.registrationCompleted),
    [invitation?.registrationCompleted, invitationStatus],
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
        body: JSON.stringify({
          ...form,
          avatarDataUrl: avatarDataUrl ?? undefined,
        }),
      });

      setSuccess(
        invitationStatus === "APPROVED"
          ? locale === "ru"
            ? "Доступ завершён. Теперь можно войти в систему."
            : "Access setup is complete. You can sign in now."
          : locale === "ru"
            ? "Профиль отправлен руководителю на подтверждение. Теперь можно войти в систему."
            : "The profile was sent to the manager for approval. You can sign in now.",
      );
      setTimeout(() => router.replace("/login"), 1200);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : locale === "ru"
            ? "Не удалось завершить регистрацию."
            : "Failed to complete registration.",
      );
    } finally {
      setSubmitting(false);
    }
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
              ? `Для ${invitation.email} анкета уже заполнена. Войдите в систему и дождитесь подтверждения руководителя.`
              : `The form for ${invitation.email} has already been completed. Sign in and wait for manager approval.`}
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
            {invitationStatus === "APPROVED"
              ? locale === "ru"
                ? "Завершите активацию доступа"
                : "Complete access activation"
              : locale === "ru"
                ? "Присоединение к компании"
                : "Join the company"}
          </h1>
          <p>
            {invitationStatus === "APPROVED" ? (
              <>
                {locale === "ru" ? (
                  <>
                    Руководитель уже одобрил вашу заявку в <strong>{invitation.tenantName}</strong>. Завершите профиль и
                    задайте пароль для входа.
                  </>
                ) : (
                  <>
                    The manager has already approved your request to join <strong>{invitation.tenantName}</strong>. Complete
                    your profile and set a password to sign in.
                  </>
                )}
              </>
            ) : (
              <>
                {locale === "ru" ? (
                  <>
                    Компания <strong>{invitation.tenantName}</strong> приглашает вас присоединиться к системе. Заполните
                    обязательные поля, чтобы отправить профиль руководителю на подтверждение.
                  </>
                ) : (
                  <>
                    <strong>{invitation.tenantName}</strong> invites you to join the system. Fill in the required fields
                    to send your profile to the manager for approval.
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
          <label>
            <span>{locale === "ru" ? "Пароль" : "Password"}{requiredMark}</span>
            <input
              minLength={8}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              type="password"
              value={form.password}
            />
          </label>
          <label>
            <span>{locale === "ru" ? "Имя" : "First name"}{requiredMark}</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              required
              value={form.firstName}
            />
          </label>
          <label>
            <span>{locale === "ru" ? "Фамилия" : "Last name"}{requiredMark}</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              required
              value={form.lastName}
            />
          </label>
          <label>
            <span>{locale === "ru" ? "Отчество" : "Middle name"}</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, middleName: event.target.value }))}
              value={form.middleName}
            />
          </label>
          <label>
            <span>{locale === "ru" ? "Дата рождения" : "Date of birth"}{requiredMark}</span>
            <DateOfBirthField
              value={form.birthDate}
              onChange={(nextValue) => setForm((current) => ({ ...current, birthDate: nextValue }))}
              triggerClassName="rounded-2xl px-4 py-3"
            />
          </label>
          <label>
            <span>{locale === "ru" ? "Пол" : "Gender"}{requiredMark}</span>
            <AppSelectField
              value={form.gender}
              onValueChange={(value) => setForm((current) => ({ ...current, gender: value }))}
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
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              required
              value={form.phone}
            />
          </label>
          <label>
            <span>{locale === "ru" ? "Аватар" : "Avatar"}</span>
            <input accept="image/*" onChange={handleAvatarChange} type="file" />
          </label>
          {error ? <div className="error-box">{error}</div> : null}
          {success ? <div className="success-box">{success}</div> : null}
          <button className="solid-button" disabled={submitting} type="submit">
            {submitting
              ? locale === "ru"
                ? "Отправляем..."
                : "Submitting..."
              : locale === "ru"
                ? "Готово"
                : "Done"}
          </button>
        </form>
      </section>
    </main>
  );
}
