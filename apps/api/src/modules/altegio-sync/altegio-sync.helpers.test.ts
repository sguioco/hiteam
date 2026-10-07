import assert from 'node:assert/strict';
import {
  formatDateOnly,
  groupHiteamShiftsForAltegioPush,
  isImportedAltegioEmployee,
  matchEmployeeToAltegioStaff,
  mergeLocalTimeOnDate,
  normalizeAltegioEmail,
  normalizeAltegioPhone,
  phonesMatch,
  pilotAltegioEmployeeNumber,
  pilotAltegioSyntheticEmail,
  splitAltegioStaffName,
  syntheticAltegioEmail,
} from './altegio-sync.helpers';
import {
  AltegioB2bError,
  AltegioB2bClient,
  altegioRequestErrorMessage,
  isAltegioInvalidCredentialsError,
  mergeAltegioHooksSettings,
  parseLocationProfilePayload,
  parseSchedulePayload,
  parseTeamMembersPayload,
  parseSingleTeamMemberPayload,
  scheduleAccessBlockReason,
} from './altegio-b2b.client';
import { resolveMarketplaceTrialGrant } from '../billing/altegio-marketplace.helpers';

const disabledScheduleMember = parseSingleTeamMemberPayload({ data: { id: 123, has_access_timetable: false, bookable: true } }, '123');
assert.equal(disabledScheduleMember?.hasAccessTimetable, false);
assert.equal(scheduleAccessBlockReason(disabledScheduleMember), 'timetable_disabled');
assert.equal(scheduleAccessBlockReason(parseSingleTeamMemberPayload({ data: { id: 123 } }, '123')), 'timetable_unknown');
assert.equal(scheduleAccessBlockReason(parseSingleTeamMemberPayload({ data: { id: 123, has_access_timetable: true, bookable: false } }, '123')), null);

function testPhoneMatching() {
  assert.equal(phonesMatch('+971501234567', '971501234567'), true);
  assert.equal(phonesMatch('0501234567', '971501234567'), true);
  assert.equal(phonesMatch('123', '999'), false);
  assert.equal(normalizeAltegioPhone('+971 50 123-4567'), '+971501234567');
  assert.equal(normalizeAltegioEmail('  Foo@Bar.COM '), 'foo@bar.com');
}

function testNameSplitAndSyntheticEmail() {
  assert.deepEqual(splitAltegioStaffName('Anna Petrova'), {
    firstName: 'Anna',
    lastName: 'Petrova',
  });
  assert.deepEqual(splitAltegioStaffName('Solo'), {
    firstName: 'Solo',
    lastName: 'Staff',
  });
  assert.equal(syntheticAltegioEmail('42'), 'altegio+42@users.hiteam.local');
}

function testEmployeeMatching() {
  const employees = [
    { id: 'e1', altegioTeamMemberId: '100', phone: '+971501111111', email: 'a@x.com' },
    { id: 'e2', altegioTeamMemberId: null, phone: '+971502222222', email: 'b@x.com' },
    { id: 'e3', altegioTeamMemberId: null, phone: null, email: 'c@x.com' },
  ];

  assert.equal(
    matchEmployeeToAltegioStaff(employees, { id: '100', phone: null, email: null })?.id,
    'e1',
  );
  assert.equal(
    matchEmployeeToAltegioStaff(employees, {
      id: '999',
      phone: '971502222222',
      email: null,
    })?.id,
    'e2',
  );
  assert.equal(
    matchEmployeeToAltegioStaff(employees, {
      id: '998',
      phone: null,
      email: 'c@x.com',
    })?.id,
    'e3',
  );
  assert.equal(
    matchEmployeeToAltegioStaff(employees, {
      id: '997',
      phone: null,
      email: 'missing@x.com',
    }),
    null,
  );
  assert.equal(
    matchEmployeeToAltegioStaff(
      [{ id: 'e4', altegioTeamMemberId: null, employeeNumber: 'ALT-759658-100', phone: null, email: null }],
      { id: '100', phone: null, email: null },
      '759658',
    )?.id,
    'e4',
  );
  assert.equal(pilotAltegioEmployeeNumber('759658', '100'), 'ALT-759658-100');
  assert.equal(
    pilotAltegioSyntheticEmail('759658', '100'),
    'altegio+759658-100@users.hiteam.local',
  );
}

