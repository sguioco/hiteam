# Smart System Map

Этот файл держим как живую карту текущей системы. Здесь фиксируются:
- какие БД и внешние сервисы использует проект
- какие ключевые модели и статусы есть в Prisma
- какие backend endpoints уже существуют и какие добавлены
- как устроены auth/access ограничения

## Инфраструктура и env

Источник: [/.env](/h:/Smart/.env), [/.env.local](/h:/Smart/.env.local), [docker-compose.yml](/h:/Smart/docker-compose.yml)

- `PostgreSQL`
  - `DATABASE_URL=postgresql://smart:smart@localhost:5432/smart`
- `Redis`
  - `REDIS_URL=redis://localhost:6379`
- `S3 / MinIO`
  - `S3_ENDPOINT=http://localhost:9000`
  - `S3_BUCKET=smart-local`
  - `S3_PUBLIC_BASE_URL=http://localhost:9000/smart-local`
- `JWT`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`

Почтовой инфраструктуры в проекте изначально не было. Для приглашений сотрудников добавляется новый email flow в backend.

## Основные backend модули

Папка: [apps/api/src/modules](/h:/Smart/apps/api/src/modules)

- `auth`
- `employees`
- `notifications`
- `audit`
- `org`
- `attendance`
- `schedule`
- `requests`
- `collaboration`
- `biometric`
- `diagnostics`
- `observability`
- `storage`
- `push`

## Ключевые модели Prisma

Файл: [schema.prisma](/h:/Smart/apps/api/prisma/schema.prisma)

Базовые:
- `Tenant`
- `User`
- `Role`
- `UserRole`
- `Session`
- `Employee`
- `Notification`
- `AuditLog`

Оргструктура:
- `Company`
- `Department`
- `Location`
- `Position`

Новый поток сотрудников:
- `EmployeeInvitation`

## Auth и access

Текущий login:
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

Новая логика доступа:
- пользователь может иметь логин, но быть заблокирован по рабочему доступу
- для этого в `User` добавлено поле `workspaceAccessAllowed`
- пока сотрудник не подтверждён руководителем, `workspaceAccessAllowed=false`
- backend должен блокировать рабочие endpoints для такого пользователя
- клиент должен показывать экран ожидания подтверждения

## Employees flow

Старое:
- `GET /api/v1/employees`
- `GET /api/v1/employees/:employeeId`
- `POST /api/v1/employees`

Новое целевое поведение:
1. Руководитель создаёт приглашение по `email`
2. Backend проверяет дубликат email
3. Отправляется письмо с invite link
4. Сотрудник по ссылке заполняет обязательные поля профиля
5. Пользователь может войти, но рабочий доступ закрыт
6. Руководитель подтверждает или отклоняет заявку
7. После подтверждения создаётся полноценный `Employee` и открывается доступ

Новые целевые endpoints:
- `POST /api/v1/employees/invitations`
- `POST /api/v1/employees/invitations/:invitationId/resend`
- `GET /api/v1/employees/invitations/public/:token`
- `POST /api/v1/employees/invitations/public/:token/register`
- `GET /api/v1/employees/invitations/pending`
- `PATCH /api/v1/employees/invitations/:invitationId/review`
- `GET /api/v1/employees/me/access-status`

## Audit / notifications

Уже есть инфраструктура:
- `AuditService` пишет события в `AuditLog`
- `NotificationsService` создаёт in-app уведомления и пуши

Для нового flow нужно логировать:
- создание приглашения
- повторную отправку приглашения
- отправку анкеты сотрудником
- подтверждение заявки
- отклонение заявки
- редактирование данных руководителем

На клиенте audit log не показывается.
