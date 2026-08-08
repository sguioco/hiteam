import { createDecipheriv, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const TENANT_ID = '6f956828-2abb-4a70-a2d1-11d3a70885d2';
const ALT_LOCATION_ID = '759658';
const PILOT_LOCATION_ID = '6d699e4b-cfa1-4062-88fe-5ecdf6265c2b';
const HITEAM_LOCATION_ID = '36af3b6f-e6b9-4718-b7c4-364a59e85ee2';

function decrypt(value, keyMaterial) {
  const key = createHash('sha256').update(keyMaterial).digest();
  const bytes = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
}

async function altegioRequest(method, url, partner, userToken) {
  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/vnd.api.v2+json',
      Authorization: `Bearer ${partner}, User ${userToken}`,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Altegio ${method} ${url} -> ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

function parseTeamMembers(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows
    .map((row) => {
      const attrs = row.attributes || row;
      return {
        id: String(row.id ?? attrs.id ?? '').trim(),
        name: String(attrs.name ?? attrs.title ?? '').trim(),
        fired: Boolean(attrs.fired),
        deleted: Boolean(attrs.deleted),
      };
    })
    .filter((row) => row.id && !row.fired && !row.deleted);
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

const partner = process.env.ALTEGIO_PARTNER_TOKEN || '';
const keyMaterial = process.env.ALTEGIO_PILOT_ENCRYPTION_KEY || '';
if (!partner || !keyMaterial) {
  console.log(JSON.stringify({ error: 'missing_env', hasPartner: Boolean(partner), hasPilotKey: Boolean(keyMaterial) }));
  process.exit(2);
}

const prisma = new PrismaClient();
try {
  const connection = await prisma.altegioPilotConnection.findUnique({ where: { tenantId: TENANT_ID } });
  if (!connection) throw new Error('pilot connection missing');
  const userToken = decrypt(connection.userTokenCiphertext, keyMaterial);

  const links = await prisma.altegioPilotStaffLink.findMany({
    where: { pilotLocationId: PILOT_LOCATION_ID },
    include: { employee: true },
  });

  const query = new URLSearchParams();
  query.append('filter[fired]', '0');
  query.append('filter[deleted]', '0');
  query.append('include', 'employee');
  query.append('include', 'position');
  const staffPayload = await altegioRequest(
    'GET',
    `https://api.alteg.io/api/v2/locations/${ALT_LOCATION_ID}/team_members?${query.toString()}`,
    partner,
    userToken,
  );
  const remoteStaff = parseTeamMembers(staffPayload);

  const linkedIds = new Set(links.map((link) => link.altegioStaffId));
  const remoteIds = new Set(remoteStaff.map((staff) => staff.id));
  const missingInHiteam = remoteStaff
    .filter((staff) => !linkedIds.has(staff.id))
    .map((staff) => ({ id: staff.id, name: staff.name }));
  const extraInHiteam = links
    .filter((link) => !remoteIds.has(link.altegioStaffId))
    .map((link) => ({
      altegioStaffId: link.altegioStaffId,
      name: `${link.employee.firstName} ${link.employee.lastName}`.trim(),
    }));

  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 14);

  const schedulePayload = await altegioRequest(
    'GET',
    `https://api.alteg.io/api/v1/company/${ALT_LOCATION_ID}/staff/schedule?start_date=${formatDate(from)}&end_date=${formatDate(to)}`,
    partner,
    userToken,
  );

  let remoteDays = 0;
  let remoteSlots = 0;
  for (const day of schedulePayload?.data || []) {
    remoteDays += 1;
    remoteSlots += Array.isArray(day.slots) ? day.slots.length : 0;
  }

  const hiteamAltegioShifts = await prisma.shift.count({
    where: {
      tenantId: TENANT_ID,
      locationId: HITEAM_LOCATION_ID,
      status: 'PUBLISHED',
      source: { startsWith: 'ALTEGIO_PILOT_' },
      shiftDate: { gte: from, lt: to },
    },
  });
  const hiteamOwnShifts = await prisma.shift.count({
    where: {
      tenantId: TENANT_ID,
      locationId: HITEAM_LOCATION_ID,
      status: 'PUBLISHED',
      source: 'HITEAM',
      shiftDate: { gte: from, lt: to },
    },
  });

  const pilotLoc = await prisma.altegioPilotLocation.findUnique({ where: { id: PILOT_LOCATION_ID } });

  console.log(
    JSON.stringify(
      {
        location: {
          altegioId: ALT_LOCATION_ID,
          name: pilotLoc?.altegioLocationName,
          hiteamLocationId: HITEAM_LOCATION_ID,
        },
        sync: {
          staffLastSyncedAt: pilotLoc?.staffLastSyncedAt,
          scheduleLastSyncedAt: pilotLoc?.scheduleLastSyncedAt,
          lastError: pilotLoc?.lastError,
        },
        staff: {
          altegioActiveCount: remoteStaff.length,
          hiteamLinkedCount: links.length,
          missingInHiteamCount: missingInHiteam.length,
          extraInHiteamCount: extraInHiteam.length,
          missingInHiteam: missingInHiteam.slice(0, 15),
          extraInHiteam: extraInHiteam.slice(0, 15),
          staffMatch: missingInHiteam.length === 0 && extraInHiteam.length === 0,
        },
        scheduleWindow: { from: formatDate(from), to: formatDate(to) },
        schedule: {
          altegioDays: remoteDays,
          altegioSlots: remoteSlots,
          hiteamImportedShifts: hiteamAltegioShifts,
          hiteamPublishedOwnShifts: hiteamOwnShifts,
        },
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