function testScheduleHelpers() {
  assert.equal(formatDateOnly(new Date(Date.UTC(2026, 6, 27))), '2026-07-27');
  const starts = mergeLocalTimeOnDate('2026-07-27', '10:00', 'UTC');
  assert.ok(starts);
  assert.equal(starts!.toISOString(), '2026-07-27T10:00:00.000Z');

  const grouped = groupHiteamShiftsForAltegioPush([
    {
      altegioTeamMemberId: '11',
      shiftDate: new Date(Date.UTC(2026, 6, 27)),
      startsAt: new Date(Date.UTC(2026, 6, 27, 9, 0)),
      endsAt: new Date(Date.UTC(2026, 6, 27, 18, 0)),
      timeZone: 'UTC',
    },
    {
      altegioTeamMemberId: '11',
      shiftDate: new Date(Date.UTC(2026, 6, 27)),
      startsAt: new Date(Date.UTC(2026, 6, 27, 19, 0)),
      endsAt: new Date(Date.UTC(2026, 6, 27, 21, 0)),
      timeZone: 'UTC',
    },
  ]);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].teamMemberId, '11');
  assert.equal(grouped[0].date, '2026-07-27');
  assert.equal(grouped[0].slots.length, 2);
}

function testPayloadParsers() {
  const location = parseLocationProfilePayload(
    {
      data: {
        id: 720441,
        title: 'Beauty Lab',
        public_title: 'Beauty Lab Downtown',
        address: 'Dubai, UAE',
        country: 'United Arab Emirates',
        city: 'Dubai',
        timezone_name: 'Asia/Dubai',
        coordinate_lat: 25.2,
        coordinate_lon: 55.27,
        logo: 'https://example.com/logo.png',
      },
    },
    '720441',
  );
  assert.equal(location.name, 'Beauty Lab');
  assert.equal(location.timezone, 'Asia/Dubai');
  assert.equal(location.latitude, 25.2);

  const members = parseTeamMembersPayload({
    data: [
      {
        id: '55',
        type: 'team_members',
        attributes: { name: 'Ivan Ivanov', specialization: 'Barber' },
        relationships: {
          employee: { data: { id: 'e1', type: 'employee' } },
          position: { data: { id: 'p1', type: 'position' } },
        },
      },
    ],
    included: [
      {
        id: 'e1',
        type: 'employee',
        attributes: { phone: '+971501234567', email: 'ivan@example.com' },
      },
      {
        id: 'p1',
        type: 'position',
        attributes: { title: 'Stylist' },
      },
    ],
  });

  assert.equal(members.length, 1);
  assert.equal(members[0].id, '55');
  assert.equal(members[0].phone, '+971501234567');
  assert.equal(members[0].email, 'ivan@example.com');
  assert.equal(members[0].positionTitle, 'Stylist');

  const days = parseSchedulePayload({
    data: [
      {
        team_member_id: 55,
        date: '2026-07-28',
        slots: [{ from: '10:00', to: '19:00' }],
      },
    ],
  });
  assert.equal(days.length, 1);
  assert.equal(days[0].teamMemberId, '55');
  assert.deepEqual(days[0].slots, [{ from: '10:00', to: '19:00' }]);
}

function testInvalidAltegioCredentialsAreRecognized() {
  assert.equal(
    isAltegioInvalidCredentialsError(
      new AltegioB2bError('Altegio B2B request failed with 404', 404, {
        meta: { message: 'Wrong login or password' },
      }),
    ),
    true,
  );
  assert.equal(
    isAltegioInvalidCredentialsError(new AltegioB2bError('missing location', 404, {})),
    false,
  );
}

function testMarketplaceTrialCannotBeExtendedOrTransferred() {
  const now = new Date('2026-07-27T12:00:00.000Z');
  const claim = {
    originalTenantId: 'tenant-original',
    trialStartedAt: new Date('2026-07-20T00:00:00.000Z'),
    trialEndsAt: new Date('2026-07-30T00:00:00.000Z'),
  };

  const reconnect = resolveMarketplaceTrialGrant({
    tenantId: 'tenant-original',
    snapshotPeriodStart: new Date('2026-07-27T00:00:00.000Z'),
    snapshotPeriodEnd: new Date('2026-08-06T00:00:00.000Z'),
    claim,
    now,
  });
  assert.equal(reconnect.allowed, true);
  assert.equal(reconnect.periodEnd?.toISOString(), '2026-07-30T00:00:00.000Z');

  const recreatedTenant = resolveMarketplaceTrialGrant({
    tenantId: 'tenant-recreated',
    snapshotPeriodStart: new Date('2026-07-27T00:00:00.000Z'),
    snapshotPeriodEnd: new Date('2026-08-06T00:00:00.000Z'),
    claim,
    now,
  });
  assert.equal(recreatedTenant.allowed, false);
  assert.equal(recreatedTenant.reason, 'claimed_by_another_tenant');

  const expiredReconnect = resolveMarketplaceTrialGrant({
    tenantId: 'tenant-original',
    snapshotPeriodStart: new Date('2026-08-01T00:00:00.000Z'),
    snapshotPeriodEnd: new Date('2026-08-10T00:00:00.000Z'),
    claim,
    now: new Date('2026-08-01T00:00:00.000Z'),
  });
  assert.equal(expiredReconnect.allowed, false);
  assert.equal(expiredReconnect.reason, 'trial_expired');
}

