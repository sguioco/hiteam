const { createDecipheriv, createHash } = require('node:crypto');
const { PrismaClient, ShiftStatus } = require('@prisma/client');

const TENANT_ID = '6f956828-2abb-4a70-a2d1-11d3a70885d2';
const ALT_LOCATION_ID = '759658';
const PILOT_ID = '5afbe1d6-cd35-4a70-a6b9-c4b259509a70';

function decrypt(value, keyMaterial) {
  const key = createHash('sha256').update(keyMaterial).digest();
  const bytes = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
}

(async () => {
  const partner = process.env.ALTEGIO_PARTNER_TOKEN || '';
  const keyMaterial = process.env.ALTEGIO_PILOT_ENCRYPTION_KEY || '';
  const prisma = new PrismaClient();
  const conn = await prisma.altegioPilotConnection.findUnique({ where: { tenantId: TENANT_ID } });
  const pilot = await prisma.altegioPilotLocation.findUnique({ where: { id: PILOT_ID } });
  const token = decrypt(conn.userTokenCiphertext, keyMaterial);

  const hooksRes = await fetch(`https://api.alteg.io/api/v1/hooks_settings/${ALT_LOCATION_ID}`, {
    headers: {
      Accept: 'application/vnd.api.v2+json',
      Authorization: 'Bearer ' + partner + ', User ' + token,
    },
  });
  const hooksBody = await hooksRes.json();
  const hooks = hooksBody.data || {};
  const urls = Array.isArray(hooks.urls) ? hooks.urls : [];

  const links = await prisma.altegioPilotStaffLink.findMany({
    where: { pilotLocationId: PILOT_ID },
    include: { employee: { select: { firstName: true, lastName: true } } },
  });
  const query = new URLSearchParams({ start_date: '2026-08-15', end_date: '2026-08-25' });
  for (const link of links) query.append('staff_ids[]', link.altegioStaffId);
  const schedRes = await fetch(
    `https://api.alteg.io/api/v1/company/${ALT_LOCATION_ID}/staff/schedule?${query.toString()}`,
    {
      headers: {
        Accept: 'application/vnd.api.v2+json',
        Authorization: 'Bearer ' + partner + ', User ' + token,
      },
    },
  );
  const schedBody = await schedRes.json();
  const remoteDays = (Array.isArray(schedBody.data) ? schedBody.data : [])
    .filter((row) => Array.isArray(row.slots) && row.slots.length > 0)
    .map((row) => ({
      staffId: String(row.staff_id || row.team_member_id || ''),
      date: String(row.date || ''),
      slots: row.slots,
    }));

  const source = 'ALTEGIO_PILOT_' + PILOT_ID;
  const local = await prisma.shift.findMany({
    where: {
      locationId: pilot.hiteamLocationId,
      source,
      status: { not: ShiftStatus.CANCELLED },
      shiftDate: { gte: new Date('2026-08-15'), lte: new Date('2026-08-25') },
    },
    include: { employee: { select: { firstName: true, lastName: true } } },
    orderBy: { startsAt: 'asc' },
  });

  const abdullaLink = links.find((link) =>
    /abdulla/i.test(`${link.employee.lastName} ${link.employee.firstName}`),
  );

  console.log(
    JSON.stringify(
      {
        hooks: {
          http: hooksRes.status,
          active: hooks.active,
          master: hooks.master,
          urlCount: urls.length,
          hasHiteamWebhookUrl: urls.some(
            (url) => String(url).includes('api.hiteam.net') && String(url).includes('altegio/webhooks'),
          ),
          urlHosts: urls.map((url) => {
            try {
              return new URL(url).host;
            } catch {
              return 'invalid';
            }
          }),
        },
        pilot: {
          scheduleLastSyncedAt: pilot.scheduleLastSyncedAt,
          staffLastSyncedAt: pilot.staffLastSyncedAt,
          lastError: pilot.lastError,
          staffLinks: links.length,
        },
        scheduleWindowAug15_25: {
          remoteDays: remoteDays.length,
          localShifts: local.length,
          remoteSample: remoteDays.slice(0, 8),
          localSample: local.slice(0, 8).map((shift) => ({
            name: `${shift.employee.firstName} ${shift.employee.lastName}`.trim(),
            date: shift.shiftDate.toISOString().slice(0, 10),
            start: shift.startsAt.toISOString(),
            end: shift.endsAt.toISOString(),
          })),
          abdulla: abdullaLink
            ? {
                staffId: abdullaLink.altegioStaffId,
                remote: remoteDays.filter((day) => day.staffId === abdullaLink.altegioStaffId),
                local: local
                  .filter((shift) => shift.employeeId === abdullaLink.employeeId)
                  .map((shift) => ({
                    date: shift.shiftDate.toISOString().slice(0, 10),
                    start: shift.startsAt.toISOString(),
                    end: shift.endsAt.toISOString(),
                  })),
              }
            : null,
        },
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
})().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
