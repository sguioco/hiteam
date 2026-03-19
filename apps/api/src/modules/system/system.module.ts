import { Module } from '@nestjs/common';
import { SystemResolver } from './system.resolver';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SystemController],
  providers: [SystemResolver, SystemService],
})
export class SystemModule {}
