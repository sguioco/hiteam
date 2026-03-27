"use client";

import { AnnouncementArchiveEntry } from "@smart/types";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toAdminHref } from "@/lib/admin-routes";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Locale, useI18n } from "@/lib/i18n";

function localize(locale: Locale, ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

function formatDate(value: string, locale: Locale) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEmployeeName(
  employee:
    | {
        firstName: string;
        lastName: string;
      }
    | null
    | undefined,
) {
  if (!employee) {
    return null;
  }

  return [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim() || null;
}

function getArchiveActionLabel(action: AnnouncementArchiveEntry["action"], locale: Locale) {
  switch (action) {
    case "announcement.created":
      return localize(locale, "Создана", "Created");
    case "announcement.generated":
      return localize(locale, "Создана автоматически", "Generated");
    case "announcement.updated":
      return localize(locale, "Изменена", "Updated");
    case "announcement.deleted":
      return localize(locale, "Удалена", "Deleted");
    default:
      return action;
  }
}

function getArchiveErrorMessage(error: unknown, locale: Locale) {
  if (error instanceof Error && error.message.includes("/collaboration/announcements/archive")) {
    return localize(
      locale,
      "Архив недоступен в текущей версии API. Нужно обновить backend.",
      "Archive is unavailable in the current API version. Backend update is required.",
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return localize(locale, "Не удалось загрузить архив.", "Unable to load archive.");
}

export function NewsArchive() {
  const { locale } = useI18n();
  const [items, setItems] = useState<AnnouncementArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadArchive() {
      const session = getSession();
      if (!session) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextArchive = await apiRequest<AnnouncementArchiveEntry[]>(
          "/collaboration/announcements/archive",
          {
            token: session.accessToken,
          },
        );
        setItems(nextArchive);
      } catch (loadError) {
        setError(getArchiveErrorMessage(loadError, locale));
      } finally {
        setLoading(false);
      }
    }

    void loadArchive();
  }, [locale]);

  return (
    <section className="flex flex-col gap-5">
      <header className="animate-fade-in flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)] md:text-4xl">
              {localize(locale, "Архив новостей", "News archive")}
            </h1>
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {localize(
              locale,
              "История создания, изменений и удаления новостей.",
              "History of created, updated, and deleted news items.",
            )}
          </p>
        </div>

        <Button asChild type="button" variant="outline">
          <Link href={toAdminHref("/news")}>
            <ArrowLeft className="size-4" />
            {localize(locale, "Назад к новостям", "Back to news")}
          </Link>
        </Button>
      </header>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              className="animate-fade-in rounded-[28px] border border-[rgba(148,163,184,0.18)] bg-white/90 px-6 py-6"
              key={`archive-skeleton-${index}`}
            >
              <div className="h-4 w-28 rounded-full bg-slate-100" />
              <div className="mt-4 h-7 w-3/5 rounded-full bg-slate-100" />
              <div className="mt-3 h-4 w-2/5 rounded-full bg-slate-100" />
            </div>
          ))
        ) : items.length ? (
          items.map((entry) => (
            <article
              className="animate-fade-in rounded-[28px] border border-[rgba(148,163,184,0.18)] bg-white/94 px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[1px] hover:shadow-[0_24px_52px_rgba(15,23,42,0.08)]"
              key={entry.id}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[0.72rem] font-semibold text-slate-700">
                  {getArchiveActionLabel(entry.action, locale)}
                </span>
                {entry.isPinned ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-[0.72rem] font-semibold text-amber-700">
                    {localize(locale, "Важно", "Pinned")}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 text-xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                {entry.title ?? localize(locale, "Без названия", "Untitled")}
              </div>

              <div className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                {localize(
                  locale,
                  `${formatDate(entry.createdAt, locale)} · ${formatEmployeeName(entry.actorEmployee) ?? "Система"}`,
                  `${formatDate(entry.createdAt, locale)} · ${formatEmployeeName(entry.actorEmployee) ?? "System"}`,
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="animate-fade-in rounded-[28px] border border-[rgba(148,163,184,0.18)] bg-white/94 px-6 py-12 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <FileText className="size-6" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
              {localize(locale, "Архив пока пуст", "Archive is empty")}
            </h2>
          </div>
        )}
      </div>
    </section>
  );
}
