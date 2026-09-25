export type ClockPeriod = 'AM' | 'PM';

export function usesTwelveHourClock(locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 === true;
}

export function displayHour(hour: number, twelveHour: boolean) {
  if (!twelveHour) return hour;
  return hour % 12 || 12;
}

export function clockPeriod(hour: number): ClockPeriod {
  return hour < 12 ? 'AM' : 'PM';
}

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩۰-۹０-９]/g, (digit) => {
    const code = digit.charCodeAt(0);
    const zero = code >= 0xff10 ? 0xff10 : code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - zero);
  });
}

export function parseTimeInput(hourText: string, minuteText: string, twelveHour: boolean, period: ClockPeriod) {
  hourText = normalizeDigits(hourText);
  minuteText = normalizeDigits(minuteText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (
    !/^\d{1,2}$/.test(hourText) ||
    !/^\d{1,2}$/.test(minuteText) ||
    hour < (twelveHour ? 1 : 0) ||
    hour > (twelveHour ? 12 : 23) ||
    minute > 59
  ) return null;

  return {
    hour: twelveHour ? (hour % 12) + (period === 'PM' ? 12 : 0) : hour,
    minute,
  };
}
