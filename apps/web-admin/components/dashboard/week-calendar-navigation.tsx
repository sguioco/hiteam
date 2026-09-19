import { toAdminHref } from "../../lib/admin-routes";

export function calendarDayHref(date: Date) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return toAdminHref(`/schedule?date=${key}`);
}

export function WeekCalendarNavigation({ start, locale }: { start: Date; locale: string }) {
  const ru = locale === 'ru';
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const previous = new Date(start); previous.setDate(previous.getDate() - 7);
  const next = new Date(start); next.setDate(next.getDate() + 7);
  const format = (date: Date) => date.toLocaleDateString(ru ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  return <header className="dashboard-week-navigation">
    <div><h2>{ru ? 'Мой календарь' : 'My calendar'}</h2><p>{format(start)} — {format(end)}</p></div>
    <nav aria-label={ru ? 'Переходы в полный календарь' : 'Open full calendar'}>
      <a href={calendarDayHref(previous)} aria-label={ru ? 'Предыдущая неделя в календаре' : 'Previous week in calendar'}>←</a>
      <a href={calendarDayHref(start)}>{ru ? 'Открыть календарь' : 'Open calendar'}</a>
      <a href={calendarDayHref(next)} aria-label={ru ? 'Следующая неделя в календаре' : 'Next week in calendar'}>→</a>
    </nav>
  </header>;
}
