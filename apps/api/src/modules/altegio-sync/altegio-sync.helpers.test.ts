import assert from 'node:assert/strict';
import {
  formatDateOnly,
  groupHiteamShiftsForAltegioPush,
  matchEmployeeToAltegioStaff,
  mergeLocalTimeOnDate,
  normalizeAltegioEmail,
  normalizeAltegioPhone,
  phonesMatch,
  splitAltegioStaffName,
  syntheticAltegioEmail,
} from './altegio-sync.helpers';
import {
  AltegioB2bError,
  isAltegioInvalidCredentialsError,
  parseLocationProfilePayload,
  parseSchedulePayload,
  parseTeamMembersPayload,
} from './altegio-b2b.client';
import { resolveMarketplaceTrialGrant } from '../billing/altegio-marketplace.helpers';

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

testPhoneMatching();
testNameSplitAndSyntheticEmail();
testEmployeeMatching();
testScheduleHelpers();
testPayloadParsers();
testInvalidAltegioCredentialsAreRecognized();
testMarketplaceTrialCannotBeExtendedOrTransferred();

console.log('altegio staff/schedule sync helpers: ok');
