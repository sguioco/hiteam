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

const targetModule = { exports: {} };
new Function('exports', 'module', ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../lib/announcement-target.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText)(targetModule.exports, targetModule);
const { buildAnnouncementTarget } = targetModule.exports;
for (const workspaceLocationId of [undefined, 'workspace-location']) {
  assert.deepEqual(buildAnnouncementTarget({ audience: 'ALL' }, workspaceLocationId), { audience: 'ALL' });
  assert.deepEqual(buildAnnouncementTarget({ audience: 'GROUP', groupIds: ['g', 'g'] }, workspaceLocationId), { audience: 'GROUP', groupId: 'g' });
  assert.deepEqual(buildAnnouncementTarget({ audience: 'EMPLOYEE', targetEmployeeIds: ['e1', 'e2'] }, workspaceLocationId), { audience: 'EMPLOYEE', targetEmployeeIds: ['e1', 'e2'] });
  assert.deepEqual(buildAnnouncementTarget({ audience: 'GROUP', groupId: 'g', targetEmployeeId: 'e' }, workspaceLocationId), { audience: 'GROUP', groupId: 'g', targetEmployeeId: 'e' });
}
assert.deepEqual(buildAnnouncementTarget({}, 'workspace-location'), { audience: 'LOCATION', locationId: 'workspace-location' });
assert.deepEqual(buildAnnouncementTarget({}), { audience: 'ALL' });
assert.deepEqual(buildAnnouncementTarget({ audience: 'LOCATION', locationId: 'explicit' }, 'workspace-location'), { audience: 'LOCATION', locationId: 'explicit' });
assert.deepEqual(buildAnnouncementTarget({ audience: 'LOCATION' }, 'workspace-location'), { audience: 'LOCATION', locationId: 'workspace-location' });
// The geolocation attachment is content, not a target scope.
const news = { ...payload, ...buildAnnouncementTarget({ audience: 'ALL' }, 'workspace-location') };
assert.deepEqual(JSON.parse(serializeAnnouncement(news, 'en')).attachmentLocation, payload.attachmentLocation);
const apiSource = fs.readFileSync(path.join(__dirname, '../lib/api.ts'), 'utf8');
const createSource = apiSource.split('export async function createManagerAnnouncement(')[1].split('\nexport ')[0];
assert.match(createSource, /buildAnnouncementTarget\(input, getWorkspaceScope\(\)\?\.locationId\)/);
assert.match(createSource, /\.\.\.target/);
assert.doesNotMatch(createSource, /\.\.\.\(locationId/);
console.log('announcement audience: ALL, LOCATION, groups, employees and workspace isolation passed');
