"use client";

import { Cake } from "lucide-react";

type BirthdayItem = {
  avatarUrl?: string | null;
  dateLabel: string;
  department: string;
  name: string;
};

export const BirthdaysSidebar = ({
  items,
}: {
  items: BirthdayItem[];
}) => (
  <div className="birthdays-sidebar">
    <div className="birthdays-sidebar-header">
      <Cake className="w-4 h-4 text-[var(--accent)]" />
      <div>
        <h2 className="font-semibold text-sm">Дни рождения</h2>
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
              <p className="birthdays-sidebar-department">
                {item.department}
              </p>
            </div>
            <span className="birthdays-sidebar-date">
              {item.dateLabel}
            </span>
          </div>
        ))
      ) : (
        <div className="birthdays-sidebar-empty">
          В ближайшие дни дней рождения нет.
        </div>
      )}
    </div>
  </div>
);
