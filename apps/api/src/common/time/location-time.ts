/** A calendar date belongs to a location, not to the API process timezone. */
export function locationDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Resolve local wall time to an instant. Reject invalid zones and DST gaps.
 * In a DST overlap choose the earlier instant deterministically. */
export function localTimeToInstant(date: string, time: string, timeZone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const guess = new Date(`${date}T${time}:00.000Z`);
  if (Number.isNaN(guess.getTime()) || guess.toISOString().slice(0, 10) !== date) return null;
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return null; }
  const wallTime = (instant: Date) => {
    const parts = formatter.formatToParts(instant);
    const get = (type: string) => parts.find(part => part.type === type)!.value;
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}.000Z`;
  };
  const candidates: number[] = [];
  for (const delta of [-86_400_000, 0, 86_400_000]) {
    const probe = new Date(guess.getTime() + delta);
    const offset = new Date(wallTime(probe)).getTime() - probe.getTime();
    const candidate = new Date(guess.getTime() - offset);
    if (wallTime(candidate) === `${date}T${time}:00.000Z`) candidates.push(candidate.getTime());
  }
  return candidates.length ? new Date(Math.min(...candidates)) : null;
}
