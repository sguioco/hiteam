import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import {
  AttendanceEventType,
  AttendanceResult,
  BiometricEnrollmentStatus,
  DevicePlatform,
  EmployeeInvitationStatus,
  EmployeeStatus,
  Prisma,
  ShiftStatus,
} from '@prisma/client';
import { LifecycleEmailService, type LifecycleEmailSendResult } from '../mail/lifecycle-email.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  KOMMO_FIELD_SPECS,
  KOMMO_PIPELINE_NAME,
  KOMMO_PIPELINE_SPECS,
  KOMMO_STAGE_SPECS,
  KOMMO_TAGS,
  KommoEntityType,
  KommoFieldSpec,
  KommoPipelineKey,
} from './kommo.constants';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type KommoFieldInfo = KommoFieldSpec & { id: number };
type KommoFieldMap = Record<KommoEntityType, Map<string, KommoFieldInfo>>;
type KommoStageName = (typeof KOMMO_STAGE_SPECS)[number]['name'];

type KommoPipelineSetup = {
  id: number;
  statusesByName: Map<string, number>;
};

type KommoAccountSetup = {
  pipelines: Record<KommoPipelineKey, KommoPipelineSetup>;
  fields: KommoFieldMap;
};

type KommoStageTarget = {
  pipelineKey: KommoPipelineKey;
  pipelineId: number;
  stageName: KommoStageName;
  statusId?: number;
};

type KommoSyncOptions = {
  reason: string;
  stageName?: KommoStageName;
  note?: string;
  employeeId?: string;
  invitationId?: string;
  syncAllContacts?: boolean;
  lifecycleEmailResult?: LifecycleEmailSendResult;
};

type KommoEmployeeEmailDeliveryResult = {
  status: string;
  provider: string;
  recipients?: string[];
  recordedAt?: string;
  actionUrl?: string;
  errorMessage?: string;
};

type KommoDeletedEmployeeInvitationNote = {
  id: string;
  email: string | null;
  phone: string | null;
  userId: string | null;
  employeeId: string | null;
};

type KommoLifecycleEvent =
  | 'user_registered'
  | 'trial_started'
  | 'activation_started'
  | 'trial_ending_soon'
  | 'trial_expired'
  | 'payment_successful'
  | 'payment_failed'
  | 'subscription_renewal_upcoming'
  | 'subscription_cancelled'
  | 'inactive_3_days'
  | 'key_feature_not_used';

type KommoLifecycleEventOptions = {
  stageName?: KommoStageName;
  note: string;
  taskText?: string;
  taskDueInDays?: number;
  key?: string;
  employeeId?: string;
  invitationId?: string;
  syncAllContacts?: boolean;
};

type KommoSyncResult = {
  skipped?: boolean;
  leadId?: number;
  companyId?: number;
  primaryContactId?: number;
  syncedEmployeeContacts?: number;
};

type KommoTenantBackfillResult = KommoSyncResult & {
  tenantId: string;
  status: 'synced' | 'skipped' | 'error';
  errorMessage?: string;
};

type KommoWebhookLeadEvent = {
  action: string;
  id: number;
  statusId: number | null;
  oldStatusId: number | null;
  pipelineId: number | null;
  raw: unknown;
};

type KommoTaskNotePerson = {
  firstName: string;
  lastName: string;
  employeeNumber: string;
  user: { email: string } | null;
};

type KommoTaskNote = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: Date | null;
  assigneeEmployeeId: string | null;
  managerEmployeeId: string;
  group: { name: string } | null;
  assigneeEmployee: KommoTaskNotePerson | null;
  managerEmployee: KommoTaskNotePerson;
};

type KommoRecurringTaskNote = {
  template: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    dueTimeLocal: string | null;
    requiresPhoto: boolean;
    group: { name: string } | null;
    managerEmployee: KommoTaskNotePerson;
  };
  assigneeEmployee: KommoTaskNotePerson;
  completion: {
    status: string;
    completedAt: Date | null;
  } | null;
  occurrenceDate: Date;
  reason: string;
  status?: string | null;
};

type KommoTaskTemplateNote = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  assigneeEmployeeId: string | null;
  managerEmployeeId: string;
  requiresPhoto: boolean;
  expandOnDemand: boolean;
  frequency: string;
  weekDaysJson: string | null;
  dayOfMonth: number | null;
  startDate: Date;
  endDate: Date | null;
  dueAfterDays: number;
  dueTimeLocal: string | null;
  isActive: boolean;
  group: { name: string } | null;
  department: { name: string } | null;
  location: { name: string } | null;
  assigneeEmployee: KommoTaskNotePerson | null;
  managerEmployee: KommoTaskNotePerson;
};

type KommoDeletedTaskTemplateNote = {
  id: string;
  title: string;
  assigneeEmployeeId: string | null;
  managerEmployeeId: string;
  group: { name: string } | null;
  department: { name: string } | null;
  location: { name: string } | null;
  assigneeEmployee: KommoTaskNotePerson | null;
  managerEmployee: KommoTaskNotePerson;
};

type KommoConfig = {
  enabled: boolean;
  baseUrl: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string | null;
  responsibleUserId: number | null;
  pipelineIds: Record<KommoPipelineKey, number | null>;
  pipelineNames: Record<KommoPipelineKey, string>;
  trialDays: number;
  eventNotesEnabled: boolean;
};

type KommoApiObject = Record<string, unknown>;

const DEFAULT_KOMMO_WEB_ADMIN_BASE_URL = 'https://hiteam.net';

class KommoRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
  }
}

