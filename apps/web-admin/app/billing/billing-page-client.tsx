"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  ExternalLink,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { WorkspaceLoading } from "@/components/workspace-loading";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

type BillingCurrency = "AED" | "USD" | "EUR";

export type BillingSummary = {
  status: string;
  paidSeats: number;
  requiredSeats: number;
  usedSeats: number;
  billableSeats: number;
  availableSeats: number;
  missingSeats: number;
  activeEmployeeCount: number;
  pendingInvitationCount: number;
  monthlyTotal: number;
  amountDue: number;
  billingStartedAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextBillingAt: string | null;
  serviceActive: boolean;
  stripeConnected: boolean;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string;
  stripeCancelAtPeriodEnd: boolean;
  stripeCurrentPeriodStart: string | null;
  stripeCurrentPeriodEnd: string | null;
  trialActive: boolean;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialDaysRemaining: number;
  trialSource: string | null;
  promoCode: string | null;
  price: {
    regionCode: string;
    regionLabel: string;
    country: string | null;
    currency: BillingCurrency;
    unitAmount: number;
    approxUsd: number | null;
    stripeLookupKey: string;
    locationConfigured: boolean;
  };
};

type BillingRedirectResponse = {
  mode: "checkout" | "portal";
  url: string | null;
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

function formatBillingDate(value: string | Date | null | undefined, locale: "en" | "ru") {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function addUtcMonths(anchor: Date, monthOffset: number) {
  const targetMonth = new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth() + monthOffset,
      1,
      anchor.getUTCHours(),
      anchor.getUTCMinutes(),
      anchor.getUTCSeconds(),
      anchor.getUTCMilliseconds(),
    ),
  );
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      targetMonth.getUTCFullYear(),
      targetMonth.getUTCMonth(),
      Math.min(anchor.getUTCDate(), lastDayOfTargetMonth),
      anchor.getUTCHours(),
      anchor.getUTCMinutes(),
      anchor.getUTCSeconds(),
      anchor.getUTCMilliseconds(),
    ),
  );
}

type BillingInvoiceRow = {
  id: string;
  date: string;
  amount: string;
  status: string;
  tone: "due" | "paid";
};

