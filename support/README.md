# HiTeam Support

The cabinet reuses the Mapty/FastSign Support widget, with tenant-aware local
session keys, screenshots, async turns, feedback and explicit human escalation.
Public Umnico, WhatsApp and email support are preserved.

The Next server checks the user's bearer with the canonical HiTeam `/api/v1/auth/me`
on every request. Cookie snapshots, browser user IDs and tenant IDs are not authority.
Only session/message/feedback/escalation paths are proxied. Product bearer tokens
are never forwarded to Support. A five-minute HMAC identity binds `hiteam`, actor
and tenant. The assistant cannot access employee, biometric or geolocation records.

## Runtime configuration

Server-only web-admin settings: `HITEAM_SUPPORT_ENABLED=true`,
`HITEAM_SUPPORT_BASE_URL`, `HITEAM_SUPPORT_API_KEY`, `HITEAM_SUPPORT_IDENTITY_SECRET`.
The matching Support runtime requires product `hiteam`, `signed_header` identity
mode, a separate database and knowledge graph, and `deploy/profiles/hiteam.yaml`.
Do not use NEXT_PUBLIC variables for secrets. The enable flag defaults off.

The common runtime is owned under `FastSign/support/support_chat`, not forked into
each product. The pinned source release is recorded in `runtime.lock.json`.
Build that tracked Support source with its `support/deploy/sql` schema, mount this
product profile and its independently verified semantic knowledge artifact.
Only one gateway may register the common Telegram bot's webhook. It must route
project selection and ticket replies to their owner; never point the common bot
directly at a second product instance and overwrite the first webhook.

AI-only activation does not depend on Telegram. Set
`SUPPORT_HUMAN_ESCALATION_ENABLED=false` until the operator transport is configured;
the assistant must not claim that anyone was notified. New secrets belong only in ignored `.env` files
or the Kubernetes runtime Secret, never Git or chat.

## Verification

Web-admin typecheck, production Next build and all existing web-admin test scripts
pass. The added proxy tests check missing/rejected auth, disabled configuration,
path allowlisting, forged browser identities and server-side signing. Shared
runtime HiTeam/FastSign, session-identity and Telegram tests: 22 passed.
Production semantic HiTeam knowledge build: 18 nodes from seven reviewed RU/EN
articles and allowlisted UI source. The isolated AI runtime completed a real
question/answer smoke test. Runtime secrets are supplied by the dedicated
`hiteam-support-runtime` Kubernetes Secret; provider credentials stay on the
support host. Telegram and operator delivery are deliberately postponed.
