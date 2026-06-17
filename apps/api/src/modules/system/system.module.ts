import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmployeesModule } from '../employees/employees.module';
import { SystemResolver } from './system.resolver';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, EmployeesModule],
  controllers: [SystemController],
  providers: [SystemResolver, SystemService],
})
export class SystemModule {}
