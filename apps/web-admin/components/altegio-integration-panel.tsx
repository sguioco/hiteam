"use client";

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CalendarRange,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Unlink,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AltegioPilotConnect } from "@/components/altegio-pilot-connect";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  formatAltegioIntegrationSubtitle,
  resolveAltegioIntegrationView,
  type AltegioMarketplaceStatus,
  type AltegioPilotStatus,
} from "@/lib/altegio-integration";
import { useI18n } from "@/lib/i18n";

type AltegioIntegrationPanelProps = {
  className?: string;
  marketplace?: AltegioMarketplaceStatus | null;
  onMarketplaceAction?: () => void;
};

type AltegioSyncStatus = {
  connected: boolean;
  staffLastSyncedAt: string | null;
  scheduleLastSyncedAt: string | null;
  lastError: string | null;
  linkedEmployees: number;
  totalEmployees: number;
  altegioShifts: number;
  hiteamPublishedShifts: number;
  b2bConfigured: boolean;
};

export function AltegioIntegrationPanel({
  className,
  marketplace,
  onMarketplaceAction,
}: AltegioIntegrationPanelProps) {
  const { locale } = useI18n();
  const [pilotStatus, setPilotStatus] = useState<AltegioPilotStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<AltegioSyncStatus | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncActionError, setSyncActionError] = useState<string | null>(null);

  async function loadSyncStatus() {
    const session = getSession();
    if (!session) return;
    try {
      setSyncLoading(true);
      setSyncStatus(
        await apiRequest<AltegioSyncStatus>("/altegio/sync/status", {
          token: session.accessToken,
          skipClientCache: true,
        }),
      );
    } catch {
      setSyncStatus(null);
    } finally {
      setSyncLoading(false);
    }
  }

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    void apiRequest<AltegioPilotStatus>("/altegio/pilot", { token: session.accessToken })
      .then(setPilotStatus)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void loadSyncStatus();
  }, []);

  async function syncNow() {
    const session = getSession();
    if (!session) return;
    try {
      setSyncing(true);
      setSyncActionError(null);
      await apiRequest("/altegio/sync", {
        method: "POST",
        token: session.accessToken,
      });
      await loadSyncStatus();
    } catch (cause) {
      setSyncActionError(
        cause instanceof Error
          ? cause.message
          : locale === "ru"
            ? "Не удалось запустить синхронизацию."
            : "Unable to start synchronization.",
      );
    } finally {
      setSyncing(false);
    }
  }

  const view = useMemo(
    () => resolveAltegioIntegrationView(marketplace, pilotStatus),
    [marketplace, pilotStatus],
  );
  const subtitle = formatAltegioIntegrationSubtitle(view, locale);

  const formatSyncDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : locale === "ru"
        ? "ещё не выполнялась"
        : "not run yet";

  const employeeSyncPercent = syncStatus?.totalEmployees
    ? Math.min(100, Math.round((syncStatus.linkedEmployees / syncStatus.totalEmployees) * 100))
    : 0;

  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.07)] ${className ?? ""}`}
    >
      <div className="relative overflow-hidden border-b border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#f7f9ff_62%,#fffbea_100%)] px-6 py-6 sm:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#ffe36a]/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex -space-x-3">
              <div className="relative z-10 h-14 w-14 overflow-hidden rounded-2xl border-[3px] border-white shadow-[0_10px_28px_rgba(237,194,15,0.22)]">
                <img alt="Altegio" className="h-full w-full object-cover" src="/altegio-logo.png" />
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-white bg-[#eef3ff] shadow-sm">
                <span className="font-serif text-lg font-semibold italic text-[#111827]">HT</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-heading text-xl font-semibold tracking-[-0.03em] text-foreground">
                  Altegio
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    view.connected
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      view.connected ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {view.connected
                    ? locale === "ru"
                      ? "Подключено"
                      : "Connected"
                    : locale === "ru"
                      ? "Не подключено"
                      : "Not connected"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                marketplace?.connected
                  ? "border border-slate-200 bg-white text-foreground shadow-sm hover:bg-slate-50"
                  : "bg-[#22262c] text-white shadow-sm hover:bg-[#111418]"
              }`}
              onClick={onMarketplaceAction}
              type="button"
            >
              {marketplace?.connected ? (
                <Unlink className="h-4 w-4" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {marketplace?.connected
                ? locale === "ru"
                  ? "Отключить"
                  : "Disconnect"
                : locale === "ru"
                  ? "Подключить"
                  : "Connect"}
            </button>
            <AltegioPilotConnect
              onStatusChange={setPilotStatus}
              pilotStatus={pilotStatus}
              skipInitialFetch
            />
          </div>
        </div>
      </div>

      {syncStatus?.connected ? (
        <div className="p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg font-semibold tracking-[-0.02em] text-foreground">
                  {locale === "ru" ? "Состояние синхронизации" : "Synchronization status"}
                </h3>
                {!syncStatus.lastError && !syncActionError ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {locale === "ru" ? "Работает" : "Healthy"}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {locale === "ru"
                  ? "Данные сотрудников и расписания обновляются между системами."
                  : "Employee and schedule data are kept up to date across both systems."}
              </p>
            </div>
            <button
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[color:var(--accent)] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(61,87,201,0.2)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={syncing || !syncStatus.b2bConfigured}
              onClick={() => void syncNow()}
              type="button"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing
                ? locale === "ru"
                  ? "Синхронизация…"
                  : "Synchronizing…"
                : locale === "ru"
                  ? "Синхронизировать"
                  : "Sync now"}
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-[#f8faff] p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">
                  {locale === "ru" ? "Связано сотрудников" : "Linked employees"}
                </span>
                <UsersRound className="h-4 w-4 text-[#5577e8]" />
              </div>
              <p className="mt-3 font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground">
                {syncStatus.linkedEmployees}
                <span className="ml-1 text-base font-medium text-muted-foreground">
                  / {syncStatus.totalEmployees}
                </span>
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e7ecfb]">
                <div
                  className="h-full rounded-full bg-[#5577e8] transition-[width]"
                  style={{ width: `${employeeSyncPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-[#fbfcfe] p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">
                  {locale === "ru" ? "Смен из Altegio" : "Shifts from Altegio"}
                </span>
                <ArrowDownToLine className="h-4 w-4 text-[#5577e8]" />
              </div>
              <p className="mt-3 font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground">
                {syncStatus.altegioShifts}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {locale === "ru" ? "Импортировано в HiTeam" : "Imported into HiTeam"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-[#fbfcfe] p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">
                  {locale === "ru" ? "Смен из HiTeam" : "Shifts from HiTeam"}
                </span>
                <ArrowUpFromLine className="h-4 w-4 text-[#5577e8]" />
              </div>
              <p className="mt-3 font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground">
                {syncStatus.hiteamPublishedShifts}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {locale === "ru" ? "Опубликовано в Altegio" : "Published to Altegio"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-[#fbfcfe] p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">
                  {locale === "ru" ? "Последнее обновление" : "Last updated"}
                </span>
                <RefreshCw className={`h-4 w-4 text-[#5577e8] ${syncLoading ? "animate-spin" : ""}`} />
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-foreground">
                {formatSyncDate(syncStatus.scheduleLastSyncedAt ?? syncStatus.staffLastSyncedAt)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {locale === "ru" ? "Автоматическая синхронизация" : "Automatic synchronization"}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80">
            <div className="grid items-center gap-3 border-b border-slate-100 px-4 py-3.5 sm:grid-cols-[1fr_auto_1fr] sm:px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef3ff] text-[#5577e8]">
                  <UsersRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {locale === "ru" ? "Сотрудники" : "Employees"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSyncDate(syncStatus.staffLastSyncedAt)}
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-2 text-xs font-semibold text-[#5577e8] sm:flex">
                Altegio <ArrowDownToLine className="h-3.5 w-3.5" /> HiTeam
              </div>
              <p className="text-xs leading-5 text-muted-foreground sm:text-right">
                {locale === "ru"
                  ? "Импорт и привязка профилей без дублей"
                  : "Profile import and linking without duplicates"}
              </p>
            </div>

            <div className="grid items-center gap-3 px-4 py-3.5 sm:grid-cols-[1fr_auto_1fr] sm:px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff8dc] text-[#aa7b00]">
                  <CalendarRange className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {locale === "ru" ? "Расписание" : "Schedule"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSyncDate(syncStatus.scheduleLastSyncedAt)}
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-2 text-xs font-semibold text-[#5577e8] sm:flex">
                Altegio <ArrowLeftRight className="h-3.5 w-3.5" /> HiTeam
              </div>
              <p className="text-xs leading-5 text-muted-foreground sm:text-right">
                {locale === "ru"
                  ? "Импорт смен и публикация изменений"
                  : "Shift import and change publishing"}
              </p>
            </div>
          </div>

          {!syncStatus.b2bConfigured ? (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {locale === "ru"
                ? "Ручная синхронизация пока недоступна: нужны партнёрские токены Altegio."
                : "Manual synchronization requires Altegio partner tokens."}
            </p>
          ) : null}
          {syncStatus.lastError || syncActionError ? (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {syncActionError ?? syncStatus.lastError}
            </p>
          ) : null}
        </div>
      ) : view.connected ? (
        <div className="flex min-h-44 items-center justify-center px-6 py-8 text-sm text-muted-foreground">
          <RefreshCw className={`mr-2 h-4 w-4 ${syncLoading ? "animate-spin" : ""}`} />
          {locale === "ru" ? "Получаем состояние синхронизации…" : "Loading synchronization status…"}
        </div>
      ) : (
        <div className="px-6 py-7 sm:px-7">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-6 text-center">
            <p className="font-heading font-semibold text-foreground">
              {locale === "ru" ? "Подключите Altegio, чтобы начать" : "Connect Altegio to get started"}
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {locale === "ru"
                ? "После подключения здесь появятся сотрудники, расписание и состояние обмена данными."
                : "Once connected, employee, schedule, and synchronization details will appear here."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
