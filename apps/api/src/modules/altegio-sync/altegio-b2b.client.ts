import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class AltegioB2bError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'AltegioB2bError';
  }
}

export type AltegioTeamMember = {
  id: string;
  name: string;
  specialization: string | null;
  positionId: string | null;
  positionTitle: string | null;
  phone: string | null;
  email: string | null;
  fired: boolean;
  deleted: boolean;
};

export type AltegioScheduleSlot = {
  from: string;
  to: string;
};

export type AltegioScheduleDay = {
  teamMemberId: string;
  date: string;
  slots: AltegioScheduleSlot[];
};

export type AltegioLocationProfile = {
  id: string;
  name: string;
  publicName: string | null;
  address: string;
  country: string | null;
  city: string | null;
  timezone: string;
  latitude: number;
  longitude: number;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
};

@Injectable()
export class AltegioB2bClient {
  private readonly logger = new Logger(AltegioB2bClient.name);
  private readonly apiBase = 'https://api.alteg.io';

  constructor(private readonly configService: ConfigService) {}

  isConfigured() {
    return Boolean(this.partnerToken() && this.systemUserToken());
  }

  partnerToken() {
    return this.configService.get<string>('ALTEGIO_PARTNER_TOKEN')?.trim() || '';
  }

  systemUserToken() {
    return (this.configService.get<string>('ALTEGIO_MARKETPLACE_SYSTEM_USER_TOKEN') ?? '').trim();
  }

  async getLocationProfile(locationId: string): Promise<AltegioLocationProfile> {
    const payload = await this.request(
      'GET',
      `${this.apiBase}/api/v1/company/${encodeURIComponent(locationId)}`,
      undefined,
      'application/vnd.api.v2+json',
      false,
    );
    return parseLocationProfilePayload(payload, locationId);
  }

  async listTeamMembers(locationId: string): Promise<AltegioTeamMember[]> {
    const query = new URLSearchParams();
    query.append('filter[fired]', '0');
    query.append('filter[deleted]', '0');
    query.append('include', 'employee');
    query.append('include', 'position');

    const payload = await this.request(
      'GET',
      `${this.apiBase}/api/v2/locations/${encodeURIComponent(locationId)}/team_members?${query.toString()}`,
      undefined,
      'application/vnd.api.v2+json',
    );

    return parseTeamMembersPayload(payload);
  }

  async createTeamMember(args: {
    locationId: string;
    name: string;
    specialization?: string | null;
    phone?: string | null;
    email?: string | null;
    positionId?: number | null;
  }) {
    const phoneDigits = digitsOnly(args.phone);
    const payload = await this.request(
      'POST',
      `${this.apiBase}/api/v1/company/${encodeURIComponent(args.locationId)}/staff/quick`,
      {
        name: args.name.trim(),
        specialization: (args.specialization || 'Specialist').trim(),
        position_id: args.positionId ?? null,
        phone_number: phoneDigits || null,
        user_email: (args.email || '').trim() || `altegio+${Date.now()}@users.hiteam.local`,
        user_phone: phoneDigits || '0000000000',
        is_user_invite: false,
        is_paid_staff: false,
      },
      'application/vnd.api.v2+json',
    );

    const data = (payload.data && typeof payload.data === 'object' ? payload.data : payload) as Record<
      string,
      unknown
    >;
    const id = String(data.id ?? '').trim();
    if (!id) {
      throw new AltegioB2bError('altegio_create_team_member_missing_id', 502, payload);
    }
    return { id, raw: payload };
  }

  async getStaffSchedule(args: {
    locationId: string;
    startDate: string;
    endDate: string;
    staffIds?: string[];
  }): Promise<AltegioScheduleDay[]> {
    const query = new URLSearchParams({
      start_date: args.startDate,
      end_date: args.endDate,
    });
    for (const staffId of args.staffIds ?? []) {
      query.append('staff_ids[]', staffId);
    }

    const payload = await this.request(
      'GET',
      `${this.apiBase}/api/v1/company/${encodeURIComponent(args.locationId)}/staff/schedule?${query.toString()}`,
      undefined,
      'application/vnd.api.v2+json',
    );

    return parseSchedulePayload(payload);
  }

  async setStaffSchedule(args: {
    locationId: string;
    schedulesToSet?: Array<{
      teamMemberId: string;
      dates: string[];
      slots: AltegioScheduleSlot[];
    }>;
    schedulesToDelete?: Array<{
      teamMemberId: string;
      dates: string[];
    }>;
  }) {
    return this.request(
      'PUT',
      `${this.apiBase}/api/v1/company/${encodeURIComponent(args.locationId)}/staff/schedule`,
      {
        schedules_to_set: (args.schedulesToSet ?? []).map((item) => ({
          team_member_id: Number.parseInt(item.teamMemberId, 10),
          dates: item.dates,
          slots: item.slots,
        })),
        schedules_to_delete: (args.schedulesToDelete ?? []).map((item) => ({
          team_member_id: Number.parseInt(item.teamMemberId, 10),
          dates: item.dates,
        })),
      },
      'application/vnd.api.v2+json',
    );
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    json?: Record<string, unknown>,
    accept = 'application/vnd.api.v2+json',
    includeUserToken = true,
  ) {
    const partnerToken = this.partnerToken();
    const userToken = this.systemUserToken();
    if (!partnerToken || (includeUserToken && !userToken)) {
      throw new AltegioB2bError('altegio_b2b_tokens_missing', 503);
    }

    const headers: Record<string, string> = {
      Accept: accept,
      Authorization: includeUserToken
        ? `Bearer ${partnerToken}, User ${userToken}`
        : `Bearer ${partnerToken}`,
    };
    if (json) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: json ? JSON.stringify(json) : undefined,
    });

    const rawText = await response.text();
    let payload: unknown = null;
    if (rawText.trim()) {
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = { error: 'invalid_json', response_text: rawText.slice(0, 500) };
      }
    } else if (response.status >= 200 && response.status < 300) {
      payload = { success: true, data: null };
    }

    if (response.status >= 400) {
      this.logger.warn(`Altegio B2B ${method} ${url} -> ${response.status}: ${rawText.slice(0, 400)}`);
      throw new AltegioB2bError(`Altegio B2B request failed with ${response.status}`, response.status, payload);
    }

    return (payload && typeof payload === 'object' ? payload : { success: true, data: payload }) as Record<
      string,
      unknown
    >;
  }
}

