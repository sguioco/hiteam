"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  ReceiptText,
  Users,
  WalletCards,
} from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { apiRequest } from "../../../lib/api";
import { toAdminHref } from "../../../lib/admin-routes";
import { getSession } from "../../../lib/auth";
import { useI18n } from "../../../lib/i18n";

type BillingCurrency = "AED" | "USD" | "EUR";

export type BillingSummary = {
  status: string;
  paidSeats: number;
  usedSeats: number;
  availableSeats: number;
  activeEmployeeCount: number;
  pendingInvitationCount: number;
  monthlyTotal: number;
  nextSeatAmount: number;
  price: {
    regionCode: string;
    regionLabel: string;
    country: string | null;
    currency: BillingCurrency;
    unitAmount: number;
    approxUsd: number | null;
    locationConfigured: boolean;
  };
};

export type BillingPageInitialData = BillingSummary;

function formatMoney(value: number, currency: BillingCurrency, locale: "en" | "ru") {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function pluralSeats(count: number, locale: "en" | "ru") {
  if (locale !== "ru") {
    return count === 1 ? "seat" : "seats";
  }

  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return "место";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "места";
  return "мест";
}

export default function BillingPageClient({
  initialData,
}: {
  initialData?: BillingPageInitialData | null;
}) {
  const { locale } = useI18n();
  const [summary, setSummary] = useState<BillingSummary | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [seatDialogOpen, setSeatDialogOpen] = useState(false);
  const [seatCount, setSeatCount] = useState(1);
  const [addingSeats, setAddingSeats] = useState(false);
  const [addSeatsError, setAddSeatsError] = useState<string | null>(null);

  const usagePercent = useMemo(() => {
    if (!summary?.paidSeats) return 0;
    return Math.min(100, Math.round((summary.usedSeats / summary.paidSeats) * 100));
  }, [summary]);

  const seatDeltaTotal = summary ? seatCount * summary.nextSeatAmount : 0;

  async function loadBilling() {
    const session = getSession();
    if (!session) {
      setError(locale === "ru" ? "Сессия истекла. Войди заново." : "Session expired. Sign in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const nextSummary = await apiRequest<BillingSummary>("/billing/summary", {
        token: session.accessToken,
        skipClientCache: true,
      });
      setSummary(nextSummary);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : locale === "ru"
            ? "Не удалось загрузить биллинг."
            : "Failed to load billing.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSeats() {
    const session = getSession();
    if (!session || !summary) return;

    try {
      setAddingSeats(true);
      setAddSeatsError(null);
      const nextSummary = await apiRequest<BillingSummary>("/billing/seats", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({ seats: seatCount }),
      });
      setSummary(nextSummary);
      setSeatDialogOpen(false);
      setSeatCount(1);
    } catch (requestError) {
      setAddSeatsError(
        requestError instanceof Error
          ? requestError.message
          : locale === "ru"
            ? "Не удалось добавить места."
            : "Failed to add seats.",
      );
    } finally {
      setAddingSeats(false);
    }
  }

  useEffect(() => {
    if (!initialData) {
      void loadBilling();
    }
  }, []);

  return (
    <AdminShell showTopbar={false}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 md:px-10 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex rounded-2xl border border-border bg-secondary/30 p-1 font-heading text-sm">
              <a
                className="rounded-xl px-3 py-2 text-muted-foreground transition hover:text-foreground"
                href={toAdminHref("/organization")}
              >
                {locale === "ru" ? "Организация" : "Organization"}
              </a>
              <span className="rounded-xl bg-background px-3 py-2 text-foreground shadow-sm">
                Billing
              </span>
            </div>
            <div>
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
                {locale === "ru" ? "Billing" : "Billing"}
              </h1>
              <p className="mt-2 max-w-2xl font-heading text-sm text-muted-foreground">
                {locale === "ru"
                  ? "Стоимость считается за каждого сотрудника и зависит от страны точки организации."
                  : "Pricing is calculated per employee and follows the country selected for the organization point."}
              </p>
            </div>
          </div>

          <Button className="rounded-xl font-heading" variant="outline" asChild>
            <a href={toAdminHref("/organization")}>
              <ArrowLeft className="h-4 w-4" />
              {locale === "ru" ? "К организации" : "Organization"}
            </a>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="h-72 animate-pulse rounded-[28px] border border-border bg-secondary/30" />
            <div className="h-72 animate-pulse rounded-[28px] border border-border bg-secondary/30" />
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 font-heading text-sm text-red-900">
            {error}
          </div>
        ) : summary ? (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <section className="rounded-[28px] border border-border bg-[color:var(--panel-strong)] p-6 shadow-sm md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-heading text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {locale === "ru" ? "Оплаченные места" : "Paid seats"}
                    </div>
                    <div className="mt-3 font-heading text-4xl font-semibold tracking-tight text-foreground">
                      {summary.usedSeats} / {summary.paidSeats}
                    </div>
                    <p className="mt-2 font-heading text-sm text-muted-foreground">
                      {locale === "ru"
                        ? `${summary.activeEmployeeCount} сотрудников, ${summary.pendingInvitationCount} ожидающих приглашений`
                        : `${summary.activeEmployeeCount} employees, ${summary.pendingInvitationCount} pending invitations`}
                    </p>
                  </div>

                  <Button
                    className="rounded-xl bg-accent font-heading text-accent-foreground hover:bg-accent/90"
                    onClick={() => {
                      setSeatDialogOpen(true);
                      setAddSeatsError(null);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    {locale === "ru" ? "Добавить место" : "Add seat"}
                  </Button>
                </div>

                <div className="mt-8">
                  <div className="h-4 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        summary.availableSeats > 0 ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-heading text-sm">
                    <span className="text-muted-foreground">
                      {summary.availableSeats > 0
                        ? locale === "ru"
                          ? `Свободно: ${summary.availableSeats} ${pluralSeats(summary.availableSeats, locale)}`
                          : `Available: ${summary.availableSeats} ${pluralSeats(summary.availableSeats, locale)}`
                        : locale === "ru"
                          ? "Свободных мест нет"
                          : "No available seats"}
                    </span>
                    <span className="font-semibold text-foreground">{usagePercent}%</span>
                  </div>
                </div>

                {summary.availableSeats <= 0 ? (
                  <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-heading text-sm text-amber-950">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold">
                        {locale === "ru" ? "Нужно добавить место перед новым сотрудником." : "Add a seat before inviting a new employee."}
                      </p>
                      <p className="mt-1 text-amber-900/80">
                        {locale === "ru"
                          ? "Инвайт тоже резервирует место, чтобы команда не ушла выше оплаченного лимита."
                          : "An invitation reserves a seat too, so the team stays within the paid limit."}
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-[28px] border border-border bg-[color:var(--panel-strong)] p-6 shadow-sm md:p-7">
                <div className="flex items-center gap-2 font-heading text-sm text-muted-foreground">
                  <ReceiptText className="h-4 w-4" />
                  {locale === "ru" ? "Тариф" : "Plan"}
                </div>
                <div className="mt-5 space-y-5">
                  <div>
                    <p className="font-heading text-sm text-muted-foreground">
                      {locale === "ru" ? "Цена за сотрудника" : "Per employee"}
                    </p>
                    <p className="mt-1 font-heading text-3xl font-semibold tracking-tight text-foreground">
                      {formatMoney(summary.price.unitAmount, summary.price.currency, locale)}
                    </p>
                    {summary.price.approxUsd ? (
                      <p className="mt-1 font-heading text-xs text-muted-foreground">
                        {locale === "ru" ? `примерно $${summary.price.approxUsd}` : `about $${summary.price.approxUsd}`}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                    <div className="flex items-center gap-2 font-heading text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {summary.price.country ?? summary.price.regionLabel}
                    </div>
                    <p className="mt-2 font-heading text-sm text-foreground">
                      {summary.price.regionLabel}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                    <div className="flex items-center gap-2 font-heading text-sm text-muted-foreground">
                      <WalletCards className="h-4 w-4" />
                      {locale === "ru" ? "Итого в месяц" : "Monthly total"}
                    </div>
                    <p className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground">
                      {formatMoney(summary.monthlyTotal, summary.price.currency, locale)}
                    </p>
                  </div>
                </div>

                {!summary.price.locationConfigured ? (
                  <Button className="mt-5 w-full rounded-xl font-heading" variant="outline" asChild>
                    <a href={toAdminHref("/organization")}>
                      {locale === "ru" ? "Выбрать точку организации" : "Set organization point"}
                    </a>
                  </Button>
                ) : null}
              </section>
            </div>

            <Dialog open={seatDialogOpen} onOpenChange={setSeatDialogOpen}>
              <DialogContent className="w-[min(520px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl">
                    {locale === "ru" ? "Добавить оплаченные места" : "Add paid seats"}
                  </DialogTitle>
                  <DialogDescription className="font-heading">
                    {locale === "ru"
                      ? "Выберите количество мест, которое нужно добавить к текущей подписке."
                      : "Choose how many seats to add to the current subscription."}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/20 p-4">
                    <Button
                      className="h-10 w-10 rounded-xl p-0"
                      disabled={seatCount <= 1}
                      onClick={() => setSeatCount((current) => Math.max(1, current - 1))}
                      type="button"
                      variant="outline"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <label className="grid gap-1 text-center font-heading">
                      <span className="text-xs text-muted-foreground">
                        {locale === "ru" ? "Количество" : "Quantity"}
                      </span>
                      <Input
                        className="h-12 w-24 text-center text-lg font-semibold"
                        min={1}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          setSeatCount(Number.isFinite(parsed) ? Math.max(1, Math.min(500, Math.floor(parsed))) : 1);
                        }}
                        type="number"
                        value={seatCount}
                      />
                    </label>
                    <Button
                      className="h-10 w-10 rounded-xl p-0"
                      onClick={() => setSeatCount((current) => Math.min(500, current + 1))}
                      type="button"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-border bg-background p-4 font-heading">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {seatCount} {pluralSeats(seatCount, locale)}
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatMoney(seatDeltaTotal, summary.price.currency, locale)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {locale === "ru" ? "Добавится к ежемесячной сумме." : "Added to the monthly total."}
                    </p>
                  </div>

                  {addSeatsError ? <div className="error-box">{addSeatsError}</div> : null}

                  <Button
                    className="w-full rounded-xl bg-accent font-heading text-accent-foreground hover:bg-accent/90"
                    disabled={addingSeats}
                    onClick={() => void handleAddSeats()}
                  >
                    <CreditCard className="h-4 w-4" />
                    {addingSeats
                      ? locale === "ru" ? "Добавляем..." : "Adding..."
                      : locale === "ru" ? "Добавить места" : "Add seats"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}
