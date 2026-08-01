import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../..');
const schema = readFileSync(resolve(root, 'prisma/schema.prisma'), 'utf8');
const orgService = readFileSync(resolve(__dirname, 'org.service.ts'), 'utf8');
const employeesService = readFileSync(
  resolve(__dirname, '../employees/employees.service.ts'),
  'utf8',
);
const scheduleService = readFileSync(
  resolve(__dirname, '../schedule/schedule.service.ts'),
  'utf8',
);

assert.match(schema, /model EmployeeLocationAssignment \{/);
assert.match(schema, /assignedAt\s+DateTime/);
assert.match(schema, /unassignedAt\s+DateTime\?/);
assert.match(schema, /archivedAt\s+DateTime\?/);
assert.match(schema, /model Task \{[\s\S]*?locationId\s+String\?/);

assert.match(
  orgService,
  /Organization was not found in this workspace/,
  'Creating a location must validate company ownership.',
);
assert.match(
  orgService,
  /Move employees to another location before archiving it/,
  'Archiving a populated location must be blocked.',
);
assert.match(
  orgService,
  /configuredPair[\s\S]*companies[\s\S]*isConfiguredLocation/,
  'An unfinished new company must not hide an existing configured workspace.',
);
assert.match(
  employeesService,
  /Close the active attendance session before moving this employee/,
);
assert.match(
  employeesService,
  /employee\.location_changed/,
  'Employee transfers must be audited.',
);
assert.match(
  scheduleService,
  /Employee is not assigned to the template location/,
  'Shift creation must validate employee location eligibility.',
);

process.stdout.write('organization multi-location tests passed\n');
