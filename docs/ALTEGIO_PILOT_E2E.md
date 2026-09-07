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
code. If the default local ports are already in use, start the dependencies on
alternative ports and run the API explicitly against them:

```bash
LOCAL_POSTGRES_PORT=5434 LOCAL_REDIS_PORT=6380 \
  docker compose --profile local-backend up -d postgres redis

DATABASE_URL='postgresql://smart:smart@localhost:5434/smart' \
REDIS_URL='redis://localhost:6380' \
  corepack pnpm --filter @smart/api dev
```

In a second terminal, run:

```bash
ALTEGIO_E2E_ENABLED=true corepack pnpm --filter @smart/api test:altegio-pilot:e2e
```

The runner intentionally stops if the disposable tenant is already connected.
To make a new local run against that same **disposable** tenant, explicitly opt
into deleting only its local Pilot connection and links first:

```bash
ALTEGIO_E2E_ENABLED=true ALTEGIO_E2E_RESET_EXISTING_CONNECTION=true \
  corepack pnpm --filter @smart/api test:altegio-pilot:e2e
```

This reset does not delete data from Altegio. Do not use it for a real customer
tenant.

The scenario verifies real HiTeam login, one-time Altegio credential exchange,
the expected location entitlement, automatic synchronization on location
selection, a second explicit sync, and persisted staff/schedule sync timestamps
without an error. It stops before connecting if the test tenant already has a
Pilot connection, preventing accidental reuse of a non-disposable workspace.
