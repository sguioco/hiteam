function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function formatDateKeyInTimeZone(date: Date, timeZone?: string | null) {
  if (!timeZone) {
    return formatLocalDateKey(date);
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fallback to device-local date key when timezone is invalid.
  }

  return formatLocalDateKey(date);
}

export function isDateKeyBefore(left: string, right: string) {
  return left.localeCompare(right) < 0;
}
