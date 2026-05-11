# HiTeam Kommo integration

## What is synced

The API syncs HiTeam tenants to Kommo as:

- one Kommo company per HiTeam tenant;
- one Kommo lead in the `HiTeam` pipeline;
- one primary contact for the admin/owner;
- linked contacts for employees and pending employee invitations;
- custom field groups for company, product, employees, payment, activity, quick links;
- tags, notes and manager tasks for onboarding, trial expiry and inactivity.

## Required Kommo settings

Create a Kommo integration with CRM permissions for leads, contacts, companies, custom fields, tasks and notes.
Then configure the API environment:

```env
KOMMO_ENABLED=true
KOMMO_SUBDOMAIN=your-subdomain
KOMMO_LONG_LIVED_TOKEN=...

WEB_ADMIN_BASE_URL=https://admin.example.com

# Optional
KOMMO_PIPELINE_NAME=HiTeam
KOMMO_PIPELINE_ID=
KOMMO_RESPONSIBLE_USER_ID=
KOMMO_TRIAL_DAYS=7
KOMMO_EVENT_NOTES_ENABLED=true
KOMMO_WEBHOOK_SECRET=
KOMMO_DEFAULT_INDUSTRY=
KOMMO_DEFAULT_REFERRAL_SOURCE=HiTeam signup
KOMMO_SALES_MANAGER_NAME=
KOMMO_ONBOARDING_MANAGER_NAME=
```

OAuth refresh flow is also supported with:

```env
KOMMO_ACCESS_TOKEN=...
KOMMO_REFRESH_TOKEN=...
KOMMO_CLIENT_ID=...
KOMMO_CLIENT_SECRET=...
KOMMO_REDIRECT_URI=...
```

Prefer `KOMMO_LONG_LIVED_TOKEN` in production unless refresh-token persistence is moved to a secure store.

## Event mapping

- organization registration -> creates/updates company, contact, lead; stage `New Registration`;
- organization setup/location update -> refreshes company and quick links;
- employee created/invited/approved/rejected -> refreshes employee counters and linked contacts;
- employee check-in -> stage `First Check-In Completed`, updates activity fields;
- employee check-out -> updates activity fields;
- billing checkout/invoice/subscription events -> updates seats, plan, payment and stage;
- device changes -> updates app-installed and device counters;
- biometric enrollment/verification -> updates face verification counters and contact fields.

## Admin API

Tenant admins can inspect and force sync:

- `GET /kommo/status`
- `POST /kommo/sync`

Both endpoints require JWT and one of `tenant_owner`, `hr_admin`, `operations_admin`.

## Kommo inbound webhook

Configure Kommo webhooks for lead stage/status updates:

```text
POST https://api.example.com/api/v1/kommo/webhook?secret=...
```

Kommo sends `x-www-form-urlencoded` payloads. The API accepts those payloads, resolves the Kommo lead ID to a HiTeam tenant, writes an audit event and stores the manual Kommo stage in sync metadata. Later background syncs preserve that manual stage unless a HiTeam milestone explicitly moves the lead.

## Database

Two Prisma models store remote IDs and once-only automation records:

- `KommoEntityLink`
- `KommoAutomationLog`

After deploying this code, run Prisma generation and apply the schema migration in the normal release flow.
This change was intentionally not applied automatically during development.

## Known boundary

The REST integration creates the CRM data model, stages, tags, tasks, notes and quick links. A visual Kommo tab exactly like Altegio requires a separate Kommo widget package using Kommo's widget SDK. The fields created here are the backend foundation for that widget.
