// Isolated, create-once local fixture. Never run against a remote database.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const slug = 'qa-ux-acceptance';
const databaseUrl = process.env.DATABASE_URL;
const password = process.env.QA_ACCEPTANCE_PASSWORD;

if (!databaseUrl || !password || password.length < 12) {
  throw new Error('Set DATABASE_URL and QA_ACCEPTANCE_PASSWORD (at least 12 characters).');
}

const database = new URL(databaseUrl);
if (!['localhost', '127.0.0.1', '::1'].includes(database.hostname)) {
  throw new Error('Refusing to seed a non-local database.');
}

const prisma = new PrismaClient();

async function main() {
  if (await prisma.tenant.findUnique({ where: { slug } })) {
    throw new Error(`Tenant ${slug} already exists; fixture is create-once and will not overwrite it.`);
  }

  const roleCodes = ['tenant_owner', 'manager', 'employee'];
  const roles = await prisma.role.findMany({ where: { code: { in: roleCodes } } });
  if (roles.length !== roleCodes.length) {
    throw new Error('Required roles are missing. Initialize the local schema and roles first.');
  }
  const roleByCode = new Map(roles.map((role) => [role.code, role]));
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: {
      slug, name: 'UX Acceptance', timezone: 'Europe/Moscow', locale: 'en',
    } });
    const company = await tx.company.create({ data: {
      tenantId: tenant.id, name: 'UX Acceptance Company', code: 'QA_UX',
    } });
    const department = await tx.department.create({ data: {
      tenantId: tenant.id, name: 'Operations', code: 'OPS',
    } });
    const positions = {};
    for (const code of ['OWNER', 'MANAGER', 'EMPLOYEE']) {
      positions[code] = await tx.position.create({ data: {
        tenantId: tenant.id, name: code, code,
      } });
    }
    const locations = {};
    for (const [code, name, latitude, longitude] of [
      ['HQ', 'Head office', 55.7558, 37.6173],
      ['NORTH', 'North warehouse', 55.8058, 37.6173],
      ['SOUTH', 'South retail', 55.7058, 37.6173],
    ]) {
      locations[code] = await tx.location.create({ data: {
        tenantId: tenant.id, companyId: company.id, code, name,
        address: `QA fixture: ${name}`, timezone: 'Europe/Moscow', latitude, longitude,
      } });
    }

    const people = {};
    for (const person of [
      { key: 'owner', role: 'tenant_owner', number: 'QA-001', first: 'Olivia', last: 'Owner', location: 'HQ', position: 'OWNER' },
      { key: 'manager', role: 'manager', number: 'QA-002', first: 'Maya', last: 'Manager', location: 'SOUTH', position: 'MANAGER' },
      { key: 'employee', role: 'employee', number: 'QA-003', first: 'Evan', last: 'Employee', location: 'SOUTH', position: 'EMPLOYEE' },
    ]) {
      const user = await tx.user.create({ data: {
        tenantId: tenant.id, email: `qa-${person.key}@ux-acceptance.invalid`,
        passwordHash, status: 'ACTIVE', preferredLocale: 'en',
      } });
      await tx.userRole.create({ data: {
        userId: user.id, roleId: roleByCode.get(person.role).id,
        scopeType: 'tenant', scopeId: tenant.id,
      } });
      const employee = await tx.employee.create({ data: {
        tenantId: tenant.id, userId: user.id, companyId: company.id,
        departmentId: department.id, primaryLocationId: locations[person.location].id,
        positionId: positions[person.position].id, employeeNumber: person.number,
        firstName: person.first, lastName: person.last, status: 'ACTIVE', hireDate: new Date(),
      } });
      await tx.employeeLocationAssignment.create({ data: {
        tenantId: tenant.id, companyId: company.id, employeeId: employee.id,
        locationId: locations[person.location].id, isPrimary: true,
      } });
      people[person.key] = employee;
    }

    for (const [code, assignee, title] of [
      ['HQ', 'owner', 'QA: headquarters task'],
      ['NORTH', 'owner', 'QA: north task'],
      ['SOUTH', 'employee', 'QA: south task'],
    ]) {
      await tx.task.create({ data: {
        tenantId: tenant.id, managerEmployeeId: people.owner.id,
        assigneeEmployeeId: people[assignee].id, locationId: locations[code].id,
        title, status: 'TODO', dueAt: new Date(Date.now() + 86400000),
      } });
    }
  });
  console.log(`Created local fixture ${slug} with owner, manager, employee, three locations and three tasks.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
