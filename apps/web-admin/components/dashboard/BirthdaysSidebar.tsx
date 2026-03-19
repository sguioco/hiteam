"use client";

import { Cake } from "lucide-react";

type BirthdayItem = {
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
        <p className="birthdays-sidebar-caption">Ближайшие сотрудники</p>
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
            <div>
              <p className="text-sm font-medium leading-tight">{item.name}</p>
              <p className="text-[10px] text-[var(--muted-foreground)]">
                {item.department}
              </p>
            </div>
            <span className="text-xs text-[var(--accent)] font-medium whitespace-nowrap">
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