@Injectable()
export class KommoService {
  private readonly logger = new Logger(KommoService.name);
  private setupCache: { value: KommoAccountSetup; expiresAt: number } | null = null;
  private setupPromise: Promise<KommoAccountSetup> | null = null;
  private runtimeAccessToken: string | null = null;
  private runtimeRefreshToken: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly lifecycleEmailService: LifecycleEmailService,
  ) {}

  getStatus() {
    const config = this.getConfig();

    return {
      enabled: config.enabled,
      baseUrl: config.baseUrl,
      pipelineName: config.pipelineNames.trial,
      pipelineId: config.pipelineIds.trial,
      pipelines: KOMMO_PIPELINE_SPECS.map((pipeline) => ({
        key: pipeline.key,
        name: config.pipelineNames[pipeline.key],
        pipelineId: config.pipelineIds[pipeline.key],
      })),
      hasAccessToken: Boolean(config.accessToken),
      hasRefreshFlow: Boolean(config.refreshToken && config.clientId && config.clientSecret),
      eventNotesEnabled: config.eventNotesEnabled,
    };
  }

  async getTenantStatus(tenantId: string) {
    const links = await this.prisma.kommoEntityLink.findMany({
      where: { tenantId },
      orderBy: [{ localEntityType: 'asc' }, { updatedAt: 'desc' }],
    });

    return {
      ...this.getStatus(),
      links: links.map((link) => ({
        localEntityType: link.localEntityType,
        localEntityId: link.localEntityId,
        kommoEntityType: link.kommoEntityType,
        kommoEntityId: link.kommoEntityId,
        lastSyncedAt: link.lastSyncedAt?.toISOString() ?? null,
        lastSyncStatus: link.lastSyncStatus,
        lastSyncError: link.lastSyncError,
      })),
    };
  }

  recordOrganizationRegistered(
    tenantId: string,
    managerSetupEmailResult?: KommoEmployeeEmailDeliveryResult | null,
  ) {
    void (async () => {
      await this.syncLifecycleEvent(tenantId, 'user_registered', {
        stageName: 'New Registration',
        note: managerSetupEmailResult
          ? [
              'Client registered in HiTeam.',
              '',
              this.buildEmployeeEmailDeliveryNote('manager_setup_email', managerSetupEmailResult),
            ].join('\n')
          : 'Client registered in HiTeam.',
        syncAllContacts: true,
      });
      await this.syncLifecycleEvent(tenantId, 'trial_started', {
        stageName: 'Trial Started',
        note: 'HiTeam trial started.',
        syncAllContacts: true,
      });
    })().catch((error) => {
      this.logger.warn(`Kommo registration lifecycle failed for tenant ${tenantId}: ${this.getErrorMessage(error)}`);
    });
  }

  recordOrganizationUpdated(tenantId: string, reason = 'organization_updated') {
    this.enqueueSync(tenantId, {
      reason,
      note: `HiTeam organization updated: ${reason}.`,
      syncAllContacts: true,
    });
  }

  recordLogin(tenantId: string, userId: string) {
    if (!this.getConfig().enabled) {
      return;
    }

    void this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    }).then((employee) => {
      this.enqueueSync(tenantId, {
        reason: 'login',
        note: 'HiTeam login recorded.',
        employeeId: employee?.id,
        syncAllContacts: false,
      });
    }).catch((error) => {
      this.logger.warn(`Unable to resolve employee for Kommo login sync: ${this.getErrorMessage(error)}`);
    });
  }

  recordEmployeeCreated(tenantId: string, employeeId: string) {
    this.enqueueSync(tenantId, {
      reason: 'employee_created',
      note: 'HiTeam employee created.',
      employeeId,
    });
  }

  recordEmployeeInvited(
    tenantId: string,
    invitationId: string,
    emailDeliveryResult?: KommoEmployeeEmailDeliveryResult | null,
  ) {
    this.enqueueSync(tenantId, {
      reason: 'employee_invited',
      note: emailDeliveryResult
        ? this.buildEmployeeEmailDeliveryNote('employee_invited', emailDeliveryResult)
        : 'HiTeam employee invitation sent.',
      invitationId,
      syncAllContacts: true,
    });
  }

  recordEmployeeInvitationDeleted(tenantId: string, invitation: KommoDeletedEmployeeInvitationNote) {
    this.enqueueSync(tenantId, {
      reason: 'employee_invitation_deleted',
      note: [
        'HiTeam employee invitation deleted.',
        `Invitation ID: ${invitation.id}`,
        `Employee ID: ${invitation.employeeId ?? 'n/a'}`,
        `User ID: ${invitation.userId ?? 'n/a'}`,
        `Email: ${invitation.email ?? 'n/a'}`,
        `Phone: ${invitation.phone ?? 'n/a'}`,
      ].join('\n'),
      syncAllContacts: true,
    });
  }

  recordEmployeeUpdated(
    tenantId: string,
    employeeId: string,
    reason = 'employee_updated',
    emailDeliveryResult?: KommoEmployeeEmailDeliveryResult | null,
  ) {
    this.enqueueSync(tenantId, {
      reason,
      note: emailDeliveryResult
        ? [
            `HiTeam employee updated: ${reason}.`,
            '',
            this.buildEmployeeEmailDeliveryNote(reason, emailDeliveryResult),
          ].join('\n')
        : `HiTeam employee updated: ${reason}.`,
      employeeId,
    });
  }

  recordAttendanceEvent(tenantId: string, employeeId: string, eventType: 'check_in' | 'check_out') {
    this.enqueueSync(tenantId, {
      reason: `attendance_${eventType}`,
      note: eventType === 'check_in' ? 'Employee check-in completed.' : 'Employee check-out completed.',
      employeeId,
    });
  }

  recordTaskCreated(tenantId: string, taskId: string) {
    this.enqueueTaskSync(tenantId, taskId, 'task_created');
  }

  recordTaskUpdated(tenantId: string, taskId: string, reason = 'task_updated') {
    this.enqueueTaskSync(tenantId, taskId, reason);
  }

  recordRecurringTaskUpdated(
    tenantId: string,
    params: {
      taskTemplateId: string;
      assigneeEmployeeId: string;
      occurrenceDate: Date;
      reason: string;
      status?: string | null;
    },
  ) {
    this.enqueueRecurringTaskSync(tenantId, params);
  }

  recordTaskTemplateCreated(tenantId: string, taskTemplateId: string) {
    this.enqueueTaskTemplateSync(tenantId, taskTemplateId, 'task_template_created');
  }

  recordTaskTemplateUpdated(tenantId: string, taskTemplateId: string, reason = 'task_template_updated') {
    this.enqueueTaskTemplateSync(tenantId, taskTemplateId, reason);
  }

  recordTaskTemplateDeleted(tenantId: string, template: KommoDeletedTaskTemplateNote) {
    this.enqueueSync(tenantId, {
      reason: 'task_template_deleted',
      note: this.buildDeletedTaskTemplateEventNote(template),
      employeeId: template.assigneeEmployeeId ?? undefined,
      syncAllContacts: false,
    });
  }

  recordBillingUpdated(tenantId: string, reason = 'billing_updated') {
    switch (reason) {
      case 'seat_purchase_paid':
      case 'invoice_paid':
        void this.enqueuePaymentSuccessful(tenantId);
        return;
      case 'invoice_payment_failed':
      case 'invoice_finalization_failed':
        void this.enqueuePaymentFailed(tenantId, reason);
        return;
      case 'subscription_cancelled':
      case 'stripe_disconnected':
        this.enqueueLifecycleEvent(tenantId, 'subscription_cancelled', {
          stageName: 'Subscription Cancelled',
          note: `Subscription cancelled: ${reason}.`,
          taskText: 'HiTeam subscription was cancelled. Contact the customer for feedback and recovery.',
          key: `lifecycle:subscription_cancelled:${this.toDateKey(new Date())}`,
        });
        return;
      default:
        break;
    }

    this.enqueueSync(tenantId, {
      reason,
      note: `HiTeam billing updated: ${reason}.`,
    });
  }

  recordDeviceUpdated(tenantId: string, employeeId: string) {
    this.enqueueSync(tenantId, {
      reason: 'device_updated',
      note: 'HiTeam employee device updated.',
      employeeId,
    });
  }

  recordBiometricUpdated(tenantId: string, employeeId: string) {
    this.enqueueSync(tenantId, {
      reason: 'biometric_updated',
      note: 'HiTeam biometric status updated.',
      employeeId,
    });
  }

  async manualSyncTenant(tenantId: string) {
    return this.syncTenant(tenantId, {
      reason: 'manual_sync',
      note: 'Manual HiTeam sync completed.',
      syncAllContacts: true,
    });
  }

  async syncAllTenants(options: { tenantId?: string; limit?: number } = {}) {
    const tenants = await this.prisma.tenant.findMany({
      where: options.tenantId ? { id: options.tenantId } : undefined,
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: options.limit ?? 500,
    });
    const items: KommoTenantBackfillResult[] = [];

    for (const tenant of tenants) {
      try {
        const result = await this.syncTenant(tenant.id, {
          reason: 'system_backfill',
          note: 'System Kommo backfill completed.',
          syncAllContacts: true,
        });
        items.push({
          tenantId: tenant.id,
          status: result.skipped ? 'skipped' : 'synced',
          ...result,
        });
      } catch (error) {
        items.push({
          tenantId: tenant.id,
          status: 'error',
          errorMessage: this.getErrorMessage(error),
        });
      }
    }

    return {
      total: items.length,
      synced: items.filter((item) => item.status === 'synced').length,
      skipped: items.filter((item) => item.status === 'skipped').length,
      errors: items.filter((item) => item.status === 'error').length,
      items,
    };
  }

  isWebhookSecretValid(secret?: string | null) {
    const expected = this.configService.get<string>('KOMMO_WEBHOOK_SECRET')?.trim();
    return !expected || secret === expected;
  }

  async handleIncomingWebhook(body: unknown) {
    if (!this.getConfig().enabled) {
      return { accepted: true, skipped: true };
    }

    const events = this.extractWebhookLeadEvents(body);
    if (events.length === 0) {
      return { accepted: true, processed: 0, ignored: 0 };
    }

    const setup = await this.ensureAccountSetup();
    const stageByStatusId = new Map<number, { stageName: KommoStageName; pipelineKey: KommoPipelineKey; pipelineId: number }>();
    for (const pipeline of KOMMO_PIPELINE_SPECS) {
      const pipelineSetup = setup.pipelines[pipeline.key];
      for (const [name, id] of pipelineSetup.statusesByName.entries()) {
        if (this.isKommoStageName(name)) {
          stageByStatusId.set(id, {
            stageName: name,
            pipelineKey: pipeline.key,
            pipelineId: pipelineSetup.id,
          });
        }
      }
    }

    let processed = 0;
    let ignored = 0;

    for (const event of events) {
      const link = await this.prisma.kommoEntityLink.findFirst({
        where: {
          kommoEntityType: 'leads',
          kommoEntityId: event.id,
        },
      });

      if (!link) {
        ignored += 1;
        continue;
      }

      const stage = event.statusId ? stageByStatusId.get(event.statusId) ?? null : null;
      const metadata = this.mergeMetadata(link.metadataJson, {
        lastInboundAction: event.action,
        lastInboundAt: new Date().toISOString(),
        kommoStatusId: event.statusId,
        kommoOldStatusId: event.oldStatusId,
        kommoPipelineId: event.pipelineId,
        ...(stage
          ? {
              kommoStageName: stage.stageName,
              kommoPipelineKey: stage.pipelineKey,
              manualStageName: stage.stageName,
              manualPipelineKey: stage.pipelineKey,
              manualStatusId: event.statusId,
              manualPipelineId: stage.pipelineId,
              manualStageUpdatedAt: new Date().toISOString(),
            }
          : {}),
      });

      await this.prisma.kommoEntityLink.update({
        where: { id: link.id },
        data: {
          lastSyncStatus: 'OK',
          lastSyncError: null,
          metadataJson: JSON.stringify(metadata),
        },
      });

      await this.prisma.auditLog.create({
        data: {
          tenantId: link.tenantId,
          entityType: 'kommo_lead',
          entityId: String(event.id),
          action: 'kommo.lead_webhook',
          metadataJson: JSON.stringify({
            action: event.action,
            statusId: event.statusId,
            oldStatusId: event.oldStatusId,
            pipelineId: event.pipelineId,
            stageName: stage?.stageName ?? null,
            pipelineKey: stage?.pipelineKey ?? null,
          }),
        },
      });

      processed += 1;
    }

    return { accepted: true, processed, ignored };
  }

  async syncTenant(tenantId: string, options: KommoSyncOptions): Promise<KommoSyncResult> {
    const config = this.getConfig();
    if (!config.enabled) {
      return { skipped: true };
    }

    await this.markTenantSyncState(tenantId, 'PENDING', null);

    try {
      const [setup, snapshot] = await Promise.all([
        this.ensureAccountSetup(),
        this.loadTenantSnapshot(tenantId),
      ]);

      const existingLeadLink = await this.findLink(snapshot.tenant.id, 'tenant', snapshot.tenant.id, 'leads');
      const manualStageName = options.stageName ? null : this.readManualStageName(existingLeadLink?.metadataJson, setup);
      const stageName = options.stageName ?? manualStageName ?? this.resolveStageName(snapshot);
      const stageTarget = this.resolveStageTarget(setup, stageName);
      const tags = this.resolveTags(snapshot);
      const companyId = await this.syncCompany(setup, snapshot);
      const primaryContactId = await this.syncPrimaryContact(setup, snapshot, companyId);
      const employeeContactIds = await this.syncEmployeeContacts(setup, snapshot, companyId, options);
      const leadId = await this.syncLead(setup, snapshot, {
        stage: stageTarget,
        tags,
        companyId,
        primaryContactId,
        employeeContactIds,
        clearManualStage: Boolean(options.stageName),
        lifecycleEmailResult: options.lifecycleEmailResult,
      });

      if (options.note && (config.eventNotesEnabled || options.reason === 'manual_sync')) {
        await this.addLeadNote(leadId, this.buildEventNote(snapshot, options.note, options.reason));
      }

      if (options.lifecycleEmailResult) {
        await this.addLeadNote(leadId, this.buildLifecycleEmailNote(options.lifecycleEmailResult));
      }

      await this.markTenantSyncState(tenantId, 'OK', null, leadId);

      return {
        leadId,
        companyId,
        primaryContactId,
        syncedEmployeeContacts: employeeContactIds.length,
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      await this.markTenantSyncState(tenantId, 'ERROR', message);
      this.logger.warn(`Kommo sync failed for tenant ${tenantId}: ${message}`);
      throw error;
    }
  }

  @Cron('0 9 * * *')
  async runDailyAutomations() {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });

    for (const tenant of tenants) {
      try {
        const snapshot = await this.loadTenantSnapshot(tenant.id);
        await this.runTenantAutomations(snapshot);
      } catch (error) {
        this.logger.warn(`Kommo daily automation failed for tenant ${tenant.id}: ${this.getErrorMessage(error)}`);
      }
    }
  }

  private enqueueSync(tenantId: string, options: KommoSyncOptions) {
    if (!this.getConfig().enabled) {
      return;
    }

    void this.syncTenant(tenantId, options).catch((error) => {
      this.logger.warn(`Background Kommo sync failed for tenant ${tenantId}: ${this.getErrorMessage(error)}`);
    });
  }

  private enqueueTaskSync(tenantId: string, taskId: string, reason: string) {
    if (!this.getConfig().enabled) {
      return;
    }

    void this.prisma.task.findFirst({
      where: { id: taskId, tenantId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueAt: true,
        assigneeEmployeeId: true,
        managerEmployeeId: true,
        group: { select: { name: true } },
        assigneeEmployee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNumber: true,
            user: { select: { email: true } },
          },
        },
        managerEmployee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNumber: true,
            user: { select: { email: true } },
          },
        },
      },
    }).then((task) => {
      if (!task) {
        return;
      }

      this.enqueueSync(tenantId, {
        reason,
        note: this.buildTaskEventNote(task, reason),
        employeeId: task.assigneeEmployeeId ?? task.managerEmployeeId ?? undefined,
        syncAllContacts: false,
      });
    }).catch((error) => {
      this.logger.warn(`Unable to enqueue Kommo task sync for ${taskId}: ${this.getErrorMessage(error)}`);
    });
  }

  private enqueueRecurringTaskSync(
    tenantId: string,
    params: {
      taskTemplateId: string;
      assigneeEmployeeId: string;
      occurrenceDate: Date;
      reason: string;
      status?: string | null;
    },
  ) {
    if (!this.getConfig().enabled) {
      return;
    }

    void Promise.all([
      this.prisma.taskTemplate.findFirst({
        where: {
          id: params.taskTemplateId,
          tenantId,
        },
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          dueTimeLocal: true,
          requiresPhoto: true,
          group: { select: { name: true } },
          managerEmployee: {
            select: {
              firstName: true,
              lastName: true,
              employeeNumber: true,
              user: { select: { email: true } },
            },
          },
        },
      }),
      this.prisma.employee.findFirst({
        where: {
          id: params.assigneeEmployeeId,
          tenantId,
        },
        select: {
          firstName: true,
          lastName: true,
          employeeNumber: true,
          user: { select: { email: true } },
        },
      }),
      this.prisma.taskCompletion.findUnique({
        where: {
          taskTemplateId_assigneeEmployeeId_occurrenceDate: {
            taskTemplateId: params.taskTemplateId,
            assigneeEmployeeId: params.assigneeEmployeeId,
            occurrenceDate: params.occurrenceDate,
          },
        },
        select: {
          status: true,
          completedAt: true,
        },
      }),
    ]).then(([template, assigneeEmployee, completion]) => {
      if (!template || !assigneeEmployee) {
        return;
      }

      this.enqueueSync(tenantId, {
        reason: params.reason,
        note: this.buildRecurringTaskEventNote({
          template,
          assigneeEmployee,
          completion,
          occurrenceDate: params.occurrenceDate,
          reason: params.reason,
          status: params.status,
        }),
        employeeId: params.assigneeEmployeeId,
        syncAllContacts: false,
      });
    }).catch((error) => {
      this.logger.warn(
        `Unable to enqueue Kommo recurring task sync for ${params.taskTemplateId}: ${this.getErrorMessage(error)}`,
      );
    });
  }

  private enqueueTaskTemplateSync(tenantId: string, taskTemplateId: string, reason: string) {
    if (!this.getConfig().enabled) {
      return;
    }

    void this.prisma.taskTemplate.findFirst({
      where: { id: taskTemplateId, tenantId },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        assigneeEmployeeId: true,
        managerEmployeeId: true,
        requiresPhoto: true,
        expandOnDemand: true,
        frequency: true,
        weekDaysJson: true,
        dayOfMonth: true,
        startDate: true,
        endDate: true,
        dueAfterDays: true,
        dueTimeLocal: true,
        isActive: true,
        group: { select: { name: true } },
        department: { select: { name: true } },
        location: { select: { name: true } },
        assigneeEmployee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNumber: true,
            user: { select: { email: true } },
          },
        },
        managerEmployee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNumber: true,
            user: { select: { email: true } },
          },
        },
      },
    }).then((template) => {
      if (!template) {
        return;
      }

      this.enqueueSync(tenantId, {
        reason,
        note: this.buildTaskTemplateEventNote(template, reason),
        employeeId: template.assigneeEmployeeId ?? undefined,
        syncAllContacts: false,
      });
    }).catch((error) => {
      this.logger.warn(
        `Unable to enqueue Kommo task template sync for ${taskTemplateId}: ${this.getErrorMessage(error)}`,
      );
    });
  }

  private enqueueLifecycleEvent(
    tenantId: string,
    event: KommoLifecycleEvent,
    options: KommoLifecycleEventOptions,
  ) {
    void this.syncLifecycleEvent(tenantId, event, options).catch((error) => {
      this.logger.warn(
        `Kommo lifecycle event ${event} failed for tenant ${tenantId}: ${this.getErrorMessage(error)}`,
      );
    });
  }

  private async enqueuePaymentSuccessful(tenantId: string) {
    try {
      const [previousPaymentEvent, latestPayment] = await Promise.all([
        this.prisma.kommoAutomationLog.findFirst({
          where: {
            tenantId,
            key: { startsWith: 'lifecycle:payment_successful:' },
          },
          select: { id: true },
        }),
        this.prisma.billingPayment.findFirst({
          where: { tenantId, status: 'PAID' },
          orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            stripeCheckoutSessionId: true,
            stripeInvoiceId: true,
            stripePaymentIntentId: true,
          },
        }),
      ]);
      const renewed = Boolean(previousPaymentEvent);
      const paymentKey =
        latestPayment?.stripeCheckoutSessionId ??
        latestPayment?.stripeInvoiceId ??
        latestPayment?.stripePaymentIntentId ??
        latestPayment?.id ??
        this.toDateKey(new Date());

      await this.syncLifecycleEvent(tenantId, 'payment_successful', {
        stageName: renewed ? 'Renewed' : 'New Customer',
        note: renewed
          ? 'Subscription payment received successfully. Customer renewed.'
          : 'First payment received successfully. Customer moved to paid onboarding.',
        key: `lifecycle:payment_successful:${paymentKey}`,
        syncAllContacts: true,
      });
    } catch (error) {
      this.logger.warn(
        `Kommo payment lifecycle failed for tenant ${tenantId}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private async enqueuePaymentFailed(tenantId: string, reason: string) {
    try {
      const subscription = await this.prisma.billingSubscription.findUnique({
        where: { tenantId },
        select: { firstPaidAt: true },
      });
      const hasEverPaid = Boolean(subscription?.firstPaidAt);

      await this.syncLifecycleEvent(tenantId, 'payment_failed', {
        stageName: hasEverPaid ? 'Churn Risk' : 'Trial Ending Soon',
        note: `Payment failed: ${reason}.`,
        taskText: 'HiTeam payment failed. Contact the customer and help complete payment.',
        key: `lifecycle:payment_failed:${this.toDateKey(new Date())}`,
      });
    } catch (error) {
      this.logger.warn(
        `Kommo payment failure lifecycle failed for tenant ${tenantId}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private async syncLifecycleEvent(
    tenantId: string,
    event: KommoLifecycleEvent,
    options: KommoLifecycleEventOptions,
  ) {
    const kommoEnabled = this.getConfig().enabled;
    const lifecycleEmailsEnabled = this.lifecycleEmailService.isEnabled();
    if (!kommoEnabled && !lifecycleEmailsEnabled) {
      return;
    }

    const key = options.key ?? `lifecycle:${event}`;
    const existingLog = await this.prisma.kommoAutomationLog.findFirst({
      where: { tenantId, key },
      select: { id: true },
    });

    if (existingLog) {
      return;
    }

    const lifecycleEmailResult = await this.lifecycleEmailService.sendLifecycleEmail({ tenantId, event }).catch((error) => {
      this.logger.warn(
        `Lifecycle email ${event} failed for tenant ${tenantId}: ${this.getErrorMessage(error)}`,
      );
      return undefined;
    });

    if (
      !lifecycleEmailResult ||
      lifecycleEmailResult.status === 'failed' ||
      lifecycleEmailResult.status === 'disabled' ||
      lifecycleEmailResult.status === 'no_recipient' ||
      lifecycleEmailResult.status === 'missing_tenant'
    ) {
      this.logger.warn(
        `Lifecycle event ${event} for tenant ${tenantId} continues with email delivery status ${lifecycleEmailResult?.status ?? 'unknown'}.`,
      );
    }

    const shouldRetryEmail =
      lifecycleEmailsEnabled &&
      lifecycleEmailResult?.status !== 'accepted' &&
      lifecycleEmailResult?.status !== 'missing_tenant';

    if (!kommoEnabled) {
      if (!shouldRetryEmail) {
        await this.createAutomationLogOnce(tenantId, key);
      }
      return;
    }

    const result = await this.syncTenant(tenantId, {
      reason: event,
      stageName: options.stageName,
      note: `Lifecycle event: ${event}. ${options.note}`,
      employeeId: options.employeeId,
      invitationId: options.invitationId,
      syncAllContacts: options.syncAllContacts,
      lifecycleEmailResult,
    });

    if (result.leadId && options.taskText) {
      await this.createTaskOnce(
        tenantId,
        `${key}:task`,
        result.leadId,
        options.taskText,
        new Date(Date.now() + (options.taskDueInDays ?? 1) * 24 * 60 * 60 * 1000),
      );
    }

    if (!shouldRetryEmail) {
      await this.createAutomationLogOnce(tenantId, key);
    }
  }

  private async runTenantAutomations(snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>) {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const paid = snapshot.metrics.hasEverPaid;
    const trialEndingSoon =
      !paid &&
      snapshot.trialEndDate.getTime() >= now &&
      snapshot.trialEndDate.getTime() - now <= threeDaysMs;
    const trialExpired =
      !paid && snapshot.trialEndDate.getTime() < now;
    const renewalDate = snapshot.tenant.billingSubscription?.stripeCurrentPeriodEnd ?? null;
    const subscriptionRenewalUpcoming =
      paid &&
      renewalDate !== null &&
      renewalDate.getTime() >= now &&
      renewalDate.getTime() - now <= sevenDaysMs;
    const inactivityAnchor = snapshot.metrics.lastActivityDate ?? snapshot.tenant.createdAt;
    const inactive =
      now - inactivityAnchor.getTime() >= threeDaysMs;
    const keyFeatureNotUsed =
      now - snapshot.tenant.createdAt.getTime() >= oneDayMs &&
      snapshot.metrics.employeesInvited === 0 &&
      snapshot.metrics.totalRegisteredEmployees <= 1 &&
      !snapshot.metrics.firstCheckInDate;

    if (trialEndingSoon) {
      await this.syncLifecycleEvent(
        snapshot.tenant.id,
        'trial_ending_soon',
        {
          stageName: 'Trial Ending Soon',
          note: `Trial ends on ${this.toDateKey(snapshot.trialEndDate)}.`,
          taskText: `HiTeam trial expires on ${this.toDateKey(snapshot.trialEndDate)}. Check payment and onboarding blockers.`,
          key: `lifecycle:trial_ending_soon:${this.toDateKey(snapshot.trialEndDate)}`,
        },
      );
    }

    if (trialExpired) {
      await this.syncLifecycleEvent(
        snapshot.tenant.id,
        'trial_expired',
        {
          stageName: 'Trial Expired',
          note: `Trial expired on ${this.toDateKey(snapshot.trialEndDate)}.`,
          taskText: 'HiTeam trial expired. Contact the customer and help activate subscription.',
          key: `lifecycle:trial_expired:${this.toDateKey(snapshot.trialEndDate)}`,
        },
      );
    }

    if (subscriptionRenewalUpcoming && renewalDate) {
      await this.syncLifecycleEvent(
        snapshot.tenant.id,
        'subscription_renewal_upcoming',
        {
          stageName: 'Renewal Soon',
          note: `Subscription renewal is coming on ${this.toDateKey(renewalDate)}.`,
          taskText: `HiTeam subscription renews on ${this.toDateKey(renewalDate)}. Check payment status and customer health.`,
          key: `lifecycle:subscription_renewal_upcoming:${this.toDateKey(renewalDate)}`,
        },
      );
    }

    if (inactive) {
      await this.syncLifecycleEvent(
        snapshot.tenant.id,
        'inactive_3_days',
        {
          stageName: paid ? 'Churn Risk' : 'Non-Activation Risk',
          note: 'No HiTeam activity for 3 days.',
          taskText: 'HiTeam has had no activity for 3 days. Contact the customer and verify blockers.',
          key: `lifecycle:inactive_3_days:${this.toDateKey(inactivityAnchor)}`,
        },
      );
    }

    if (keyFeatureNotUsed) {
      await this.syncLifecycleEvent(
        snapshot.tenant.id,
        'key_feature_not_used',
        {
          note: 'Customer has not invited employees or completed a first check-in after registration.',
          taskText: 'Customer has not used key HiTeam setup features. Help them invite employees and complete first check-in.',
          key: `lifecycle:key_feature_not_used:${this.toDateKey(snapshot.tenant.createdAt)}`,
        },
      );
    }
  }

  private async ensureAccountSetup(): Promise<KommoAccountSetup> {
    const cached = this.setupCache;
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    if (this.setupPromise) {
      return this.setupPromise;
    }

    this.setupPromise = this.buildAccountSetup();
    try {
      const value = await this.setupPromise;
      this.setupCache = { value, expiresAt: Date.now() + 15 * 60 * 1000 };
      return value;
    } finally {
      this.setupPromise = null;
    }
  }

  private async buildAccountSetup(): Promise<KommoAccountSetup> {
    const pipelines = {} as Record<KommoPipelineKey, KommoPipelineSetup>;
    for (const pipeline of KOMMO_PIPELINE_SPECS) {
      const pipelineId = await this.ensurePipeline(pipeline.key);
      pipelines[pipeline.key] = {
        id: pipelineId,
        statusesByName: await this.ensurePipelineStages(pipeline.key, pipelineId),
      };
    }
    const fields = await this.ensureCustomFields();

    return { pipelines, fields };
  }

  private getPipelineSpec(pipelineKey: KommoPipelineKey) {
    return KOMMO_PIPELINE_SPECS.find((pipeline) => pipeline.key === pipelineKey)!;
  }

  private getPipelineStages(pipelineKey: KommoPipelineKey) {
    return KOMMO_STAGE_SPECS.filter((stage) => stage.pipelineKey === pipelineKey);
  }

  private getStageSpec(stageName: KommoStageName) {
    return KOMMO_STAGE_SPECS.find((stage) => stage.name === stageName)!;
  }

  private resolveStageTarget(setup: KommoAccountSetup, stageName: KommoStageName): KommoStageTarget {
    const stageSpec = this.getStageSpec(stageName);
    const pipeline = setup.pipelines[stageSpec.pipelineKey];

    return {
      pipelineKey: stageSpec.pipelineKey,
      pipelineId: pipeline.id,
      stageName,
      statusId: pipeline.statusesByName.get(stageName),
    };
  }

  private async ensurePipeline(pipelineKey: KommoPipelineKey) {
    const config = this.getConfig();
    const configuredPipelineId = config.pipelineIds[pipelineKey];
    if (configuredPipelineId) {
      return configuredPipelineId;
    }

    const pipelineSpec = this.getPipelineSpec(pipelineKey);
    const pipelineName = config.pipelineNames[pipelineKey];
    const listResponse = await this.request<KommoApiObject>('GET', '/api/v4/leads/pipelines');
    const pipelines = this.extractEmbedded(listResponse, 'pipelines');
    const existing = pipelines.find((pipeline) => this.readString(pipeline.name) === pipelineName);

    if (existing?.id) {
      return Number(existing.id);
    }

    try {
      const createResponse = await this.request<KommoApiObject>('POST', '/api/v4/leads/pipelines', [
        {
          name: pipelineName,
          sort: pipelineSpec.sort,
          is_main: false,
          is_unsorted_on: false,
          _embedded: {
            statuses: this.getPipelineStages(pipelineKey).map((stage) => ({
              name: stage.name,
              sort: stage.sort,
            })),
          },
        },
      ]);
      const created = this.extractEmbedded(createResponse, 'pipelines')[0];
      if (created?.id) {
        return Number(created.id);
      }
    } catch (error) {
      this.logger.warn(`Unable to create Kommo pipeline, falling back to main pipeline: ${this.getErrorMessage(error)}`);
    }

    const mainPipeline = pipelines.find((pipeline) => pipeline.is_main === true) ?? pipelines[0];
    if (!mainPipeline?.id) {
      throw new Error('Kommo pipeline was not found and could not be created.');
    }

    return Number(mainPipeline.id);
  }

  private async ensurePipelineStages(pipelineKey: KommoPipelineKey, pipelineId: number) {
    const listResponse = await this.request<KommoApiObject>('GET', `/api/v4/leads/pipelines/${pipelineId}/statuses`);
    const existingStatuses = this.extractEmbedded(listResponse, 'statuses');
    const statusesByName = new Map<string, number>();

    for (const status of existingStatuses) {
      const name = this.readString(status.name);
      const id = Number(status.id);
      if (name && Number.isFinite(id)) {
        statusesByName.set(name, id);
      }
    }

    const missing = this.getPipelineStages(pipelineKey).filter((stage) => !statusesByName.has(stage.name));
    if (missing.length > 0) {
      const createResponse = await this.request<KommoApiObject>(
        'POST',
        `/api/v4/leads/pipelines/${pipelineId}/statuses`,
        missing.map((stage) => ({
          name: stage.name,
          sort: stage.sort,
        })),
      );
      for (const status of this.extractEmbedded(createResponse, 'statuses')) {
        const name = this.readString(status.name);
        const id = Number(status.id);
        if (name && Number.isFinite(id)) {
          statusesByName.set(name, id);
        }
      }
    }

    return statusesByName;
  }

  private async ensureCustomFields(): Promise<KommoFieldMap> {
    const fields: KommoFieldMap = {
      leads: new Map(),
      contacts: new Map(),
      companies: new Map(),
    };

    for (const entityType of ['leads', 'contacts', 'companies'] as const) {
      const entitySpecs = KOMMO_FIELD_SPECS.filter((spec) => spec.entityType === entityType);
      const groups = await this.ensureFieldGroups(entityType, entitySpecs);
      const listResponse = await this.request<KommoApiObject>('GET', `/api/v4/${entityType}/custom_fields`, undefined, { limit: 250 });
      const existingFields = this.extractEmbedded(listResponse, 'custom_fields');
      const existingByName = new Map<string, KommoApiObject>();

      for (const field of existingFields) {
        const name = this.readString(field.name);
        if (name && !existingByName.has(name)) {
          existingByName.set(name, field);
        }
      }

      const missingSpecs = entitySpecs.filter((spec) => !existingByName.has(spec.name));
      if (missingSpecs.length > 0) {
        const createResponse = await this.request<KommoApiObject>(
          'POST',
          `/api/v4/${entityType}/custom_fields`,
          missingSpecs.map((spec) => ({
            name: spec.name,
            type: spec.type,
            sort: spec.sort,
            group_id: groups.get(spec.groupName),
            enums: spec.enums?.map((value, index) => ({ value, sort: (index + 1) * 10 })),
          })),
        );
        for (const field of this.extractEmbedded(createResponse, 'custom_fields')) {
          const name = this.readString(field.name);
          if (name) {
            existingByName.set(name, field);
          }
        }
      }

      for (const spec of entitySpecs) {
        const field = existingByName.get(spec.name);
        const id = Number(field?.id);
        if (Number.isFinite(id)) {
          const actualEnums = this.readFieldEnumValues(field);
          fields[entityType].set(spec.key, {
            ...spec,
            id,
            enums: actualEnums.length > 0 ? actualEnums : spec.enums,
          });
        }
      }
    }

    return fields;
  }

  private async ensureFieldGroups(entityType: KommoEntityType, specs: KommoFieldSpec[]) {
    const response = await this.request<KommoApiObject>('GET', `/api/v4/${entityType}/custom_fields/groups`);
    const existingGroups = this.extractEmbedded(response, 'custom_field_groups');
    const groupsByName = new Map<string, string>();

    for (const group of existingGroups) {
      const name = this.readString(group.name);
      const id = this.readString(group.id);
      if (name && id) {
        groupsByName.set(name, id);
      }
    }

    const desiredGroupNames = Array.from(new Set(specs.map((spec) => spec.groupName)));
    const missing = desiredGroupNames.filter((name) => !groupsByName.has(name));

    if (missing.length > 0) {
      const createResponse = await this.request<KommoApiObject>(
        'POST',
        `/api/v4/${entityType}/custom_fields/groups`,
        missing.map((name, index) => ({
          name,
          sort: 900 + index,
        })),
      );
      for (const group of this.extractEmbedded(createResponse, 'custom_field_groups')) {
        const name = this.readString(group.name);
        const id = this.readString(group.id);
        if (name && id) {
          groupsByName.set(name, id);
        }
      }
    }

    return groupsByName;
  }

  private async loadTenantSnapshot(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        id: true,
        businessId: true,
        name: true,
        slug: true,
        timezone: true,
        locale: true,
        createdAt: true,
        companies: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        locations: {
          select: {
            id: true,
            name: true,
            address: true,
            country: true,
            timezone: true,
            latitude: true,
            longitude: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        users: {
          select: {
            id: true,
            email: true,
            roles: {
              select: {
                role: {
                  select: { code: true },
                },
              },
            },
          },
        },
        employees: {
          select: {
            id: true,
            userId: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            avatarUrl: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                email: true,
                roles: {
                  select: {
                    role: {
                      select: { code: true },
                    },
                  },
                },
              },
            },
            company: { select: { name: true, logoUrl: true } },
            department: { select: { name: true } },
            position: { select: { name: true } },
            primaryLocation: { select: { name: true, country: true, timezone: true, address: true } },
            biometricProfile: {
              select: {
                enrollmentStatus: true,
                enrolledAt: true,
                lastVerifiedAt: true,
                provider: true,
              },
            },
            devices: {
              select: {
                id: true,
                platform: true,
                isPrimary: true,
                updatedAt: true,
              },
            },
            groupMemberships: {
              select: {
                group: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        },
        employeeInvitations: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            status: true,
            employeeId: true,
            invitedAt: true,
            submittedAt: true,
            approvedAt: true,
            avatarUrl: true,
            approvedGroupId: true,
            workMode: true,
            company: { select: { name: true } },
          },
          orderBy: { invitedAt: 'desc' },
        },
        billingSubscription: true,
        payrollPolicy: { select: { id: true } },
        _count: {
          select: {
            pushDevices: true,
            taskTemplates: true,
          },
        },
      },
    });

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const adminUserIds = tenant.users
      .filter((user) => this.hasAnyRole(user.roles.map((entry) => entry.role.code), ['tenant_owner', 'hr_admin', 'operations_admin', 'manager']))
      .map((user) => user.id);

    const employeeIds = tenant.employees.map((employee) => employee.id);
    const userIds = tenant.users.map((user) => user.id);

    const [
      lastCheckIn,
      lastCheckOut,
      firstCheckIn,
      checkInsToday,
      lateEmployees,
      missedCheckIns,
      checkInsLast7Days,
      employeesWithRecentActivity,
      latestAudit,
      latestAdminAudit,
      latestLogin,
      latestLoginsByUser,
      latestCheckInsByEmployee,
      latestCheckOutsByEmployee,
      diagnosticsSnapshot,
      latestBillingPayment,
    ] = await Promise.all([
      this.prisma.attendanceEvent.findFirst({
        where: { tenantId, eventType: AttendanceEventType.CHECK_IN, result: AttendanceResult.ACCEPTED },
        orderBy: { occurredAt: 'desc' },
        select: { employeeId: true, occurredAt: true },
      }),
      this.prisma.attendanceEvent.findFirst({
        where: { tenantId, eventType: AttendanceEventType.CHECK_OUT, result: AttendanceResult.ACCEPTED },
        orderBy: { occurredAt: 'desc' },
        select: { employeeId: true, occurredAt: true },
      }),
      this.prisma.attendanceEvent.findFirst({
        where: { tenantId, eventType: AttendanceEventType.CHECK_IN, result: AttendanceResult.ACCEPTED },
        orderBy: { occurredAt: 'asc' },
        select: { id: true, occurredAt: true },
      }),
      this.prisma.attendanceEvent.count({
        where: {
          tenantId,
          eventType: AttendanceEventType.CHECK_IN,
          result: AttendanceResult.ACCEPTED,
          occurredAt: { gte: startOfToday, lte: endOfToday },
        },
      }),
      this.prisma.attendanceSession.count({
        where: {
          tenantId,
          startedAt: { gte: startOfToday, lte: endOfToday },
          lateMinutes: { gt: 0 },
        },
      }),
      this.prisma.shift.count({
        where: {
          tenantId,
          status: ShiftStatus.PUBLISHED,
          startsAt: { gte: startOfToday, lte: now },
          attendanceSessions: { none: {} },
        },
      }),
      this.prisma.attendanceEvent.count({
        where: {
          tenantId,
          eventType: AttendanceEventType.CHECK_IN,
          result: AttendanceResult.ACCEPTED,
          occurredAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.attendanceEvent.findMany({
        where: {
          tenantId,
          employeeId: { in: employeeIds.length > 0 ? employeeIds : ['__none__'] },
          occurredAt: { gte: sevenDaysAgo },
        },
        distinct: ['employeeId'],
        select: { employeeId: true },
      }),
      this.prisma.auditLog.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      adminUserIds.length > 0
        ? this.prisma.auditLog.findFirst({
            where: { tenantId, actorUserId: { in: adminUserIds } },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          })
        : Promise.resolve(null),
      this.prisma.auditLog.findFirst({
        where: { tenantId, action: 'auth.login' },
        orderBy: { createdAt: 'desc' },
        select: { actorUserId: true, createdAt: true },
      }),
      userIds.length > 0
        ? this.prisma.auditLog.findMany({
            where: { tenantId, action: 'auth.login', actorUserId: { in: userIds } },
            orderBy: { createdAt: 'desc' },
            distinct: ['actorUserId'],
            select: { actorUserId: true, createdAt: true },
          })
        : Promise.resolve([]),
      employeeIds.length > 0
        ? this.prisma.attendanceEvent.findMany({
            where: { tenantId, employeeId: { in: employeeIds }, eventType: AttendanceEventType.CHECK_IN, result: AttendanceResult.ACCEPTED },
            orderBy: { occurredAt: 'desc' },
            distinct: ['employeeId'],
            select: { employeeId: true, occurredAt: true },
          })
        : Promise.resolve([]),
      employeeIds.length > 0
        ? this.prisma.attendanceEvent.findMany({
            where: { tenantId, employeeId: { in: employeeIds }, eventType: AttendanceEventType.CHECK_OUT, result: AttendanceResult.ACCEPTED },
            orderBy: { occurredAt: 'desc' },
            distinct: ['employeeId'],
            select: { employeeId: true, occurredAt: true },
          })
        : Promise.resolve([]),
      this.prisma.diagnosticsSnapshot.findFirst({
        where: { tenantId },
        orderBy: { capturedAt: 'desc' },
        select: { criticalAlerts: true, warningAlerts: true },
      }),
      this.prisma.billingPayment.findFirst({
        where: { tenantId },
        orderBy: { paidAt: 'desc' },
        select: {
          id: true,
          status: true,
          reason: true,
          amountMinor: true,
          currency: true,
          planMonths: true,
          accessMonths: true,
          targetSeats: true,
          periodStart: true,
          periodEnd: true,
          paidAt: true,
          stripeCheckoutSessionId: true,
          stripeInvoiceId: true,
        },
      }),
    ]);

    const activeEmployees = tenant.employees.filter((employee) => employee.status === EmployeeStatus.ACTIVE);
    const activeEmployeeIds = new Set(activeEmployees.map((employee) => employee.id));
    const employeesWithRecentActivitySet = new Set(employeesWithRecentActivity.map((entry) => entry.employeeId));
    const employeesWithoutActivity = Array.from(activeEmployeeIds).filter((id) => !employeesWithRecentActivitySet.has(id)).length;
    const seatHoldingInvitationStatuses = new Set<EmployeeInvitationStatus>([
      EmployeeInvitationStatus.INVITED,
      EmployeeInvitationStatus.PENDING_APPROVAL,
      EmployeeInvitationStatus.APPROVED,
    ]);
    const paidThrough = tenant.billingSubscription?.stripeCurrentPeriodEnd ?? null;
    const paidAccessActive = Boolean(
      (paidThrough && paidThrough > new Date()) ||
        (!paidThrough && tenant.billingSubscription?.firstPaidAt),
    );
    const paidSeats = paidAccessActive ? tenant.billingSubscription?.paidSeats ?? 0 : 0;
    const usedSeats =
      activeEmployees.length +
      tenant.employeeInvitations.filter((invitation) => seatHoldingInvitationStatuses.has(invitation.status)).length;
    const trialDays = this.getConfig().trialDays;
    const trialStartDate = tenant.billingSubscription?.trialStartedAt ?? tenant.createdAt;
    const trialEndDate =
      tenant.billingSubscription?.trialEndsAt ??
      new Date(trialStartDate.getTime() + trialDays * 24 * 60 * 60 * 1000);
    const normalizedSubscriptionStatus = this.normalizeSubscriptionStatus(tenant.billingSubscription?.status);
    const hasEverPaid = Boolean(tenant.billingSubscription?.firstPaidAt);
    const subscriptionCancelled =
      ['CANCELED', 'CANCELLED'].includes(normalizedSubscriptionStatus) ||
      Boolean(tenant.billingSubscription?.stripeCancelAtPeriodEnd);
    const serviceActive =
      paidAccessActive &&
      paidSeats >= usedSeats &&
      !this.isBlockingSubscriptionStatus(tenant.billingSubscription?.status);
    const paymentStatus = serviceActive
      ? 'PAID'
      : tenant.billingSubscription?.status && this.isBlockingSubscriptionStatus(tenant.billingSubscription.status)
        ? 'FAILED'
        : 'PENDING';
    const lastActivityDate = this.maxDate([
      latestAudit?.createdAt ?? null,
      lastCheckIn?.occurredAt ?? null,
      lastCheckOut?.occurredAt ?? null,
      latestLogin?.createdAt ?? null,
    ]);
    const weeklyUsageScore = this.calculateWeeklyUsageScore(activeEmployees.length, checkInsLast7Days);
    const engagementLevel = weeklyUsageScore >= 70 ? 'HIGH' : weeklyUsageScore >= 30 ? 'MEDIUM' : 'LOW';
    const primaryCompany = tenant.companies[0] ?? null;
    const primaryLocation = tenant.locations[0] ?? null;
    const configuredLocations = tenant.locations.filter((location) =>
      location.address !== 'Not set yet' &&
      location.address !== 'Demo address' &&
      !(location.latitude === 0 && location.longitude === 0),
    );
    const country = primaryLocation?.country ?? this.inferCountryFromAddress(primaryLocation?.address ?? null);
    const latestLoginByUserId = new Map(
      latestLoginsByUser
        .filter((entry) => entry.actorUserId)
        .map((entry) => [entry.actorUserId!, entry.createdAt]),
    );
    const latestCheckInByEmployeeId = new Map(latestCheckInsByEmployee.map((entry) => [entry.employeeId, entry.occurredAt]));
    const latestCheckOutByEmployeeId = new Map(latestCheckOutsByEmployee.map((entry) => [entry.employeeId, entry.occurredAt]));
    const ownerEmployee =
      tenant.employees.find((employee) =>
        this.hasAnyRole(employee.user.roles.map((entry) => entry.role.code), ['tenant_owner', 'hr_admin', 'operations_admin', 'manager']),
      ) ?? tenant.employees[0] ?? null;
    const managerInvitation = tenant.employeeInvitations.find((invitation) => invitation.email || invitation.phone) ?? null;

    return {
      tenant,
      primaryCompany,
      primaryLocation,
      ownerEmployee,
      managerInvitation,
      country,
      trialStartDate,
      trialEndDate,
      latestLoginByUserId,
      latestCheckInByEmployeeId,
      latestCheckOutByEmployeeId,
      latestBillingPayment,
      metrics: {
        totalEmployees: tenant.employees.length,
        activeEmployees: activeEmployees.length,
        totalRegisteredEmployees: tenant.employees.length,
        employeesInvited: tenant.employeeInvitations.filter((invitation) => invitation.status === EmployeeInvitationStatus.INVITED).length,
        employeesActivated: activeEmployees.length,
        employeesWithFaceVerification: tenant.employees.filter((employee) => employee.biometricProfile?.enrollmentStatus === BiometricEnrollmentStatus.ENROLLED).length,
        employeesWithoutActivity,
        checkInsToday,
        lateEmployees,
        missedCheckIns,
        weeklyUsageScore,
        engagementLevel,
        paidSeats,
        usedSeats,
        serviceActive,
        paymentStatus,
        subscriptionStatus: serviceActive ? 'ACTIVE' : normalizedSubscriptionStatus,
        lastActivityDate,
        lastAdminActivityDate: latestAdminAudit?.createdAt ?? null,
        lastEmployeeActivityDate: this.maxDate([lastCheckIn?.occurredAt ?? null, lastCheckOut?.occurredAt ?? null]),
        lastLoginDate: latestLogin?.createdAt ?? null,
        lastEmployeeCheckIn: lastCheckIn?.occurredAt ?? null,
        lastEmployeeCheckOut: lastCheckOut?.occurredAt ?? null,
        firstCheckInDate: firstCheckIn?.occurredAt ?? null,
        activeDevices: tenant.employees.reduce((sum, employee) => sum + employee.devices.length, 0),
        mobileAppInstalled: tenant.employees.some((employee) => employee.devices.some((device) => device.platform !== DevicePlatform.WEB)),
        notificationsEnabled: tenant._count.pushDevices > 0,
        checklistFeatureEnabled: true,
        payrollModuleEnabled: Boolean(tenant.payrollPolicy),
        diagnosticsNeedsSupport: Boolean(diagnosticsSnapshot && diagnosticsSnapshot.criticalAlerts > 0),
        hasEverPaid,
        subscriptionCancelled,
        renewalDate: tenant.billingSubscription?.stripeCurrentPeriodEnd ?? null,
        firstLoginCompleted: Boolean(latestLogin),
        employeesAddedCompleted:
          tenant.employeeInvitations.length > 0 ||
          tenant.employees.length > 1,
        firstQrCreatedCompleted: configuredLocations.length > 0,
        firstCheckInCompleted: Boolean(firstCheckIn),
        checklistsConfiguredCompleted: tenant._count.taskTemplates > 0,
        activationMilestonesCompleted: [
          Boolean(latestLogin),
          tenant.employeeInvitations.length > 0 || tenant.employees.length > 1,
          configuredLocations.length > 0,
          Boolean(firstCheckIn),
        ].filter(Boolean).length,
        configuredTaskTemplates: tenant._count.taskTemplates,
      },
    };
  }

  private async syncCompany(
    setup: KommoAccountSetup,
    snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>,
  ) {
    const name = snapshot.primaryCompany?.name ?? snapshot.tenant.name;
    const payload = {
      name,
      custom_fields_values: this.buildCompanyFieldValues(setup, snapshot),
    };
    const link = await this.findLink(snapshot.tenant.id, 'tenant', snapshot.tenant.id, 'companies');
    const companyId = await this.upsertKommoEntity('companies', link?.kommoEntityId ?? null, payload);

    await this.upsertLink(snapshot.tenant.id, 'tenant', snapshot.tenant.id, 'companies', companyId, 'OK', null);
    return companyId;
  }

  private async syncPrimaryContact(
    setup: KommoAccountSetup,
    snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>,
    companyId: number,
  ) {
    const owner = snapshot.ownerEmployee;
    const invitation = snapshot.managerInvitation;
    const name = owner
      ? this.employeeFullName(owner)
      : invitation?.firstName || invitation?.lastName
        ? [invitation.lastName, invitation.firstName].filter(Boolean).join(' ')
        : `${snapshot.tenant.name} manager`;
    const email = owner?.user.email ?? invitation?.email ?? null;
    const phone = owner?.phone ?? invitation?.phone ?? null;
    const payload = {
      name,
      custom_fields_values: [
        ...this.buildStandardContactFieldValues(email, phone),
        ...this.toCustomFieldValues(setup.fields.contacts, {
          employeeName: name,
          employeePosition: owner?.position.name ?? 'Primary contact',
          employeeBranch: owner?.primaryLocation.name ?? snapshot.primaryLocation?.name ?? null,
          employeeStatus: owner?.status ?? 'INVITED',
          employeeAppInstalled: owner ? owner.devices.length > 0 : false,
          employeeFaceVerificationActive: owner?.biometricProfile?.enrollmentStatus === BiometricEnrollmentStatus.ENROLLED,
        }),
      ],
      _embedded: {
        companies: [{ id: companyId }],
      },
    };
    const link = await this.findLink(snapshot.tenant.id, 'tenant_primary_contact', snapshot.tenant.id, 'contacts');
    const contactId = await this.upsertKommoEntity('contacts', link?.kommoEntityId ?? null, payload);

    await this.upsertLink(snapshot.tenant.id, 'tenant_primary_contact', snapshot.tenant.id, 'contacts', contactId, 'OK', null);
    return contactId;
  }

  private async syncEmployeeContacts(
    setup: KommoAccountSetup,
    snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>,
    companyId: number,
    options: KommoSyncOptions,
  ) {
    const contactIds: number[] = [];
    const shouldSyncEmployee = (employeeId: string) =>
      options.syncAllContacts || !options.employeeId || employeeId === options.employeeId;

    for (const employee of snapshot.tenant.employees) {
      if (!shouldSyncEmployee(employee.id)) {
        continue;
      }

      const contactId = await this.syncSingleEmployeeContact(setup, snapshot, companyId, employee);
      contactIds.push(contactId);
    }

    if (options.syncAllContacts || options.invitationId) {
      for (const invitation of snapshot.tenant.employeeInvitations.filter((item) => !item.employeeId)) {
        if (options.invitationId && invitation.id !== options.invitationId) {
          continue;
        }

        const contactId = await this.syncInvitationContact(setup, snapshot, companyId, invitation);
        contactIds.push(contactId);
      }
    }

    return contactIds;
  }

  private async syncSingleEmployeeContact(
    setup: KommoAccountSetup,
    snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>,
    companyId: number,
    employee: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>['tenant']['employees'][number],
  ) {
    const name = this.employeeFullName(employee);
    const payload = {
      name,
      custom_fields_values: [
        ...this.buildStandardContactFieldValues(employee.user.email, employee.phone),
        ...this.toCustomFieldValues(setup.fields.contacts, {
          employeeName: name,
          employeePosition: employee.position.name,
          employeeBranch: employee.primaryLocation.name,
          employeeStatus: employee.status,
          employeeLastCheckIn: snapshot.latestCheckInByEmployeeId.get(employee.id) ?? null,
          employeeAppInstalled: employee.devices.length > 0,
          employeeFaceVerificationActive: employee.biometricProfile?.enrollmentStatus === BiometricEnrollmentStatus.ENROLLED,
        }),
      ],
      _embedded: {
        companies: [{ id: companyId }],
      },
    };
    const link = await this.findLink(snapshot.tenant.id, 'employee', employee.id, 'contacts');
    const contactId = await this.upsertKommoEntity('contacts', link?.kommoEntityId ?? null, payload);

    await this.upsertLink(snapshot.tenant.id, 'employee', employee.id, 'contacts', contactId, 'OK', null);
    return contactId;
  }

  private async syncInvitationContact(
    setup: KommoAccountSetup,
    snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>,
    companyId: number,
    invitation: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>['tenant']['employeeInvitations'][number],
  ) {
    const name =
      [invitation.lastName, invitation.firstName].filter(Boolean).join(' ') ||
      invitation.email ||
      invitation.phone ||
      `Invitation ${invitation.id.slice(0, 8)}`;
    const payload = {
      name,
      custom_fields_values: [
        ...this.buildStandardContactFieldValues(invitation.email, invitation.phone),
        ...this.toCustomFieldValues(setup.fields.contacts, {
          employeeName: name,
          employeePosition: 'Invited employee',
          employeeBranch: invitation.company?.name ?? snapshot.primaryLocation?.name ?? null,
          employeeStatus: invitation.status,
          employeeAppInstalled: false,
          employeeFaceVerificationActive: false,
        }),
      ],
      _embedded: {
        companies: [{ id: companyId }],
      },
    };
    const link = await this.findLink(snapshot.tenant.id, 'employee_invitation', invitation.id, 'contacts');
    const contactId = await this.upsertKommoEntity('contacts', link?.kommoEntityId ?? null, payload);

    await this.upsertLink(snapshot.tenant.id, 'employee_invitation', invitation.id, 'contacts', contactId, 'OK', null);
    return contactId;
  }

  private async syncLead(
    setup: KommoAccountSetup,
    snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>,
    args: {
      stage: KommoStageTarget;
      tags: string[];
      companyId: number;
      primaryContactId: number;
      employeeContactIds: number[];
      clearManualStage: boolean;
      lifecycleEmailResult?: LifecycleEmailSendResult;
    },
  ) {
    const config = this.getConfig();
    const name = `HiTeam - ${snapshot.primaryCompany?.name ?? snapshot.tenant.name}`;
    const link = await this.findLink(snapshot.tenant.id, 'tenant', snapshot.tenant.id, 'leads');
    const uniqueContactIds = Array.from(new Set([args.primaryContactId, ...args.employeeContactIds])).slice(0, 100);
    const basePayload = {
      name,
      pipeline_id: args.stage.pipelineId,
      status_id: args.stage.statusId,
      price: Math.round(this.resolveTotalMonthlyPayment(snapshot) ?? 0),
      responsible_user_id: config.responsibleUserId ?? undefined,
      custom_fields_values: this.buildLeadFieldValues(setup, snapshot, args.stage, args.lifecycleEmailResult),
      _embedded: {
        companies: [{ id: args.companyId }],
        contacts: uniqueContactIds.map((id, index) => ({ id, is_main: index === 0 })),
      },
    };

    const leadId = await this.upsertKommoEntity('leads', link?.kommoEntityId ?? null, {
      ...basePayload,
      _embedded: {
        ...basePayload._embedded,
        ...(link?.kommoEntityId
          ? { tags_to_add: args.tags.map((tag) => ({ name: tag })) }
          : { tags: args.tags.map((tag) => ({ name: tag })) }),
      },
    });
    await this.ensureLeadEntityLinks(leadId, args.companyId, uniqueContactIds);

    const metadata = this.mergeMetadata(
      link?.metadataJson,
      {
        stageName: args.stage.stageName,
        pipelineKey: args.stage.pipelineKey,
        pipelineId: args.stage.pipelineId,
        statusId: args.stage.statusId ?? null,
        lastOutboundSyncAt: new Date().toISOString(),
      },
      args.clearManualStage ? ['manualStageName', 'manualStatusId', 'manualStageUpdatedAt'] : [],
    );

    await this.upsertLink(
      snapshot.tenant.id,
      'tenant',
      snapshot.tenant.id,
      'leads',
      leadId,
      'OK',
      null,
      JSON.stringify(metadata),
    );
    return leadId;
  }

  private buildLeadFieldValues(
    setup: KommoAccountSetup,
    snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>,
    stage: KommoStageTarget,
    lifecycleEmailResult?: LifecycleEmailSendResult,
  ) {
    const country = snapshot.country;
    const city = this.inferCityFromAddress(snapshot.primaryLocation?.address ?? null);
    const totalMonthlyPayment = this.resolveTotalMonthlyPayment(snapshot);
    const unitPrice = this.resolvePricePerEmployee(snapshot);
    const paidUntil = snapshot.tenant.billingSubscription?.stripeCurrentPeriodEnd ?? null;
    const latestPayment = snapshot.latestBillingPayment;
    const lastPaymentDate = latestPayment?.paidAt ?? snapshot.tenant.billingSubscription?.firstPaidAt ?? null;
    const plan = this.resolveBillingPlanLabel(snapshot);
    const billingCycle = this.resolveBillingCycle(snapshot);
    const lastPaymentAmount =
      latestPayment?.amountMinor !== null && latestPayment?.amountMinor !== undefined
        ? latestPayment.amountMinor / 100
        : null;
    const lastPaymentPeriod = this.formatLatestPaymentPeriod(snapshot);
    const paymentLink = this.buildWebUrl('/billing');
    const dashboardLink = this.buildWebUrl('/app');

    return this.toCustomFieldValues(setup.fields.leads, {
      companyName: snapshot.primaryCompany?.name ?? snapshot.tenant.name,
      organizationId: snapshot.tenant.businessId,
      country,
      city,
      timezone: snapshot.primaryLocation?.timezone ?? snapshot.tenant.timezone,
      industry: this.configService.get<string>('KOMMO_DEFAULT_INDUSTRY') ?? null,
      numberOfLocations: snapshot.tenant.locations.length,
      totalEmployees: snapshot.metrics.totalEmployees,
      activeEmployees: snapshot.metrics.activeEmployees,
      trialStatus: !snapshot.metrics.hasEverPaid,
      currentPlan: plan,
      subscriptionStatus: snapshot.metrics.serviceActive ? 'ACTIVE' : snapshot.metrics.subscriptionStatus,
      paymentStatus: snapshot.metrics.paymentStatus,
      trialStartDate: snapshot.trialStartDate,
      trialEndDate: snapshot.trialEndDate,
      paidUntil,
      lastActivityDate: snapshot.metrics.lastActivityDate,
      registrationDate: snapshot.tenant.createdAt,
      referralSource: this.configService.get<string>('KOMMO_DEFAULT_REFERRAL_SOURCE') ?? 'HiTeam signup',
      salesManager: this.configService.get<string>('KOMMO_SALES_MANAGER_NAME') ?? null,
      onboardingManager: this.configService.get<string>('KOMMO_ONBOARDING_MANAGER_NAME') ?? null,
      lifecycleWebhook: this.resolveWebhookName(stage.stageName),
      lifecycleStage: stage.stageName,
      lifecyclePipeline: stage.pipelineKey,
      lastLifecycleEventAt: new Date(),
      lastLifecycleEmailEvent: lifecycleEmailResult?.event,
      lastLifecycleEmailStatus: lifecycleEmailResult?.status ? this.formatLifecycleEmailStatus(lifecycleEmailResult.status) : null,
      lastLifecycleEmailProvider: lifecycleEmailResult?.provider,
      lastLifecycleEmailAt: lifecycleEmailResult?.recordedAt,
      lastLifecycleEmailSender: lifecycleEmailResult?.sender,
      lastLifecycleEmailReplyTo: lifecycleEmailResult?.replyTo,
      lastLifecycleEmailRecipients: lifecycleEmailResult ? this.formatEmailRecipients(lifecycleEmailResult) : null,
      lastLifecycleEmailRecipientCount: lifecycleEmailResult?.recipientCount,
      lastLifecycleEmailSubject: lifecycleEmailResult?.subject,
      lastLifecycleEmailPreview: lifecycleEmailResult?.preview,
      lastLifecycleEmailCta: lifecycleEmailResult?.ctaUrl,
      lastLifecycleEmailError: lifecycleEmailResult?.errorMessage,
      dashboardLink,
      adminLink: dashboardLink,
      mobileAppInstalled: snapshot.metrics.mobileAppInstalled,
      gpsTrackingEnabled: true,
      faceRecognitionEnabled: snapshot.metrics.employeesWithFaceVerification > 0,
      selfieVerificationEnabled: true,
      checklistFeatureEnabled: snapshot.metrics.checklistFeatureEnabled,
      notificationsEnabled: snapshot.metrics.notificationsEnabled,
      payrollModuleEnabled: snapshot.metrics.payrollModuleEnabled,
      activeDevices: snapshot.metrics.activeDevices,
      lastEmployeeCheckIn: snapshot.metrics.lastEmployeeCheckIn,
      lastEmployeeCheckOut: snapshot.metrics.lastEmployeeCheckOut,
      lastSyncStatus: `OK ${new Date().toISOString()}`,
      firstLoginCompleted: snapshot.metrics.firstLoginCompleted,
      employeesAddedCompleted: snapshot.metrics.employeesAddedCompleted,
      firstQrCreatedCompleted: snapshot.metrics.firstQrCreatedCompleted,
      firstCheckInCompleted: snapshot.metrics.firstCheckInCompleted,
      checklistsConfiguredCompleted: snapshot.metrics.checklistsConfiguredCompleted,
      integrationStatus: 'ACTIVE',
      totalRegisteredEmployees: snapshot.metrics.totalRegisteredEmployees,
      employeesInvited: snapshot.metrics.employeesInvited,
      employeesActivated: snapshot.metrics.employeesActivated,
      employeesWithFaceVerification: snapshot.metrics.employeesWithFaceVerification,
      employeesWithoutActivity: snapshot.metrics.employeesWithoutActivity,
      employeeRoster: this.buildEmployeeRoster(snapshot),
      subscriptionType: plan,
      pricePerEmployee: unitPrice,
      totalMonthlyPayment,
      billingCycle,
      nextPaymentDate: paidUntil,
      lastPaymentDate,
      paymentMethod: snapshot.tenant.billingSubscription?.stripeCustomerId ? 'Stripe' : null,
      autoRenewal: !snapshot.tenant.billingSubscription?.stripeCancelAtPeriodEnd,
      paymentLink,
      invoiceAttached: Boolean(
        snapshot.tenant.billingSubscription?.stripeSubscriptionId ||
          latestPayment?.stripeInvoiceId ||
          latestPayment?.stripeCheckoutSessionId,
      ),
      seatsUsed: snapshot.metrics.usedSeats,
      seatsPaid: snapshot.metrics.paidSeats,
      lastPaymentAmount,
      lastPaymentCurrency: latestPayment?.currency ?? snapshot.tenant.billingSubscription?.stripeCurrency ?? null,
      lastPaymentPlan: latestPayment ? plan : null,
      lastPaymentPeriod,
      lastPaymentSeats: latestPayment?.targetSeats ?? null,
      lastLoginDate: snapshot.metrics.lastLoginDate,
      lastAdminActivityDate: snapshot.metrics.lastAdminActivityDate,
      lastEmployeeActivityDate: snapshot.metrics.lastEmployeeActivityDate,
      checkInsToday: snapshot.metrics.checkInsToday,
      lateEmployees: snapshot.metrics.lateEmployees,
      missedCheckIns: snapshot.metrics.missedCheckIns,
      weeklyUsageScore: snapshot.metrics.weeklyUsageScore,
      engagementLevel: snapshot.metrics.engagementLevel,
      employeesLink: this.buildWebUrl('/employees'),
      billingLink: this.buildWebUrl('/billing'),
      checkInLogsLink: this.buildWebUrl('/attendance'),
      branchesLink: this.buildWebUrl('/organization'),
    });
  }

  private buildCompanyFieldValues(
    setup: KommoAccountSetup,
    snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>,
  ) {
    return this.toCustomFieldValues(setup.fields.companies, {
      companyOrganizationId: snapshot.tenant.businessId,
      companyDashboardLink: this.buildWebUrl('/app'),
      companyAdminLink: this.buildWebUrl('/app'),
      companyTotalEmployees: snapshot.metrics.totalEmployees,
      companyActiveEmployees: snapshot.metrics.activeEmployees,
      companySeatsUsed: snapshot.metrics.usedSeats,
      companySubscriptionStatus: snapshot.metrics.subscriptionStatus,
      companyPaymentStatus: snapshot.metrics.paymentStatus,
      companyLastActivityDate: snapshot.metrics.lastActivityDate,
      companyLocations: snapshot.tenant.locations.length,
    });
  }

  private toCustomFieldValues(fieldMap: Map<string, KommoFieldInfo>, values: Record<string, unknown>) {
    const customFields = [];

    for (const [key, value] of Object.entries(values)) {
      const field = fieldMap.get(key);
      if (!field) {
        continue;
      }

      const formatted = this.formatFieldValue(field, value);
      if (!formatted) {
        continue;
      }

      customFields.push({
        field_id: field.id,
        values: formatted,
      });
    }

    return customFields;
  }

  private formatFieldValue(field: KommoFieldInfo, value: unknown): Array<Record<string, unknown>> | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (field.type === 'checkbox') {
      return [{ value: Boolean(value) }];
    }

    if (field.type === 'date' || field.type === 'date_time') {
      const date = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      return [{ value: Math.floor(date.getTime() / 1000) }];
    }

    if (field.type === 'numeric') {
      const numberValue = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(numberValue)) {
        return null;
      }
      return [{ value: String(numberValue) }];
    }

    const stringValue = String(value).trim();
    if (!stringValue) {
      return null;
    }

    if (field.type === 'select') {
      const selectValue = this.resolveSelectFieldValue(field, stringValue);
      return selectValue ? [{ value: selectValue }] : null;
    }

    return [{ value: stringValue }];
  }

  private buildStandardContactFieldValues(email?: string | null, phone?: string | null) {
    const values = [];

    if (email?.trim()) {
      values.push({
        field_code: 'EMAIL',
        values: [{ value: email.trim().toLowerCase(), enum_code: 'WORK' }],
      });
    }

    if (phone?.trim()) {
      values.push({
        field_code: 'PHONE',
        values: [{ value: phone.trim(), enum_code: 'WORK' }],
      });
    }

    return values;
  }

  private async upsertKommoEntity(entityType: KommoEntityType, existingId: number | null, payload: Record<string, unknown>) {
    if (existingId) {
      try {
        await this.request<KommoApiObject>('PATCH', `/api/v4/${entityType}/${existingId}`, payload);
        return existingId;
      } catch (error) {
        if (!(error instanceof KommoRequestError) || error.status !== 404) {
          throw error;
        }
      }
    }

    const response = await this.request<KommoApiObject>('POST', `/api/v4/${entityType}`, [payload]);
    const created = this.extractEmbedded(response, entityType)[0];
    const id = Number(created?.id);

    if (!Number.isFinite(id)) {
      throw new Error(`Kommo did not return created ${entityType} ID.`);
    }

    return id;
  }

  private async addLeadNote(leadId: number, text: string) {
    await this.request('POST', '/api/v4/leads/notes', [
      {
        entity_id: leadId,
        note_type: 'common',
        params: { text },
      },
    ]);
  }

  private async ensureLeadEntityLinks(leadId: number, companyId: number, contactIds: number[]) {
    const uniqueContactIds = Array.from(new Set(contactIds)).filter((id) => Number.isFinite(id));
    const desiredLinks = [
      { to_entity_id: companyId, to_entity_type: 'companies' },
      ...uniqueContactIds.map((id) => ({ to_entity_id: id, to_entity_type: 'contacts' })),
    ].filter((link) => Number.isFinite(link.to_entity_id));

    if (desiredLinks.length === 0) {
      return;
    }

    const existingResponse = await this.request<KommoApiObject>('GET', `/api/v4/leads/${leadId}/links`);
    const existingLinks = new Set(
      this.extractEmbedded(existingResponse, 'links')
        .map((link) => {
          const type = this.readString(link.to_entity_type);
          const id = Number(link.to_entity_id);
          return type && Number.isFinite(id) ? `${type}:${id}` : null;
        })
        .filter((value): value is string => Boolean(value)),
    );
    const missingLinks = desiredLinks.filter(
      (link) => !existingLinks.has(`${link.to_entity_type}:${link.to_entity_id}`),
    );

    if (missingLinks.length === 0) {
      return;
    }

    await this.request('POST', `/api/v4/leads/${leadId}/link`, missingLinks);
  }

  private async createAutomationLogOnce(tenantId: string, key: string) {
    try {
      await this.prisma.kommoAutomationLog.create({
        data: { tenantId, key },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return false;
      }
      throw error;
    }
  }

  private async createTaskOnce(tenantId: string, key: string, leadId: number, text: string, completeTill: Date) {
    try {
      await this.prisma.kommoAutomationLog.create({
        data: { tenantId, key },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return;
      }
      throw error;
    }

    const config = this.getConfig();
    await this.request('POST', '/api/v4/tasks', [
      {
        entity_id: leadId,
        entity_type: 'leads',
        text,
        complete_till: Math.floor(completeTill.getTime() / 1000),
        responsible_user_id: config.responsibleUserId ?? undefined,
      },
    ]);
  }

  private async findLink(
    tenantId: string,
    localEntityType: string,
    localEntityId: string,
    kommoEntityType: KommoEntityType,
  ) {
    return this.prisma.kommoEntityLink.findUnique({
      where: {
        kommo_entity_local_remote_unique: {
          localEntityType,
          localEntityId,
          kommoEntityType,
        },
      },
    }).then((link) => (link?.tenantId === tenantId ? link : null));
  }

  private async upsertLink(
    tenantId: string,
    localEntityType: string,
    localEntityId: string,
    kommoEntityType: KommoEntityType,
    kommoEntityId: number | null,
    status: string,
    error: string | null,
    metadataJson?: string | null,
  ) {
    await this.prisma.kommoEntityLink.upsert({
      where: {
        kommo_entity_local_remote_unique: {
          localEntityType,
          localEntityId,
          kommoEntityType,
        },
      },
      update: {
        tenantId,
        kommoEntityId,
        lastSyncedAt: status === 'OK' ? new Date() : undefined,
        lastSyncStatus: status,
        lastSyncError: error,
        metadataJson,
      },
      create: {
        tenantId,
        localEntityType,
        localEntityId,
        kommoEntityType,
        kommoEntityId,
        lastSyncedAt: status === 'OK' ? new Date() : undefined,
        lastSyncStatus: status,
        lastSyncError: error,
        metadataJson,
      },
    });
  }

  private async markTenantSyncState(tenantId: string, status: string, error: string | null, leadId?: number) {
    const existingLeadLink =
      leadId === undefined ? await this.findLink(tenantId, 'tenant', tenantId, 'leads') : null;

    return this.upsertLink(
      tenantId,
      'tenant',
      tenantId,
      'leads',
      leadId ?? existingLeadLink?.kommoEntityId ?? null,
      status,
      error,
    );
  }

  private readManualStageName(metadataJson: string | null | undefined, setup: KommoAccountSetup): KommoStageName | null {
    if (!metadataJson) {
      return null;
    }

    const metadata = this.readRecord(this.parseJson(metadataJson));
    const stageName = this.readString(metadata?.manualStageName);
    const pipelineKey = this.readString(metadata?.manualPipelineKey);

    if (!stageName || !this.isKommoStageName(stageName)) {
      return null;
    }

    const stageSpec = this.getStageSpec(stageName);
    const resolvedPipelineKey = this.isKommoPipelineKey(pipelineKey) ? pipelineKey : stageSpec.pipelineKey;

    if (setup.pipelines[resolvedPipelineKey].statusesByName.has(stageName)) {
      return stageName;
    }

    return null;
  }

  private mergeMetadata(
    metadataJson: string | null | undefined,
    values: Record<string, unknown>,
    deleteKeys: string[] = [],
  ) {
    const parsed = this.readRecord(metadataJson ? this.parseJson(metadataJson) : null);
    const metadata: Record<string, unknown> = { ...(parsed ?? {}) };

    for (const key of deleteKeys) {
      delete metadata[key];
    }

    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        continue;
      }

      if (value === null) {
        delete metadata[key];
        continue;
      }

      metadata[key] = value;
    }

    return metadata;
  }

  private resolveWebhookName(stageName: KommoStageName) {
    switch (stageName) {
      case 'New Registration':
        return 'user_registered';
      case 'Trial Started':
        return 'trial_started';
      case 'Activation':
        return 'activation_started';
      case 'Non-Activation Risk':
      case 'Churn Risk':
        return 'inactive_3_days';
      case 'Trial Ending Soon':
        return 'trial_ending_soon';
      case 'Paid':
      case 'New Customer':
      case 'Renewed':
        return 'payment_successful';
      case 'Trial Expired':
      case 'Lost Lead':
        return 'trial_expired';
      case 'Renewal Soon':
        return 'subscription_renewal_upcoming';
      case 'Subscription Cancelled':
      case 'Winback':
        return 'subscription_cancelled';
      case 'Onboarding':
        return 'onboarding_started';
      case 'Active Customer':
        return 'active_customer';
      default:
        return 'hiteam_status_updated';
    }
  }

  private resolveStageName(snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>): KommoStageName {
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const inactivityAnchor = snapshot.metrics.lastActivityDate ?? snapshot.tenant.createdAt;
    const inactive3Days =
      now - inactivityAnchor.getTime() >= threeDaysMs;
    const renewalSoon =
      snapshot.metrics.renewalDate !== null &&
      snapshot.metrics.renewalDate.getTime() >= now &&
      snapshot.metrics.renewalDate.getTime() - now <= sevenDaysMs;

    if (snapshot.metrics.hasEverPaid) {
      if (snapshot.metrics.subscriptionCancelled) {
        return 'Subscription Cancelled';
      }

      if (renewalSoon) {
        return 'Renewal Soon';
      }

      if (inactive3Days) {
        return 'Churn Risk';
      }

      const customerOnboardingComplete =
        snapshot.metrics.employeesAddedCompleted &&
        snapshot.metrics.firstQrCreatedCompleted &&
        snapshot.metrics.checklistsConfiguredCompleted &&
        (snapshot.metrics.firstCheckInCompleted || snapshot.metrics.weeklyUsageScore >= 50);

      if (customerOnboardingComplete) {
        return 'Active Customer';
      }

      return 'Onboarding';
    }

    if (snapshot.metrics.paymentStatus === 'FAILED') {
      return snapshot.trialEndDate.getTime() < now ? 'Trial Expired' : 'Trial Ending Soon';
    }

    if (snapshot.trialEndDate.getTime() < now) {
      return 'Lost Lead';
    }

    if (snapshot.trialEndDate.getTime() - now <= threeDaysMs) {
      return 'Trial Ending Soon';
    }

    if (inactive3Days) {
      return 'Non-Activation Risk';
    }

    if (
      snapshot.metrics.firstLoginCompleted ||
      snapshot.metrics.employeesAddedCompleted ||
      snapshot.metrics.firstQrCreatedCompleted ||
      snapshot.metrics.firstCheckInCompleted
    ) {
      return 'Activation';
    }

    if (snapshot.trialEndDate.getTime() > now) {
      return 'Trial Started';
    }

    return 'New Registration';
  }

  private resolveTags(snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>) {
    const tags = new Set<string>();
    const now = Date.now();

    if (snapshot.metrics.hasEverPaid) {
      tags.add('Paid');
    } else {
      tags.add('Trial');
    }

    if (snapshot.trialEndDate.getTime() - now <= 3 * 24 * 60 * 60 * 1000 && !snapshot.metrics.hasEverPaid) {
      tags.add('Expiring Soon');
    }

    if (now - (snapshot.metrics.lastActivityDate ?? snapshot.tenant.createdAt).getTime() >= 3 * 24 * 60 * 60 * 1000) {
      tags.add('No Activity');
      if (snapshot.metrics.hasEverPaid) {
        tags.add('Churn Risk');
      }
    }

    if (snapshot.metrics.activationMilestonesCompleted > 0) {
      tags.add('Activated');
    }

    const customerOnboardingComplete =
      snapshot.metrics.employeesAddedCompleted &&
      snapshot.metrics.firstQrCreatedCompleted &&
      snapshot.metrics.checklistsConfiguredCompleted &&
      (snapshot.metrics.firstCheckInCompleted || snapshot.metrics.weeklyUsageScore >= 50);

    if (snapshot.metrics.hasEverPaid && !customerOnboardingComplete) {
      tags.add('Onboarding');
    }

    if (snapshot.metrics.hasEverPaid && snapshot.metrics.subscriptionCancelled) {
      tags.add('Cancelled');
    }

    if (snapshot.metrics.hasEverPaid && snapshot.metrics.renewalDate) {
      const renewalDelta = snapshot.metrics.renewalDate.getTime() - now;
      if (renewalDelta >= 0 && renewalDelta <= 7 * 24 * 60 * 60 * 1000) {
        tags.add('Renewal Soon');
      }
    }

    if (snapshot.metrics.weeklyUsageScore >= 70) {
      tags.add('High Engagement');
    }

    if (snapshot.metrics.totalEmployees >= 100) {
      tags.add('Enterprise');
    }

    if (snapshot.tenant.locations.length > 1) {
      tags.add('Multi-Location');
    }

    if (snapshot.metrics.diagnosticsNeedsSupport) {
      tags.add('Needs Support');
    }

    if ((snapshot.country ?? '').toLowerCase().includes('united arab emirates') || (snapshot.country ?? '').toLowerCase().includes('uae')) {
      tags.add('UAE');
    }

    if (snapshot.tenant.locale.toLowerCase().startsWith('ru')) {
      tags.add('Russian-speaking');
    } else {
      tags.add('English-speaking');
    }

    return Array.from(tags).filter((tag) => (KOMMO_TAGS as readonly string[]).includes(tag));
  }

  private buildEmployeeRoster(snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>) {
    const rows = snapshot.tenant.employees.slice(0, 100).map((employee) => {
      const lastCheckIn = snapshot.latestCheckInByEmployeeId.get(employee.id);
      return [
        this.employeeFullName(employee),
        employee.user.email,
        employee.phone ?? 'no phone',
        employee.position.name,
        employee.primaryLocation.name,
        employee.groupMemberships[0]?.group.name ?? 'no group',
        employee.status,
        lastCheckIn ? `last check-in ${lastCheckIn.toISOString()}` : 'no check-in',
      ].join(' | ');
    });

    if (snapshot.tenant.employees.length > rows.length) {
      rows.push(`...and ${snapshot.tenant.employees.length - rows.length} more employees`);
    }

    return rows.join('\n').slice(0, 6000);
  }

  private buildTaskEventNote(task: KommoTaskNote, reason: string) {
    return [
      `HiTeam task updated: ${reason}.`,
      `Task: ${task.title}`,
      `Task ID: ${task.id}`,
      `Status: ${task.status}`,
      `Priority: ${task.priority}`,
      `Due: ${task.dueAt?.toISOString() ?? 'not scheduled'}`,
      `Assignee: ${this.formatTaskNotePerson(task.assigneeEmployee)}`,
      `Manager: ${this.formatTaskNotePerson(task.managerEmployee)}`,
      `Group: ${task.group?.name ?? 'direct task'}`,
      task.description ? `Description: ${task.description.slice(0, 500)}` : null,
    ].filter((line): line is string => Boolean(line)).join('\n');
  }

  private buildRecurringTaskEventNote(task: KommoRecurringTaskNote) {
    return [
      `HiTeam recurring task updated: ${task.reason}.`,
      `Task: ${task.template.title}`,
      `Template ID: ${task.template.id}`,
      `Occurrence: ${this.toDateKey(task.occurrenceDate)}`,
      `Status: ${task.status ?? task.completion?.status ?? 'unknown'}`,
      `Completed at: ${task.completion?.completedAt?.toISOString() ?? 'not completed'}`,
      `Priority: ${task.template.priority}`,
      `Due time: ${task.template.dueTimeLocal ?? 'not scheduled'}`,
      `Requires photo: ${task.template.requiresPhoto ? 'yes' : 'no'}`,
      `Assignee: ${this.formatTaskNotePerson(task.assigneeEmployee)}`,
      `Manager: ${this.formatTaskNotePerson(task.template.managerEmployee)}`,
      `Group: ${task.template.group?.name ?? 'direct task'}`,
      task.template.description ? `Description: ${task.template.description.slice(0, 500)}` : null,
    ].filter((line): line is string => Boolean(line)).join('\n');
  }

  private buildTaskTemplateEventNote(template: KommoTaskTemplateNote, reason: string) {
    const action = reason === 'task_template_created' ? 'created' : 'updated';

    return [
      `HiTeam recurring task template ${action}: ${reason}.`,
      `Task: ${template.title}`,
      `Template ID: ${template.id}`,
      `Frequency: ${template.frequency}`,
      `Week days: ${this.formatTaskTemplateWeekDays(template.weekDaysJson)}`,
      `Day of month: ${template.dayOfMonth ?? 'n/a'}`,
      `Start: ${this.toDateKey(template.startDate)}`,
      `End: ${template.endDate ? this.toDateKey(template.endDate) : 'no end date'}`,
      `Due after days: ${template.dueAfterDays}`,
      `Due time: ${template.dueTimeLocal ?? 'not scheduled'}`,
      `Priority: ${template.priority}`,
      `Requires photo: ${template.requiresPhoto ? 'yes' : 'no'}`,
      `Expand on demand: ${template.expandOnDemand ? 'yes' : 'no'}`,
      `Active: ${template.isActive ? 'yes' : 'no'}`,
      `Assignee: ${this.formatTaskNotePerson(template.assigneeEmployee)}`,
      `Manager: ${this.formatTaskNotePerson(template.managerEmployee)}`,
      `Group: ${template.group?.name ?? 'direct task'}`,
      `Department: ${template.department?.name ?? 'n/a'}`,
      `Location: ${template.location?.name ?? 'n/a'}`,
      template.description ? `Description: ${template.description.slice(0, 500)}` : null,
    ].filter((line): line is string => Boolean(line)).join('\n');
  }

  private buildDeletedTaskTemplateEventNote(template: KommoDeletedTaskTemplateNote) {
    return [
      'HiTeam recurring task template deleted: task_template_deleted.',
      `Task: ${template.title}`,
      `Template ID: ${template.id}`,
      `Assignee: ${this.formatTaskNotePerson(template.assigneeEmployee)}`,
      `Manager: ${this.formatTaskNotePerson(template.managerEmployee)}`,
      `Group: ${template.group?.name ?? 'direct task'}`,
      `Department: ${template.department?.name ?? 'n/a'}`,
      `Location: ${template.location?.name ?? 'n/a'}`,
    ].join('\n');
  }

  private formatTaskNotePerson(person: KommoTaskNotePerson | null) {
    if (!person) {
      return 'unassigned';
    }

    return `${person.lastName} ${person.firstName} (${person.employeeNumber}, ${person.user?.email ?? 'no email'})`;
  }

  private formatTaskTemplateWeekDays(weekDaysJson: string | null) {
    if (!weekDaysJson) {
      return 'n/a';
    }

    try {
      const value = JSON.parse(weekDaysJson);
      return Array.isArray(value) && value.length > 0 ? value.join(', ') : 'n/a';
    } catch {
      return weekDaysJson;
    }
  }

  private buildEventNote(
    snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>,
    note: string,
    reason: string,
  ) {
    return [
      `[HiTeam] ${note}`,
      `Reason: ${reason}`,
      `Organization: ${snapshot.tenant.name}`,
      `Organization ID: ${snapshot.tenant.businessId}`,
      `Employees: ${snapshot.metrics.activeEmployees}/${snapshot.metrics.totalEmployees} active`,
      `Payment: ${snapshot.metrics.paymentStatus}`,
      `Tariff: ${this.resolveBillingPlanLabel(snapshot)}`,
      `Last payment amount: ${this.formatLatestPaymentAmount(snapshot)}`,
      `Last payment period: ${this.formatLatestPaymentPeriod(snapshot) ?? 'n/a'}`,
      `Seats paid/used: ${snapshot.metrics.paidSeats}/${snapshot.metrics.usedSeats}`,
      `Weekly usage score: ${snapshot.metrics.weeklyUsageScore}`,
      `Dashboard: ${this.buildWebUrl('/app')}`,
    ].join('\n');
  }

  private buildLifecycleEmailNote(result: LifecycleEmailSendResult) {
    const lines = [
      `[HiTeam Email] ${this.formatLifecycleEmailStatus(result.status)}`,
      `Event: ${result.event}`,
      `Provider: ${result.provider}`,
      `From: ${result.sender}`,
      `Reply-To: ${result.replyTo}`,
      `Recipients (${result.recipientCount}): ${this.formatEmailRecipients(result)}`,
      `Subject: ${result.subject ?? 'n/a'}`,
      `Preview: ${result.preview ?? 'n/a'}`,
      `CTA: ${result.ctaLabel ?? 'n/a'} ${result.ctaUrl ?? 'n/a'}`,
      `Dashboard: ${result.dashboardUrl ?? 'n/a'}`,
      `Billing: ${result.billingUrl ?? 'n/a'}`,
      `Employees: ${result.employeesUrl ?? 'n/a'}`,
      `Recorded at: ${result.recordedAt}`,
    ];

    if (result.errorMessage) {
      lines.push(`Error: ${result.errorMessage}`);
    }

    return lines.join('\n').slice(0, 6000);
  }

  private buildEmployeeEmailDeliveryNote(action: string, result: KommoEmployeeEmailDeliveryResult) {
    const recipients = result.recipients?.length ? result.recipients.join(', ') : 'No recipients';
    const lines = [
      `[HiTeam Employee Email] ${String(result.status).toUpperCase()}`,
      `Action: ${action}`,
      `Provider: ${result.provider}`,
      `Recipients: ${recipients}`,
      `Action URL: ${result.actionUrl ?? 'n/a'}`,
      `Recorded at: ${result.recordedAt ?? new Date().toISOString()}`,
    ];

    if (result.errorMessage) {
      lines.push(`Error: ${result.errorMessage}`);
    }

    return lines.join('\n').slice(0, 6000);
  }

  private formatLifecycleEmailStatus(status: LifecycleEmailSendResult['status']) {
    return status.toUpperCase();
  }

  private formatEmailRecipients(result: LifecycleEmailSendResult) {
    if (result.recipients.length === 0) {
      return 'No recipients';
    }

    return result.recipients.join(', ').slice(0, 4000);
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const config = this.getConfig();
    if (!config.baseUrl) {
      throw new Error('KOMMO_SUBDOMAIN or KOMMO_BASE_URL is not configured.');
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('KOMMO_ACCESS_TOKEN or refresh-token flow is not configured.');
      }

      const response = await fetch(this.buildApiUrl(config.baseUrl, path, query), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (response.status === 401 && attempt === 0 && this.canRefreshToken()) {
        await this.refreshAccessToken();
        continue;
      }

      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get('retry-after'));
        await this.delay(Number.isFinite(retryAfter) ? retryAfter * 1000 : 1000 * (attempt + 1));
        continue;
      }

      if (response.status === 204) {
        return null as T;
      }

      const text = await response.text();
      const parsed = this.parseJson(text);

      if (!response.ok) {
        throw new KommoRequestError(
          `Kommo ${method} ${path} failed with HTTP ${response.status}`,
          response.status,
          text,
        );
      }

      return parsed as T;
    }

    throw new Error(`Kommo ${method} ${path} failed after retries.`);
  }

  private async getAccessToken() {
    if (this.runtimeAccessToken) {
      return this.runtimeAccessToken;
    }

    const config = this.getConfig();
    if (config.accessToken) {
      return config.accessToken;
    }

    if (this.canRefreshToken()) {
      await this.refreshAccessToken();
      return this.runtimeAccessToken;
    }

    return null;
  }

  private canRefreshToken() {
    const config = this.getConfig();
    return Boolean((this.runtimeRefreshToken || config.refreshToken) && config.clientId && config.clientSecret);
  }

  private async refreshAccessToken() {
    const config = this.getConfig();
    if (!config.baseUrl || !config.clientId || !config.clientSecret) {
      throw new Error('Kommo OAuth refresh flow is not fully configured.');
    }

    const refreshToken = this.runtimeRefreshToken ?? config.refreshToken;
    if (!refreshToken) {
      throw new Error('KOMMO_REFRESH_TOKEN is not configured.');
    }

    const response = await fetch(this.buildApiUrl(config.baseUrl, '/oauth2/access_token'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        redirect_uri: config.redirectUri ?? undefined,
      }),
    });
    const text = await response.text();
    const parsed = this.parseJson(text) as {
      access_token?: string;
      refresh_token?: string;
    };

    if (!response.ok || !parsed.access_token) {
      throw new KommoRequestError('Kommo OAuth refresh failed.', response.status, text);
    }

    this.runtimeAccessToken = parsed.access_token;
    this.runtimeRefreshToken = parsed.refresh_token ?? refreshToken;
  }

  private getConfig(): KommoConfig {
    const baseUrl = this.resolveBaseUrl();
    const accessToken =
      this.configService.get<string>('KOMMO_LONG_LIVED_TOKEN')?.trim() ||
      this.configService.get<string>('KOMMO_ACCESS_TOKEN')?.trim() ||
      null;
    const refreshToken = this.configService.get<string>('KOMMO_REFRESH_TOKEN')?.trim() || null;
    const clientId = this.configService.get<string>('KOMMO_CLIENT_ID')?.trim() || null;
    const clientSecret = this.configService.get<string>('KOMMO_CLIENT_SECRET')?.trim() || null;
    const explicitEnabled = this.configService.get<string>('KOMMO_ENABLED')?.trim().toLowerCase();
    const hasCredentials = Boolean(accessToken || (refreshToken && clientId && clientSecret));
    const enabled = explicitEnabled === 'true' || (explicitEnabled !== 'false' && Boolean(baseUrl && hasCredentials));

    return {
      enabled,
      baseUrl,
      accessToken,
      refreshToken,
      clientId,
      clientSecret,
      redirectUri: this.configService.get<string>('KOMMO_REDIRECT_URI')?.trim() || null,
      responsibleUserId: this.readNumberConfig('KOMMO_RESPONSIBLE_USER_ID'),
      pipelineIds: {
        trial: this.readNumberConfig('KOMMO_TRIAL_PIPELINE_ID') ?? this.readNumberConfig('KOMMO_PIPELINE_ID'),
        customers: this.readNumberConfig('KOMMO_CUSTOMERS_PIPELINE_ID'),
      },
      pipelineNames: {
        trial:
          this.configService.get<string>('KOMMO_TRIAL_PIPELINE_NAME')?.trim() ||
          this.configService.get<string>('KOMMO_PIPELINE_NAME')?.trim() ||
          KOMMO_PIPELINE_NAME,
        customers:
          this.configService.get<string>('KOMMO_CUSTOMERS_PIPELINE_NAME')?.trim() ||
          this.getPipelineSpec('customers').name,
      },
      trialDays: this.readNumberConfig('KOMMO_TRIAL_DAYS') ?? 7,
      eventNotesEnabled: this.configService.get<string>('KOMMO_EVENT_NOTES_ENABLED')?.trim().toLowerCase() !== 'false',
    };
  }

  private resolveBaseUrl() {
    const explicitBaseUrl = this.configService.get<string>('KOMMO_BASE_URL')?.trim().replace(/\/$/, '');
    if (explicitBaseUrl) {
      return explicitBaseUrl;
    }

    const rawSubdomain = this.configService.get<string>('KOMMO_SUBDOMAIN')?.trim();
    if (!rawSubdomain) {
      return null;
    }

    if (/^https?:\/\//i.test(rawSubdomain)) {
      return rawSubdomain.replace(/\/$/, '');
    }

    const subdomain = rawSubdomain.replace(/\.kommo\.com$/i, '');
    return `https://${subdomain}.kommo.com`;
  }

  private buildApiUrl(baseUrl: string, path: string, query?: Record<string, string | number | boolean | undefined>) {
    const url = new URL(path, `${baseUrl}/`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
    return url;
  }

  private buildWebUrl(path: string) {
    const baseUrl = this.resolveKommoWebBaseUrl();

    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private resolveKommoWebBaseUrl() {
    const explicitKommoBaseUrl = this.normalizeWebBaseUrl(
      this.configService.get<string>('KOMMO_WEB_ADMIN_BASE_URL'),
    );
    if (explicitKommoBaseUrl) {
      return explicitKommoBaseUrl;
    }

    const configuredBaseUrl = this.normalizeWebBaseUrl(
      this.configService.get<string>('WEB_ADMIN_BASE_URL') ??
        this.configService.get<string>('FRONTEND_URL') ??
        this.configService.get<string>('APP_BASE_URL'),
    );

    if (!configuredBaseUrl || this.isTemporaryPublicHost(configuredBaseUrl)) {
      return DEFAULT_KOMMO_WEB_ADMIN_BASE_URL;
    }

    return configuredBaseUrl;
  }

  private normalizeWebBaseUrl(value: string | undefined | null) {
    const trimmed = value?.trim().replace(/\/+$/, '');
    return trimmed || null;
  }

  private isTemporaryPublicHost(value: string) {
    try {
      const hostname = new URL(value).hostname.toLowerCase();
      return hostname === 'nip.io' || hostname.endsWith('.nip.io');
    } catch {
      return /\.nip\.io(?::\d+)?(?:\/|$)/i.test(value);
    }
  }

  private resolvePricePerEmployee(snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>) {
    const lookupKey = snapshot.tenant.billingSubscription?.stripePriceLookupKey ?? '';
    if (lookupKey.includes('middle_east')) return 11;
    if (lookupKey.includes('us_uk')) return 5;
    if (lookupKey.includes('spain_france')) return 3;
    if (lookupKey.includes('kazakhstan')) return 2;
    if (lookupKey.includes('uzbekistan') || lookupKey.includes('kyrgyzstan')) return 1;
    if (lookupKey.includes('armenia')) return 2;
    return null;
  }

  private resolveBillingPlanLabel(snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>) {
    const payment = snapshot.latestBillingPayment;
    const lookupKey = snapshot.tenant.billingSubscription?.stripePriceLookupKey ?? '';
    const region = lookupKey
      .replace(/^hiteam_seat_/, '')
      .replace(/_monthly$/, '')
      .replace(/_/g, ' ')
      .trim();

    if (!payment?.planMonths) {
      return lookupKey || 'trial';
    }

    const term =
      payment.planMonths === 12
        ? 'Annual'
        : payment.planMonths === 6
          ? 'Semi Annual'
          : 'Monthly';
    const access = payment.accessMonths
      ? `, access ${payment.accessMonths} months`
      : '';

    return `${term}${region ? ` (${region})` : ''} - paid ${payment.planMonths} months${access}`;
  }

  private resolveBillingCycle(snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>) {
    const planMonths = snapshot.latestBillingPayment?.planMonths;
    if (planMonths === 12) {
      return 'ANNUAL';
    }

    if (planMonths && planMonths !== 1) {
      return 'CUSTOM';
    }

    return 'MONTHLY';
  }

  private formatLatestPaymentPeriod(snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>) {
    const payment = snapshot.latestBillingPayment;
    if (!payment) {
      return null;
    }

    const start = payment.periodStart ? this.toDateKey(payment.periodStart) : null;
    const end = payment.periodEnd ? this.toDateKey(payment.periodEnd) : null;
    const term = [
      payment.planMonths ? `paid ${payment.planMonths} months` : null,
      payment.accessMonths ? `access ${payment.accessMonths} months` : null,
    ].filter(Boolean).join(', ');

    return [
      term || null,
      start && end ? `${start} - ${end}` : end ? `until ${end}` : null,
    ].filter(Boolean).join(' | ') || null;
  }

  private formatLatestPaymentAmount(snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>) {
    const payment = snapshot.latestBillingPayment;
    if (!payment || payment.amountMinor === null || payment.amountMinor === undefined) {
      return 'n/a';
    }

    const amount = (payment.amountMinor / 100).toFixed(2).replace(/\.00$/, '');
    return `${amount} ${payment.currency ?? snapshot.tenant.billingSubscription?.stripeCurrency ?? ''}`.trim();
  }

  private resolveTotalMonthlyPayment(snapshot: Awaited<ReturnType<KommoService['loadTenantSnapshot']>>) {
    const unitPrice = this.resolvePricePerEmployee(snapshot);
    if (unitPrice === null) {
      return null;
    }
    return Math.max(snapshot.metrics.paidSeats, snapshot.metrics.usedSeats, 1) * unitPrice;
  }

  private calculateWeeklyUsageScore(activeEmployees: number, checkInsLast7Days: number) {
    if (activeEmployees <= 0) {
      return 0;
    }

    const expectedCheckIns = activeEmployees * 5;
    return Math.min(100, Math.round((checkInsLast7Days / Math.max(expectedCheckIns, 1)) * 100));
  }

  private isBlockingSubscriptionStatus(status?: string | null) {
    return ['CANCELED', 'CANCELLED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'PAST_DUE', 'PAYMENT_FAILED', 'INVOICE_FINALIZATION_FAILED', 'UNPAID'].includes(
      this.normalizeStatusToken(status),
    );
  }

  private normalizeSubscriptionStatus(status?: string | null) {
    const normalized = this.normalizeStatusToken(status) || 'TRIAL';
    switch (normalized) {
      case 'TRIALING':
        return 'TRIAL';
      case 'ACTIVE':
      case 'PAYMENT_REQUIRED':
      case 'PAST_DUE':
      case 'CANCELED':
      case 'CANCELLED':
      case 'INCOMPLETE':
      case 'INCOMPLETE_EXPIRED':
      case 'UNPAID':
      case 'UNKNOWN':
      case 'TRIAL':
        return normalized;
      default:
        return 'UNKNOWN';
    }
  }

  private normalizeStatusToken(status?: string | null) {
    return (status ?? '').trim().toUpperCase().replace(/[-\s]+/g, '_');
  }

  private resolveSelectFieldValue(field: KommoFieldInfo, rawValue: string) {
    const allowedValues = field.enums ?? [];
    const normalized = this.normalizeStatusToken(rawValue);
    const candidates = [rawValue, rawValue.toUpperCase(), normalized];

    if (field.key === 'subscriptionStatus') {
      candidates.push(this.normalizeSubscriptionStatus(rawValue));
    }

    for (const candidate of candidates) {
      const match = allowedValues.find((value) => value.toLowerCase() === candidate.toLowerCase());
      if (match) {
        return match;
      }
    }

    return allowedValues.length > 0 ? null : rawValue;
  }

  private readFieldEnumValues(field?: KommoApiObject) {
    const enums = Array.isArray(field?.enums) ? field.enums : [];
    const values: string[] = [];

    for (const item of enums) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const value = this.readString((item as KommoApiObject).value);
      if (value) {
        values.push(value);
      }
    }

    return values;
  }

  private extractEmbedded(response: unknown, key: string): KommoApiObject[] {
    const embedded = (response as { _embedded?: Record<string, unknown> } | null)?._embedded;
    const value = embedded?.[key];
    return Array.isArray(value) ? (value as KommoApiObject[]) : [];
  }

  private extractWebhookLeadEvents(body: unknown): KommoWebhookLeadEvent[] {
    const root = this.readRecord(body);
    const containers = [this.readRecord(root?.leads), this.readRecord(root?.lead)].filter(
      (value): value is Record<string, unknown> => Boolean(value),
    );
    const events: KommoWebhookLeadEvent[] = [];

    for (const container of containers) {
      for (const action of ['status', 'update', 'add', 'responsible', 'restore', 'delete']) {
        const entries = this.toWebhookEntries(container[action]);

        for (const raw of entries) {
          const record = this.readRecord(raw);
          const id = this.readWebhookNumber(record?.id ?? record?.entity_id ?? record?.element_id);
          if (!id) {
            continue;
          }

          events.push({
            action,
            id,
            statusId: this.readWebhookNumber(record?.status_id),
            oldStatusId: this.readWebhookNumber(record?.old_status_id),
            pipelineId: this.readWebhookNumber(record?.pipeline_id),
            raw,
          });
        }
      }
    }

    return events;
  }

  private toWebhookEntries(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.toWebhookEntries(item));
    }

    const record = this.readRecord(value);
    if (!record) {
      return [];
    }

    if ('id' in record || 'entity_id' in record || 'element_id' in record) {
      return [record];
    }

    return Object.values(record).flatMap((item) => this.toWebhookEntries(item));
  }

  private readRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  }

  private readWebhookNumber(value: unknown) {
    const numberValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
  }

  private isKommoStageName(value: string): value is KommoStageName {
    return KOMMO_STAGE_SPECS.some((stage) => stage.name === value);
  }

  private isKommoPipelineKey(value: string | null): value is KommoPipelineKey {
    return Boolean(value && KOMMO_PIPELINE_SPECS.some((pipeline) => pipeline.key === value));
  }

  private parseJson(text: string) {
    if (!text.trim()) {
      return null;
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private readString(value: unknown) {
    return typeof value === 'string' ? value : null;
  }

  private readNumberConfig(key: string) {
    const value = Number(this.configService.get<string>(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private hasAnyRole(roleCodes: string[], expected: string[]) {
    return roleCodes.some((roleCode) => expected.includes(roleCode));
  }

  private maxDate(values: Array<Date | null>) {
    const dates = values.filter((value): value is Date => Boolean(value));
    if (dates.length === 0) {
      return null;
    }

    return dates.reduce((latest, value) => (value > latest ? value : latest), dates[0]);
  }

  private employeeFullName(employee: { firstName: string; lastName: string; middleName?: string | null }) {
    return [employee.lastName, employee.firstName, employee.middleName].filter(Boolean).join(' ');
  }

  private inferCountryFromAddress(address?: string | null) {
    if (!address) {
      return null;
    }

    const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
    return parts[parts.length - 1] ?? null;
  }

  private inferCityFromAddress(address?: string | null) {
    if (!address) {
      return null;
    }

    const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0] ?? null;
  }

  private toDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private delay(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof KommoRequestError) {
      return `${error.message}: ${error.body.slice(0, 500)}`;
    }

    return error instanceof Error ? error.message : String(error);
  }
}
