# Altegio Pilot E2E (local)

This test makes real calls to Altegio and can create employees and published
shifts in HiTeam. Use a disposable HiTeam tenant and a dedicated Altegio test
location only. It never runs as part of the ordinary test suite.

Create `.env.e2e.local` in the repository root (it is ignored by Git):

```env
ALTEGIO_E2E_ENABLED=true
ALTEGIO_E2E_API_URL=http://localhost:4000/api/v1

# A disposable HiTeam administrator and its empty test workspace.
ALTEGIO_E2E_HITEAM_IDENTIFIER=owner@example.test
ALTEGIO_E2E_HITEAM_PASSWORD=replace-me
ALTEGIO_E2E_HITEAM_TENANT_SLUG=altegio-e2e

# Altegio test account. Never commit this file or paste these values into chat.
ALTEGIO_E2E_LOGIN=replace-me
ALTEGIO_E2E_PASSWORD=replace-me
ALTEGIO_E2E_LOCATION_ID=123456
```

The local API environment must also contain `ALTEGIO_PARTNER_TOKEN` and
`ALTEGIO_PILOT_ENCRYPTION_KEY` in `.env.local`. Start the API with the current
code, then run:

```bash
pnpm --filter @smart/api test:altegio-pilot:e2e
```

The scenario verifies real HiTeam login, one-time Altegio credential exchange,
the expected location entitlement, automatic synchronization on location
selection, a second explicit sync, and persisted staff/schedule sync timestamps
without an error. It stops before connecting if the test tenant already has a
Pilot connection, preventing accidental reuse of a non-disposable workspace.
