# HiTeam × Altegio: integration contract

This document is the source of truth for the Marketplace integration. It defines
which system owns each entity and prevents a change received from one side from
being sent back as a new change.

## Scope

The integration connects one HiTeam workspace to the selected Altegio location.
It synchronizes staff and work schedules. HiTeam attendance, tasks, photo
proofs, payroll settings and operational reports are not mirrored to Altegio.

## Ownership and direction

| Entity | System of record | Direction | Rule |
| --- | --- | --- | --- |
| Location profile on first connection | Altegio | Altegio → HiTeam | Import only when the HiTeam location is still unconfigured. |
| Existing staff | Altegio | Altegio → HiTeam | Match by `altegioTeamMemberId`; no duplicate local employee. |
| New staff created in HiTeam | HiTeam | HiTeam → Altegio | Create remote staff first, then persist its `altegioTeamMemberId`. |
| Existing staff profile edits | Altegio | Altegio → HiTeam | Remote profile data remains authoritative. |
| Invite/login access | HiTeam | HiTeam only | Access is attached to the already-linked employee; it must never create a duplicate employee. |
| Schedule edited in Altegio | Altegio | Altegio → HiTeam | Imported shifts have source `ALTEGIO`. |
| Schedule edited in HiTeam | HiTeam | HiTeam → Altegio | Local shifts have source `HITEAM` and are pushed as set/delete operations. |
| Attendance, tasks, proofs, reports | HiTeam | HiTeam only | These are product data, not Altegio schedule data. |

## Identity invariants

1. Every synchronized employee has exactly one `Employee` and one stable
   `altegioTeamMemberId`.
2. A HiTeam login invitation for imported staff is linked to that employee and
   its existing user record. Registration activates those records.
3. Synthetic addresses ending in `@users.hiteam.local` are internal placeholders
   and must never be used as invitation recipients.
4. A person may not have two active employees in the same tenant because of an
   invitation or a synchronization retry.

## Schedule invariants

1. Imported Altegio shifts are marked `ALTEGIO`; HiTeam must not re-push them as
   newly created HiTeam shifts.
2. A HiTeam-created, changed or cancelled shift is sent to Altegio as a set or
   delete operation for the linked staff member and date.
3. Reconciliation can cancel only previously imported Altegio shifts that have
   disappeared remotely. It must not cancel HiTeam-only shifts.
4. The initial and manual synchronization window is explicit and shown to the
   manager; the default is the configured rolling window in the sync service.

## Operational contract

The UI must expose connection state, last successful staff/schedule sync,
linked staff count, imported shifts count, the latest error, and a manual sync
action. A Marketplace acceptance test must validate both directions using a
clean Altegio location.

## Conflict policy

- Staff profile data: Altegio wins for already linked staff.
- Access, roles and teams in HiTeam: HiTeam wins; they are not written to
  Altegio unless a supported staff-creation operation requires a profile field.
- Schedule: source tagging and outbound set/delete operations prevent loops;
  a remote pull reconciles only `ALTEGIO` shifts.
