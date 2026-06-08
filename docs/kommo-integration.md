# HiTeam Kommo integration

## What is synced

The API syncs HiTeam tenants to Kommo as:

- one Kommo company per HiTeam tenant;
- one Kommo lead that starts in the `HiTeam - Trial to Payment` pipeline and moves to `HiTeam - Customers` after payment;
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
KOMMO_TRIAL_PIPELINE_NAME=HiTeam - Trial to Payment
KOMMO_TRIAL_PIPELINE_ID=
KOMMO_CUSTOMERS_PIPELINE_NAME=HiTeam - Customers
KOMMO_CUSTOMERS_PIPELINE_ID=
# Backward compatible fallback for the trial pipeline
KOMMO_PIPELINE_NAME=
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

## Pipeline and lifecycle email mapping

Pochtovik is not used. Lifecycle emails are sent directly by the API through Microsoft Graph from `info@hiteam.net`; see `docs/lifecycle-emails-microsoft-graph.md`.
Kommo can still be used for CRM stages; the API moves the lead and fills custom fields.

Trial pipeline `HiTeam - Trial to Payment`:

- `New Registration` -> `Lifecycle Webhook = user_registered`;
- `Trial Started` -> `trial_started`;
- `Activation` -> `activation_started` when the customer logs in, adds employees, configures the first work location/geofence, or completes the first check-in;
- `Non-Activation Risk` -> `inactive_3_days` when there is no activity for 3 days;
- `Trial Ending Soon` -> `trial_ending_soon`;
- `Trial Expired` -> `trial_expired`;
- `Lost Lead` -> final trial loss stage after an expired unpaid trial.

Customers pipeline `HiTeam - Customers`:

- `New Customer` -> first `payment_successful`;
- `Onboarding` -> paid customer still configuring employees, checklists, geolocation and check-ins;
- `Active Customer` -> active paid usage;
- `Churn Risk` -> `inactive_3_days` for paid customers;
- `Renewal Soon` -> `subscription_renewal_upcoming`;
- `Renewed` -> repeated `payment_successful`;
- `Subscription Cancelled` -> `subscription_cancelled`;
- `Winback` -> manual recovery stage.

Useful lifecycle variables are available as Kommo lead fields:

- `Lifecycle Webhook`, `Lifecycle Stage`, `Lifecycle Pipeline`, `Last Lifecycle Event At`;
- `First Login Completed`, `Employees Added Completed`, `First QR Created Completed`, `First Check-In Completed`, `Checklists Configured Completed`;
- payment, seats, activity, employee roster and quick link fields.

Other sync events:

- organization setup/location update -> refreshes company, activation signals and quick links;
- employee created/invited/approved/rejected -> refreshes employee counters and linked contacts;
- employee check-in/check-out -> updates activity fields and can move trial customers to `Activation` or paid customers to `Active Customer`;
- billing checkout/invoice/subscription events -> updates seats, plan, payment and customer stage;
- device changes -> updates app-installed and device counters;
- biometric enrollment/verification -> updates face verification counters and contact fields;
- daily automation -> emits `trial_ending_soon`, `trial_expired`, `subscription_renewal_upcoming`, `inactive_3_days`, `key_feature_not_used` as Kommo notes/tasks.

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
