# Altegio Marketplace (HiTeam)

Одно приложение в маркетплейсе Altegio. Цена в Stripe считается по региону локации HiTeam (`BillingService` PRICE_RULES). В карточке маркетплейса можно указать цену «от» минимальной.

## Env

| Variable | Required | Notes |
|----------|----------|-------|
| `ALTEGIO_MARKETPLACE_APPLICATION_ID` | yes | ID единственного приложения |
| `ALTEGIO_PARTNER_TOKEN` или `ALTEGIO_MARKETPLACE_PARTNER_KEY` | yes | BearerPartner |
| `ALTEGIO_MARKETPLACE_SYSTEM_USER_TOKEN` | optional | System user token из кабинета (на будущее) |
| `ALTEGIO_CALLBACK_TOKEN` | optional | Защита `/api/v1/altegio/callback` |
| `ALTEGIO_MARKETPLACE_PAYMENT_CURRENCY` | optional | Fallback currency для notify (default `USD`) |

## URLs в кабинете разработчика Altegio

- Website / Registration Redirect: `https://hiteam.net/login?from=altegio&app_id=<APPLICATION_ID>`
- После login/signup пользователь попадает на `/billing?from=altegio&salon_id=...`
- Callback disconnect/connect: `https://api.hiteam.net/api/v1/altegio/callback`

`salon_id` Altegio обычно дописывает в redirect сама.

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/billing/altegio/connect` | JWT | Activate install + bind salon |
| POST | `/api/v1/billing/altegio/sync` | JWT | Two-way period/status sync |
| POST | `/api/v1/billing/altegio/disconnect` | JWT | Unbind salon locally |
| GET | `/api/v1/billing/altegio/status` | JWT | Connection summary |
| ALL | `/api/v1/altegio/callback` | token | Connect/disconnect from Altegio |

## Sync model

1. **DB** `BillingSubscription`: `status`, `stripeCurrentPeriodEnd`, `trialEndsAt`, `altegioLocationId`, `altegioApplicationId`
2. **Stripe** — источник правды для оплаченной подписки
3. **Altegio** — `GET /marketplace/salon/{location}/application/{app}` pull; `POST /marketplace/partner/payment` push

После `invoice.paid` / `checkout.session.completed` HiTeam пушит в Altegio:
- `period_to` = локальный `stripeCurrentPeriodEnd` (или trial end)
- `payment_sum` = фактическая сумма Stripe или региональный `monthlyTotal`
- `currency_iso` = валюта региона HiTeam / Stripe

## Connect flow

1. Connect в маркетплейсе → redirect на HiTeam login с `salon_id` + `app_id`
2. Login/signup сохраняет params в `sessionStorage`
3. Redirect на `/billing`
4. `POST /billing/altegio/connect` → `POST app.alteg.io/marketplace/partner/callback`
5. Pull статуса Altegio и запись в DB
