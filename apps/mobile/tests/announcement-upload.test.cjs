const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../lib/announcement-upload.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const tested = { exports: {} };
new Function('exports', 'module', compiled)(tested.exports, tested);
const { utf8ByteLength, serializeAnnouncement, ANNOUNCEMENT_REQUEST_LIMIT_BYTES } = tested.exports;

for (const text of ['ASCII', 'Меняется график', '😀', '\ud800']) {
  // Requests contain JSON, which escapes lone surrogates.
  const json = JSON.stringify({ text });
  assert.equal(utf8ByteLength(json), Buffer.byteLength(json, 'utf8'));
}
const payload = {
  audience: 'ALL', title: 'Меняется график', body: 'Новый график опубликуем послезавтра',
  imageAspectRatio: '1:1', imageDataUrl: 'data:image/jpeg;base64,YWJj',
  attachmentLocation: { address: 'Первомайская, 1', latitude: 55.03, longitude: 82.92 },
  scheduledFor: '2026-10-01T10:00:00.000Z',
};
assert.deepEqual(JSON.parse(serializeAnnouncement(payload, 'ru')), payload);
const exactLimit = 'x'.repeat(ANNOUNCEMENT_REQUEST_LIMIT_BYTES - 2);
assert.equal(utf8ByteLength(serializeAnnouncement(exactLimit, 'ru')), ANNOUNCEMENT_REQUEST_LIMIT_BYTES);
assert.throws(() => serializeAnnouncement(exactLimit + 'x', 'ru'), /Уменьшите размер/);
assert.throws(() => serializeAnnouncement(exactLimit + 'x', 'en'), /Reduce the photo/);
assert.throws(() => serializeAnnouncement({ attachments: [{ dataUrl: exactLimit }] }, 'ru'), /слишком большая/);
// A changed server limit must update the client contract as well.
const server = fs.readFileSync(path.join(__dirname, '../../api/src/main.ts'), 'utf8');
assert.match(server, /json\(\{ limit: '8mb' \}\)/);
assert.equal(ANNOUNCEMENT_REQUEST_LIMIT_BYTES, 8 * 1024 * 1024);
console.log('announcement upload: UTF-8, valid payload, exact boundary and RU/EN errors passed');
