# Altegio Marketplace (HiTeam)

Одно приложение в маркетплейсе Altegio. Цена в Stripe считается по региону локации HiTeam (`BillingService` PRICE_RULES). В карточке маркетплейса можно указать цену «от» минимальной.

## Env

| Variable | Required | Notes |
|----------|----------|-------|
| `ALTEGIO_MARKETPLACE_APPLICATION_ID` | yes | ID единственного приложения |
| `ALTEGIO_PARTNER_TOKEN` | yes | BearerPartner для Marketplace и B2B API |
| `ALTEGIO_MARKETPLACE_PARTNER_KEY` | optional | Signing key для проверки `user_data_sign`, не API token |
| `ALTEGIO_MARKETPLACE_SYSTEM_USER_TOKEN` | yes for staff/schedule | User token для B2B staff/schedule API |
| `ALTEGIO_CALLBACK_TOKEN` | optional | Защита `/api/v1/altegio/callback` и `/api/v1/altegio/webhooks` для вызовов без `partner_token` |
| `ALTEGIO_MARKETPLACE_PAYMENT_CURRENCY` | optional | Fallback currency для notify (default `USD`) |
| `ALTEGIO_WEBHOOK_URL` | optional | Регистрируется в Altegio при connect, обычно `https://api.hiteam.net/api/v1/altegio/webhooks` |

## URLs в кабинете разработчика Altegio

- Website / Registration Redirect: `https://hiteam.net/login?from=altegio&app_id=<APPLICATION_ID>`
- `/signup?...` сохраняет query и редиректит на `/create?...`
- После login/signup пользователь попадает на `/billing?from=altegio&salon_id=...`
- Callback disconnect/connect: `https://api.hiteam.net/api/v1/altegio/callback`
- Marketplace lifecycle webhook (`uninstall` / `freeze`): `https://api.hiteam.net/api/v1/altegio/callback`
- Staff/schedule webhooks: `https://api.hiteam.net/api/v1/altegio/webhooks`

Оба входящих эндпоинта принимают оба типа событий: `/webhooks` перенаправляет
lifecycle-события (`event: uninstall|freeze`) в marketplace-обработчик, поэтому в
кабинете Altegio можно указать один URL.

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
| GET | `/api/v1/altegio/onboarding/preview` | public + pending consent | Preview location for signup |
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

## Отключение и согласованность состояния

Аутентификация входящих вызовов: если в теле есть `partner_token`, он сверяется с
`ALTEGIO_PARTNER_TOKEN` (так приходят lifecycle-webhooks Altegio). Иначе
используется `ALTEGIO_CALLBACK_TOKEN` из заголовка `x-altegio-callback-token`
или query `token`.

Три источника события «интеграция выключена»:

1. **Webhook Altegio** `event=uninstall` → полный unbind: `altegioLocationId`,
   `altegioApplicationId`, `altegioMarketplaceActivatedAt` и метки sync очищаются.
2. **Webhook Altegio** `event=freeze` → связь сохраняется (приложение в Altegio
   осталось установленным), запускается pull статуса: `freezed` обрезает
   локальный период и переводит подписку в `CANCELED`.
3. **Pull при синхронизации** (`/billing` summary, manual sync, Stripe webhook) —
   страховка на случай пропущенного webhook: `connection_status: uninstalled`
   или `404` от `GET /marketplace/salon/{id}/application/{app}` тоже приводят к
   unbind.

Отключение со стороны HiTeam (`POST /api/v1/billing/altegio/disconnect`)
дополнительно вызывает `POST /marketplace/salon/{id}/application/{app}/uninstall`,
чтобы маркетплейс не считал приложение установленным. Ошибка этого вызова
логируется и не блокирует локальный unbind.

Trial-claim (`AltegioMarketplaceTrialClaim`) при disconnect не удаляется.

## Staff & schedule sync

Двусторонняя синхронизация после marketplace connect:

- **Employees:** матч по `altegioTeamMemberId` → phone → email; автосоздание в HiTeam/Altegio
- **Schedule:** Altegio slots → `Shift` с `source=ALTEGIO`; HiTeam `PUBLISHED` с `source=HITEAM` → push в Altegio
- B2B API: `GET /api/v2/.../team_members`, `GET/PUT /api/v1/company/{id}/staff/schedule`

## Trial protection

Marketplace trial выдаётся один раз для пары `application_id + salon_id`.
`AltegioMarketplaceTrialClaim` хранится независимо от tenant и не удаляется при
disconnect или удалении workspace. Повторное подключение может использовать
только остаток первоначального периода, но не продлить его; новый tenant для того
же салона повторный trial не получает.

## Connect flow

### Новый аккаунт из Altegio

1. Connect в маркетплейсе → redirect на HiTeam login с `salon_id` + `app_id`.
2. HiTeam проверяет, что интеграция в статусе `pending`, получает название,
   адрес, timezone и координаты салона и открывает создание организации с
   предзаполненными данными.
3. После регистрации выполняется `POST /billing/altegio/connect` →
   `POST app.alteg.io/marketplace/partner/callback`.
4. Компания и основная локация HiTeam синхронизируются из Altegio, затем в фоне
   импортируются сотрудники и расписание.

### Существующий аккаунт HiTeam

1. На `/billing` пользователь нажимает **Подключить** и переходит в карточку
   приложения Altegio Marketplace.
2. После подтверждения доступа Altegio возвращает пользователя в HiTeam.
3. HiTeam активирует интеграцию, синхронизирует подписку и импортирует
   сотрудников/расписание автоматически. Модалка показывает только успех.
