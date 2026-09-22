export function CalendarFilterSummary({ labels, locale, onReset }: {
  labels: string[];
  locale: string;
  onReset: () => void;
}) {
  if (!labels.length) return null;
  return <div className="calendar-filter-summary" aria-label={locale === "ru" ? "Активные фильтры" : "Active filters"}>
    {labels.map((label, index) => <span key={`${index}:${label}`}>{label}</span>)}
    <button type="button" onClick={onReset}>{locale === "ru" ? "Сбросить фильтры" : "Clear filters"}</button>
  </div>;
}
