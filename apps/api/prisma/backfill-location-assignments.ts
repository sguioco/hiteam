import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      tenantId: true,
      companyId: true,
      primaryLocationId: true,
    },
  });

  let created = 0;
  let repaired = 0;
  for (const employee of employees) {
    const closed = await prisma.employeeLocationAssignment.updateMany({
      where: {
        tenantId: employee.tenantId,
        employeeId: employee.id,
        isPrimary: true,
        unassignedAt: null,
        locationId: { not: employee.primaryLocationId },
      },
      data: {
        isPrimary: false,
        unassignedAt: new Date(),
        reason: 'Closed by primary location backfill',
      },
    });
    repaired += closed.count;

    const existing = await prisma.employeeLocationAssignment.findFirst({
      where: {
        tenantId: employee.tenantId,
        employeeId: employee.id,
        locationId: employee.primaryLocationId,
        unassignedAt: null,
      },
      select: { id: true, isPrimary: true },
    });

    if (existing) {
      if (!existing.isPrimary) {
        await prisma.employeeLocationAssignment.update({
          where: { id: existing.id },
          data: { isPrimary: true },
        });
        repaired += 1;
      }
      continue;
    }

    await prisma.employeeLocationAssignment.create({
      data: {
        tenantId: employee.tenantId,
        companyId: employee.companyId,
        employeeId: employee.id,
        locationId: employee.primaryLocationId,
        isPrimary: true,
        reason: 'Backfilled from employee primary location',
      },
    });
    created += 1;
  }

  const activePrimaryAssignments =
    await prisma.employeeLocationAssignment.findMany({
      where: { isPrimary: true, unassignedAt: null },
      select: { employeeId: true, locationId: true },
    });
  const primaryLocationsByEmployee = new Map<string, string[]>();
  for (const assignment of activePrimaryAssignments) {
    const locations =
      primaryLocationsByEmployee.get(assignment.employeeId) ?? [];
    locations.push(assignment.locationId);
    primaryLocationsByEmployee.set(assignment.employeeId, locations);
  }
  const invalidEmployees = employees.filter((employee) => {
    const locations = primaryLocationsByEmployee.get(employee.id) ?? [];
    return (
      locations.length !== 1 ||
      locations[0] !== employee.primaryLocationId
    );
  });
  if (invalidEmployees.length > 0) {
    throw new Error(
      `Location assignment validation failed for ${invalidEmployees.length} employee(s).`,
    );
  }

  process.stdout.write(
    `Location assignment backfill complete. Created ${created} assignment(s), repaired ${repaired} assignment(s), validated ${employees.length} employee(s).\n`,
  );
}

main()
  .catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
