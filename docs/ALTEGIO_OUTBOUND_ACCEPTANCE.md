# Altegio outbound acceptance — 2026-10-06

## Production findings

- Altegio UAE: location `759658`, HiTeam system user `12918309`.
- Staff/schedule reads succeed. Schedule writes return 403, including an empty
  batch: this is a permission failure, not payload validation or a subscription issue.
- The system user's role is `system`, with `is_editable=false`. Its permissions
  are managed by the marketplace application; do not replace its token with a
  personal owner token or attempt to promote it through location user APIs.
- Required application permissions: `timetable_schedule_edit_access`,
  `settings_schedule_edit_access`, `settings_staff_edit_access`,
  `settings_staff_dismiss_access` (the last two cover profile edits/termination).
  Staff create/read permissions are already present for this location.
- Update those scopes in the Altegio developer cabinet for HiTeam, then
  reconnect and verify the system user's effective permissions. This external
  configuration is not deployed by GitHub Actions.
- The live batch schedule API expects `staff_id` for both set/delete entries,
  despite the translated reference naming `team_member_id`. Verified validation
  rejects `team_member_id` with 422. Keep the current serializer.
- The provided test phone is already associated with a user in the location;
  using a Gmail alias does not avoid the upstream staff creation conflict (400).
  Use genuinely distinct controlled contacts for a new employee test. Never
  bypass the conflict by relinking an existing employee automatically.

## Code correction

Shift creation/editing interprets template times in the location timezone,
not the host process timezone. Calendar dates remain UTC-midnight date markers;
start/end/break fields are real UTC instants. Overnight end dates are resolved
in the location timezone. Invalid zones and nonexistent DST wall times are
rejected. Existing production shifts are not rewritten by this change.

Incremental schedule export failures are persisted to integration status,
with actionable permission/conflict messages instead of a generic status code.

## Safe production retest

1. Confirm effective schedule edit and staff dismissal permissions for the
   system user; an empty schedule batch should no longer return 403.
2. On a confirmed empty future staff-day, create one HiTeam shift via API.
   A Dubai template 09:00–18:00 must persist 05:00–14:00 UTC and appear in Altegio
   as 09:00–18:00. Do not test on an occupied day: a push owns the entire day.
3. Cancel the exact test shift and verify its slots disappear in Altegio.
4. With distinct controlled contacts create one temporary employee, verify a
   new remote ID, then remove it in HiTeam. Removal means TERMINATED/SUSPENDED
   locally and fired remotely, not hard deletion.
5. Always clean up in a finally block. Never delete an ID that existed before
   the test. Confirm existing schedules, billing and owner accounts unchanged.

Client service appointments are not implemented in HiTeam and remain outside
this employee/work-schedule integration.
