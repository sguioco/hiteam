"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Unlink } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api";
import { clearSession, getSession, redirectToLogin } from "@/lib/auth";
import { isDemoAccessToken } from "@/lib/demo-mode";
import { useI18n } from "@/lib/i18n";
import type { AltegioPilotStatus } from "@/lib/altegio-integration";

type AvailableLocation = { id: string; name: string; publicName: string | null };

export function AltegioPilotConnect({
  onStatusChange,
  pilotStatus,
  skipInitialFetch = false,
}: {
  onStatusChange?: (status: AltegioPilotStatus) => void;
  pilotStatus?: AltegioPilotStatus | null;
  skipInitialFetch?: boolean;
} = {}) {
  const { locale } = useI18n();
  const [internalStatus, setInternalStatus] = useState<AltegioPilotStatus | null>(null);
  const status = pilotStatus ?? internalStatus;

  function updateStatus(nextStatus: AltegioPilotStatus) {
    if (pilotStatus === undefined) {
      setInternalStatus(nextStatus);
    }
    onStatusChange?.(nextStatus);
  }

  useEffect(() => {
    if (skipInitialFetch || pilotStatus !== undefined) return;
    const session = getSession();
    if (!session) return;
    void apiRequest<AltegioPilotStatus>("/altegio/pilot", { token: session.accessToken })
      .then(updateStatus)
      .catch(() => undefined);
  }, [pilotStatus, skipInitialFetch]);
  const [open, setOpen] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [available, setAvailable] = useState<AvailableLocation[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [editingLocations, setEditingLocations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetDialog() {
    setPassword(""); setAvailable([]); setSelected([]); setEditingLocations(false); setError(null);
  }

  async function authorize() {
    const session = getSession();
    if (!session) return;
    if (isDemoAccessToken(session.accessToken)) {
      setError(
        locale === "ru"
          ? "Подключение Altegio недоступно в демо-режиме. Войдите в рабочий аккаунт HiTeam, чтобы подключить локации."
          : "Altegio connection is unavailable in demo mode. Sign in to a HiTeam workspace to connect locations.",
      );
      return;
    }
    try {
      setLoading(true); setError(null);
      const result = await apiRequest<{ locations: AvailableLocation[] }>("/altegio/pilot/authorize", {
        method: "POST", token: session.accessToken, body: JSON.stringify({ login, password }),
      });
      setPassword(""); setAvailable(result.locations); setSelected(status?.locations.map((location) => location.altegioLocationId) ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to authorize Altegio"); }
    finally { setLoading(false); }
  }

  async function connect() {
    const session = getSession();
    if (!session) return;
    try {
      setLoading(true); setError(null);
      const result = await apiRequest<AltegioPilotStatus>("/altegio/pilot/locations", {
        method: "POST", token: session.accessToken, body: JSON.stringify({ locationIds: selected }),
      });
      updateStatus(result); setEditingLocations(false); setOpen(false); resetDialog();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save locations"); }
    finally { setLoading(false); }
  }

  async function removeLocation(locationId: string) {
    const session = getSession();
    if (!session) return;
    try {
      setLoading(true); setError(null);
      const result = await apiRequest<AltegioPilotStatus>(`/altegio/pilot/locations/${locationId}`, { method: "DELETE", token: session.accessToken });
      updateStatus(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to disconnect location"); }
    finally { setLoading(false); }
  }

  const hasLocations = Boolean(status?.locations.length);
  const isDemoSession = isDemoAccessToken(getSession()?.accessToken);

  function leaveDemoAndSignIn() {
    clearSession();
    redirectToLogin();
  }

  return <>
    <button className="h-10 shrink-0 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition hover:opacity-90" onClick={() => setOpen(true)} type="button">
      {hasLocations ? (locale === "ru" ? "Управлять подключением" : "Manage connection") : (locale === "ru" ? "Подключить вручную" : "Connect manually")}
    </button>
    <Dialog open={open} onOpenChange={(next) => { if (!loading) { setOpen(next); if (!next) resetDialog(); } }}>
      <DialogContent className="max-w-lg overflow-hidden border-0 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
        <div className="bg-[linear-gradient(135deg,#f4f9ff_0%,#ffffff_58%,#fff8cf_100%)] px-7 pb-6 pt-7">
          <div className="mx-auto flex max-w-sm items-center justify-center gap-4">
            <div className="flex h-20 w-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-white bg-white/90 shadow-sm"><img alt="Altegio" className="h-9 w-9 rounded-xl object-cover" src="/altegio-logo.png" /><span className="text-xs font-semibold text-[#22262c]">Altegio</span></div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-[#5577e8] text-white shadow-md"><Link2 className="h-4 w-4" /></div>
            <div className="flex h-20 w-28 items-center justify-center rounded-2xl border border-white bg-white/90 shadow-sm"><BrandWordmark className="text-[1.2rem]" /></div>
          </div>
          <DialogHeader className="mt-6 text-center"><DialogTitle className="text-[1.55rem] tracking-[-0.04em]">{available.length ? (locale === "ru" ? "Выберите локации" : "Select locations") : (locale === "ru" ? "Подключите Altegio к HiTeam" : "Connect Altegio to HiTeam")}</DialogTitle><DialogDescription className="mt-2 leading-6">{isDemoSession ? (locale === "ru" ? "Для подключения нужен рабочий аккаунт HiTeam. Демо-организация не может быть связана с локациями Altegio." : "A HiTeam workspace is required to connect Altegio. Demo organizations cannot be linked to Altegio locations.") : available.length ? (locale === "ru" ? "Выберите до трёх локаций для подключения к HiTeam." : "Select up to three locations to connect to HiTeam.") : (locale === "ru" ? "Войдите в Altegio: пароль не сохраняется и нужен только для выдачи безопасного токена доступа." : "Sign in to Altegio. Your password is only used to obtain a secure access token and is not stored.")}</DialogDescription></DialogHeader>
        </div>
        <div className="px-7 pb-7 pt-5">
        {isDemoSession ? <div /> : !available.length && hasLocations && !editingLocations ? <div className="mt-4 space-y-3">{status!.locations.map((location) => <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm" key={location.id}><span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600"><Check className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{location.name}</p><p className="text-xs text-slate-500">#{location.altegioLocationId}</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{locale === "ru" ? "Подключено" : "Connected"}</span><button aria-label={locale === "ru" ? "Отключить" : "Disconnect"} className="flex h-8 w-8 items-center justify-center rounded-lg border text-slate-500 hover:bg-slate-50" disabled={loading} onClick={() => void removeLocation(location.id)} type="button"><Unlink className="h-4 w-4" /></button></div>)}<button className="h-11 w-full rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700" onClick={() => { setEditingLocations(true); setLogin(""); setPassword(""); setError(null); }} type="button">{locale === "ru" ? "Изменить список локаций" : "Change locations"}</button></div> : !available.length ? <div className="mt-4 space-y-3"><input autoComplete="username" className="h-11 w-full rounded-lg border bg-white px-3 text-sm" value={login} onChange={(event) => setLogin(event.target.value)} placeholder={locale === "ru" ? "Логин Altegio" : "Altegio login"} /><input autoComplete="current-password" className="h-11 w-full rounded-lg border bg-white px-3 text-sm" value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder={locale === "ru" ? "Пароль Altegio" : "Altegio password"} /><button className="h-11 w-full rounded-lg bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60" disabled={loading || !login || !password} onClick={() => void authorize()} type="button">{loading ? "…" : locale === "ru" ? "Продолжить" : "Continue"}</button></div> : <div className="mt-4 space-y-3"><div className="overflow-hidden rounded-xl border">{available.map((location) => <label className="flex items-center gap-3 border-b px-3 py-3 last:border-0" key={location.id}><input checked={selected.includes(location.id)} onChange={() => setSelected((current) => current.includes(location.id) ? current.filter((id) => id !== location.id) : current.length < 3 ? [...current, location.id] : current)} type="checkbox" /><span className="flex-1 text-sm">{location.publicName || location.name}<small className="block text-slate-500">#{location.id}</small></span>{status?.locations.some((item) => item.altegioLocationId === location.id) ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{locale === "ru" ? "Подключено" : "Connected"}</span> : null}</label>)}</div><button className="h-11 w-full rounded-lg bg-[#3d57c9] text-sm font-semibold text-white disabled:opacity-60" disabled={loading || !selected.length} onClick={() => void connect()} type="button">{locale === "ru" ? "Сохранить выбранные" : "Save selected"}</button></div>}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
