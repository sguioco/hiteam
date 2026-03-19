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
};

export default function ManagerJoinPage({
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

  const [form, setForm] = useState({
    password: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "male",
    phone: "",
    companyName: "",
    address: "",
  });

  useEffect(() => {
    void apiRequest<InvitationPayload>(`/employees/invitations/public/${token}`)
      .then(setInvitation)
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Не удалось открыть приглашение.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitation) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Register
      await apiRequest(`/employees/invitations/public/${token}/register`, {
        method: "POST",
        body: JSON.stringify({
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          middleName: "",
          birthDate: form.birthDate,
          gender: form.gender,
          phone: form.phone,
        }),
      });

      // 2. Login to get token
      const authData = await apiRequest<{ accessToken: string }>(`/auth/login`, {
        method: "POST",
        body: JSON.stringify({
          tenantSlug: invitation.tenantSlug,
          email: invitation.email,
          password: form.password,
        }),
      });

      // 3. Setup company Info
      await apiRequest(`/org/setup`, {
        method: "POST",
        token: authData.accessToken,
        body: JSON.stringify({
          mode: "create",
          companyName: form.companyName,
          address: form.address,
          latitude: 0,
          longitude: 0,
          geofenceRadiusMeters: 100,
          timezone: "UTC",
        }),
      });

      setSuccess("Организация успешно настроена. Сейчас вы будете перенаправлены.");
      setTimeout(() => router.replace("/login"), 1500);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Произошла ошибка при настройке.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="auth-gate">
        <div className="auth-gate-card">Загрузка...</div>
      </main>
    );
  }

  if (error && !invitation) {
    return (
      <main className="auth-gate">
        <div className="auth-gate-card max-w-[520px] text-left">
          <h1 className="text-2xl font-bold">Приглашение недоступно</h1>
          <p className="mt-3 text-sm text-gray-500">{error}</p>
        </div>
      </main>
    );
  }

  if (!invitation) return null;

  return (
    <main className="login-page">
      <section className="login-panel max-w-[800px]">
        <div className="login-copy">
          <h1>Создание первой организации</h1>
          <p>Пожалуйста, заполните данные вашего профиля и базовую информацию о компании.</p>
        </div>

        <form className="login-form mt-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <label>
              <span>Email</span>
              <input disabled value={invitation.email} />
            </label>
            <label>
              <span>Пароль</span>
              <input
                required
                minLength={8}
                type="password"
                onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
                value={form.password}
              />
            </label>
            <label>
              <span>Имя</span>
              <input
                required
                onChange={(e) => setForm((c) => ({ ...c, firstName: e.target.value }))}
                value={form.firstName}
              />
            </label>
            <label>
              <span>Фамилия</span>
              <input
                required
                onChange={(e) => setForm((c) => ({ ...c, lastName: e.target.value }))}
                value={form.lastName}
              />
            </label>
            <label>
              <span>Дата рождения</span>
              <input
                required
                type="date"
                onChange={(e) => setForm((c) => ({ ...c, birthDate: e.target.value }))}
                value={form.birthDate}
              />
            </label>
            <label>
              <span>Телефон</span>
              <input
                required
                onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
                value={form.phone}
              />
            </label>
            <div className="col-span-2">
              <hr className="my-4 border-[color:var(--border)]" />
              <h2 className="text-lg font-bold mb-4">Данные компании</h2>
            </div>
            <label className="col-span-2">
              <span>Название компании</span>
              <input
                required
                onChange={(e) => setForm((c) => ({ ...c, companyName: e.target.value }))}
                value={form.companyName}
              />
            </label>
            <label className="col-span-2">
              <span>Адрес главного офиса</span>
              <input
                required
                onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))}
                value={form.address}
              />
            </label>
          </div>
          {error && <div className="error-box mt-4">{error}</div>}
          {success && <div className="success-box mt-4">{success}</div>}
          <button className="solid-button mt-6 w-full" disabled={submitting} type="submit">
            {submitting ? "Создание..." : "Создать компанию"}
          </button>
        </form>
      </section>
    </main>
  );
}
