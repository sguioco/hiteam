'use client';

import { useEffect, useRef, useState } from 'react';
import { KeyRound, LogOut, Mail, Shield, UploadCloud, UserRound } from 'lucide-react';
import { AdminShell } from '../../components/admin-shell';
import { ImageAdjustField } from '../../components/image-adjust-field';
import { AuthSession, destroySession, getSession, isEmployeeOnlyRole, redirectToLogin } from '../../lib/auth';
import { apiRequest } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { buildUserDisplayName, getDisplayInitials } from '../../lib/profile-display';
import { readStoredProfileAvatar, writeStoredProfileAvatar } from '../../lib/profile-avatar';

type ProfileEmployee = {
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export default function ProfilePageClient({
  initialEmployee,
  initialSession,
}: {
  initialEmployee?: ProfileEmployee | null;
  initialSession: AuthSession;
}) {
  const { locale } = useI18n();
  const [employeeMode, setEmployeeMode] = useState(
    isEmployeeOnlyRole(initialSession.user.roleCodes),
  );
  const [session, setSession] = useState<AuthSession>(initialSession);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialEmployee?.avatarUrl ?? readStoredProfileAvatar(),
  );
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<ProfileEmployee | null>(initialEmployee ?? null);
  const didUseInitialEmployee = useRef(Boolean(initialEmployee));

  useEffect(() => {
    const s = getSession();
    if (!s) {
      redirectToLogin();
      return;
    }

    setSession(s);
    setEmployeeMode(isEmployeeOnlyRole(s.user.roleCodes));

    if (didUseInitialEmployee.current && initialEmployee) {
      didUseInitialEmployee.current = false;
      if (initialEmployee.avatarUrl) {
        setAvatarPreview(initialEmployee.avatarUrl);
        writeStoredProfileAvatar(initialEmployee.avatarUrl);
      } else {
        setAvatarPreview(readStoredProfileAvatar());
      }
      return;
    }

    void apiRequest<ProfileEmployee | null>('/employees/me', {
      token: s.accessToken,
      realBackend: true,
    })
      .then((employee) => {
        setEmployee(employee);

        if (employee?.avatarUrl) {
          setAvatarPreview(employee.avatarUrl);
          writeStoredProfileAvatar(employee.avatarUrl);
          return;
        }

        setAvatarPreview(readStoredProfileAvatar());
      })
      .catch(() => {
        setAvatarPreview(readStoredProfileAvatar());
      });
  }, [initialEmployee]);

  async function handleSignOut() {
    await destroySession();
    redirectToLogin();
  }

  function handleAvatarChange(nextAvatarDataUrl: string | null) {
    setAvatarPreview(nextAvatarDataUrl);
    writeStoredProfileAvatar(nextAvatarDataUrl);
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
  const roleLabel = user.roleCodes.map((code) => roleLabels[code] ?? code).join(', ');
  const fullName = buildUserDisplayName(employee?.firstName, employee?.lastName);
  const displayName = fullName || user.email;
  const avatarFallback = getDisplayInitials(displayName || user.email);

  return (
    <AdminShell mode={employeeMode ? "employee" : "admin"}>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 font-heading text-2xl font-bold">
          {locale === 'ru' ? 'Профиль' : 'Profile'}
        </h1>

        <div className="space-y-4">
          {avatarError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {avatarError}
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-card p-6">
            <ImageAdjustField
              dialogDescription={
                locale === 'ru'
                  ? 'Подгони кадр так, как он должен выглядеть в профиле.'
                  : 'Adjust the frame so it looks right in the profile.'
              }
              dialogTitle={locale === 'ru' ? 'Редактировать фото профиля' : 'Edit profile photo'}
              onChange={handleAvatarChange}
              onError={setAvatarError}
              previewAlt={displayName}
              renderTrigger={({ chooseFile, openEditor, previewSrc }) => (
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="flex shrink-0 flex-col items-start gap-3">
                    <button className="cursor-pointer" onClick={openEditor} type="button">
                      <span className="org-setup-avatar org-logo-preview">
                        {previewSrc ? (
                          <img alt={displayName} src={previewSrc} />
                        ) : (
                          avatarFallback
                        )}
                      </span>
                    </button>
                    <p className="text-sm font-semibold text-foreground">
                      {locale === 'ru' ? 'Фото профиля' : 'Profile photo'}
                    </p>
                  </div>

                  <button
                    className="inline-flex shrink-0 cursor-pointer items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50 sm:mt-6"
                    onClick={chooseFile}
                    type="button"
                  >
                    <UploadCloud className="size-4" />
                    {locale === 'ru' ? 'Изменить фото' : 'Change photo'}
                  </button>

                  <div className="min-w-0 pt-0 sm:flex-1 sm:pt-6">
                    <p className="text-lg font-bold text-foreground">{displayName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {locale === 'ru'
                        ? 'Личные данные аккаунта'
                        : 'Personal account details'}
                    </p>
                  </div>
                </div>
              )}
              value={avatarPreview}
            />

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <UserRound className="size-4 text-muted-foreground" />
                <dt className="w-32 text-muted-foreground">
                  {locale === 'ru' ? 'Имя' : 'Name'}
                </dt>
                <dd className="font-medium">
                  {fullName || (locale === 'ru' ? 'Не указано' : 'Not provided')}
                </dd>
              </div>
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
