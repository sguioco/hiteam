const { createDecipheriv, createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const TENANT_ID = '6f956828-2abb-4a70-a2d1-11d3a70885d2';

function decrypt(value, keyMaterial) {
  const key = createHash('sha256').update(keyMaterial).digest();
  const bytes = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
}

// Minimal reimplementation of pilot syncLocation schedule import for one location via HTTP internal
(async () => {
  const res = await fetch('http://127.0.0.1:4000/api/v1/altegio/pilot/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  console.log('direct', res.status, await res.text());
})().catch((e) => console.error(e.message));
