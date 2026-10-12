import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
const employee = schema.split('model Employee {')[1].split('\nmodel ')[0];
assert.match(employee, /@@unique\(\[tenantId, altegioTeamMemberId\]\)/);
assert.doesNotMatch(employee, /altegioTeamMemberId\s+String\?\s+@unique/);
const migration = fs.readFileSync(path.join(root, 'prisma/migrations/20261012140000_tenant_scoped_altegio_staff/migration.sql'), 'utf8');
assert.match(migration, /ON "Employee"\("tenantId", "altegioTeamMemberId"\)/);
assert.match(migration, /DROP INDEX "Employee_altegioTeamMemberId_key"/);
assert.ok(migration.indexOf('CREATE UNIQUE INDEX') < migration.indexOf('DROP INDEX'));
console.log('Altegio tenant-scoped staff identity tests passed');
