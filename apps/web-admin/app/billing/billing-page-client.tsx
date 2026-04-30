"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  Info,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
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
  serviceActive: boolean;
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
      <div className="mt-5 rounded-xl border border-dashed border-[rgba(15,23,42,0.14)] px-4 py-6 font-heading text-sm text-muted-foreground">
        {locale === "ru"
          ? "История появится после первой полной оплаты."
          : "Billing history will appear after the first full payment."}
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

  const usagePercent = useMemo(() => {
    if (!summary?.requiredSeats) return 0;
    return Math.min(100, Math.round((summary.paidSeats / summary.requiredSeats) * 100));
  }, [summary]);
  const nextBillingDate = summary
    ? formatBillingDate(summary.currentPeriodEnd, locale)
    : "—";
  const invoiceRows = useMemo<BillingInvoiceRow[]>(() => {
    if (!summary?.currentPeriodStart) {
      return [];
    }

    const periodStart = new Date(summary.currentPeriodStart);
    const billingStartedAt = summary.billingStartedAt
      ? new Date(summary.billingStartedAt)
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
          isCurrent && summary.missingSeats > 0 ? summary.amountDue : summary.monthlyTotal,
          summary.price.currency,
          locale,
        ),
        status:
          isCurrent && summary.missingSeats > 0
            ? locale === "ru"
              ? "К оплате"
              : "Due"
            : locale === "ru"
              ? "Оплачено"
              : "Paid",
        tone: isCurrent && summary.missingSeats > 0 ? "due" : "paid",
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
          ? "Сессия истекла. Войди заново."
          : "Session expired. Sign in again.",
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
            ? "Не удалось загрузить биллинг."
            : "Failed to load billing.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialData) {
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
              ? "Управляйте местами, тарифом и платежными деталями."
              : "Manage your seats, plan and billing details."}
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
          <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
            <div className="h-72 animate-pulse rounded-2xl bg-white shadow-[0_14px_38px_rgba(15,23,42,0.07)]" />
            <div className="h-72 animate-pulse rounded-2xl bg-white shadow-[0_14px_38px_rgba(15,23,42,0.07)]" />
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-6 font-heading text-sm text-red-900 shadow-[0_14px_38px_rgba(220,38,38,0.08)]">
            {error}
          </div>
        ) : summary && activeTab === "overview" ? (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
              <article className="rounded-2xl bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
                <h2 className="font-heading text-lg font-semibold tracking-[-0.02em] text-foreground">
                  {locale === "ru" ? "Места и тариф" : "Seats & Plan"}
                </h2>

                <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_1px_minmax(220px,0.85fr)] md:items-start">
                  <div className="grid gap-5">
                    <div className="flex items-start gap-5">
                      <Users
                        className="mt-1 size-7 shrink-0 text-[#284bff]"
                        strokeWidth={1.8}
                      />
                      <div className="min-w-0">
                        <p className="font-heading text-sm text-muted-foreground">
                          {locale === "ru" ? "Оплаченные места" : "Paid seats"}
                        </p>
                        <p className="mt-1 font-heading text-4xl font-semibold leading-none tracking-[-0.06em] text-foreground tabular-nums">
                          {summary.paidSeats} / {summary.requiredSeats}
                        </p>
                        <p className="mt-2 font-heading text-sm text-muted-foreground">
                          {locale === "ru" ? "обязательных мест" : "required seats"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between font-heading text-sm">
                        <span className="text-muted-foreground">
                          {summary.missingSeats > 0
                            ? locale === "ru"
                              ? `Нужно оплатить: ${summary.missingSeats} ${pluralSeats(summary.missingSeats, locale)}`
                              : `Unpaid: ${summary.missingSeats} ${pluralSeats(summary.missingSeats, locale)}`
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

                <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-blue-50 px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#284bff]">
                      <Users className="size-5" strokeWidth={1.9} />
                    </div>
                    <div className="font-heading">
                      <p className="font-semibold text-foreground">
                        {summary.missingSeats > 0
                          ? locale === "ru"
                            ? "Есть неоплаченные места"
                            : "Payment required"
                          : locale === "ru"
                            ? "Места считаются автоматически"
                            : "Seats update automatically"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {locale === "ru"
                          ? "Инвайты добавляют места сразу, увольнения остаются в расчете до конца месяца."
                          : "Invites reserve seats immediately; dismissals stay billable until month end."}
                      </p>
                    </div>
                  </div>
                  {summary.missingSeats > 0 ? (
                    <div className="rounded-xl bg-white px-5 py-3 text-right font-heading">
                      <p className="text-xs font-medium text-muted-foreground">
                        {locale === "ru" ? "К оплате" : "Amount due"}
                      </p>
                      <p className="text-lg font-semibold text-red-600">
                        {formatMoney(summary.amountDue, summary.price.currency, locale)}
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
                      {locale === "ru" ? "Следующее списание" : "Next billing date"}
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
                        {locale === "ru"
                          ? "Платежный метод не подключен"
                          : "No payment method connected"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {locale === "ru"
                          ? "После подключения платежи закроют недостающие места."
                          : "Once connected, payments will cover missing seats."}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-4 py-2 font-heading text-sm font-medium text-muted-foreground">
                    {locale === "ru" ? "Ожидает" : "Pending"}
                  </span>
                </div>
                <div className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-dashed border-[rgba(15,23,42,0.16)] font-heading text-sm font-medium text-foreground">
                  <CreditCard className="size-4" />
                  {locale === "ru"
                    ? "Подключается через платежного провайдера"
                    : "Managed through the payment provider"}
                </div>
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

            <aside className="flex gap-4 rounded-2xl bg-blue-50 px-5 py-4 font-heading text-sm text-slate-700">
              <Info className="mt-0.5 size-5 shrink-0 text-[#284bff]" />
              <div>
                <p className="font-semibold text-foreground">
                  {locale === "ru" ? "Как работает биллинг" : "How billing works"}
                </p>
                <p className="mt-1">
                  {locale === "ru"
                    ? "Дата биллинга начинается после первой полной оплаты. Дальше сумма списывается ежемесячно по обязательным местам."
                    : "Billing starts after the first full payment. After that, required seats are charged monthly."}
                </p>
              </div>
            </aside>
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
