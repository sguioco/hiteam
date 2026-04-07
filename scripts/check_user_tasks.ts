import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const email = 'sgiuoco688@gmail.com';

  const user = await prisma.user.findFirst({
    where: { email },
    include: { employee: true },
  });

  if (!user) {
    console.log(`User with email ${email} not found.`);
    return;
  }

  if (!user.employee) {
    console.log(`User ${email} has no employee record.`);
    return;
  }

  const employeeId = user.employee.id;
  const tenantId = user.tenantId;

  console.log(`Found employee ${user.employee.firstName} ${user.employee.lastName} (ID: ${employeeId}) for tenant ${tenantId}`);

  const tasks = await prisma.task.findMany({
    where: { assigneeEmployeeId: employeeId },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${tasks.length} tasks for this employee.`);
  tasks.forEach(t => {
    console.log(`- [${t.status}] ${t.title} (ID: ${t.id}, Proof Required: ${t.requiresPhoto})`);
  });

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
