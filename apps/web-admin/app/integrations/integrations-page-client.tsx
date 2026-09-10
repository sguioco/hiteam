"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, LoaderCircle, Unlink, X } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { AltegioIntegrationPanel } from "@/components/altegio-integration-panel";
import { BrandWordmark } from "@/components/brand-wordmark";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkspaceLoading } from "@/components/workspace-loading";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  buildAltegioMarketplaceConnectUrl,
  clearAltegioMarketplaceParams,
  peekAltegioMarketplaceParams,
} from "@/lib/altegio-marketplace";

type AltegioStatus = {
  connected: boolean;
  locationId: string | null;
  applicationId: string | null;
  activatedAt: string | null;
};

export type IntegrationsPageInitialData = {
  altegio?: AltegioStatus;
};

function clearMarketplaceQuery() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("connected");
  url.searchParams.delete("from");
  url.searchParams.delete("salon_id");
  url.searchParams.delete("app_id");
  url.searchParams.delete("application_id");
  window.history.replaceState({}, "", url.toString());
}

export default function IntegrationsPageClient({
  initialData,
}: {
  initialData?: IntegrationsPageInitialData | null;
}) {
  const { locale } = useI18n();
  const [summary, setSummary] = useState<IntegrationsPageInitialData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const connectAttempted = useRef(false);

  async function loadSummary() {
    const session = getSession();
    if (!session) return;
    try {
      setLoading(true);
      setError(null);
      setSummary(
        await apiRequest<IntegrationsPageInitialData>("/billing/summary", {
          token: session.accessToken,
          skipClientCache: true,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : locale === "ru"
            ? "Не удалось загрузить интеграции."
            : "Failed to load integrations.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialData) void loadSummary();
  }, []);

  useEffect(() => {
    if (!summary) return;
    const pending = peekAltegioMarketplaceParams();
    if (!pending?.locationId) return;

    setDialogOpen(true);
    if (summary.altegio?.connected && summary.altegio.locationId === pending.locationId) {
      clearAltegioMarketplaceParams();
      clearMarketplaceQuery();
      return;
    }
    if (connectAttempted.current) return;

    const session = getSession();
    if (!session) return;
    connectAttempted.current = true;
    void (async () => {
      try {
        setConnecting(true);
        setError(null);
        const nextSummary = await apiRequest<IntegrationsPageInitialData>(
          "/billing/altegio/connect",
          {
            body: JSON.stringify({
              locationId: pending.locationId,
              ...(pending.applicationId ? { applicationId: pending.applicationId } : {}),
            }),
            method: "POST",
            token: session.accessToken,
            skipClientCache: true,
          },
        );
        setSummary(nextSummary);
        clearAltegioMarketplaceParams();
        clearMarketplaceQuery();
      } catch (cause) {
        connectAttempted.current = false;
        setError(
          cause instanceof Error
            ? cause.message
            : locale === "ru"
              ? "Не удалось подключить Altegio."
              : "Failed to connect Altegio.",
        );
      } finally {
        setConnecting(false);
      }
    })();
  }, [locale, summary]);

  function handleMarketplaceAction() {
    if (summary?.altegio?.connected) {
      setDialogOpen(true);
      return;
    }
    const url = buildAltegioMarketplaceConnectUrl(summary?.altegio?.applicationId);
    if (!url) {
      setError(
        locale === "ru"
          ? "Не удалось открыть Altegio Marketplace."
          : "Could not open Altegio Marketplace.",
      );
      return;
    }
    window.location.assign(url);
  }

  async function disconnect() {
    const session = getSession();
    if (!session) return;
    try {
      setDisconnecting(true);
      setError(null);
      const nextSummary = await apiRequest<IntegrationsPageInitialData>(
        "/billing/altegio/disconnect",
        {
          method: "POST",
          token: session.accessToken,
          skipClientCache: true,
        },
      );
      setSummary(nextSummary);
      clearAltegioMarketplaceParams();
      clearMarketplaceQuery();
      setDialogOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : locale === "ru"
            ? "Не удалось отключить Altegio."
            : "Failed to disconnect Altegio.",
      );
    } finally {
      setDisconnecting(false);
    }
  }

  const connected = Boolean(summary?.altegio?.connected);

  return (
    <AdminShell showTopbar={false}>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 md:px-8 md:py-10">
        <header className="space-y-2">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
            {locale === "ru" ? "Настройки рабочего пространства" : "Workspace settings"}
          </p>
          <h1 className="font-heading text-[2.5rem] font-semibold leading-none tracking-[-0.05em] text-foreground">
            {locale === "ru" ? "Интеграции" : "Integrations"}
          </h1>
          <p className="max-w-2xl font-heading text-sm text-muted-foreground">
            {locale === "ru"
              ? "Подключайте внешние сервисы и контролируйте обмен данными."
              : "Connect external services and control data synchronization."}
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <WorkspaceLoading
            className="min-h-[220px] rounded-2xl bg-white shadow-[0_14px_38px_rgba(15,23,42,0.07)]"
            label={locale === "ru" ? "Загружаем интеграции" : "Loading integrations"}
          />
        ) : (
          <AltegioIntegrationPanel
            marketplace={summary?.altegio}
            onMarketplaceAction={handleMarketplaceAction}
          />
        )}

      </main>

      <Dialog open={dialogOpen} onOpenChange={(open) => !connecting && !disconnecting && setDialogOpen(open)}>
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] overflow-hidden border-0 bg-white p-0 shadow-[0_36px_110px_rgba(18,24,38,0.25)]">
          <div className="bg-[linear-gradient(135deg,#f4f7ff_0%,#ffffff_55%,#fff8d6_100%)] px-7 py-8 sm:px-9">
            <DialogHeader>
              <DialogTitle className="text-center font-heading text-2xl">
                {connected
                  ? locale === "ru" ? "Отключить Altegio?" : "Disconnect Altegio?"
                  : locale === "ru" ? "Подключение Altegio" : "Connecting Altegio"}
              </DialogTitle>
              <DialogDescription className="text-center leading-6">
                {connected
                  ? locale === "ru"
                    ? "Синхронизация сотрудников и расписания будет остановлена."
                    : "Employee and schedule synchronization will stop."
                  : locale === "ru"
                    ? "Завершаем подключение и первичную синхронизацию."
                    : "Finishing the connection and initial synchronization."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-7 flex items-center justify-center gap-5">
              <div className="flex h-20 w-28 items-center justify-center rounded-2xl bg-white shadow-sm">
                <img alt="Altegio" className="h-11 w-11 rounded-xl" src="/altegio-logo.png" />
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${connected ? "bg-red-50 text-red-600" : "bg-emerald-500 text-white"}`}>
                {connecting || disconnecting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : connected ? <Unlink className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              </div>
              <div className="flex h-20 w-28 items-center justify-center rounded-2xl bg-white shadow-sm">
                <BrandWordmark className="text-xl" />
              </div>
            </div>
          </div>

          {connected ? (
            <div className="flex flex-col-reverse gap-3 px-7 pb-7 pt-5 sm:flex-row sm:justify-center sm:px-9">
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium text-muted-foreground hover:bg-muted" disabled={disconnecting} onClick={() => setDialogOpen(false)} type="button">
                <X className="h-4 w-4" />
                {locale === "ru" ? "Отмена" : "Cancel"}
              </button>
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-sm font-medium text-background disabled:opacity-60" disabled={disconnecting} onClick={() => void disconnect()} type="button">
                {disconnecting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                {locale === "ru" ? "Отключить" : "Disconnect"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 px-7 py-6 text-sm text-muted-foreground">
              {connecting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {locale === "ru" ? "Это обычно занимает несколько секунд…" : "This usually takes a few seconds…"}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
