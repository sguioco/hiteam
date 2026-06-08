# HiTeam lifecycle emails

Lifecycle emails are sent directly by the API through Microsoft Graph. Pochtovik is not required.

## Events

- `user_registered`
- `trial_started`
- `trial_ending_soon`
- `trial_expired`
- `payment_successful`
- `payment_failed`
- `subscription_renewal_upcoming`
- `subscription_cancelled`
- `inactive_3_days`
- `key_feature_not_used`

The API deduplicates lifecycle sends through `KommoAutomationLog`, but email sending does not require `KOMMO_ENABLED=true`.

When `KOMMO_ENABLED=true`, every lifecycle email attempt is also written back to the Kommo lead:

- a `HiTeam Email` note with event, status, sender, reply-to, recipients, subject, preview, CTA links and error text
- `HiTeam - Lifecycle Email` custom fields with the latest email event, status, provider, time, recipients, subject, preview, CTA and error

`ACCEPTED` means Microsoft Graph accepted the message for delivery and saved it to the sender mailbox sent items. Microsoft Graph does not return a per-message ID from `sendMail`.

## Microsoft 365 setup

1. Open Microsoft Entra admin center
2. Create an App Registration for HiTeam API email sending
3. Add Microsoft Graph application permission `Mail.Send`
4. Grant admin consent
5. Create a mail-enabled security group, for example `hiteam-mail-senders@hiteam.net`
6. Add only `info@hiteam.net` to that group
7. Restrict the app to that group with an Exchange Online application access policy
8. Create a client secret and store it only in deployment secrets

Example Exchange Online PowerShell:

```powershell
Connect-ExchangeOnline

New-ApplicationAccessPolicy `
  -AppId "<MICROSOFT_GRAPH_CLIENT_ID>" `
  -PolicyScopeGroupId "hiteam-mail-senders@hiteam.net" `
  -AccessRight RestrictAccess `
  -Description "Restrict HiTeam lifecycle email sender to info@hiteam.net"

Test-ApplicationAccessPolicy `
  -Identity "info@hiteam.net" `
  -AppId "<MICROSOFT_GRAPH_CLIENT_ID>"
```

## API environment

```env
LIFECYCLE_EMAILS_ENABLED=true
MICROSOFT_GRAPH_TENANT_ID=...
MICROSOFT_GRAPH_CLIENT_ID=...
MICROSOFT_GRAPH_CLIENT_SECRET=...
MICROSOFT_GRAPH_SENDER=info@hiteam.net
LIFECYCLE_EMAIL_REPLY_TO=info@hiteam.net
WEB_ADMIN_BASE_URL=https://hiteam.net
```

## Sending logic

- registration sends `user_registered` and `trial_started`
- Stripe paid invoice sends `payment_successful`
- Stripe failed invoice sends `payment_failed`
- cancellation sends `subscription_cancelled`
- daily cron sends trial ending, trial expired, renewal upcoming, inactivity and key-feature-not-used emails

If Microsoft Graph credentials are missing while `LIFECYCLE_EMAILS_ENABLED=true`, the event is logged as failed in API logs and does not block the original lifecycle flow.
With Kommo enabled, that failure is also visible on the lead as `Last Lifecycle Email Status = FAILED`.
