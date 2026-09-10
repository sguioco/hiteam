import assert from 'node:assert/strict';
import {
  marketplaceEmployeesTraceAttributes,
  marketplaceOrganizationTraceAttributes,
  marketplaceScheduleTraceAttributes,
  pilotLocationTraceAttributes,
  pilotSyncTraceAttributes,
  webhookTraceAttributes,
} from './altegio-tracing';

function testMarketplaceResultAttributes() {
  assert.deepEqual(
    marketplaceEmployeesTraceAttributes({
      remoteStaff: 12,
      linked: 10,
      createdLocal: 2,
      updatedLocal: 8,
      createdRemote: 1,
    }),
    {
      'hiteam.altegio.sync.result': 'completed',
      'hiteam.altegio.staff.remote_count': 12,
      'hiteam.altegio.staff.linked_count': 10,
      'hiteam.altegio.staff.imported_count': 2,
      'hiteam.altegio.staff.updated_count': 8,
      'hiteam.altegio.staff.exported_count': 1,
    },
  );

  assert.equal(
    marketplaceOrganizationTraceAttributes({ synchronized: false, reason: 'unexpected' })[
      'hiteam.altegio.organization.result'
    ],
    'not_updated',
  );
  assert.equal(
    marketplaceScheduleTraceAttributes({ remoteDays: 5, upserted: 4, cancelled: 1, pushed: 2 })[
      'hiteam.altegio.schedule.cancelled_shift_count'
    ],
    1,
  );
}

function testPilotTotals() {
  const first = {
    remoteStaff: 5,
    importedEmployees: 2,
    linkedEmployees: 4,
    exportedEmployees: 1,
    remoteScheduleDays: 7,
    importedShifts: 6,
    cancelledShifts: 2,
    exportedShiftDays: 3,
  };
  const second = {
    remoteStaff: 3,
    importedEmployees: 1,
    linkedEmployees: 2,
    exportedEmployees: 0,
    remoteScheduleDays: 4,
    importedShifts: 3,
    cancelledShifts: 1,
    exportedShiftDays: 2,
  };

  assert.equal(pilotLocationTraceAttributes(first)['hiteam.altegio.staff.linked_count'], 4);
  assert.deepEqual(pilotSyncTraceAttributes({ locations: [first, second] }), {
    'hiteam.altegio.sync.result': 'completed',
    'hiteam.altegio.staff.remote_count': 8,
    'hiteam.altegio.staff.imported_count': 3,
    'hiteam.altegio.staff.linked_count': 6,
    'hiteam.altegio.staff.exported_count': 1,
    'hiteam.altegio.schedule.remote_day_count': 11,
    'hiteam.altegio.schedule.upserted_shift_count': 9,
    'hiteam.altegio.schedule.cancelled_shift_count': 3,
    'hiteam.altegio.schedule.exported_day_count': 5,
    'hiteam.altegio.location.processed_count': 2,
  });
}

function testWebhookOutcomesAreBounded() {
  assert.equal(
    webhookTraceAttributes({ ignored: 'unknown_location' })['hiteam.altegio.webhook.result'],
    'ignored_unknown_location',
  );
  assert.equal(
    webhookTraceAttributes({ ignored: 'attacker-controlled-value' })[
      'hiteam.altegio.webhook.result'
    ],
    'ignored_unknown',
  );
  assert.equal(
    webhookTraceAttributes({ kind: 'unexpected-resource' })[
      'hiteam.altegio.webhook.resource'
    ],
    'unknown',
  );
}

function testNoSensitiveOrHighCardinalityAttributeKeys() {
  const attributes = pilotSyncTraceAttributes({ locations: [] });
  const forbidden = /(tenant|employee_id|location_id|email|phone|token|payload)/i;
  assert.equal(Object.keys(attributes).some((key) => forbidden.test(key)), false);
}

testMarketplaceResultAttributes();
testPilotTotals();
testNoSensitiveOrHighCardinalityAttributeKeys();
testWebhookOutcomesAreBounded();
console.log('Altegio tracing tests passed');
