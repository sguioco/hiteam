import { Global, Module } from '@nestjs/common';
import { BillingModule } from '../../modules/billing/billing.module';
import { WorkspaceAccessGuard } from '../guards/workspace-access.guard';
import { EmployeeScopeService } from './employee-scope.service';

@Global()
@Module({
  imports: [BillingModule],
  providers: [WorkspaceAccessGuard, EmployeeScopeService],
  exports: [WorkspaceAccessGuard, EmployeeScopeService],
})
export class AccessModule {}
