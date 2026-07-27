# Altegio Marketplace (HiTeam)

Одно приложение в маркетплейсе Altegio. Цена в Stripe считается по региону локации HiTeam (`BillingService` PRICE_RULES). В карточке маркетплейса можно указать цену «от» минимальной.

## Env

| Variable | Required | Notes |
|----------|----------|-------|
| `ALTEGIO_MARKETPLACE_APPLICATION_ID` | yes | ID единственного приложения |
| `ALTEGIO_PARTNER_TOKEN` или `ALTEGIO_MARKETPLACE_PARTNER_KEY` | yes | BearerPartner |
| `ALTEGIO_MARKETPLACE_SYSTEM_USER_TOKEN` | yes for staff/schedule | User token для B2B staff/schedule API |
| `ALTEGIO_CALLBACK_TOKEN` | optional | Защита `/api/v1/altegio/callback` и `/api/v1/altegio/webhooks` |
| `ALTEGIO_MARKETPLACE_PAYMENT_CURRENCY` | optional | Fallback currency для notify (default `USD`) |

## URLs в кабинете разработчика Altegio

- Website / Registration Redirect: `https://hiteam.net/login?from=altegio&app_id=<APPLICATION_ID>`
- После login/signup пользователь попадает на `/billing?from=altegio&salon_id=...`
- Callback disconnect/connect: `https://api.hiteam.net/api/v1/altegio/callback`
- Staff/schedule webhooks: `https://api.hiteam.net/api/v1/altegio/webhooks`

`salon_id` Altegio обычно дописывает в redirect сама.

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/billing/altegio/connect` | JWT | Activate install + bind salon |
| POST | `/api/v1/billing/altegio/sync` | JWT | Two-way period/status sync |
| POST | `/api/v1/billing/altegio/disconnect` | JWT | Unbind salon locally |
| GET | `/api/v1/billing/altegio/status` | JWT | Connection summary |
| POST | `/api/v1/altegio/sync` | JWT | Sync staff + schedule |
| POST | `/api/v1/altegio/sync/employees` | JWT | Sync employees only |
| POST | `/api/v1/altegio/sync/schedule` | JWT | Sync schedule only |
| GET | `/api/v1/altegio/sync/status` | JWT | Staff/schedule sync status |
| ALL | `/api/v1/altegio/callback` | token | Connect/disconnect from Altegio |
| ALL | `/api/v1/altegio/webhooks` | token | StaffEvent / ScheduleEvent |

## Sync model

1. **DB** `BillingSubscription`: `status`, `stripeCurrentPeriodEnd`, `trialEndsAt`, `altegioLocationId`, `altegioApplicationId`
2. **Stripe** — источник правды для оплаченной подписки
3. **Altegio** — `GET /marketplace/salon/{location}/application/{app}` pull; `POST /marketplace/partner/payment` push

После `invoice.paid` / `checkout.session.completed` HiTeam пушит в Altegio:
- `period_to` = локальный `stripeCurrentPeriodEnd` (или trial end)
- `payment_sum` = фактическая сумма Stripe или региональный `monthlyTotal`
- `currency_iso` = валюта региона HiTeam / Stripe

## Staff & schedule sync

Двусторонняя синхронизация после marketplace connect:

- **Employees:** матч по `altegioTeamMemberId` → phone → email; автосоздание в HiTeam/Altegio
- **Schedule:** Altegio slots → `Shift` с `source=ALTEGIO`; HiTeam `PUBLISHED` с `source=HITEAM` → push в Altegio
- B2B API: `GET /api/v2/.../team_members`, `GET/PUT /api/v1/company/{id}/staff/schedule`

## Connect flow

1. Connect в маркетплейсе → redirect на HiTeam login с `salon_id` + `app_id`
2. Login/signup сохраняет params в `sessionStorage`
3. Redirect на `/billing`
4. `POST /billing/altegio/connect` → `POST app.alteg.io/marketplace/partner/callback`
5. Pull статуса Altegio и запись в DB
6. Background sync сотрудников и расписания
