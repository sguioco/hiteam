export type MatchableEmployee = {
  id: string;
  altegioTeamMemberId: string | null;
  employeeNumber?: string | null;
  phone: string | null;
  email: string | null;
};

export type AltegioStaffIdentity = {
  id: string;
  phone: string | null;
  email: string | null;
};

export function normalizeAltegioPhone(phone?: string | null) {
  const trimmed = String(phone || '').trim();
  if (!trimmed) return null;
  const withPlus = trimmed.replace(/[^\d+]/g, '');
  return withPlus || null;
}

export function normalizeAltegioEmail(email?: string | null) {
  const normalized = String(email || '').trim().toLowerCase();
  return normalized || null;
}

export function phoneDigits(phone?: string | null) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits || null;
}

export function phonesMatch(left?: string | null, right?: string | null) {
  const a = phoneDigits(left);
  const b = phoneDigits(right);
  if (!a || !b) return false;
  if (a === b) return true;

  const normalize = (value: string) => value.replace(/^0+/, '');
  const leftNorm = normalize(a);
  const rightNorm = normalize(b);
  if (!leftNorm || !rightNorm) return false;
  if (leftNorm === rightNorm) return true;

  const shorter = leftNorm.length <= rightNorm.length ? leftNorm : rightNorm;
  const longer = leftNorm.length <= rightNorm.length ? rightNorm : leftNorm;
  return shorter.length >= 8 && longer.endsWith(shorter);
}

export function splitAltegioStaffName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: 'Altegio', lastName: 'Staff' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Staff' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

export function syntheticAltegioEmail(teamMemberId: string) {
  return `altegio+${teamMemberId}@users.hiteam.local`;
}

export function pilotAltegioEmployeeNumber(altegioLocationId: string, staffId: string) {
  return `ALT-${altegioLocationId}-${staffId}`.slice(0, 32);
}

export function pilotAltegioSyntheticEmail(altegioLocationId: string, staffId: string) {
  return syntheticAltegioEmail(`${altegioLocationId}-${staffId}`);
}

export function matchEmployeeToAltegioStaff(
  employees: MatchableEmployee[],
  staff: AltegioStaffIdentity,
  altegioLocationId?: string,
): MatchableEmployee | null {
  const byId = employees.find((employee) => employee.altegioTeamMemberId === staff.id);
  if (byId) {
    return byId;
  }

  if (altegioLocationId) {
    const targetNumber = pilotAltegioEmployeeNumber(altegioLocationId, staff.id);
    const byEmployeeNumber = employees.find((employee) => employee.employeeNumber === targetNumber);
    if (byEmployeeNumber) {
      return byEmployeeNumber;
    }
  }

  if (staff.phone) {
    const byPhone = employees.find(
      (employee) => !employee.altegioTeamMemberId && phonesMatch(employee.phone, staff.phone),
    );
    if (byPhone) {
      return byPhone;
    }
  }

  const staffEmail = normalizeAltegioEmail(staff.email);
  if (staffEmail && !staffEmail.endsWith('@users.hiteam.local')) {
    const byEmail = employees.find(
      (employee) =>
        !employee.altegioTeamMemberId && normalizeAltegioEmail(employee.email) === staffEmail,
    );
    if (byEmail) {
      return byEmail;
    }
  }

  return null;
}

export function formatDateOnly(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateOnlyToUtc(date: string) {
  const [year, month, day] = date.split('-').map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

export function mergeLocalTimeOnDate(date: string, hhmm: string, timeZone: string) {
  const [hoursRaw, minutesRaw] = hhmm.split(':');
  const hours = Number.parseInt(hoursRaw || '0', 10);
  const minutes = Number.parseInt(minutesRaw || '0', 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  // Interpret HH:mm in the location timezone by approximating with a Date in that zone via offset probe.
  const utcGuess = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`);
  const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, utcGuess);
  if (offsetMinutes === null) {
    return utcGuess;
  }
  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

function getTimeZoneOffsetMinutes(timeZone: string, date: Date) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = dtf.formatToParts(date);
    const values: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== 'literal') {
        values[part.type] = part.value;
      }
    }
    const asUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour === '24' ? '0' : values.hour),
      Number(values.minute),
      Number(values.second),
    );
    return (asUtc - date.getTime()) / 60_000;
  } catch {
    return null;
  }
}

export function defaultSyncWindow(now = new Date()) {
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - 7);
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setUTCDate(to.getUTCDate() + 30);
  to.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

export function groupHiteamShiftsForAltegioPush(
  shifts: Array<{
    altegioTeamMemberId: string;
    shiftDate: Date;
    startsAt: Date;
    endsAt: Date;
    timeZone: string;
  }>,
) {
  const byKey = new Map<
    string,
    {
      teamMemberId: string;
      date: string;
      slots: Array<{ from: string; to: string }>;
    }
  >();

  for (const shift of shifts) {
    const date = formatDateOnly(shift.shiftDate);
    const key = `${shift.altegioTeamMemberId}:${date}`;
    const existing = byKey.get(key) ?? {
      teamMemberId: shift.altegioTeamMemberId,
      date,
      slots: [],
    };
    existing.slots.push({
      from: formatHmInTimeZone(shift.startsAt, shift.timeZone),
      to: formatHmInTimeZone(shift.endsAt, shift.timeZone),
    });
    byKey.set(key, existing);
  }

  return [...byKey.values()];
}

function formatHmInTimeZone(value: Date, timeZone: string) {
  try {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(value);
    return formatted.replace('24:', '00:');
  } catch {
    return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
  }
}

export const ALTEGIO_SHIFT_SOURCE = 'ALTEGIO';
export const HITEAM_SHIFT_SOURCE = 'HITEAM';
export const ALTEGIO_IMPORT_TEMPLATE_CODE = 'altegio-import';