function optionalString(value: unknown) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseLocationProfilePayload(
  payload: Record<string, unknown>,
  locationId: string,
): AltegioLocationProfile {
  const rows = Array.isArray(payload.data)
    ? payload.data
    : payload.data && typeof payload.data === 'object'
      ? [payload.data]
      : [];
  const row = rows.find(
    (item): item is Record<string, unknown> =>
      Boolean(item) &&
      typeof item === 'object' &&
      String((item as Record<string, unknown>).id ?? '') === locationId,
  );
  if (!row) {
    throw new AltegioB2bError('altegio_location_not_found', 404, payload);
  }

  return {
    id: String(row.id),
    name: String(row.title || row.public_title || `Altegio ${locationId}`).trim(),
    publicName: optionalString(row.public_title),
    address: String(row.address || '').trim(),
    country: optionalString(row.country),
    city: optionalString(row.city),
    timezone: String(row.timezone_name || 'UTC').trim() || 'UTC',
    latitude: finiteNumber(row.coordinate_lat),
    longitude: finiteNumber(row.coordinate_lon),
    logoUrl: optionalString(row.logo),
    phone: optionalString(row.phone),
    email: optionalString(row.email),
  };
}

function digitsOnly(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

export function parseTeamMembersPayload(payload: Record<string, unknown>): AltegioTeamMember[] {
  const data = Array.isArray(payload.data) ? payload.data : [];
  const included = Array.isArray(payload.included) ? payload.included : [];

  const includedByKey = new Map<string, Record<string, unknown>>();
  for (const item of included) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const type = String(row.type || '').trim();
    const id = String(row.id || '').trim();
    if (type && id) {
      includedByKey.set(`${type}:${id}`, row);
    }
  }

  const members: AltegioTeamMember[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id || '').trim();
    if (!id) continue;

    const attributes =
      row.attributes && typeof row.attributes === 'object'
        ? (row.attributes as Record<string, unknown>)
        : row;
    const relationships =
      row.relationships && typeof row.relationships === 'object'
        ? (row.relationships as Record<string, unknown>)
        : {};

    const employeeRel = relationships.employee as { data?: { id?: string; type?: string } } | undefined;
    const positionRel = relationships.position as { data?: { id?: string; type?: string } } | undefined;

    let phone: string | null = null;
    let email: string | null = null;
    if (employeeRel?.data?.id) {
      const employee = includedByKey.get(`employee:${employeeRel.data.id}`);
      const employeeAttrs =
        employee?.attributes && typeof employee.attributes === 'object'
          ? (employee.attributes as Record<string, unknown>)
          : employee;
      if (employeeAttrs) {
        phone = pickString(employeeAttrs.phone, employeeAttrs.phone_number);
        email = pickString(employeeAttrs.email, employeeAttrs.user_email);
      }
    }

    phone = phone || pickString(attributes.phone, attributes.phone_number);
    email = email || pickString(attributes.email, attributes.user_email);

    let positionTitle: string | null = null;
    let positionId: string | null = positionRel?.data?.id ? String(positionRel.data.id) : null;
    if (positionRel?.data?.id) {
      const position = includedByKey.get(`position:${positionRel.data.id}`);
      const positionAttrs =
        position?.attributes && typeof position.attributes === 'object'
          ? (position.attributes as Record<string, unknown>)
          : position;
      positionTitle = pickString(positionAttrs?.title, positionAttrs?.name);
    }
    if (!positionId) {
      positionId = pickString(attributes.position_id);
    }

    members.push({
      id,
      name: pickString(attributes.name) || `Staff ${id}`,
      specialization: pickString(attributes.specialization),
      positionId,
      positionTitle,
      phone,
      email,
      fired: Boolean(attributes.fired === true || attributes.fired === 1 || attributes.fired === '1'),
      deleted: Boolean(attributes.deleted === true || attributes.deleted === 1 || attributes.deleted === '1'),
    });
  }

  return members;
}

export function parseSchedulePayload(payload: Record<string, unknown>): AltegioScheduleDay[] {
  const raw = Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
  const days: AltegioScheduleDay[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const teamMemberId = String(row.team_member_id ?? row.staff_id ?? '').trim();
    const date = String(row.date || '').trim();
    if (!teamMemberId || !date) continue;

    const slotsRaw = Array.isArray(row.slots) ? row.slots : [];
    const slots: AltegioScheduleSlot[] = [];
    for (const slot of slotsRaw) {
      if (!slot || typeof slot !== 'object') continue;
      const slotRow = slot as Record<string, unknown>;
      const from = String(slotRow.from || '').trim();
      const to = String(slotRow.to || '').trim();
      if (from && to) {
        slots.push({ from, to });
      }
    }

    days.push({ teamMemberId, date, slots });
  }

  return days;
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return null;
}
