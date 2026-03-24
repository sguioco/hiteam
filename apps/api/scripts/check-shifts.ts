import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'employee@demo.smart' } });
  if (!user) return console.log('user not found');
  const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
  if (!employee) return console.log('employee not found');
  
  const shifts = await prisma.shift.findMany({ where: { employeeId: employee.id } });
  console.log('Shifts for employee@demo.smart:', JSON.stringify(shifts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
