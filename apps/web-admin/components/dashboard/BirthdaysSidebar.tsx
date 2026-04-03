"use client";

import { Cake } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type BirthdayItem = {
  avatarUrl?: string | null;
  dateLabel: string;
  name: string;
};

export const BirthdaysSidebar = ({
  locale: forcedLocale,
  items,
}: {
  locale?: "ru" | "en";
  items: BirthdayItem[];
}) => {
  const { locale: activeLocale } = useI18n();
  const locale = forcedLocale ?? activeLocale;

  return (
    <div className="birthdays-sidebar">
      <div className="birthdays-sidebar-header">
        <Cake className="w-4 h-4 text-[var(--accent)]" />
        <div className="birthdays-sidebar-title">
          <h2 className="font-semibold text-sm">
            {locale === "ru" ? "Дни рождения" : "Birthdays"}
          </h2>
        </div>
      </div>
      <div className="birthdays-sidebar-list">
        {items.length ? (
          items.map((item, index) => (
            <div
              key={`${item.name}-${item.dateLabel}`}
              className="birthdays-sidebar-item animate-fade-in"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <img
                alt={item.name}
                className="h-11 w-11 shrink-0 rounded-full object-cover shadow-[0_8px_20px_rgba(40,75,255,0.12)]"
                src={item.avatarUrl ?? undefined}
              />
              <div className="birthdays-sidebar-copy">
                <p className="birthdays-sidebar-name">{item.name}</p>
                <span className="birthdays-sidebar-date">
                  {item.dateLabel}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="birthdays-sidebar-empty">
            {locale === "ru"
              ? "В ближайшие дни дней рождения нет"
              : "No birthdays in the next few days"}
          </div>
        )}
      </div>
    </div>
  );
};
