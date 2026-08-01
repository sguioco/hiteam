"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  CreditCard,
  ExternalLink,
  Link2,
  LoaderCircle,
  Minus,
  Plus,
  ReceiptText,
  Unlink,
  Users,
  X,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { AltegioPilotConnect } from "@/components/altegio-pilot-connect";
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

type BillingCurrency = "AED" | "USD" | "EUR";

type BillingPaymentHistoryItem = {
  id: string;
  source: string;
  status: string;
  reason: string;
  amountMinor: number | null;
  currency: string | null;
  planMonths: number | null;
  accessMonths: number | null;
  targetSeats: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string;
  stripeCheckoutSessionId: string | null;
  stripeInvoiceId: string | null;
};

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
  history?: BillingPaymentHistoryItem[];
  altegio?: {
    connected: boolean;
    locationId: string | null;
    applicationId: string | null;
    activatedAt: string | null;
  };
};

type BillingRedirectResponse = {
  mode: "checkout" | "portal";
  url: string | null;
};


export type BillingPageInitialData = BillingSummary;

type BillingPurchasePlanId = "monthly" | "semi_annual" | "annual";

const BILLING_PURCHASE_PLANS: Array<{
  id: BillingPurchasePlanId;
  paidMonths: 1 | 6 | 12;
  accessMonths: number;
  bonusMonths: number;
}> = [
  { id: "monthly", paidMonths: 1, accessMonths: 1, bonusMonths: 0 },
  { id: "semi_annual", paidMonths: 6, accessMonths: 7, bonusMonths: 1 },
  { id: "annual", paidMonths: 12, accessMonths: 14, bonusMonths: 2 },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const MINIMUM_SEAT_PURCHASE_COUNT = 1;

function getCurrentSeatBase(summary?: BillingSummary | null) {
  if (!summary) {
    return 0;
  }

  return Math.max(
    0,
    summary.paidSeats,
    summary.requiredSeats,
    summary.usedSeats,
    summary.billableSeats,
  );
}

function formatMoney(value: number, currency: BillingCurrency, locale: "en" | "ru") {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatMoneyFromMinor(
  value: number | null,
  currency: string | null,
  fallbackCurrency: BillingCurrency,
  locale: "en" | "ru",
) {
  if (value === null || value === undefined) {
    return "—";
  }

  return formatMoney(value / 100, (currency ?? fallbackCurrency) as BillingCurrency, locale);
}

function formatPaymentPlan(payment: BillingPaymentHistoryItem, locale: "en" | "ru") {
  if (!payment.planMonths) {
    return locale === "ru" ? "Тариф не указан" : "Plan not specified";
  }

  const plan =
    payment.planMonths === 12
      ? locale === "ru"
        ? "Годовой"
        : "Annual"
      : payment.planMonths === 6
        ? locale === "ru"
          ? "Полугодовой"
          : "Semi Annual"
        : locale === "ru"
          ? "Месячный"
          : "Monthly";
  const access = payment.accessMonths
    ? locale === "ru"
      ? `доступ ${payment.accessMonths} мес.`
      : `${payment.accessMonths} mo access`
    : null;

  return [plan, access].filter(Boolean).join(" · ");
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
  meta: string;
};

function AnimatedBillingValue({
  animate = true,
  children,
  className = "",
  valueKey,
}: {
  animate?: boolean;
  children: ReactNode;
  className?: string;
  valueKey: string | number;
}) {
  return (
    <span
      className={`${animate ? "billing-value-pop " : ""}inline-block tabular-nums ${className}`}
      key={valueKey}
    >
      {children}
    </span>
  );
}

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
          className="grid gap-2 px-4 py-3 font-heading text-sm text-foreground sm:grid-cols-[0.9fr_1.4fr_auto_auto] sm:items-center sm:gap-4 [&+&]:border-t [&+&]:border-[rgba(15,23,42,0.08)]"
          key={invoice.id}
        >
          <span className="text-muted-foreground">{invoice.date}</span>
          <span className="min-w-0">
            <span className="block truncate">
              {locale === "ru" ? `Платеж #${invoice.id}` : `Payment #${invoice.id}`}
            </span>
            <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
              {invoice.meta}
            </span>
          </span>
          <span className="font-medium">{invoice.amount}</span>
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
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
  const [selectedPlanId, setSelectedPlanId] =
    useState<BillingPurchasePlanId>("semi_annual");
  const [selectedSeatCount, setSelectedSeatCount] = useState(() =>
    MINIMUM_SEAT_PURCHASE_COUNT,
  );
  const [seatControlTouched, setSeatControlTouched] = useState(false);
  const [altegioConnecting, setAltegioConnecting] = useState(false);
  const [altegioDisconnecting, setAltegioDisconnecting] = useState(false);
  const [altegioDialogOpen, setAltegioDialogOpen] = useState(false);
  const [altegioDialogMode, setAltegioDialogMode] = useState<"success" | "disconnect">(
    "success",
  );
  const [altegioMessage, setAltegioMessage] = useState<string | null>(null);
  const altegioConnectAttempted = useRef(false);

  const usagePercent = useMemo(() => {
    if (!summary?.requiredSeats) return 0;
    const coveredSeats = summary.trialActive ? summary.requiredSeats : summary.paidSeats;
    return Math.min(100, Math.round((coveredSeats / summary.requiredSeats) * 100));
  }, [summary]);
  const currentSeatBase = useMemo(() => getCurrentSeatBase(summary), [summary]);
  const minimumSeatCount = MINIMUM_SEAT_PURCHASE_COUNT;
  const selectedPlan = useMemo(
    () =>
      BILLING_PURCHASE_PLANS.find((plan) => plan.id === selectedPlanId) ??
      BILLING_PURCHASE_PLANS[0],
    [selectedPlanId],
  );
  const purchasePreview = useMemo(() => {
    if (!summary) {
      return null;
    }

    const now = new Date();
    const currentPeriodEnd = summary.currentPeriodEnd ?? summary.stripeCurrentPeriodEnd;
    const currentPaidThrough = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
    const activePaidThrough =
      currentPaidThrough &&
      !Number.isNaN(currentPaidThrough.getTime()) &&
      currentPaidThrough > now
        ? currentPaidThrough
        : null;
    const seatsToBuy = Math.max(minimumSeatCount, selectedSeatCount);
    const targetSeats = currentSeatBase + seatsToBuy;
    const additionalSeats = activePaidThrough
      ? Math.max(0, targetSeats - summary.paidSeats)
      : 0;
    const remainingDays = activePaidThrough
      ? Math.max(0, (activePaidThrough.getTime() - now.getTime()) / DAY_MS)
      : 0;
    const proratedAmount =
      additionalSeats > 0
        ? Math.ceil(additionalSeats * summary.price.unitAmount * (remainingDays / 30))
        : 0;
    const renewalAmount =
      targetSeats * summary.price.unitAmount * selectedPlan.paidMonths;
    const extensionStart = activePaidThrough ?? now;
    const accessEndsAt = addUtcMonths(extensionStart, selectedPlan.accessMonths);

    return {
      accessEndsAt,
      additionalSeats,
      amountDue: proratedAmount + renewalAmount,
      proratedAmount,
      renewalAmount,
      targetSeats,
    };
  }, [currentSeatBase, minimumSeatCount, selectedPlan, selectedSeatCount, summary]);
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
    if (!summary) {
      return [];
    }

    const history = summary.history ?? [];
    if (history.length > 0) {
      return history.map((payment) => {
        const paid = payment.status.toUpperCase() === "PAID";
        const plan = formatPaymentPlan(payment, locale);
        const seats = payment.targetSeats
          ? locale === "ru"
            ? `${payment.targetSeats} ${pluralSeats(payment.targetSeats, locale)}`
            : `${payment.targetSeats} ${pluralSeats(payment.targetSeats, locale)}`
          : null;
        const period =
          payment.periodEnd || payment.accessMonths
            ? [
                payment.periodEnd
                  ? `${locale === "ru" ? "до" : "until"} ${formatBillingDate(payment.periodEnd, locale)}`
                  : null,
                payment.accessMonths
                  ? locale === "ru"
                    ? `${payment.accessMonths} мес. доступа`
                    : `${payment.accessMonths} mo access`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : null;

        return {
          id:
            payment.stripeInvoiceId ??
            payment.stripeCheckoutSessionId ??
            payment.id.slice(0, 8),
          date: formatBillingDate(payment.paidAt, locale),
          amount: formatMoneyFromMinor(
            payment.amountMinor,
            payment.currency,
            summary.price.currency,
            locale,
          ),
          status: paid
            ? locale === "ru"
              ? "Оплачено"
              : "Paid"
            : locale === "ru"
              ? "Ошибка"
              : "Failed",
          tone: paid ? "paid" : "due",
          meta: [plan, seats, period].filter(Boolean).join(" · "),
        };
      });
    }

    if (!summary.billingStartedAt) {
      return [];
    }

    return [
      {
        id: "LEGACY-CURRENT",
        date: formatBillingDate(summary.billingStartedAt, locale),
        amount: formatMoney(summary.monthlyTotal, summary.price.currency, locale),
        status: summary.serviceActive
          ? locale === "ru"
            ? "Активно"
            : "Active"
          : locale === "ru"
            ? "Нужна оплата"
            : "Payment required",
        tone: summary.serviceActive ? "paid" : "due",
        meta:
          locale === "ru"
            ? `Текущий период · ${summary.paidSeats}/${summary.requiredSeats} мест`
            : `Current period · ${summary.paidSeats}/${summary.requiredSeats} seats`,
      },
    ];
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
    if (!session || !summary || !purchasePreview) {
      setError(
        locale === "ru"
          ? "Сессия истекла или биллинг еще не загружен"
          : "Session expired or billing is not loaded yet",
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
      const redirect = await apiRequest<BillingRedirectResponse>("/billing/checkout", {
        body: JSON.stringify({
          planMonths: selectedPlan.paidMonths,
          seats: purchasePreview.targetSeats,
        }),
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

  function adjustSelectedSeatCount(delta: number) {
    setSeatControlTouched(true);
    setSelectedSeatCount((current) => Math.max(minimumSeatCount, current + delta));
  }

  async function openStripePortal() {
    if (!summary?.stripeConnected) {
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

    const stripeWindow = window.open("", "_blank");
    if (stripeWindow) {
      stripeWindow.opener = null;
    }

    try {
      setBillingActionLoading(true);
      setError(null);
      const redirect = await apiRequest<BillingRedirectResponse>("/billing/portal", {
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
    } catch (requestError) {
      stripeWindow?.close();
      setError(
        requestError instanceof Error
          ? requestError.message
          : locale === "ru"
            ? "Не удалось открыть Stripe"
            : "Failed to open Stripe",
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


  useEffect(() => {
    setSelectedSeatCount((current) => Math.max(current, minimumSeatCount));
  }, [minimumSeatCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    // Legacy bookmark/redirect: strip connected=1 so refresh doesn't reopen the modal.
    if (params.get("connected") === "1" && !peekAltegioMarketplaceParams()?.locationId) {
      const url = new URL(window.location.href);
      url.searchParams.delete("connected");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    // Wait for billing summary so React re-renders don't cancel an in-flight connect.
    if (!summary) {
      return;
    }

    const pending = peekAltegioMarketplaceParams();
    if (!pending?.locationId) {
      return;
    }

    setAltegioDialogMode("success");
    setAltegioDialogOpen(true);

    if (summary.altegio?.connected && summary.altegio.locationId === pending.locationId) {
      clearAltegioMarketplaceParams();
      setAltegioMessage(null);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("connected");
        url.searchParams.delete("salon_id");
        url.searchParams.delete("app_id");
        window.history.replaceState({}, "", url.toString());
      }
      return;
    }

    if (altegioConnectAttempted.current) {
      return;
    }

    const session = getSession();
    if (!session) {
      return;
    }

    altegioConnectAttempted.current = true;
    void (async () => {
      try {
        setAltegioConnecting(true);
        setAltegioMessage(null);
        const nextSummary = await apiRequest<BillingSummary>("/billing/altegio/connect", {
          method: "POST",
          token: session.accessToken,
          body: JSON.stringify({
            locationId: pending.locationId,
            ...(pending.applicationId ? { applicationId: pending.applicationId } : {}),
          }),
          skipClientCache: true,
        });
        setSummary(nextSummary);
        clearAltegioMarketplaceParams();
        setAltegioMessage(null);
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("connected");
          url.searchParams.delete("salon_id");
          url.searchParams.delete("app_id");
          window.history.replaceState({}, "", url.toString());
        }
      } catch (requestError) {
        altegioConnectAttempted.current = false;
        setAltegioMessage(
          requestError instanceof Error
            ? requestError.message
            : locale === "ru"
              ? "Не удалось подключить Altegio"
              : "Failed to connect Altegio",
        );
      } finally {
        setAltegioConnecting(false);
      }
    })();
  }, [locale, summary]);

  function openAltegioMarketplace() {
    const url = buildAltegioMarketplaceConnectUrl(summary?.altegio?.applicationId);
    if (!url) {
      setAltegioDialogMode("success");
      setAltegioDialogOpen(true);
      setAltegioMessage(
        locale === "ru"
          ? "Не удалось открыть Altegio Marketplace."
          : "Could not open Altegio Marketplace.",
      );
      return;
    }
    window.location.assign(url);
  }

  function handleAltegioAction() {
    if (summary?.altegio?.connected) {
      setAltegioDialogMode("disconnect");
      setAltegioMessage(null);
      setAltegioDialogOpen(true);
      return;
    }
    openAltegioMarketplace();
  }

  async function confirmAltegioDisconnect() {
    const session = getSession();
    if (!session) return;
    try {
      setAltegioDisconnecting(true);
      setAltegioMessage(
        locale === "ru"
          ? "Отключаем Altegio и синхронизируем статус…"
          : "Disconnecting Altegio and syncing status…",
      );
      const nextSummary = await apiRequest<BillingSummary>("/billing/altegio/disconnect", {
        method: "POST",
        token: session.accessToken,
        skipClientCache: true,
      });
      setSummary(nextSummary);
      clearAltegioMarketplaceParams();
      setAltegioDialogOpen(false);
      setAltegioDialogMode("success");
      setAltegioMessage(null);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("connected");
        url.searchParams.delete("salon_id");
        url.searchParams.delete("app_id");
        window.history.replaceState({}, "", url.toString());
      }
    } catch (requestError) {
      setAltegioMessage(
        requestError instanceof Error
          ? requestError.message
          : locale === "ru"
            ? "Не удалось отключить Altegio"
            : "Failed to disconnect Altegio",
      );
    } finally {
      setAltegioDisconnecting(false);
    }
  }


  const altegioBusy = altegioConnecting || altegioDisconnecting;
  const isDisconnectDialog = altegioDialogMode === "disconnect";

  return (
    <AdminShell showTopbar={false}>
      <style>{`
        @keyframes billing-value-pop {
          from {
            opacity: 0.35;
            transform: translateY(4px);
            filter: blur(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        .billing-value-pop {
          animation: billing-value-pop 180ms cubic-bezier(0.2, 0, 0, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          .billing-value-pop {
            animation: none;
          }
        }
      `}</style>
      <main className="mx-auto flex w-full max-w-[1460px] flex-col gap-5 px-6 py-6 md:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="font-heading text-[2rem] font-semibold leading-none tracking-[-0.04em] text-foreground">
              Billing
            </h1>
            <p className="max-w-2xl font-heading text-sm text-muted-foreground">
              {locale === "ru"
                ? "Управляйте местами, тарифом и платежными деталями"
                : "Manage your seats, plan and billing details"}
            </p>
          </div>
        </header>

        {summary && (
          <section className="flex flex-col gap-4 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-5 py-4 font-heading shadow-[0_14px_38px_rgba(15,23,42,0.07)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex -space-x-2">
                <div className="relative z-10 h-11 w-11 overflow-hidden rounded-xl border-2 border-white shadow-sm">
                  <img alt="Altegio" className="h-full w-full object-cover" src="/altegio-logo.png" />
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-white bg-[#eef4ff] shadow-sm">
                  <span className="font-serif text-base font-semibold italic text-[#111827]">HT</span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">Altegio</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      summary.altegio?.connected
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {summary.altegio?.connected
                      ? locale === "ru"
                        ? "Подключено"
                        : "Connected"
                      : locale === "ru"
                        ? "Не подключено"
                        : "Not connected"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {summary.altegio?.connected
                    ? locale === "ru"
                      ? `Сотрудники и расписание · salon ${summary.altegio.locationId}`
                      : `Staff and schedule · salon ${summary.altegio.locationId}`
                    : locale === "ru"
                      ? "Синхронизация HiTeam с вашим салоном"
                      : "Sync HiTeam with your location"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                  summary.altegio?.connected
                    ? "border border-[rgba(15,23,42,0.12)] bg-white text-foreground hover:bg-[#f7f8fa]"
                    : "cursor-not-allowed bg-slate-200 text-slate-500"
                }`}
                disabled={!summary.altegio?.connected}
                onClick={handleAltegioAction}
                type="button"
              >
                {summary.altegio?.connected ? <Unlink className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                {summary.altegio?.connected ? (locale === "ru" ? "Отключить" : "Disconnect") : (locale === "ru" ? "Скоро в Marketplace" : "Available soon")}
              </button>
              <AltegioPilotConnect />
            </div>
          </section>
        )}

        <Dialog
          open={altegioDialogOpen}
          onOpenChange={(open) => {
            if (!altegioBusy) setAltegioDialogOpen(open);
          }}
        >
          <DialogContent className="w-[min(640px,calc(100vw-2rem))] overflow-hidden border-0 bg-white p-0 shadow-[0_36px_110px_rgba(18,24,38,0.25)]">
            <div
              className={`relative overflow-hidden px-7 pb-7 pt-8 sm:px-9 ${
                isDisconnectDialog
                  ? "bg-[linear-gradient(135deg,#fff7f5_0%,#ffffff_55%,#f4f7ff_100%)]"
                  : "bg-[linear-gradient(135deg,#f4f7ff_0%,#fffdf4_54%,#fff5b8_100%)]"
              }`}
            >
              <div
                className={`pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl ${
                  isDisconnectDialog ? "bg-[#ffb4a8]/25" : "bg-[#ffe85d]/30"
                }`}
              />
              <div
                className={`pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full blur-3xl ${
                  isDisconnectDialog ? "bg-[#8bb5ff]/20" : "bg-[#8bb5ff]/25"
                }`}
              />

              <DialogHeader className="relative z-10 text-center">
                <DialogTitle className="sr-only">
                  {isDisconnectDialog
                    ? locale === "ru"
                      ? "Отключение Altegio"
                      : "Disconnect Altegio"
                    : locale === "ru"
                      ? "Подключение Altegio"
                      : "Altegio connection"}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {isDisconnectDialog
                    ? locale === "ru"
                      ? "Подтверждение отключения интеграции Altegio"
                      : "Confirm Altegio integration disconnect"
                    : locale === "ru"
                      ? "Синхронизация Altegio и HiTeam"
                      : "Synchronize Altegio and HiTeam"}
                </DialogDescription>
              </DialogHeader>

              <div className="relative z-10 mx-auto flex max-w-md items-center justify-center gap-4 sm:gap-7">
                <div className="flex h-24 w-36 flex-col items-center justify-center gap-2 rounded-[24px] border border-white/90 bg-white/85 shadow-[0_16px_45px_rgba(30,41,59,0.10)] backdrop-blur">
                  <div className="flex items-center gap-2">
                    <img
                      alt=""
                      aria-hidden="true"
                      className="h-9 w-9 rounded-xl object-cover"
                      src="/altegio-logo.png"
                    />
                    <span className="text-xl font-semibold tracking-[-0.04em] text-[#22262c]">
                      altegio
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#818896]">
                    Marketplace
                  </span>
                </div>

                <div className="relative flex w-14 items-center justify-center">
                  <div
                    className={`absolute h-px w-16 ${
                      isDisconnectDialog
                        ? "bg-gradient-to-r from-[#f2cc23] via-[#d0d5dd] to-[#527ce8] opacity-40"
                        : "bg-gradient-to-r from-[#f2cc23] via-[#839ef2] to-[#527ce8]"
                    }`}
                  />
                  <div
                    className={`relative flex h-9 w-9 items-center justify-center rounded-full border-4 border-white shadow-md ${
                      isDisconnectDialog
                        ? altegioDisconnecting
                          ? "bg-[#d97757] text-white"
                          : "bg-white text-[#d97757]"
                        : summary?.altegio?.connected
                          ? "bg-emerald-500 text-white"
                          : altegioConnecting
                            ? "bg-[#5577e8] text-white"
                            : "bg-white text-[#5577e8]"
                    }`}
                  >
                    {isDisconnectDialog ? (
                      altegioDisconnecting ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unlink className="h-4 w-4" />
                      )
                    ) : summary?.altegio?.connected ? (
                      <Check className="h-4 w-4 stroke-[3]" />
                    ) : altegioConnecting ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                  </div>
                </div>

                <div className="flex h-24 w-36 flex-col items-center justify-center gap-2 rounded-[24px] border border-white/90 bg-white/85 shadow-[0_16px_45px_rgba(30,41,59,0.10)] backdrop-blur">
                  <BrandWordmark className="text-[1.35rem]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#818896]">
                    Workspace
                  </span>
                </div>
              </div>

              <div className="relative z-10 mt-7 text-center">
                <h2 className="font-heading text-[1.65rem] font-semibold tracking-[-0.04em] text-[#1c2026]">
                  {isDisconnectDialog
                    ? locale === "ru"
                      ? "Отключить Altegio?"
                      : "Disconnect Altegio?"
                    : summary?.altegio?.connected
                      ? locale === "ru"
                        ? "Altegio подключён"
                        : "Altegio is connected"
                      : altegioConnecting
                        ? locale === "ru"
                          ? "Подключаем ваш салон"
                          : "Connecting your location"
                        : locale === "ru"
                          ? "Подключите Altegio к HiTeam"
                          : "Connect Altegio to HiTeam"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
                  {isDisconnectDialog
                    ? locale === "ru"
                      ? "Интеграция будет отключена в HiTeam и в Altegio Marketplace. Синхронизация сотрудников и расписания остановится."
                      : "The integration will be removed in HiTeam and Altegio Marketplace. Staff and schedule sync will stop."
                    : summary?.altegio?.connected
                      ? locale === "ru"
                        ? "Подписка, сотрудники и расписание синхронизируются автоматически."
                        : "Subscription, staff and schedules sync automatically."
                      : altegioConnecting
                        ? locale === "ru"
                          ? "Завершаем подключение и импортируем данные из Altegio…"
                          : "Finishing the connection and importing data from Altegio…"
                        : locale === "ru"
                          ? "Подтвердите доступ в Marketplace — после возврата подключение завершится само."
                          : "Approve access in Marketplace — connection finishes automatically when you return."}
                </p>
                {!isDisconnectDialog && altegioBusy ? (
                  <div className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin text-[#5577e8]" />
                    {locale === "ru"
                      ? "Это обычно занимает несколько секунд…"
                      : "This usually takes a few seconds…"}
                  </div>
                ) : null}
                {!isDisconnectDialog && altegioMessage ? (
                  <p className="mx-auto mt-4 max-w-md text-sm text-red-700">{altegioMessage}</p>
                ) : null}
              </div>
            </div>

            {isDisconnectDialog ? (
              <div className="space-y-4 px-7 pb-7 pt-5 sm:px-9">
                {altegioMessage ? (
                  <p
                    className={`text-center text-sm ${
                      altegioDisconnecting ? "text-[#40557f]" : "text-red-700"
                    }`}
                  >
                    {altegioMessage}
                  </p>
                ) : null}

                {altegioBusy ? (
                  <div className="flex items-center justify-center gap-3 py-2 text-sm text-muted-foreground">
                    <LoaderCircle className="h-5 w-5 animate-spin text-[#5577e8]" />
                    {locale === "ru"
                      ? "Это обычно занимает несколько секунд…"
                      : "This usually takes a few seconds…"}
                  </div>
                ) : (
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      onClick={() => setAltegioDialogOpen(false)}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                      {locale === "ru" ? "Отмена" : "Cancel"}
                    </button>
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90"
                      onClick={() => void confirmAltegioDisconnect()}
                      type="button"
                    >
                      <Unlink className="h-4 w-4" />
                      {locale === "ru" ? "Отключить" : "Disconnect"}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

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
              <section className="font-heading">
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
              <article className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
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
                        {locale === "ru" ? "за место / месяц" : "per seat / month"}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`mt-auto flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4 ${
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
                            : "Активные сотрудники и pending-инвайты занимают оплаченные места"
                          : summary.trialActive
                            ? "Employees can use the service without payment until the trial ends"
                            : "Active employees and pending invites use paid seats"}
                      </p>
                    </div>
                  </div>
                  {summary.missingSeats > 0 ? (
                    <div className="min-w-[112px] text-center font-heading text-white">
                      <p className="text-xl font-semibold leading-6">
                        <AnimatedBillingValue
                          animate={false}
                          valueKey={summary.amountDue}
                        >
                          {formatMoney(
                            summary.amountDue,
                            summary.price.currency,
                            locale,
                          )}
                        </AnimatedBillingValue>
                      </p>
                      <p className="mt-1 text-xs font-medium text-white/86">
                        {locale === "ru" ? "Итого" : "Total"}
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
                      {locale === "ru" ? "Цена за место" : "Price per seat"}
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
                    {locale === "ru" ? "Стоимость всех мест в месяц" : "All seats per month"}
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
                          ? "Оплачено до"
                          : "Paid through"}
                    </span>
                    <span className="font-semibold">{nextBillingDate}</span>
                  </div>
                </div>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <article className="rounded-2xl bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-lg font-semibold tracking-[-0.02em] text-foreground">
                      {locale === "ru" ? "Купить места" : "Buy seats"}
                    </h2>
                    <p className="mt-1 max-w-xl font-heading text-sm text-muted-foreground">
                      {locale === "ru"
                        ? "Одно место активирует одного сотрудника. Новые места внутри текущего периода считаются пропорционально оставшимся дням."
                        : "One seat activates one employee. New seats inside the current period are prorated by remaining days."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 font-heading text-sm font-semibold text-[#284bff]">
                    <ReceiptText className="size-4" />
                    {formatMoney(summary.price.unitAmount, summary.price.currency, locale)}
                    <span className="font-medium text-[#284bff]/70">
                      {locale === "ru" ? "/ место / мес." : "/ seat / mo"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {BILLING_PURCHASE_PLANS.map((plan) => {
                    const isSelected = selectedPlan.id === plan.id;
                    const planName =
                      plan.id === "monthly"
                        ? "Monthly"
                        : plan.id === "semi_annual"
                          ? "Semi Annual"
                          : "Annual";

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`relative min-h-[86px] rounded-xl border px-4 py-3 pr-24 text-left font-heading transition-[border-color,background-color,transform] active:scale-[0.98] ${
                          isSelected
                            ? "border-[#284bff] bg-blue-50"
                            : "border-[rgba(15,23,42,0.12)] bg-white hover:border-[#284bff]/45"
                        }`}
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        type="button"
                      >
                        <span className="text-sm font-semibold text-foreground">
                          {planName}
                        </span>
                        <span className="mt-2 block text-sm text-muted-foreground">
                          {locale === "ru"
                            ? `Оплата ${plan.paidMonths} мес.`
                            : `Pay ${plan.paidMonths} mo`}
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-[#284bff]">
                          {locale === "ru"
                            ? `Доступ ${plan.accessMonths} мес.`
                            : `${plan.accessMonths} mo access`}
                        </span>
                        {plan.bonusMonths > 0 ? (
                          <span className="absolute right-4 top-3 whitespace-nowrap text-xs font-semibold text-emerald-700">
                            {locale === "ru"
                              ? `+${plan.bonusMonths} мес. бесплатно`
                              : `+${plan.bonusMonths} mo free`}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-[rgba(15,23,42,0.1)] py-5">
                  <div className="font-heading">
                    <p className="text-sm font-semibold text-foreground">
                      {locale === "ru" ? "Мест докупить" : "Seats to buy"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {locale === "ru"
                        ? `Минимум: ${minimumSeatCount}`
                        : `Minimum: ${minimumSeatCount}`}
                    </p>
                  </div>
                  <div className="flex h-11 items-center overflow-hidden rounded-xl border border-[rgba(15,23,42,0.14)] bg-white">
                    <button
                      aria-label={locale === "ru" ? "Уменьшить места" : "Decrease seats"}
                      className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-blue-50 hover:text-[#284bff] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={selectedSeatCount <= minimumSeatCount}
                      onClick={() => adjustSelectedSeatCount(-1)}
                      type="button"
                    >
                      <Minus className="size-4" />
                    </button>
                    <div
                      aria-live="polite"
                      className="flex h-full w-20 items-center justify-center border-x border-[rgba(15,23,42,0.1)] text-center font-heading text-base font-semibold tabular-nums"
                    >
                      <AnimatedBillingValue
                        animate={seatControlTouched}
                        valueKey={selectedSeatCount}
                      >
                        {selectedSeatCount}
                      </AnimatedBillingValue>
                    </div>
                    <button
                      aria-label={locale === "ru" ? "Добавить места" : "Increase seats"}
                      className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-blue-50 hover:text-[#284bff]"
                      onClick={() => adjustSelectedSeatCount(1)}
                      type="button"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                {purchasePreview ? (
                  <dl className="mt-5 grid gap-3 font-heading text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Места после оплаты" : "Seats after payment"}
                      </dt>
                      <dd className="font-semibold text-foreground tabular-nums">
                        <AnimatedBillingValue
                          animate={seatControlTouched}
                          valueKey={`target-${purchasePreview.targetSeats}`}
                        >
                          {purchasePreview.targetSeats}
                        </AnimatedBillingValue>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Пакет на выбранный срок" : "Selected period package"}
                      </dt>
                      <dd className="font-semibold text-foreground">
                        <AnimatedBillingValue
                          animate={seatControlTouched}
                          valueKey={`renewal-${purchasePreview.renewalAmount}`}
                        >
                          {formatMoney(
                            purchasePreview.renewalAmount,
                            summary.price.currency,
                            locale,
                          )}
                        </AnimatedBillingValue>
                      </dd>
                    </div>
                    {purchasePreview.additionalSeats > 0 ? (
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground">
                          {locale === "ru"
                            ? `Доп. места до ${formatBillingDate(
                                summary.currentPeriodEnd ?? summary.stripeCurrentPeriodEnd,
                                locale,
                              )}`
                            : `Extra seats until ${formatBillingDate(
                                summary.currentPeriodEnd ?? summary.stripeCurrentPeriodEnd,
                                locale,
                              )}`}
                        </dt>
                        <dd className="font-semibold text-foreground">
                          <AnimatedBillingValue
                            animate={seatControlTouched}
                            valueKey={`prorated-${purchasePreview.proratedAmount}`}
                          >
                            {formatMoney(
                              purchasePreview.proratedAmount,
                              summary.price.currency,
                              locale,
                            )}
                          </AnimatedBillingValue>
                        </dd>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Доступ до" : "Access until"}
                      </dt>
                      <dd className="font-semibold text-foreground">
                        {formatBillingDate(purchasePreview.accessEndsAt, locale)}
                      </dd>
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-4 border-t border-[rgba(15,23,42,0.1)] pt-4">
                      <dt className="text-sm font-semibold text-foreground">
                        {locale === "ru" ? "Итого" : "Total"}
                      </dt>
                      <dd className="text-3xl font-semibold tracking-[-0.05em] text-foreground">
                        <AnimatedBillingValue
                          animate={seatControlTouched}
                          valueKey={`total-${purchasePreview.amountDue}`}
                        >
                          {formatMoney(
                            purchasePreview.amountDue,
                            summary.price.currency,
                            locale,
                          )}
                        </AnimatedBillingValue>
                      </dd>
                    </div>
                  </dl>
                ) : null}

                <button
                  className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#284bff] font-heading text-sm font-semibold text-white transition-[background-color,transform] hover:bg-[#1f3bd8] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                  disabled={billingActionLoading || !purchasePreview}
                  onClick={openBillingFlow}
                  type="button"
                >
                  <CreditCard className="size-4" />
                  {billingActionLoading
                    ? locale === "ru"
                      ? "Открываем оплату..."
                      : "Opening checkout..."
                    : locale === "ru"
                      ? `Оплатить ${formatMoney(purchasePreview?.amountDue ?? 0, summary.price.currency, locale)}`
                      : `Pay ${formatMoney(purchasePreview?.amountDue ?? 0, summary.price.currency, locale)}`}
                </button>
              </article>

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
                            ? "Карта и счета управляются в Stripe"
                            : "Cards and invoices are managed in Stripe"
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
                  className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-dashed border-[rgba(15,23,42,0.16)] font-heading text-sm font-medium text-foreground transition-[background-color,transform] hover:bg-blue-50 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={billingActionLoading || !summary.stripeConnected}
                  onClick={openStripePortal}
                  type="button"
                >
                  <ExternalLink className="size-4" />
                  {billingActionLoading
                    ? locale === "ru"
                      ? "Открываем Stripe..."
                      : "Opening Stripe..."
                    : summary.stripeConnected
                      ? locale === "ru"
                        ? "Управлять оплатой в Stripe"
                        : "Manage billing in Stripe"
                      : locale === "ru"
                        ? "Stripe появится после оплаты"
                        : "Stripe appears after payment"}
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
