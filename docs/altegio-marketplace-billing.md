# Altegio Marketplace + Stripe billing (altegioGPT web)

Mirror of the FastSign install/billing pattern, adapted for altegioGPT.

## What we prepared

Service: `web` (`docker compose` → `http://localhost:18070`)

| Piece | Endpoint / piece |
|-------|------------------|
| altegioGPT base | `/altegiogpt` (`WEB_BASE_PATH`) |
| Legal / service | `GET /altegiogpt/privacy`, `/terms`, `/license`, `/dpa`, `/cookies`, `/altegio-guide` |
| Auth | `POST /altegiogpt/api/auth/register`, `/login`, `/logout`, `/me` |
| Altegio SSO | `POST /altegiogpt/api/auth/altegio-sso` |
| Tenant resolve / install | `POST /altegiogpt/api/tenants/resolve` → Altegio `POST /marketplace/partner/callback` |
| Disconnect | `GET\|POST /altegiogpt/api/altegio/callback` |
| Event webhook stub | `POST /altegiogpt/api/altegio/webhook` |
| Stripe Checkout | `POST /altegiogpt/api/billing/checkout-session` |
| Confirm + marketplace payment | `POST /altegiogpt/api/billing/confirm-checkout` → Altegio `POST /marketplace/partner/payment` |
| Customer portal | `POST /altegiogpt/api/billing/portal-session` |
| Stripe webhooks | `POST /altegiogpt/api/billing/webhook` |

DB schema: Postgres `copilot` (`users`, `tenants`, `user_tenants`, `billing_events`).

## Altegio developer cabinet

1. Create marketplace application (AE / Global as needed).
2. **Website** (marketplace card link):
   ```
   https://alt-tech.net/altegiogpt/
   ```
3. **Website / Registration URL** (install entry):
   ```
   https://alt-tech.net/altegiogpt/app?from=altegio&app_id={id}&salon_id={location_id}&user_data={user_data}&user_data_sign={user_data_sign}
   ```
   Alias also works: `/altegiogpt/account?...` → redirects to `/altegiogpt/app`.
4. **Disconnect URL**:
   ```
   https://alt-tech.net/altegiogpt/api/altegio/callback?token=<ALTEGIO_CALLBACK_TOKEN>
   ```
5. Copy into prod env (`PROD_ENV` / `.env.prod`):
   - `ALTEGIO_PARTNER_TOKEN`
   - `ALTEGIO_MARKETPLACE_PARTNER_KEY` — signs `user_data`
   - `ALTEGIO_MARKETPLACE_APPLICATION_ID`
   - `ALTEGIO_MARKETPLACE_SYSTEM_USER_TOKEN` (cabinet system user)
   - optional `ALTEGIO_MARKETPLACE_API_KEY`, `ALTEGIO_CALLBACK_TOKEN`, `ALTEGIO_WEBHOOK_TOKEN`

   Do **not** set demo `ALTEG_LOCATION_ID` / personal `ALTEG_USER_TOKEN` in prod.
   Location comes from Marketplace Connect → tenant; MCP uses partner + system user (FastSign-style).

## Stripe

1. Create Product + Prices (monthly / yearly).
2. `app/.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_MONTHLY=price_...
   STRIPE_PRICE_YEARLY=price_...
   WEB_PUBLIC_URL=https://alt-tech.net/altegiogpt
   WEB_BASE_PATH=/altegiogpt
   WEB_JWT_SECRET=long-random
   ```
3. Webhook endpoint: `https://alt-tech.net/altegiogpt/api/billing/webhook`  
   Events: `checkout.session.completed`, `customer.subscription.*`

Checkout uses `mode=subscription` **without** `payment_method_types` (Dashboard dynamic methods).

After successful pay we call Altegio `marketplace/partner/payment` so marketplace `period_to` stays aligned (same idea as FastSign).

## Telegram → location binding

1. Install salon via Marketplace (or Dashboard connect) → tenant gets `admin_key` + `altegio_location_id`.
2. Dashboard shows **Open bot & bind** (needs `TELEGRAM_BOT_USERNAME`) or `/start <admin_key>`.
3. Bot calls `POST /api/telegram/link` → stores `telegram_tenant_links`.
4. Each message: bot `GET /api/telegram/resolve` → `location_id` → agent `company_id` / `location_id`.
5. Agent **forces** that location on every MCP tool call (classifier cannot switch salon).
6. `/salon` — show binding; `/unlink` — remove.

Env:
```
TELEGRAM_BOT_USERNAME=YourBot
TELEGRAM_BOT_INTERNAL_TOKEN=long-random
WEB_BASE_URL=http://web:8070   # for aiogram_bot
REQUIRE_SUBSCRIPTION_FOR_BOT=1 # optional gate
AGENT_ALLOW_DEFAULT_LOCATION=0 # multi-tenant: require company_id
```

## Local run

```bash
docker compose up -d --build web
open http://localhost:18070
curl -s http://localhost:18070/health | jq .
```

## Flow (install)

1. Salon opens app in Altegio Marketplace → lands on `/app?from=altegio&...`
2. FE calls `/api/auth/altegio-sso` (verify signature → JWT user)
3. FE/backend resolves tenant → `partner/callback` installs system user on salon
4. Owner pays via Stripe Checkout
5. Webhook / confirm-checkout stores subscription + notifies Altegio payment

## Next (product gating)

Set `REQUIRE_SUBSCRIPTION_FOR_BOT=1` to refuse Telegram queries when Stripe/marketplace period is inactive.
Password-after-SSO (FastSign-style) still optional for web re-login.