function testHooksSettingsMerge() {
  const merged = mergeAltegioHooksSettings({
    current: {
      urls: ['https://other.example/webhook'],
      active: 1,
      record: 1,
      client: 1,
      master: 0,
      service: 0,
    },
    webhookUrl: 'https://api.hiteam.net/api/v1/altegio/webhooks',
    active: true,
    master: true,
  });
  assert.deepEqual(merged.urls, [
    'https://other.example/webhook',
    'https://api.hiteam.net/api/v1/altegio/webhooks',
  ]);
  assert.equal(merged.active, 1);
  assert.equal(merged.master, 1);
  assert.equal(merged.record, 1);
  assert.equal(merged.client, 1);
  assert.equal(merged.service, 0);

  const idempotent = mergeAltegioHooksSettings({
    current: {
      urls: ['https://api.hiteam.net/api/v1/altegio/webhooks'],
      active: 1,
      master: 1,
    },
    webhookUrl: 'https://api.hiteam.net/api/v1/altegio/webhooks',
    active: true,
    master: true,
  });
  assert.deepEqual(idempotent.urls, ['https://api.hiteam.net/api/v1/altegio/webhooks']);
}

testPhoneMatching();
testNameSplitAndSyntheticEmail();
testEmployeeMatching();
testScheduleHelpers();
testPayloadParsers();
testInvalidAltegioCredentialsAreRecognized();
testMarketplaceTrialCannotBeExtendedOrTransferred();
testHooksSettingsMerge();
assert.match(altegioRequestErrorMessage(403, 'PUT', 'https://api.alteg.io/api/v1/company/759658/staff/schedule', {}), /timetable_schedule_edit_access/);
assert.match(altegioRequestErrorMessage(400, 'POST', 'https://api.alteg.io/api/v1/company/759658/staff/quick', { meta: { message: 'A team member with service access has already been added to the schedule' } }), /contacts already belong/);
assert.equal(altegioRequestErrorMessage(500, 'GET', 'https://api.alteg.io/api/v1/companies', {}), 'Altegio B2B request failed with 500');

assert.equal(isImportedAltegioEmployee('ALT-759658-42', 'real@example.com'), true);
assert.equal(isImportedAltegioEmployee('E-42', 'altegio+42@users.hiteam.local'), true);
assert.equal(isImportedAltegioEmployee('E-42', 'real@example.com'), false);
async function testStaffExportRequiresRealContacts() {
  const client = new AltegioB2bClient({ get: () => '' } as never);
  for (const contact of [
    { phone: null, email: 'real@example.com' },
    { phone: '+971501234567', email: null },
    { phone: '123', email: 'real@example.com' },
    { phone: '+971501234567', email: 'altegio+42@users.hiteam.local' },
  ]) {
    await assert.rejects(client.createTeamMember({ locationId: '759658', name: 'Test', ...contact }), /requires a real email/);
  }
}
async function testListHydratesScheduleAccess() {
  const client = new AltegioB2bClient({ get: () => '' } as never);
  const calls: string[] = [];
  (client as any).request = async (_method: string, url: string) => {
    calls.push(url);
    if (url.includes('/api/v2/')) return { data: [{ id: '42', attributes: { name: 'Test' } }] };
    return { data: { id: 42, name: 'Test', has_access_timetable: false, bookable: false, fired: 0 } };
  };
  const members = await client.listTeamMembers('759658');
  assert.equal(members[0].hasAccessTimetable, false);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /staff\/759658\/42$/);
  (client as any).request = async () => { throw new Error('access denied'); };
  await assert.rejects(client.listTeamMembers('759658'), /access denied/);
}
void Promise.all([testStaffExportRequiresRealContacts(), testListHydratesScheduleAccess()]).then(() => console.log('altegio staff/schedule sync helpers: ok'));
