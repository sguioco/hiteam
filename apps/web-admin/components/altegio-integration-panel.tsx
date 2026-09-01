"use client";

import { ExternalLink, RefreshCw, Unlink } from "lucide-react";
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
import { buildAltegioMarketplaceConnectUrl } from "@/lib/altegio-marketplace";
import { useI18n } from "@/lib/i18n";

type AltegioIntegrationPanelProps = {
  className?: string;
  marketplace?: AltegioMarketplaceStatus | null;
  onMarketplaceAction?: () => void;
  onManageIntegration?: () => void;
  variant: "billing" | "organization";
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
  onManageIntegration,
  variant,
}: AltegioIntegrationPanelProps) {
  const { locale } = useI18n();
  const [pilotStatus, setPilotStatus] = useState<AltegioPilotStatus | null>(null);
  const [pilotLoaded, setPilotLoaded] = useState(false);
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
    if (!session) {
      setPilotLoaded(true);
      return;
    }

    void apiRequest<AltegioPilotStatus>("/altegio/pilot", { token: session.accessToken })
      .then((status) => {
        setPilotStatus(status);
        setPilotLoaded(true);
      })
      .catch(() => {
        setPilotLoaded(true);
      });
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
  const marketplaceConnectUrl = buildAltegioMarketplaceConnectUrl(marketplace?.applicationId);

  if (!pilotLoaded && variant === "organization") {
    return null;
  }

  if (variant === "organization" && view.marketplaceConnected) {
    return (
      <div
        className={`mb-6 flex flex-col gap-4 rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,#f4fff9_0%,#ffffff_100%)] px-5 py-4 shadow-[0_12px_36px_rgba(16,185,129,0.08)] sm:flex-row sm:items-center sm:justify-between ${className ?? ""}`}
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[15px] shadow-[0_8px_20px_rgba(236,193,23,0.22)]">
            <img alt="Altegio" className="h-full w-full object-cover" src="/altegio-logo.png" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {locale === "ru" ? "Altegio подключён" : "Altegio connected"}
              {view.locationLabel ? ` · ${view.locationLabel}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {onManageIntegration ? (
          <button
            className="shrink-0 text-sm font-semibold text-[color:var(--accent)]"
            onClick={onManageIntegration}
            type="button"
          >
            {locale === "ru" ? "Управлять интеграцией" : "Manage integration"}
          </button>
        ) : null}
      </div>
    );
  }

  const formatSyncDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : locale === "ru"
        ? "ещё не выполнялась"
        : "not run yet";

  return (
    <>
      <section
      className={`flex flex-col gap-4 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.07)] sm:flex-row sm:items-center sm:justify-between ${
        variant === "organization" ? "mb-6 font-heading" : "font-heading"
      } ${className ?? ""}`}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        {variant === "billing" ? (
          <div className="flex -space-x-2">
            <div className="relative z-10 h-11 w-11 overflow-hidden rounded-xl border-2 border-white shadow-sm">
              <img alt="Altegio" className="h-full w-full object-cover" src="/altegio-logo.png" />
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-white bg-[#eef4ff] shadow-sm">
              <span className="font-serif text-base font-semibold italic text-[#111827]">HT</span>
            </div>
          </div>
        ) : (
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl shadow-sm">
            <img alt="Altegio" className="h-full w-full object-cover" src="/altegio-logo.png" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">Altegio</p>
            {variant === "organization" ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                Marketplace
              </span>
            ) : null}
            {view.connected ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                {locale === "ru" ? "Подключено" : "Connected"}
              </span>
            ) : variant === "billing" ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {locale === "ru" ? "Не подключено" : "Not connected"}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {variant === "billing" ? (
          <button
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
              marketplace?.connected
                ? "border border-[rgba(15,23,42,0.12)] bg-white text-foreground hover:bg-[#f7f8fa]"
                : "cursor-not-allowed bg-slate-200 text-slate-500"
            }`}
            disabled={!marketplace?.connected}
            onClick={onMarketplaceAction}
            type="button"
          >
            {marketplace?.connected ? <Unlink className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
            {marketplace?.connected
              ? locale === "ru"
                ? "Отключить"
                : "Disconnect"
              : locale === "ru"
                ? "Скоро в Marketplace"
                : "Available soon"}
          </button>
        ) : (
          <a
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#22262c] px-4 text-sm font-semibold !text-white transition hover:bg-[#111418] [&_svg]:stroke-white"
            href={marketplaceConnectUrl || "#"}
            rel="noreferrer"
            target="_blank"
          >
            {locale === "ru" ? "Открыть в Altegio" : "Open in Altegio"}
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <AltegioPilotConnect
          onStatusChange={setPilotStatus}
          pilotStatus={pilotStatus}
          skipInitialFetch
        />
      </div>
      </section>
      {variant === "billing" && syncStatus?.connected ? (
        <section className="mt-4 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.07)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">
                {locale === "ru" ? "Синхронизация Altegio" : "Altegio synchronization"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {locale === "ru"
                  ? `Связано сотрудников: ${syncStatus.linkedEmployees} из ${syncStatus.totalEmployees} · смен из Altegio: ${syncStatus.altegioShifts} · опубликовано из HiTeam: ${syncStatus.hiteamPublishedShifts}`
                  : `Linked employees: ${syncStatus.linkedEmployees} of ${syncStatus.totalEmployees} · shifts from Altegio: ${syncStatus.altegioShifts} · published from HiTeam: ${syncStatus.hiteamPublishedShifts}`}
              </p>
            </div>
            <button
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#3d57c9] px-4 text-sm font-semibold text-white transition hover:bg-[#3048ae] disabled:cursor-not-allowed disabled:opacity-60"
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
                  ? "Синхронизировать сейчас"
                  : "Sync now"}
            </button>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <p>{locale === "ru" ? "Сотрудники:" : "Employees:"} {formatSyncDate(syncStatus.staffLastSyncedAt)}</p>
            <p>{locale === "ru" ? "Расписание:" : "Schedule:"} {formatSyncDate(syncStatus.scheduleLastSyncedAt)}</p>
          </div>
          {!syncStatus.b2bConfigured ? (
            <p className="mt-3 text-sm text-amber-700">
              {locale === "ru"
                ? "Ручная синхронизация пока недоступна: для неё нужны партнёрские токены Altegio."
                : "Manual synchronization is unavailable until Altegio partner tokens are configured."}
            </p>
          ) : null}
          {syncStatus.lastError || syncActionError ? (
            <p className="mt-3 text-sm text-red-700">{syncActionError ?? syncStatus.lastError}</p>
          ) : null}
          {syncLoading ? <p className="mt-3 text-xs text-muted-foreground">…</p> : null}
        </section>
      ) : null}
    </>
  );
}
