import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const employeeId = '1ab44293-c3d2-4180-916f-dad2e703346d';
  const tenantId = '06875f4f-615a-4ad2-ab39-76d1a6a63d2f';

  console.log(`Adding tasks for employee ${employeeId} in tenant ${tenantId}...`);

  const tasksData = [
    {
      title: 'Ежедневный обход территории',
      description: 'Проверить состояние всех объектов на территории и убедиться в отсутствии нарушений.',
      priority: TaskPriority.MEDIUM,
      requiresPhoto: false,
    },
    {
      title: 'Проверка чистоты рабочего места',
      description: 'Убедиться, что рабочее место чистое и соответствует стандартам компании.',
      priority: TaskPriority.LOW,
      requiresPhoto: true,
    },
    {
      title: 'Отчет по остаткам материалов',
      description: 'Подсчитать остатки расходных материалов и внести данные в систему.',
      priority: TaskPriority.HIGH,
      requiresPhoto: false,
    },
    {
      title: 'Фото фасада здания',
      description: 'Сделать фотографию главного входа для ежедневного отчета.',
      priority: TaskPriority.MEDIUM,
      requiresPhoto: true,
    }
  ];

  for (const data of tasksData) {
    const task = await prisma.task.create({
      data: {
        tenantId,
        managerEmployeeId: employeeId, // Assigning self as manager for now
        assigneeEmployeeId: employeeId,
        title: data.title,
        description: data.description,
        status: TaskStatus.TODO,
        priority: data.priority,
        requiresPhoto: data.requiresPhoto,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      },
    });
    console.log(`Created task: ${task.title} (ID: ${task.id}, Photo Required: ${task.requiresPhoto})`);
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
