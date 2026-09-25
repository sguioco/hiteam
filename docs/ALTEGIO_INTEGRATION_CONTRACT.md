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
| Existing staff profile edits | Altegio | Altegio → HiTeam, with name echo | Remote profile data stays authoritative; HiTeam echoes staff name edits back to Altegio so the remote record does not go stale. Phone/email are employment-profile data and are not writable through Altegio's staff update endpoint, so they remain remote-authoritative. |
| Staff terminated / removed in HiTeam | HiTeam | HiTeam → Altegio | The linked remote team member is deactivated with `fired: 1`; nothing is created for unlinked terminated staff. |
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

## Lifecycle invariants

1. Terminating or removing an employee in HiTeam deactivates (`fired: 1`) every
   Altegio team member the employee was linked to (marketplace location and each
   Pilot location).
2. Terminated employees are never pushed to Altegio as new staff; the deactivate
   push is skipped when there is no remote link yet.
3. The deactivate push is one-way and final: Altegio has no reactivation surface,
   so rehiring a worker creates a fresh remote record.

## Webhook invariants

1. Webhook events carry `{ company_id, resource, resource_id, status, data }`.
   `resource_id` names exactly one team member (for `staff`/`master`/`schedule`
   events) and is used for a targeted sync instead of a full reconciliation.
2. A webhook never triggers `listTeamMembers` or any other unbounded pull: staff
   events use `data` when present (matching the staff-detail GET) and fall back
   to `GET /staff/{location_id}/{team_member_id}`; schedule events only re-pull
   that staff member's days via `staff_ids[]`.
3. `status: delete`, a 404 fetch, or a `fired`/`deleted` staff record demotes the
   linked local employee to `INACTIVE`; a local `TERMINATED` employee is never
   touched by event processing.
4. Webhook events without a usable `resource_id` degrade to a full sync so no
   event is ever silently dropped.
5. The processing mode is written to telemetry as
   `hiteam.altegio.webhook.mode = full|incremental`.
6. Incoming callbacks and webhooks are authenticated: when the payload carries
   `user_data` + `user_data_sign` and `ALTEGIO_MARKETPLACE_PARTNER_KEY` is
   configured, the sign must equal hex HMAC-SHA256 of `user_data` keyed with the
   partner key (constant-time compare), otherwise the request is rejected with
   `invalid_user_data_sign`. A valid signature short-circuits the token checks.
   Without a signature the request falls back to `partner_token` against
   `ALTEGIO_PARTNER_TOKEN`, then `ALTEGIO_CALLBACK_TOKEN`. If none of the
   mechanisms is configured/present the delivery is rejected with
   `503 callback_token_not_configured` — an anonymous delivery is never accepted.
   The registered webhook URL carries `?token=<ALTEGIO_CALLBACK_TOKEN>` so real
   Altegio deliveries authenticate on every call.
7. Staff/schedule webhooks are acknowledged with a 2xx immediately after
   authentication and processed from a BullMQ queue (`altegio-webhooks`) with a
   bounded backlog, worker concurrency, and a per-worker rate limit; event
   processing never blocks the HTTP handler. When the backlog is full the
   endpoint returns `503 webhook_queue_backpressure` (the only deliberate 503),
   so Altegio redelivery cannot pile work back into the event loop. Without
   `REDIS_URL` processing degrades to inline. Marketplace lifecycle events
   (`uninstall`/`freeze`) are handled synchronously and never enqueued.
8. A salon can only be bound to a workspace through a valid signed install
   claim: the Altegio redirect carries `user_data` + `user_data_sign`, and
   `GET /onboarding/preview` and `POST /billing/altegio/connect` reject the
   request with `403 invalid_altegio_install_claim` whenever
   `ALTEGIO_MARKETPLACE_PARTNER_KEY` is configured and the sign does not verify
   over `user_data` (or `user_data` names a different salon than the claimed
   `locationId`). Without a configured key the checks degrade to the legacy
   pending-consent flow so local development is unaffected. This prevents an
   unrelated HiTeam account from claiming and binding a salon it does not own.

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
