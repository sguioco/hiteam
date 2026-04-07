import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const employeeId = '1ab44293-c3d2-4180-916f-dad2e703346d';
  
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      groupMemberships: true,
      primaryLocation: true,
      department: true,
    }
  });

  if (!employee) return;

  console.log(`Checking memberships for ${employee.firstName}:`);
  employee.groupMemberships.forEach(m => console.log(`- Member of group: ${m.groupId}`));

  const groupIds = employee.groupMemberships.map(m => m.groupId);

  const templates = await prisma.taskTemplate.findMany({
    where: {
      OR: [
        { assigneeEmployeeId: employeeId },
        { groupId: { in: groupIds } }
      ],
      isActive: true,
    }
  });

  console.log(`Found ${templates.length} relevant task templates:`);
  templates.forEach(t => console.log(`- [TEMPLATE] ${t.title} (Group: ${t.groupId}, Photo: ${t.requiresPhoto})`));

  const manualTasks = await prisma.task.findMany({
    where: { assigneeEmployeeId: employeeId, status: 'TODO' },
  });

  console.log(`Found ${manualTasks.length} manual TODO tasks:`);
  manualTasks.forEach(t => console.log(`- [TASK] ${t.title} (Due: ${t.dueAt})`));

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
