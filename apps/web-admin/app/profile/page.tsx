'use client';

import { useEffect, useMemo, useState } from 'react';
import { KeyRound, LogOut, Mail, Shield } from 'lucide-react';
import { AdminShell } from '../../components/admin-shell';
import { SessionLoader } from '../../components/session-loader';
import Upload from '../../components/ui/Upload';
import { AuthSession, clearSession, getSession, redirectToLogin } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

const PROFILE_AVATAR_STORAGE_KEY = 'smart-admin-profile-avatar';

export default function ProfilePage() {
  const { locale } = useI18n();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      redirectToLogin();
      return;
    }

    setSession(s);

    const savedAvatar =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(PROFILE_AVATAR_STORAGE_KEY)
        : null;
    setAvatarPreview(savedAvatar || null);
  }, []);

  function handleSignOut() {
    clearSession();
    redirectToLogin();
  }

  async function handleAvatarChange(files: File[]) {
    const file = files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        return;
      }

      setAvatarPreview(result);
      window.localStorage.setItem(PROFILE_AVATAR_STORAGE_KEY, result);
    };
    reader.readAsDataURL(file);
  }

  if (!session) {
    return <SessionLoader label={locale === 'ru' ? 'Проверяем сессию' : 'Checking session'} />;
  }

  const user = session.user;
  const roleLabels: Record<string, string> = {
    tenant_owner: locale === 'ru' ? 'Владелец' : 'Owner',
    hr_admin: 'HR Admin',
    operations_admin:
      locale === 'ru' ? 'Операционный администратор' : 'Operations Admin',
    manager: locale === 'ru' ? 'Менеджер' : 'Manager',
    employee: locale === 'ru' ? 'Сотрудник' : 'Employee',
  };
  const roleLabel = useMemo(
    () => user.roleCodes.map((code) => roleLabels[code] ?? code).join(', '),
    [user.roleCodes],
  );

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 font-heading text-2xl font-bold">
          {locale === 'ru' ? 'Профиль' : 'Profile'}
        </h1>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Upload
                accept="image/*"
                buttonLabel={locale === 'ru' ? 'Изменить фото' : 'Change photo'}
                className="org-logo-upload"
                description={
                  locale === 'ru'
                    ? 'Можно поставить своё фото профиля.'
                    : 'Upload your profile photo.'
                }
                onFilesChange={handleAvatarChange}
                title={locale === 'ru' ? 'Фото профиля' : 'Profile photo'}
                visual={
                  <span className="org-setup-avatar org-logo-preview">
                    {avatarPreview ? (
                      <img alt={user.email} src={avatarPreview} />
                    ) : (
                      user.email.slice(0, 2).toUpperCase()
                    )}
                  </span>
                }
              />

              <div>
                <p className="text-lg font-bold text-foreground">{user.email}</p>
                <p className="text-sm text-muted-foreground">
                  {locale === 'ru'
                    ? 'Личные данные аккаунта'
                    : 'Personal account details'}
                </p>
              </div>
            </div>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="size-4 text-muted-foreground" />
                <dt className="w-32 text-muted-foreground">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="size-4 text-muted-foreground" />
                <dt className="w-32 text-muted-foreground">
                  {locale === 'ru' ? 'Роль' : 'Role'}
                </dt>
                <dd className="font-medium">{roleLabel}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <KeyRound className="size-4" />
              {locale === 'ru' ? 'Безопасность' : 'Security'}
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{locale === 'ru' ? 'Пароль' : 'Password'}</p>
              </div>
              <button
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
                type="button"
              >
                {locale === 'ru' ? 'Сменить пароль' : 'Change password'}
              </button>
            </div>
          </div>

          <button
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
            onClick={handleSignOut}
            type="button"
          >
            <LogOut className="size-4" />
            {locale === 'ru' ? 'Выйти из аккаунта' : 'Sign out'}
          </button>
        </div>
      </main>
    </AdminShell>
  );
}
