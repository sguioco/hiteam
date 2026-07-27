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
import { parseSchedulePayload, parseTeamMembersPayload } from './altegio-b2b.client';

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

testPhoneMatching();
testNameSplitAndSyntheticEmail();
testEmployeeMatching();
testScheduleHelpers();
testPayloadParsers();

console.log('altegio staff/schedule sync helpers: ok');
