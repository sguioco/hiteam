"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { DateOfBirthField } from "@/components/ui/date-of-birth-field";
import { AppSelectField } from "@/components/ui/select";
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
      reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
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
          ? "Доступ завершён. Теперь можно войти в систему."
          : "Профиль отправлен руководителю на подтверждение. Теперь можно войти в систему.",
      );
      setTimeout(() => router.replace("/login"), 1200);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось завершить регистрацию.");
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !invitation) {
    return (
      <main className="auth-gate">
        <div className="auth-gate-card max-w-[520px] text-left">
          <h1 className="text-2xl font-heading font-bold text-[color:var(--foreground)]">Приглашение недоступно</h1>
          <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">{error}</p>
          <Link className="solid-button mt-6 inline-flex" href="/login">
            На страницу входа
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
          <h1 className="text-2xl font-heading font-bold text-[color:var(--foreground)]">Профиль уже отправлен</h1>
          <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
            Для {invitation.email} анкета уже заполнена. Войдите в систему и дождитесь подтверждения руководителя.
          </p>
          <Link className="solid-button mt-6 inline-flex" href="/login">
            Войти
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
            <span className="eyebrow">Приглашение</span>
          </div>
          <h1>{invitationStatus === "APPROVED" ? "Завершите активацию доступа" : "Присоединение к компании"}</h1>
          <p>
            {invitationStatus === "APPROVED" ? (
              <>
                Руководитель уже одобрил вашу заявку в <strong>{invitation.tenantName}</strong>. Завершите профиль и
                задайте пароль для входа.
              </>
            ) : (
              <>
                Компания <strong>{invitation.tenantName}</strong> приглашает вас присоединиться к системе. Заполните
                обязательные поля, чтобы отправить профиль руководителю на подтверждение.
              </>
            )}
          </p>
          <div className="preview-card mt-6">
            <span className="section-kicker">Email</span>
            <strong>{invitation.email}</strong>
            <p>Ссылка действует до {new Date(invitation.expiresAt).toLocaleString("ru-RU")}.</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input disabled value={invitation.email} />
          </label>
          <label>
            <span>Пароль{requiredMark}</span>
            <input
              minLength={8}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              type="password"
              value={form.password}
            />
          </label>
          <label>
            <span>Имя{requiredMark}</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              required
              value={form.firstName}
            />
          </label>
          <label>
            <span>Фамилия{requiredMark}</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              required
              value={form.lastName}
            />
          </label>
          <label>
            <span>Отчество</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, middleName: event.target.value }))}
              value={form.middleName}
            />
          </label>
          <label>
            <span>Дата рождения{requiredMark}</span>
            <DateOfBirthField
              value={form.birthDate}
              onChange={(nextValue) => setForm((current) => ({ ...current, birthDate: nextValue }))}
              triggerClassName="rounded-2xl px-4 py-3"
            />
          </label>
          <label>
            <span>Пол{requiredMark}</span>
            <AppSelectField
              value={form.gender}
              onValueChange={(value) => setForm((current) => ({ ...current, gender: value }))}
              options={[
                { value: "male", label: "Мужской" },
                { value: "female", label: "Женский" },
              ]}
              triggerClassName="rounded-2xl px-4 py-3"
            />
          </label>
          <label>
            <span>Телефон{requiredMark}</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              required
              value={form.phone}
            />
          </label>
          <label>
            <span>Аватар</span>
            <input accept="image/*" onChange={handleAvatarChange} type="file" />
          </label>
          {error ? <div className="error-box">{error}</div> : null}
          {success ? <div className="success-box">{success}</div> : null}
          <button className="solid-button" disabled={submitting} type="submit">
            {submitting ? "Отправляем..." : "Готово"}
          </button>
        </form>
      </section>
    </main>
  );
}
