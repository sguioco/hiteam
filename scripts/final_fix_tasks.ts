import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const employeeId = '1ab44293-c3d2-4180-916f-dad2e703346d';
  const tenantId = '06875f4f-615a-4ad2-ab39-76d1a6a63d2f';
  const groupId = 'ff320664-55f6-400e-8a46-32ac42ac5bdd';

  console.log(`Adding employee ${employeeId} to group ${groupId}...`);

  try {
    const membership = await prisma.workGroupMembership.create({
      data: {
        tenantId,
        employeeId,
        groupId,
      },
    });
    console.log(`Membership created: ${membership.id}`);
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log('Employee is already a member of this group.');
    } else {
      throw error;
    }
  }

  // Also make sure manual tasks are for today
  const now = new Date();
  const updateResult = await prisma.task.updateMany({
    where: {
      assigneeEmployeeId: employeeId,
      status: 'TODO',
    },
    data: {
      dueAt: now,
    },
  });
  console.log(`Updated ${updateResult.count} manual tasks to today.`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
