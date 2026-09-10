import type { Attributes } from '@opentelemetry/api';

type MarketplaceOrganizationResult = {
  synchronized: boolean;
  reason?: string;
};

type MarketplaceEmployeesResult = {
  remoteStaff: number;
  linked: number;
  createdLocal: number;
  updatedLocal: number;
  createdRemote: number;
};

type MarketplaceScheduleResult = {
  remoteDays: number;
  upserted: number;
  cancelled: number;
  pushed: number;
};

export type PilotLocationSyncResult = {
  remoteStaff: number;
  importedEmployees: number;
  linkedEmployees: number;
  exportedEmployees: number;
  remoteScheduleDays: number;
  importedShifts: number;
  cancelledShifts: number;
  exportedShiftDays: number;
};

type WebhookResult = {
  ignored?: string;
  kind?: string;
};

const completed = { 'hiteam.altegio.sync.result': 'completed' } as const;

export function marketplaceOrganizationTraceAttributes(
  result: MarketplaceOrganizationResult,
): Attributes {
  return {
    ...completed,
    'hiteam.altegio.organization.updated': result.synchronized,
    'hiteam.altegio.organization.result': result.synchronized
      ? 'updated'
      : normalizeOrganizationReason(result.reason),
  };
}

export function marketplaceEmployeesTraceAttributes(
  result: MarketplaceEmployeesResult,
): Attributes {
  return {
    ...completed,
    'hiteam.altegio.staff.remote_count': result.remoteStaff,
    'hiteam.altegio.staff.linked_count': result.linked,
    'hiteam.altegio.staff.imported_count': result.createdLocal,
    'hiteam.altegio.staff.updated_count': result.updatedLocal,
    'hiteam.altegio.staff.exported_count': result.createdRemote,
  };
}

export function marketplaceScheduleTraceAttributes(
  result: MarketplaceScheduleResult,
): Attributes {
  return {
    ...completed,
    'hiteam.altegio.schedule.remote_day_count': result.remoteDays,
    'hiteam.altegio.schedule.upserted_shift_count': result.upserted,
    'hiteam.altegio.schedule.cancelled_shift_count': result.cancelled,
    'hiteam.altegio.schedule.exported_day_count': result.pushed,
  };
}

export function pilotLocationTraceAttributes(result: PilotLocationSyncResult): Attributes {
  return {
    ...completed,
    'hiteam.altegio.staff.remote_count': result.remoteStaff,
    'hiteam.altegio.staff.imported_count': result.importedEmployees,
    'hiteam.altegio.staff.linked_count': result.linkedEmployees,
    'hiteam.altegio.staff.exported_count': result.exportedEmployees,
    'hiteam.altegio.schedule.remote_day_count': result.remoteScheduleDays,
    'hiteam.altegio.schedule.upserted_shift_count': result.importedShifts,
    'hiteam.altegio.schedule.cancelled_shift_count': result.cancelledShifts,
    'hiteam.altegio.schedule.exported_day_count': result.exportedShiftDays,
  };
}

export function pilotSyncTraceAttributes(result: { locations: PilotLocationSyncResult[] }): Attributes {
  const totals = result.locations.reduce(
    (sum, location) => ({
      remoteStaff: sum.remoteStaff + location.remoteStaff,
      importedEmployees: sum.importedEmployees + location.importedEmployees,
      linkedEmployees: sum.linkedEmployees + location.linkedEmployees,
      exportedEmployees: sum.exportedEmployees + location.exportedEmployees,
      remoteScheduleDays: sum.remoteScheduleDays + location.remoteScheduleDays,
      importedShifts: sum.importedShifts + location.importedShifts,
      cancelledShifts: sum.cancelledShifts + location.cancelledShifts,
      exportedShiftDays: sum.exportedShiftDays + location.exportedShiftDays,
    }),
    {
      remoteStaff: 0,
      importedEmployees: 0,
      linkedEmployees: 0,
      exportedEmployees: 0,
      remoteScheduleDays: 0,
      importedShifts: 0,
      cancelledShifts: 0,
      exportedShiftDays: 0,
    },
  );

  return {
    ...pilotLocationTraceAttributes(totals),
    'hiteam.altegio.location.processed_count': result.locations.length,
  };
}

export function webhookTraceAttributes(result: WebhookResult): Attributes {
  const ignored = normalizeWebhookIgnoredReason(result.ignored);
  const attributes: Attributes = {
    ...completed,
    'hiteam.altegio.webhook.result': result.ignored
      ? `ignored_${ignored ?? 'unknown'}`
      : 'synchronized',
  };
  if (result.kind) {
    attributes['hiteam.altegio.webhook.resource'] = normalizeWebhookResource(result.kind);
  }
  return attributes;
}

export function normalizeWebhookResource(resource?: string): string {
  return resource && ['staff', 'master', 'schedule'].includes(resource) ? resource : 'unknown';
}

function normalizeOrganizationReason(reason?: string): string {
  return reason === 'organization_already_configured' ? reason : 'not_updated';
}

function normalizeWebhookIgnoredReason(reason?: string): string | null {
  return reason && ['unknown_event', 'missing_location', 'unknown_location'].includes(reason)
    ? reason
    : null;
}
