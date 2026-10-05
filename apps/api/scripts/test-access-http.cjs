// Run only against the isolated local audit fixture, never production.
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const db = new PrismaClient();
const base = 'http://localhost:4000/api/v1';
const slug = 'qa-functional-audit-2026-10-05';
async function request(path, token, body) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}
async function run() {
  assert.ok(process.env.QA_ACCEPTANCE_PASSWORD, 'QA_ACCEPTANCE_PASSWORD is required');
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname), 'Only a local database is allowed');
  const tenant = await db.tenant.findUniqueOrThrow({ where: { slug } });
  const users = await db.user.findMany({ where: { tenantId: tenant.id }, include: { employee: true } });
  assert.equal(users.length, 3);
  assert.ok(users.every(u => u.email.endsWith('@functional-audit.invalid')));
  const owner = users.find(u => u.email.startsWith('qa-owner@'));
  const employee = users.find(u => u.email.startsWith('qa-employee@'));
  const manager = users.find(u => u.email.startsWith('qa-manager@'));
  const tokens = {};
  const sessions = {};
  for (const user of users) {
    const login = await request('/auth/login', null, { email: user.email, tenantSlug: slug, password: process.env.QA_ACCEPTANCE_PASSWORD });
    assert.equal(login.status, 201); tokens[user.id] = login.data.accessToken; sessions[user.id] = login.data;
  }
  assert.equal((await request('/collaboration/tasks/me')).status, 401);
  const roles = await db.userRole.findMany({ where: { userId: manager.id } });
  const subscription = await db.billingSubscription.findUnique({ where: { tenantId: tenant.id } });
  let groupId;
  let photoTaskId;
  let photoKey;
  const storage = new S3Client({ region: 'us-east-1', endpoint: 'http://localhost:9000', forcePathStyle: true, credentials: { accessKeyId: 'minio', secretAccessKey: 'miniosecret' } });
  try {
    await db.user.update({ where: { id: employee.id }, data: { workspaceAccessAllowed: false } });
    assert.equal((await request('/collaboration/tasks/me', tokens[employee.id])).status, 403);
    assert.equal((await request('/auth/me', tokens[employee.id])).status, 200);
    await db.user.update({ where: { id: employee.id }, data: { workspaceAccessAllowed: true } });
    await db.billingSubscription.upsert({ where: { tenantId: tenant.id }, create: { tenantId: tenant.id, paidSeats: 3, status: 'ACTIVE' }, update: { paidSeats: 3, status: 'ACTIVE' } });
    await db.billingSubscription.update({ where: { tenantId: tenant.id }, data: { paidSeats: 0, trialStartedAt: new Date('2026-01-01'), trialEndsAt: new Date('2026-01-02') } });
    assert.equal((await request('/collaboration/tasks/me', tokens[employee.id])).status, 402);
    assert.equal((await request('/auth/me', tokens[employee.id])).status, 200);
    await db.billingSubscription.update({ where: { tenantId: tenant.id }, data: { paidSeats: 3 } });
    const group = await request('/collaboration/groups', tokens[owner.id], { name: `HTTP access regression ${Date.now()}`, memberEmployeeIds: [owner.employee.id] });
    assert.equal(group.status, 201); groupId = group.data.id;
    const chat = await request('/collaboration/chats', tokens[owner.id], { groupId });
    assert.equal(chat.status, 201);
    assert.ok(!JSON.stringify(chat.data).includes('passwordHash'));
    assert.equal((await request('/collaboration/chats', tokens[employee.id], { groupId })).status, 403);
    assert.equal((await request(`/collaboration/chats/${chat.data.id}`, tokens[employee.id])).status, 403);
    assert.equal((await request(`/collaboration/groups/${groupId}/members`, tokens[owner.id], { employeeIds: [owner.employee.id, employee.employee.id] })).status, 201);
    assert.equal((await request('/collaboration/chats', tokens[employee.id], { groupId })).status, 201);
    assert.equal((await request(`/collaboration/groups/${groupId}/members`, tokens[owner.id], { employeeIds: [owner.employee.id] })).status, 201);
    assert.equal((await request(`/collaboration/chats/${chat.data.id}`, tokens[employee.id])).status, 403);
    assert.equal((await request(`/collaboration/chats/${chat.data.id}/messages`, tokens[employee.id], { body: 'Must not be sent' })).status, 403);
    for (const role of roles) await db.userRole.update({ where: { id: role.id }, data: { scopeType: 'location', scopeId: manager.employee.primaryLocationId } });
    const balances = await request('/requests/balances?search=Owner', tokens[manager.id]);
    assert.equal(balances.status, 200); assert.equal(balances.data.length, 0);
    assert.equal((await request(`/requests/balances/${owner.employee.id}`, tokens[manager.id], { vacationAllowanceDays: 100 })).status, 403);
    const payroll = await request('/payroll/summary?dateFrom=2026-10-05&dateTo=2026-10-06', tokens[manager.id]);
    assert.equal(payroll.status, 200); assert.equal(payroll.data.totals.employees, 2);
    const exported = await fetch(base + '/payroll/export?format=csv&dateFrom=2026-10-05&dateTo=2026-10-06', { headers: { Authorization: `Bearer ${tokens[manager.id]}` } });
    assert.equal(exported.status, 200);
    assert.ok(!(await exported.text()).includes('Olivia'), 'Scoped export must not contain the HQ owner');
    const task = await db.task.create({ data: { tenantId: tenant.id, managerEmployeeId: owner.employee.id, assigneeEmployeeId: employee.employee.id, locationId: owner.employee.primaryLocationId, title: 'Temporary private photo regression' } });
    photoTaskId = task.id;
    photoKey = `tenants/${tenant.id}/tasks/${task.id}/http-photo-test.jpg`;
    await storage.send(new PutObjectCommand({ Bucket: 'smart-local', Key: photoKey, Body: Buffer.from('test-photo'), ContentType: 'image/jpeg' }));
    const proof = await db.taskPhotoProof.create({ data: { tenantId: tenant.id, taskId: task.id, uploadedByEmployeeId: employee.employee.id, fileName: 'test.jpg', storageKey: photoKey } });
    const photoPath = `/media/task-photo-proofs/${proof.id}/file`;
    const photo = token => fetch(base + photoPath, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    assert.equal((await photo()).status, 401);
    assert.equal((await photo(tokens[manager.id])).status, 404, 'South-scoped manager cannot access HQ task proof');
    const readable = await photo(tokens[employee.id]);
    assert.equal(readable.status, 200);
    assert.equal(readable.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(await readable.text(), 'test-photo');
    if (process.env.QA_TEST_WEB === 'true') {
      const webPhotoUrl = `http://localhost:3000/api/task-photo-proofs/${proof.id}`;
      assert.equal((await fetch(webPhotoUrl)).status, 401);
      const cookie = `smart_admin_session=${Buffer.from(JSON.stringify(sessions[employee.id])).toString('base64url')}`;
      const webPhoto = await fetch(webPhotoUrl, { headers: { Cookie: cookie } });
      assert.equal(webPhoto.status, 200);
      assert.equal(webPhoto.headers.get('Cache-Control'), 'private, no-store');
      assert.equal(webPhoto.headers.get('Content-Security-Policy'), "default-src 'none'; sandbox");
      assert.equal(await webPhoto.text(), 'test-photo');
      const managerCookie = `smart_admin_session=${Buffer.from(JSON.stringify(sessions[manager.id])).toString('base64url')}`;
      assert.equal((await fetch(webPhotoUrl, { headers: { Cookie: managerCookie } })).status, 404);
      console.log('Web photo proxy HTTP tests passed');
    }
    assert.equal((await fetch(`http://localhost:9000/smart-local/${photoKey}`)).status, 403, 'Raw storage URL must not bypass API authorization');
    assert.equal((await photo(tokens[owner.id])).status, 200);
    const replacement = await db.taskPhotoProof.create({ data: { tenantId: tenant.id, taskId: task.id, uploadedByEmployeeId: employee.employee.id, fileName: 'replacement.jpg', storageKey: photoKey } });
    await db.taskPhotoProof.update({ where: { id: proof.id }, data: { supersededByProofId: replacement.id } });
    assert.equal((await photo(tokens[employee.id])).status, 404);
    await db.taskPhotoProof.update({ where: { id: proof.id }, data: { supersededByProofId: null } });
    await db.task.update({ where: { id: task.id }, data: { assigneeEmployeeId: owner.employee.id } });
    assert.equal((await photo(tokens[employee.id])).status, 404, 'Hot object cache must not bypass changed task access');
    await db.task.update({ where: { id: task.id }, data: { assigneeEmployeeId: employee.employee.id } });
    await db.taskPhotoProof.update({ where: { id: proof.id }, data: { deletedAt: new Date() } });
    assert.equal((await photo(tokens[employee.id])).status, 404);
    await db.taskPhotoProof.update({ where: { id: proof.id }, data: { deletedAt: null } });
    await db.task.update({ where: { id: task.id }, data: { deletedAt: new Date() } });
    assert.equal((await photo(tokens[employee.id])).status, 404);
    console.log('HTTP protected photos passed: anonymous, scoped denial, authorized bytes, no-store, raw storage denial, superseded/deleted proof/task, access revocation.');
    console.log('HTTP access regressions passed: anonymous, pending, auth exception, private chat, balances, payroll.');
  } finally {
    if (photoTaskId) await db.task.delete({ where: { id: photoTaskId } });
    if (photoKey) await storage.send(new DeleteObjectCommand({ Bucket: 'smart-local', Key: photoKey }));
    await db.user.update({ where: { id: employee.id }, data: { workspaceAccessAllowed: employee.workspaceAccessAllowed } });
    for (const role of roles) await db.userRole.update({ where: { id: role.id }, data: { scopeType: role.scopeType, scopeId: role.scopeId } });
    if (subscription) await db.billingSubscription.update({ where: { tenantId: tenant.id }, data: { paidSeats: subscription.paidSeats, status: subscription.status, trialStartedAt: subscription.trialStartedAt, trialEndsAt: subscription.trialEndsAt } });
    else await db.billingSubscription.deleteMany({ where: { tenantId: tenant.id } });
    if (groupId) await db.workGroup.delete({ where: { id: groupId } });
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
