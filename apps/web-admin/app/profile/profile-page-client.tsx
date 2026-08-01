'use client';

import { useEffect, useRef, useState } from 'react';
import { KeyRound, LogOut, Mail, Shield, Trash2, UploadCloud, UserRound } from 'lucide-react';
import { AdminShell } from '../../components/admin-shell';
import { ImageAdjustField } from '../../components/image-adjust-field';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { AuthSession, destroySession, getSession, isEmployeeOnlyRole, redirectToLogin } from '../../lib/auth';
import { apiRequest } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { buildUserDisplayName } from '../../lib/profile-display';
import { readStoredProfileAvatar, writeStoredProfileAvatar } from '../../lib/profile-avatar';

export type ProfileEmployee = {
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
  const { locale, setLocale } = useI18n();
  const [employeeMode, setEmployeeMode] = useState(
    isEmployeeOnlyRole(initialSession.user.roleCodes),
  );
  const [session, setSession] = useState<AuthSession>(initialSession);
  const avatarScope = session.user.email;
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialEmployee?.avatarUrl ?? readStoredProfileAvatar(initialSession.user.email),
  );
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteInFlight, setDeleteInFlight] = useState(false);
  const [employee, setEmployee] = useState<ProfileEmployee | null>(initialEmployee ?? null);
  const didUseInitialEmployee = useRef(initialEmployee !== undefined);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      redirectToLogin();
      return;
    }

    setSession(s);
    setEmployeeMode(isEmployeeOnlyRole(s.user.roleCodes));

    if (didUseInitialEmployee.current) {
      didUseInitialEmployee.current = false;
      if (initialEmployee?.avatarUrl) {
        setAvatarPreview(initialEmployee.avatarUrl);
        writeStoredProfileAvatar(initialEmployee.avatarUrl, s.user.email);
      } else {
        setAvatarPreview(readStoredProfileAvatar(s.user.email));
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
          writeStoredProfileAvatar(employee.avatarUrl, s.user.email);
          return;
        }

        setAvatarPreview(readStoredProfileAvatar(s.user.email));
      })
      .catch(() => {
        setAvatarPreview(readStoredProfileAvatar(s.user.email));
      });
  }, [initialEmployee]);

  async function handleSignOut() {
    await destroySession();
    redirectToLogin();
  }

  async function handleDeleteAccount() {
    const currentSession = getSession() ?? session;

    setDeleteInFlight(true);
    setDeleteError(null);

    try {
      await apiRequest<{ success: true }>('/auth/me', {
        method: 'DELETE',
        token: currentSession.accessToken,
        realBackend: true,
        skipClientCache: true,
      });
      writeStoredProfileAvatar(null, avatarScope);
      await destroySession();
      redirectToLogin();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : locale === 'ru'
            ? 'Не удалось удалить аккаунт'
            : 'Unable to delete account',
      );
    } finally {
      setDeleteInFlight(false);
    }
  }

  function handleAvatarChange(nextAvatarDataUrl: string | null) {
    setAvatarPreview(nextAvatarDataUrl);
    writeStoredProfileAvatar(nextAvatarDataUrl, avatarScope);
  }

  function handleLanguageChange(nextLocale: string) {
    if (nextLocale === 'ru' || nextLocale === 'en') {
      setLocale(nextLocale);
    }
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
  const languageOptions = [
    {
      icon: '/en.png',
      label: locale === 'ru' ? 'Английский' : 'English',
      value: 'en',
    },
    {
      icon: '/ru.png',
      label: locale === 'ru' ? 'Русский' : 'Russian',
      value: 'ru',
    },
  ] as const;
  const selectedLanguage =
    languageOptions.find((option) => option.value === locale) ?? languageOptions[0];

  return (
    <AdminShell mode={employeeMode ? "employee" : "admin"}>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-heading text-2xl font-bold">
            {locale === 'ru' ? 'Профиль' : 'Profile'}
          </h1>

          <Select value={locale} onValueChange={handleLanguageChange}>
            <SelectTrigger
              aria-label={locale === 'ru' ? 'Язык интерфейса' : 'Interface language'}
              className="min-h-10 w-full rounded-full px-3 py-1.5 sm:w-[176px]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <img
                  alt=""
                  className="h-4 w-5 shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.12)]"
                  src={selectedLanguage.icon}
                />
                <span className="truncate">{selectedLanguage.label}</span>
              </span>
            </SelectTrigger>
            <SelectContent align="end">
              {languageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex min-w-0 items-center gap-2">
                    <img
                      alt=""
                      className="h-4 w-5 shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.12)]"
                      src={option.icon}
                    />
                    <span className="truncate">{option.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
              outputQuality={0.92}
              outputSize={512}
              previewAlt={displayName}
              sourceMaxSide={1024}
              sourceQuality={0.92}
              renderTrigger={({ chooseFile, openEditor, previewSrc }) => (
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="flex shrink-0 flex-col items-start gap-3">
                    <button className="cursor-pointer" onClick={openEditor} type="button">
                      <span className="org-setup-avatar org-logo-preview">
                        {previewSrc ? (
                          <img alt={displayName} src={previewSrc} />
                        ) : (
                          <UserRound className="size-10 text-muted-foreground" />
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
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
                type="button"
              >
                {locale === 'ru' ? 'Сменить пароль' : 'Change password'}
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                disabled={deleteInFlight}
                onClick={() => setDeleteConfirmOpen(true)}
                type="button"
              >
                <Trash2 className="size-4" />
                {locale === 'ru' ? 'Удалить аккаунт' : 'Delete account'}
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

        <Dialog
          onOpenChange={(open) => {
            if (deleteInFlight) return;
            setDeleteConfirmOpen(open);
            if (!open) {
              setDeleteError(null);
            }
          }}
          open={deleteConfirmOpen}
        >
          <DialogContent className="max-w-[460px]">
            <DialogHeader>
              <DialogTitle>
                {locale === 'ru' ? 'Удалить аккаунт?' : 'Delete account?'}
              </DialogTitle>
              <DialogDescription>
                {locale === 'ru'
                  ? 'После подтверждения вход будет отключён, профиль будет обезличен, а активные сессии завершены'
                  : 'After confirmation, sign-in will be disabled, the profile will be anonymized, and active sessions will end'}
              </DialogDescription>
            </DialogHeader>
            {deleteError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {deleteError}
              </div>
            ) : null}
            <DialogFooter>
              <Button
                disabled={deleteInFlight}
                onClick={() => setDeleteConfirmOpen(false)}
                type="button"
                variant="outline"
              >
                {locale === 'ru' ? 'Отмена' : 'Cancel'}
              </Button>
              <Button
                className="bg-red-600 text-white shadow-none hover:bg-red-700"
                disabled={deleteInFlight}
                onClick={() => void handleDeleteAccount()}
                type="button"
              >
                {deleteInFlight
                  ? locale === 'ru'
                    ? 'Удаляем...'
                    : 'Deleting...'
                  : locale === 'ru'
                    ? 'Удалить'
                    : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </AdminShell>
  );
}
