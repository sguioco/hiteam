import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'node:path';
import { HealthModule } from './modules/health/health.module';
import { SystemModule } from './modules/system/system.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrgModule } from './modules/org/org.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DevicesModule } from './modules/devices/devices.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuditModule } from './modules/audit/audit.module';
import { BiometricModule } from './modules/biometric/biometric.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { RequestsModule } from './modules/requests/requests.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PushModule } from './modules/push/push.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { StorageModule } from './modules/storage/storage.module';
import { ExportsModule } from './modules/exports/exports.module';
import { BootstrapModule } from './modules/bootstrap/bootstrap.module';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { TranslationModule } from './modules/translation/translation.module';
import { WorkspaceAccessGuard } from './common/guards/workspace-access.guard';
import { HttpResponseCacheInterceptor } from './common/cache/http-response-cache.interceptor';
import { ResponseCacheService } from './common/cache/response-cache.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    NestScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/api/schema.gql'),
      playground: true,
      sortSchema: true,
    }),
    PrismaModule,
    HealthModule,
    SystemModule,
    AuditModule,
    StorageModule,
    BootstrapModule,
    ExportsModule,
    DiagnosticsModule,
    ObservabilityModule,
    CollaborationModule,
    LeaderboardModule,
    TranslationModule,
    AuthModule,
    OrgModule,
    EmployeesModule,
    DevicesModule,
    ScheduleModule,
    NotificationsModule,
    PushModule,
    RequestsModule,
    PayrollModule,
    AttendanceModule,
    BiometricModule,
    JobsModule,
  ],
  providers: [
    ResponseCacheService,
    {
      provide: APP_GUARD,
      useClass: WorkspaceAccessGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpResponseCacheInterceptor,
    },
  ],
})
export class AppModule {}
