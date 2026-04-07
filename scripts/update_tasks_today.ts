import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const employeeId = '1ab44293-c3d2-4180-916f-dad2e703346d';
  const tenantId = '06875f4f-615a-4ad2-ab39-76d1a6a63d2f';

  console.log(`Updating tasks for employee ${employeeId} to be due today...`);

  const now = new Date();
  
  const result = await prisma.task.updateMany({
    where: {
      assigneeEmployeeId: employeeId,
      tenantId: tenantId,
      status: TaskStatus.TODO,
    },
    data: {
      dueAt: now,
    },
  });

  console.log(`Updated ${result.count} tasks.`);

  const tasks = await prisma.task.findMany({
    where: { assigneeEmployeeId: employeeId },
    orderBy: { createdAt: 'desc' },
    take: 4
  });

  tasks.forEach(t => {
    console.log(`- [${t.status}] ${t.title} (ID: ${t.id}, Due: ${t.dueAt})`);
  });

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
