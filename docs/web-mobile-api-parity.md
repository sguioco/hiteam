# Web Admin / Mobile API Parity

Цель: web-admin и mobile должны быть двумя клиентами одного продукта, а не двумя разными API-потребителями с разной логикой сборки экрана.

## Правило

- Для каждого крупного экрана должен быть один read endpoint `GET /bootstrap/<area>`.
- Web и mobile читают один и тот же bootstrap payload и используют одни DTO/типы.
- Гранулярные endpoints остаются для mutations и точечных действий: create/update/delete, mark read, status, upload, enroll, verify.
- Нельзя собирать один и тот же экран на web через `/bootstrap/...`, а на mobile через набор из 4-6 отдельных запросов.
- Если mobile нужен дополнительный блок в уже существующем bootstrap, расширяем payload назад-совместимо, а не создаём отдельный mobile endpoint.

## Текущий первый фикс

### Schedule / Calendar

Canonical read endpoint:

```text
GET /api/v1/bootstrap/schedule?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
```

Используют:

- web-admin schedule page
- mobile calendar manager mode

Payload должен включать:

- `templates`
- `shifts`
- `employees`
- `groups`
- `locations`
- `departments`
- `positions`
- `requests`
- `taskBoard`

Гранулярные schedule endpoints остаются только для действий:

- `POST /api/v1/schedule/templates`
- `POST /api/v1/schedule/shifts`
- после mutation перечитываем canonical bootstrap snapshot, а не `/schedule/templates` или `/schedule/shifts`.

## Закрытые области и текущие правила

| Area | Web-admin сейчас | Mobile сейчас | Нужно сделать |
| --- | --- | --- | --- |
| Schedule / Calendar | `/bootstrap/schedule` | уже переведено на `/bootstrap/schedule` для manager calendar | DTO вынесены в `@smart/types` |
| Tasks / Manager | `/bootstrap/tasks` | уже переведено на `/bootstrap/tasks` для manager home/cache | DTO вынесены в `@smart/types` |
| News | `/bootstrap/news` | уже переведено на `/bootstrap/news` для screen read/cache warmup | DTO вынесены в `@smart/types`; mutations/read status оставить на `/collaboration/announcements...` |
| Employees | `/bootstrap/employees` | pickers переведены на `/bootstrap/employees` | `/bootstrap/employees` теперь отдаёт `groups`, чтобы assignees picker не собирался двумя разными read endpoints |
| Employee detail | `/bootstrap/employees/:employeeId` | пока нет отдельного mobile detail screen | web-admin detail больше не собирает профиль, attendance, anomalies, biometric и manager access пятью read-запросами |
| Collaboration | `/bootstrap/collaboration` | нет отдельного mobile экрана | web-admin collaboration теперь собирается одним bootstrap read endpoint; mutations остаются granular |
| Dashboard / Today | `/bootstrap/dashboard` | Today/start shift prompt и legacy task/shifts wrappers переведены на `/bootstrap/dashboard`/`/bootstrap/schedule` | payload расширен `profile`, `attendanceStatus`, `scheduleShifts`, `taskBoard`, `personalTaskBoard`; task date range передаётся query |
| Profile | `/bootstrap/dashboard` | `loadMyProfile()` читает профиль из `/bootstrap/dashboard` | прямой `/employees/me` больше не нужен для screen read; preferences/access-status остаются отдельными |
| Requests | `/bootstrap/requests` | requests screen переведён на `/bootstrap/requests` | employee payload включает balances, my requests, calendar и tasks; manager payload включает inbox |
| Leaderboard | `/bootstrap/leaderboard` | уже переведено на `/bootstrap/leaderboard` | Settings mutation остаётся `/leaderboard/settings` |
| Attendance | `/bootstrap/attendance` | добавлен mobile wrapper `loadAttendanceBootstrap`; team live читает через bootstrap | Employee today может читать `/attendance/me/status`; manager screen reads должны идти через `/bootstrap/attendance` |
| Biometric | `/bootstrap/biometric` | добавлен mobile wrapper `loadBiometricBootstrap` | Employee policy/enroll/verify остаются granular, manager/team read должен идти через `/bootstrap/biometric` |
| Organization | `/bootstrap/organization` | почти не используется | Если появится mobile org screen, сразу использовать `/bootstrap/organization` |

## Типы

Локальные копии основных bootstrap DTO вынесены в `@smart/types`:

- `ScheduleBootstrapInitialData`
- `ManagerScheduleBootstrapResponse`
- `EmployeesBootstrapResponse`
- `EmployeeDetailBootstrapResponse`
- `EmployeeDetailRecord`
- `EmployeeManagerAccessResponse`
- `AttendanceBootstrapResponse`
- `ManagerTasksBootstrapResponse`
- `NewsBootstrapResponse`
- `CollaborationBootstrapResponse`
- `LeaderboardBootstrapResponse`
- `BiometricBootstrapResponse`
- `DashboardBootstrapResponse`
- `RequestsBootstrapResponse`
- `EmployeeProfileResponse`
- `EmployeeScheduleShiftItem`
- shared employee/schedule item shapes

Целевое место для контрактов:

```text
packages/types/src/index.ts
```

Правило: если payload приходит с API и используется больше чем одним клиентом, тип должен жить в `@smart/types`.

## Клиентские API слои

Сейчас:

- web-admin: `apps/web-admin/lib/api.ts`
- mobile: `apps/mobile/lib/api.ts`

Это нормально для транспорта, потому что web и native по-разному хранят session/token. Но функции предметной области должны совпадать по смыслу:

```text
loadScheduleBootstrap()
loadTasksBootstrap()
loadNewsBootstrap()
loadEmployeesBootstrap()
loadEmployeeDetailBootstrap() // для detail screen
loadAttendanceBootstrap()
loadBiometricBootstrap()
loadCollaborationBootstrap()
loadDashboardBootstrap()
loadTodayBootstrap()
loadRequestsBootstrap()
```

Нельзя держать:

```text
web:    loadScheduleBootstrap()
mobile: loadManagerTasks() + loadManagerEmployees() + loadManagerShifts() + loadManagerShiftTemplates()
```

## Порядок миграции

1. Schedule/calendar: закрыто через `/bootstrap/schedule`.
2. Manager home/tasks: закрыто через `/bootstrap/tasks`.
3. News screen read: закрыто через `/bootstrap/news`.
4. Leaderboard screen read: закрыто через `/bootstrap/leaderboard`.
5. Employees picker: закрыто через `/bootstrap/employees`, payload расширен `groups`.
6. Collaboration web-admin: закрыто через `/bootstrap/collaboration`.
7. Dashboard/Today: закрыто через `/bootstrap/dashboard`; отдаёт профиль, attendance status, смены, team `taskBoard` и личный `personalTaskBoard`.
8. Requests: закрыто через `/bootstrap/requests`; mobile больше не собирает экран четырьмя read endpoints.
9. Attendance/biometric: wrappers готовы; новые manager/team reads подключать только к `/bootstrap/attendance` и `/bootstrap/biometric`.
10. Добавить короткий audit script или checklist в PR: один экран не должен собираться разными endpoint наборами на разных платформах.
