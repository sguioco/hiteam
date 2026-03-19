"use client";

import { ChangeEvent, FormEvent, use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

type InvitationPayload = {
  id: string;
  email: string;
  status: string;
  tenantName: string;
  tenantSlug: string;
  expiresAt: string;
  submittedAt: string | null;
  registrationCompleted: boolean;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

export default function JoinInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    password: "",
    firstName: "",
    lastName: "",
    middleName: "",
    birthDate: "",
    gender: "male",
    phone: "",
  });

  useEffect(() => {
    void apiRequest<InvitationPayload>(`/employees/invitations/public/${token}`)
      .then((payload) => {
        setInvitation(payload);
        setForm((current) => ({
          ...current,
          firstName: payload.firstName ?? current.firstName,
          lastName: payload.lastName ?? current.lastName,
          phone: payload.phone ?? current.phone,
        }));
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Не удалось открыть приглашение.");
      })
      .finally(() => setLoading(false));
  }, [token]);

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
        invitation?.status === "APPROVED"
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

  if (loading) {
    return (
      <main className="auth-gate">
        <div className="auth-gate-card">Проверяем приглашение...</div>
      </main>
    );
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

  if (invitation.status === "PENDING_APPROVAL" || (invitation.status === "APPROVED" && invitation.registrationCompleted)) {
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
          <h1>{invitation.status === "APPROVED" ? "Завершите активацию доступа" : "Присоединение к компании"}</h1>
          <p>
            {invitation.status === "APPROVED"
              ? <>Руководитель уже одобрил вашу заявку в <strong>{invitation.tenantName}</strong>. Завершите профиль и задайте пароль для входа.</>
              : <>Компания <strong>{invitation.tenantName}</strong> приглашает вас присоединиться к системе. Заполните обязательные поля, чтобы отправить профиль руководителю на подтверждение.</>}
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
            <span>Пароль</span>
            <input
              minLength={8}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              type="password"
              value={form.password}
            />
          </label>
          <label>
            <span>Имя</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              required
              value={form.firstName}
            />
          </label>
          <label>
            <span>Фамилия</span>
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
            <span>Дата рождения</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
              required
              type="date"
              value={form.birthDate}
            />
          </label>
          <label>
            <span>Пол</span>
            <select
              className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm"
              onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
              value={form.gender}
            >
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select>
          </label>
          <label>
            <span>Телефон</span>
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
