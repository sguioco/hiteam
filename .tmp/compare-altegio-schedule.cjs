const { createDecipheriv, createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const TENANT_ID = '6f956828-2abb-4a70-a2d1-11d3a70885d2';
const ALT_LOCATION_ID = '759658';
const PILOT_LOCATION_ID = '6d699e4b-cfa1-4062-88fe-5ecdf6265c2b';

function decrypt(value, keyMaterial) {
  const key = createHash('sha256').update(keyMaterial).digest();
  const bytes = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
}

(async () => {
  const partner = process.env.ALTEGIO_PARTNER_TOKEN;
  const keyMaterial = process.env.ALTEGIO_PILOT_ENCRYPTION_KEY;
  const prisma = new PrismaClient();
  const connection = await prisma.altegioPilotConnection.findUnique({ where: { tenantId: TENANT_ID } });
  const userToken = decrypt(connection.userTokenCiphertext, keyMaterial);
  const from = '2026-08-08';
  const to = '2026-08-22';
  const res = await fetch(
    `https://api.alteg.io/api/v1/company/${ALT_LOCATION_ID}/staff/schedule?start_date=${from}&end_date=${to}`,
    { headers: { Accept: 'application/vnd.api.v2+json', Authorization: `Bearer ${partner}, User ${userToken}` } },
  );
  const payload = await res.json();
  const links = await prisma.altegioPilotStaffLink.findMany({
    where: { pilotLocationId: PILOT_LOCATION_ID },
    include: { employee: true },
  });
  const byStaff = new Map(links.map((l) => [l.altegioStaffId, `${l.employee.firstName} ${l.employee.lastName}`.trim()]));
  const days = (payload.data || []).map((day) => ({
    staffId: String(day.staff_id ?? day.staffId ?? ''),
    name: byStaff.get(String(day.staff_id ?? day.staffId ?? '')) || 'unknown',
    date: day.date,
    slots: (day.slots || []).map((slot) => ({ from: slot.from, to: slot.to })),
  }));
  console.log(JSON.stringify({ ok: res.ok, days }, null, 2));
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