function BillingHistoryList({
  invoiceRows,
  locale,
}: {
  invoiceRows: BillingInvoiceRow[];
  locale: "en" | "ru";
}) {
  if (!invoiceRows.length) {
    return (
      <div className="mt-5 flex min-h-[72px] items-center justify-center rounded-xl border border-dashed border-[rgba(15,23,42,0.14)] px-4 py-6 text-center font-heading text-sm text-muted-foreground">
        {locale === "ru"
          ? "История появится после первой полной оплаты"
          : "Billing history will appear after the first full payment"}
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-[rgba(15,23,42,0.08)]">
      {invoiceRows.map((invoice) => (
        <div
          className="grid grid-cols-[1fr_1.35fr_auto_auto] items-center gap-4 px-4 py-3 font-heading text-sm text-foreground [&+&]:border-t [&+&]:border-[rgba(15,23,42,0.08)]"
          key={invoice.id}
        >
          <span className="text-muted-foreground">{invoice.date}</span>
          <span>
            {locale === "ru" ? `Счет #${invoice.id}` : `Invoice #${invoice.id}`}
          </span>
          <span className="font-medium">{invoice.amount}</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              invoice.tone === "paid"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {invoice.status}
          </span>
        </div>
      ))}
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");
  const [billingActionLoading, setBillingActionLoading] = useState(false);
  const [billingDisconnectLoading, setBillingDisconnectLoading] = useState(false);

  const usagePercent = useMemo(() => {
    if (!summary?.requiredSeats) return 0;
    const coveredSeats = summary.trialActive ? summary.requiredSeats : summary.paidSeats;
    return Math.min(100, Math.round((coveredSeats / summary.requiredSeats) * 100));
  }, [summary]);
  const nextBillingDate = summary
    ? formatBillingDate(
        summary.nextBillingAt ??
          summary.stripeCurrentPeriodEnd ??
          summary.currentPeriodEnd ??
          (summary.trialActive ? summary.trialEndsAt : null),
        locale,
      )
    : "—";
  const invoiceRows = useMemo<BillingInvoiceRow[]>(() => {
    const sourcePeriodStart = summary?.currentPeriodStart ?? summary?.stripeCurrentPeriodStart;
    if (!summary || !sourcePeriodStart) {
      return [];
    }

    const currentSummary = summary;
    const periodStart = new Date(sourcePeriodStart);
    const billingStartedAt = currentSummary.billingStartedAt
      ? new Date(currentSummary.billingStartedAt)
      : null;
    const baseDate = Number.isNaN(periodStart.getTime()) ? new Date() : periodStart;
    const rows: BillingInvoiceRow[] = [];

    [0, 1, 2].forEach((offset) => {
      const date = addUtcMonths(baseDate, -offset);
      if (
        billingStartedAt &&
        !Number.isNaN(billingStartedAt.getTime()) &&
        date < billingStartedAt
      ) {
        return;
      }

      const invoiceMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
      const invoiceYear = date.getUTCFullYear();
      const isCurrent = offset === 0;

      rows.push({
        id: `INV-${invoiceYear}-${invoiceMonth}`,
        date: formatBillingDate(date, locale),
        amount: formatMoney(
          isCurrent && currentSummary.missingSeats > 0
            ? currentSummary.amountDue
            : currentSummary.monthlyTotal,
          currentSummary.price.currency,
          locale,
        ),
        status:
          isCurrent && currentSummary.missingSeats > 0
            ? locale === "ru"
              ? "К оплате"
              : "Due"
            : locale === "ru"
              ? "Оплачено"
              : "Paid",
        tone: isCurrent && currentSummary.missingSeats > 0 ? "due" : "paid",
      });
    });

    return rows;
  }, [locale, summary]);
  const billingTabs: Array<{ id: "overview" | "history"; label: string }> = [
    {
      id: "overview",
      label: locale === "ru" ? "Обзор" : "Overview",
    },
    {
      id: "history",
      label: locale === "ru" ? "История" : "Billing history",
    },
  ];

  async function loadBilling() {
    const session = getSession();
    if (!session) {
      setError(
        locale === "ru"
          ? "Сессия истекла. Войди заново"
          : "Session expired. Sign in again",
      );
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
            ? "Не удалось загрузить биллинг"
            : "Failed to load billing",
      );
    } finally {
      setLoading(false);
    }
  }

  async function openBillingFlow() {
    const session = getSession();
    if (!session) {
      setError(
        locale === "ru"
          ? "Сессия истекла. Войди заново"
          : "Session expired. Sign in again",
      );
      return;
    }

    const stripeWindow = window.open("", "_blank");
    if (stripeWindow) {
      stripeWindow.opener = null;
    }

    try {
      setBillingActionLoading(true);
      setError(null);
      const path = summary?.stripeConnected ? "/billing/portal" : "/billing/checkout";
      const redirect = await apiRequest<BillingRedirectResponse>(path, {
        method: "POST",
        token: session.accessToken,
        skipClientCache: true,
      });

      if (redirect.url) {
        if (stripeWindow) {
          stripeWindow.location.href = redirect.url;
        } else {
          window.open(redirect.url, "_blank", "noopener,noreferrer");
        }
        return;
      }

      stripeWindow?.close();
      await loadBilling();
    } catch (requestError) {
      stripeWindow?.close();
      setError(
        requestError instanceof Error
          ? requestError.message
          : locale === "ru"
            ? "Не удалось открыть оплату"
            : "Failed to open billing",
      );
    } finally {
      setBillingActionLoading(false);
    }
  }

  async function disconnectStripe() {
    if (!summary?.stripeConnected) {
      return;
    }

    const confirmed = window.confirm(
      locale === "ru"
        ? "Отвязать Stripe от этой организации?"
        : "Disconnect Stripe from this organization?",
    );

    if (!confirmed) {
      return;
    }

    const session = getSession();
    if (!session) {
      setError(
        locale === "ru"
          ? "Сессия истекла. Войди заново"
          : "Session expired. Sign in again",
      );
      return;
    }

    try {
      setBillingDisconnectLoading(true);
      setError(null);
      const nextSummary = await apiRequest<BillingSummary>("/billing/disconnect", {
        method: "POST",
        token: session.accessToken,
        skipClientCache: true,
      });
      setSummary(nextSummary);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : locale === "ru"
            ? "Не удалось отвязать Stripe"
            : "Failed to disconnect Stripe",
      );
    } finally {
      setBillingDisconnectLoading(false);
    }
  }

  useEffect(() => {
    const shouldRefreshAfterStripe =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("stripe");

    if (!initialData || shouldRefreshAfterStripe) {
      void loadBilling();
    }
  }, []);

  return (
    <AdminShell showTopbar={false}>
      <main className="mx-auto flex w-full max-w-[1460px] flex-col gap-5 px-6 py-6 md:px-8">
        <header className="space-y-2">
          <h1 className="font-heading text-[2rem] font-semibold leading-none tracking-[-0.04em] text-foreground">
            Billing
          </h1>
          <p className="max-w-2xl font-heading text-sm text-muted-foreground">
            {locale === "ru"
              ? "Управляйте местами, тарифом и платежными деталями"
              : "Manage your seats, plan and billing details"}
          </p>
        </header>

        <nav
          aria-label={locale === "ru" ? "Разделы биллинга" : "Billing sections"}
          className="flex gap-8 border-b border-[rgba(15,23,42,0.1)] font-heading text-sm"
        >
          {billingTabs.map((item) => (
            <button
              className={`relative pb-4 font-medium transition-colors ${
                activeTab === item.id
                  ? "text-[color:var(--accent)] after:absolute after:bottom-[-1px] after:left-0 after:h-0.5 after:w-full after:bg-[color:var(--accent)]"
                  : "text-[color:var(--foreground)] hover:text-[color:var(--accent)]"
              }`}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {loading ? (
          <WorkspaceLoading
            className="min-h-[288px] rounded-2xl bg-white shadow-[0_14px_38px_rgba(15,23,42,0.07)]"
            label={locale === "ru" ? "Загружаем биллинг" : "Loading billing"}
          />
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-6 font-heading text-sm text-red-900 shadow-[0_14px_38px_rgba(220,38,38,0.08)]">
            {error}
          </div>
        ) : summary && activeTab === "overview" ? (
          <>
            {summary.trialActive ? (
              <section className="rounded-2xl border border-blue-100 bg-blue-50 px-6 py-5 font-heading shadow-[0_14px_38px_rgba(37,99,235,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#284bff]">
                      {locale === "ru" ? "Бесплатный trial активен" : "Free trial is active"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {locale === "ru"
                        ? `Места не требуют оплаты еще ${summary.trialDaysRemaining} дн.`
                        : `Seats are covered for ${summary.trialDaysRemaining} more days.`}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">
                      {locale === "ru" ? "Trial до" : "Trial ends"}
                    </p>
                    <p className="font-semibold text-foreground">{formatBillingDate(summary.trialEndsAt, locale)}</p>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
              <article className="rounded-2xl bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
                <h2 className="font-heading text-lg font-semibold tracking-[-0.02em] text-foreground">
                  {locale === "ru" ? "Места и тариф" : "Seats & Plan"}
                </h2>

                <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_1px_minmax(220px,0.85fr)] md:items-start">
                  <div className="grid gap-5">
                    <div className="grid gap-2">
                      <div className="min-w-0">
                        <p className="font-heading text-sm text-muted-foreground">
                          {locale === "ru" ? "Оплаченные места" : "Paid seats"}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <Users
                            className="size-7 shrink-0 text-[#284bff]"
                            strokeWidth={1.8}
                          />
                          <p className="font-heading text-4xl font-semibold leading-none tracking-[-0.06em] text-foreground tabular-nums">
                            {summary.paidSeats} / {summary.requiredSeats}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between font-heading text-sm">
                        <span className="text-muted-foreground">
                          {summary.missingSeats > 0
                            ? locale === "ru"
                              ? `Нужно оплатить: ${summary.missingSeats} ${pluralSeats(summary.missingSeats, locale)}`
                              : `Unpaid: ${summary.missingSeats} ${pluralSeats(summary.missingSeats, locale)}`
                            : summary.trialActive
                              ? locale === "ru"
                                ? "Trial покрывает все места"
                                : "Trial covers all seats"
                            : summary.availableSeats > 0
                              ? locale === "ru"
                                ? `Запас: ${summary.availableSeats} ${pluralSeats(summary.availableSeats, locale)}`
                                : `Buffer: ${summary.availableSeats} ${pluralSeats(summary.availableSeats, locale)}`
                              : locale === "ru"
                                ? "Все места покрыты"
                                : "All seats covered"}
                        </span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {usagePercent}%
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-blue-50">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            summary.missingSeats > 0 ? "bg-red-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="hidden h-full bg-[rgba(15,23,42,0.12)] md:block" />

                  <div className="grid gap-8">
                    <div>
                      <p className="font-heading text-sm text-muted-foreground">
                        {locale === "ru" ? "План" : "Plan"}
                      </p>
                      <p className="mt-1 font-heading text-lg font-semibold text-foreground">
                        {summary.price.regionLabel}
                      </p>
                    </div>

                    <div>
                      <p className="font-heading text-3xl font-semibold tracking-[-0.05em] text-foreground">
                        {formatMoney(summary.price.unitAmount, summary.price.currency, locale)}
                      </p>
                      <p className="mt-1 font-heading text-sm text-muted-foreground">
                        {locale === "ru" ? "за сотрудника / месяц" : "per employee / month"}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4 ${
                    summary.missingSeats > 0 ? "bg-red-500" : "bg-blue-50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Users
                      className={`size-8 shrink-0 ${
                        summary.missingSeats > 0 ? "text-white" : "text-[#284bff]"
                      }`}
                      strokeWidth={1.9}
                    />
                    <div className="font-heading">
                      <p
                        className={`font-semibold ${
                          summary.missingSeats > 0 ? "text-white" : "text-foreground"
                        }`}
                      >
                        {summary.missingSeats > 0
                          ? locale === "ru"
                            ? "Есть неоплаченные места"
                            : "Payment required"
                          : summary.trialActive
                            ? locale === "ru"
                              ? "Бесплатный период активен"
                              : "Free trial active"
                          : locale === "ru"
                            ? "Места считаются автоматически"
                            : "Seats update automatically"}
                      </p>
                      <p
                        className={`mt-1 text-sm ${
                          summary.missingSeats > 0
                            ? "text-white/86"
                            : "text-muted-foreground"
                        }`}
                      >
                        {locale === "ru"
                          ? summary.trialActive
                            ? "Сотрудники могут пользоваться сервисом без оплаты до конца trial"
                            : "Инвайты добавляют места сразу, увольнения остаются в расчете до конца месяца"
                          : summary.trialActive
                            ? "Employees can use the service without payment until the trial ends"
                            : "Invites reserve seats immediately; dismissals stay billable until month end"}
                      </p>
                    </div>
                  </div>
                  {summary.missingSeats > 0 ? (
                    <div className="min-w-[112px] text-center font-heading text-white">
                      <p className="text-xl font-semibold leading-6">
                        {formatMoney(summary.amountDue, summary.price.currency, locale)}
                      </p>
                      <p className="mt-1 text-xs font-medium text-white/86">
                        {locale === "ru" ? "К оплате" : "Amount due"}
                      </p>
                    </div>
                  ) : null}
                </div>
              </article>

              <article className="rounded-2xl bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
                <h2 className="font-heading text-lg font-semibold tracking-[-0.02em] text-foreground">
                  {locale === "ru" ? "Сводка текущего плана" : "Current plan summary"}
                </h2>

                <dl className="mt-7 grid gap-4 font-heading text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">{locale === "ru" ? "Статус" : "Status"}</dt>
                    <dd className="font-semibold text-foreground">
                      {summary.trialActive
                        ? locale === "ru"
                          ? "Trial"
                          : "Trial"
                        : summary.serviceActive
                          ? locale === "ru"
                            ? "Активен"
                            : "Active"
                          : locale === "ru"
                            ? "Нужна оплата"
                            : "Payment required"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">{locale === "ru" ? "План" : "Plan"}</dt>
                    <dd className="font-semibold text-foreground">{summary.price.regionLabel}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {locale === "ru" ? "Цена за сотрудника" : "Price per employee"}
                    </dt>
                    <dd className="font-semibold text-foreground">
                      {formatMoney(summary.price.unitAmount, summary.price.currency, locale)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {locale === "ru" ? "Оплачено / требуется" : "Paid / required"}
                    </dt>
                    <dd className="font-semibold text-foreground tabular-nums">
                      {summary.paidSeats} / {summary.requiredSeats}
                    </dd>
                  </div>
                </dl>

                <div className="my-7 h-px bg-[rgba(15,23,42,0.1)]" />

                <div className="font-heading">
                  <p className="text-sm font-medium text-muted-foreground">
                    {locale === "ru" ? "Итого в месяц" : "Monthly total"}
                  </p>
                  <p className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-foreground">
                    {formatMoney(summary.monthlyTotal, summary.price.currency, locale)}
                  </p>
                  <div className="mt-7 flex items-center gap-3 text-sm text-foreground">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {summary.trialActive
                        ? locale === "ru"
                          ? "Trial до"
                          : "Trial ends"
                        : locale === "ru"
                          ? "Следующее списание"
                          : "Next billing date"}
                    </span>
                    <span className="font-semibold">{nextBillingDate}</span>
                  </div>
                </div>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <article className="rounded-2xl bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
                <h2 className="font-heading text-lg font-semibold tracking-[-0.02em] text-foreground">
                  {locale === "ru" ? "Способ оплаты" : "Payment method"}
                </h2>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-16 items-center justify-center rounded-lg bg-blue-50 text-[#284bff]">
                      <CreditCard className="size-5" strokeWidth={1.9} />
                    </div>
                    <div className="font-heading">
                      <p className="font-semibold text-foreground">
                        {summary.stripeConnected
                          ? locale === "ru"
                            ? "Оплата подключена через Stripe"
                            : "Billing is connected through Stripe"
                          : locale === "ru"
                            ? "Платежный метод не подключен"
                            : "No payment method connected"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {summary.stripeConnected
                          ? locale === "ru"
                            ? "Карта, счета и подписка управляются в Stripe"
                            : "Cards, invoices and subscription details are managed in Stripe"
                          : locale === "ru"
                            ? "После подключения платежи закроют недостающие места"
                            : "Once connected, payments will cover missing seats"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-heading text-sm font-semibold ${
                      summary.stripeConnected
                        ? "text-emerald-700"
                        : "text-muted-foreground"
                    }`}
                  >
                    {summary.stripeConnected
                      ? locale === "ru"
                        ? "Подключено"
                        : "Connected"
                      : locale === "ru"
                        ? "Ожидает"
                        : "Pending"}
                  </span>
                </div>
                <button
                  className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-dashed border-[rgba(15,23,42,0.16)] font-heading text-sm font-medium text-foreground transition-[background-color,transform] hover:bg-blue-50 active:scale-[0.96] disabled:cursor-wait disabled:opacity-60"
                  disabled={billingActionLoading}
                  onClick={openBillingFlow}
                  type="button"
                >
                  {summary.stripeConnected ? <ExternalLink className="size-4" /> : <CreditCard className="size-4" />}
                  {billingActionLoading
                    ? locale === "ru"
                      ? "Открываем Stripe..."
                      : "Opening Stripe..."
                    : summary.stripeConnected
                      ? locale === "ru"
                        ? "Управлять оплатой в Stripe"
                        : "Manage billing in Stripe"
                      : summary.missingSeats > 0
                        ? locale === "ru"
                          ? "Оплатить места в Stripe"
                          : "Pay seats in Stripe"
                        : locale === "ru"
                          ? "Подключить оплату Stripe"
                          : "Connect Stripe billing"}
                </button>
                {summary.stripeConnected ? (
                  <button
                    className="mt-3 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50 font-heading text-sm font-medium text-red-700 transition-[background-color,transform] hover:bg-red-100 active:scale-[0.96] disabled:cursor-wait disabled:opacity-60"
                    disabled={billingDisconnectLoading}
                    onClick={disconnectStripe}
                    type="button"
                  >
                    <CreditCard className="size-4" />
                    {billingDisconnectLoading
                      ? locale === "ru"
                        ? "Отвязываем Stripe..."
                        : "Disconnecting Stripe..."
                      : locale === "ru"
                        ? "Отвязать Stripe"
                        : "Disconnect Stripe"}
                  </button>
                ) : null}
              </article>

              <article className="rounded-2xl bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-heading text-lg font-semibold tracking-[-0.02em] text-foreground">
                    {locale === "ru" ? "История биллинга" : "Billing history"}
                  </h2>
                  <button
                    className="font-heading text-sm font-medium text-[color:var(--accent)]"
                    onClick={() => setActiveTab("history")}
                    type="button"
                  >
                    {locale === "ru" ? "Все счета" : "View all invoices"}
                  </button>
                </div>
                <BillingHistoryList invoiceRows={invoiceRows} locale={locale} />
              </article>
            </section>

          </>
        ) : summary ? (
          <article className="rounded-2xl bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
            <h2 className="font-heading text-lg font-semibold tracking-[-0.02em] text-foreground">
              {locale === "ru" ? "История биллинга" : "Billing history"}
            </h2>
            <BillingHistoryList invoiceRows={invoiceRows} locale={locale} />
          </article>
        ) : null}
      </main>
    </AdminShell>
  );
}
