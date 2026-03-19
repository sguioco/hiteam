# Mobile Employee Flow Plan

## 1. Purpose

Этот документ фиксирует, как довести текущий `apps/mobile` до полноценного employee-приложения для `iOS` и `Android`, связанного с существующей веб-админкой и backend.

Цель мобильного приложения:

- дать сотруднику один простой ежедневный сценарий: зайти, отметить приход, выполнить задачи, отметить уход
- сделать attendance защищённым: геолокация, primary device, face verification, серверное время
- показать только нужное сотруднику, без менеджерской перегрузки
- оставить управление, настройку политик, постановку задач и контроль в веб-админке

## 2. Current Baseline

Что уже есть в репозитории:

- мобильная база на `Expo + React Native + expo-router` в `apps/mobile`
- отдельные экраны `auth`, `workspace`, `tasks`, `requests`, `profile`, `biometric`
- backend-модули `auth`, `devices`, `attendance`, `biometric`, `collaboration`, `push`, `storage`
- объектное хранилище и upload flow для файлов и biometric artifacts

Что пока не готово для продового mobile flow:

- мобильное приложение всё ещё живёт на demo-сессии и demo-device логике
- нет единого employee navigation flow с понятной нижней навигацией
- `Say Hi / Say Goodbye` пока не оформлены как обязательный сценарий со всеми проверками
- task flow не покрывает обязательные фото-доказательства как основной сценарий
- нет production-ready orchestration для secure tokens, device binding, permission states и offline retry

## 3. Product Scope for Mobile

На мобильном делаем только employee experience.

На мобильном сотрудник может:

- войти или пройти регистрацию через company code / invite
- заполнить недостающий профиль
- привязать устройство
- пройти face enrollment
- сделать `Say Hi` при приходе
- видеть сегодняшнюю смену, задачи, встречи и напоминания
- выполнять задачи, включая фото-подтверждение
- получать push-уведомления
- сделать `Say Goodbye` при уходе
- смотреть календарь и свой профиль

На мобильном сотрудник не должен:

- управлять командой
- видеть админские таблицы
- ставить задачи другим
- делать manager-level approvals

Менеджерская логика остаётся в веб-админке.

## 4. Target Navigation

### 4.1 Bottom Navigation

Нижняя навигация состоит из 3 вкладок:

- слева: `Calendar`
- по центру: `Today`
- справа: `Profile`

Правила:

- центральная вкладка всегда самая заметная
- центральная кнопка круглая, визуально выделенная
- по нажатию сотрудник всегда попадает в сегодняшнюю рабочую картину
- если есть overdue задачи или не закрыт attendance action, badge и accent всегда на `Today`

### 4.2 Main Principle

`Today` это не просто home. Это главный рабочий экран сотрудника.

Именно на нём должны быть:

- статус текущей смены
- кнопка `Say Hi` или `Say Goodbye`
- сегодняшние задачи
- сегодняшние встречи / события
- предупреждения
- быстрые success / error feedback

## 5. Primary User Flows

### 5.1 First Launch

1. Splash
2. Language selection if needed
3. Welcome screen
4. Two entry points:
   - `Login`
   - `Join company`

### 5.2 Join Company / Registration Flow

Целевой flow:

1. Пользователь вводит `company code` или открывает invite link
2. Backend определяет `tenant`, `company`, доступный onboarding flow
3. Пользователь вводит базовые данные:
   - first name
   - last name
   - email
   - phone
   - password or OTP confirmation
4. Если политика требует, запрашиваем дополнительные поля профиля
5. Пользователь подтверждает согласия:
   - privacy
   - location usage
   - biometric consent
6. Выполняется первый login
7. Сразу запускается проверка `device binding`
8. Затем face enrollment
9. После завершения пользователь попадает в `Today`

Примечание:

- если текущий backend остаётся на invite-token flow, company code должен быть отдельным public endpoint, который резолвит tenant/company и открывает тот же сценарий регистрации

### 5.3 Regular Login Flow

1. Login screen
2. Ввод email/phone + password/OTP
3. Backend возвращает:
   - access token
   - refresh token
   - employee access status
   - device binding status
   - biometric enrollment status
4. Клиент роутит пользователя:
   - если профиль не завершён -> `Complete profile`
   - если device not primary -> `Bind this device`
   - если biometric not enrolled -> `Face enrollment`
   - если доступ к workspace закрыт -> `Waiting for approval`
   - иначе -> `Today`

### 5.4 Complete Profile Flow

Экран нужен только если профиль ещё неполный.

Поля минимальные:

- first name
- last name
- email
- phone

Опционально по политике tenant:

- avatar
- emergency contact
- address
- nationality / language

Правило:

- сотрудник не должен каждый раз видеть этот экран
- после первого успешного сохранения профиль считается complete

### 5.5 Device Binding Flow

Целевое поведение:

- у сотрудника может быть только одно primary mobile device
- на вебе можно быть авторизованным параллельно
- на втором мобильном устройстве login не даёт рабочий доступ, пока не завершён rebind

Flow:

1. После первого успешного login приложение отправляет fingerprint устройства
2. Backend регистрирует device
3. Если device уже primary -> продолжаем
4. Если primary device отсутствует -> показываем `Make this my work phone`
5. Если primary device уже существует -> показываем blocked / recovery state:
   - request device change
   - contact manager / admin
   - use approved recovery flow

Что должно решаться сервером:

- device identity
- primary flag
- session revocation on old mobile device при успешном rebind
- audit log

### 5.6 Face Enrollment Flow

Цель: сотрудник один раз создаёт reference profile для attendance verification.

Flow:

1. Объясняем, зачем нужна камера
2. Запрашиваем permission
3. Делаем guided capture:
   - face centered
   - slight left
   - slight right
   - optional blink / liveness step
4. Загружаем artifacts
5. Backend создаёт biometric profile
6. Пользователь видит `Face setup completed`

Правила:

- не использовать устрашающий текст
- показывать простой прогресс 1/3, 2/3, 3/3
- если verification provider требует native SDK, переходим с Expo Go на `Expo prebuild + custom dev client`

### 5.7 Daily Check-In Flow: `Say Hi`

Это главный сценарий прихода на работу.

Flow:

1. Пользователь открывает приложение и сразу попадает в `Today`
2. Если allowed action = `check_in`, на экране доминирует одна большая кнопка `Say Hi`
3. Перед submit приложение по шагам проверяет:
   - device is primary
   - location permission granted
   - geolocation received
   - accuracy acceptable
   - employee inside geofence
   - face verification required and passed
4. После submit backend ставит серверное время
5. Backend рассчитывает флаги:
   - on time
   - early
   - late
   - outside geofence
   - manual review required
6. Пользователь получает результат:
   - success state
   - minutes early / late
   - next expected action
7. После успешного `Say Hi` экран `Today` перестраивается под рабочий день

UI блока `Say Hi`:

- large CTA
- строка со сменой: start, end, location
- readiness checklist:
  - Phone verified
  - Location ready
  - Face verified
- понятный error reason вместо generic failure

### 5.8 Daily Work Flow After Check-In

После `Say Hi` пользователь остаётся на `Today`.

На экране должны быть 4 блока в таком порядке:

1. `Current shift`
2. `Today tasks`
3. `Today meetings / events`
4. `Reminders / alerts`

#### Current Shift

Показывает:

- company / location
- start time / expected finish
- actual check-in time
- lateness / earliness
- next legal action: break or goodbye

#### Today Tasks

Показывает только задачи на сегодня и overdue.

Каждая карточка:

- title
- short instruction
- priority
- due time
- required evidence chips:
  - photo required
  - comment required
  - manager review required

Действия:

- `Start`
- `Done`
- `Add photo`
- `Add comment`

Если задача требует несколько пунктов, внутри открывается step-by-step checklist.

#### Today Meetings / Events

Показывает:

- today meeting
- briefing
- training
- schedule note

Если событий нет, блок не должен занимать много места.

#### Reminders / Alerts

Показывает только важное:

- you have not said hi
- task overdue
- meeting in 15 minutes
- do not forget to say goodbye

### 5.9 Task Completion Flow

Цель: сотрудник решает задачу максимально простыми действиями.

Flow:

1. Открывает карточку задачи из `Today`
2. Видит только essential info:
   - what to do
   - where
   - deadline
   - evidence requirements
3. Отмечает checklist items
4. Если требуется фото:
   - открываем camera capture
   - разрешаем несколько фото
   - показываем thumbnails
5. Если требуется comment:
   - короткое текстовое поле
6. Нажимает `Complete task`
7. Backend сохраняет:
   - answers
   - photos
   - geolocation if required
   - completion time
8. После успеха:
   - карточка перемещается в completed
   - на `Today` уменьшается remaining counter
   - если все задачи закрыты, показываем positive completion state

Success message:

- короткое
- визуальное
- без лишнего текста

Пример смыслового состояния:

- `All tasks for today are completed`

### 5.10 Daily Check-Out Flow: `Say Goodbye`

Когда allowed action = `check_out`, на `Today` основная кнопка меняется на `Say Goodbye`.

Flow:

1. Сотрудник нажимает `Say Goodbye`
2. При необходимости повторно проверяем:
   - primary device
   - location
   - face verification by policy
3. Backend ставит server timestamp
4. Backend помечает:
   - on time
   - early leave
   - overtime
5. Показываем summary:
   - check-in time
   - check-out time
   - total shift duration
   - pending incomplete tasks if they есть

Правило:

- если компания запрещает уход при незакрытых обязательных задачах, UI должен показать blocker до отправки
- если политика разрешает уход, но задачи не закрыты, показываем warning, не silent failure

## 6. Screen Map

### 6.1 Auth Stack

- `Splash`
- `Welcome`
- `Login`
- `Join company`
- `Complete profile`
- `Waiting for approval`
- `Bind device`
- `Face enrollment`
- `Permissions help`

### 6.2 Main Tabs

- `Calendar`
- `Today`
- `Profile`

### 6.3 Today Stack

- `Today overview`
- `Task details`
- `Task camera capture`
- `Attendance verification modal`
- `Attendance result modal`

### 6.4 Calendar Stack

- `Monthly calendar`
- `Day details`
- `Upcoming tasks`
- `Shift details`

### 6.5 Profile Stack

- `Profile summary`
- `Personal info`
- `Device status`
- `Biometric status`
- `Attendance history`
- `Logout`

## 7. UX Rules for This Mobile App

### 7.1 General

- one dominant action per screen
- short sentences
- icon support for all critical states
- large touch targets
- minimal typing
- support multi-language from day one

### 7.2 For Low-Friction Worker UX

- не строить интерфейс как HR систему
- не перегружать терминами
- все ежедневные действия должны укладываться в 1-3 тапа
- текст кнопок должен быть прямой:
  - `Say Hi`
  - `Start task`
  - `Done`
  - `Add photo`
  - `Say Goodbye`

### 7.3 Empty and Error States

- отсутствие задач = спокойное positive state
- ошибка геолокации = понятная причина и retry
- отказ камеры = инструкция открыть settings
- device blocked = отдельный экран, а не toast

## 8. Backend Integration Map

### 8.1 Already Relevant Endpoints

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/devices/register`
- `POST /api/v1/devices/confirm-primary`
- `GET /api/v1/devices/me`
- `GET /api/v1/attendance/me/status`
- `POST /api/v1/attendance/check-in`
- `POST /api/v1/attendance/check-out`
- `POST /api/v1/attendance/break-start`
- `POST /api/v1/attendance/break-end`
- `GET /api/v1/tasks/me`
- `POST /api/v1/tasks/{taskId}/submit`
- `POST /api/v1/biometric/enroll/start`
- `POST /api/v1/biometric/enroll/complete`
- `POST /api/v1/biometric/verify`
- `POST /api/v1/biometric/verify/async`
- `POST /api/v1/push/register`

### 8.2 Mobile-Oriented Read Model Needed

Для простого `Today` экрана нужен единый mobile read model, иначе клиент будет собирать экран из слишком многих запросов.

Рекомендуемый endpoint:

- `GET /api/v1/mobile/me/today`

Он должен возвращать:

- employee summary
- current shift
- attendance state
- allowed action
- readiness requirements
- today tasks
- overdue tasks
- today events
- reminders
- counters

Это уберёт лишнюю клиентскую orchestration complexity.

### 8.3 Endpoints to Add or Finalize

- public `company code` resolve endpoint
- `complete profile` endpoint for employee self-service
- employee `access-status` endpoint
- task evidence upload / submit flow unified for mobile
- mobile today read model
- optional `check-in readiness` preflight endpoint

### 8.4 File Upload Strategy

Для мобильных фото и artifacts:

- сначала допустимо использовать upload в `dataUrl`, как уже сделано в отдельных backend flows
- для production лучше перейти на `presigned upload` или multipart upload
- после upload клиент отправляет только `fileId` / artifact reference в командный endpoint

Это особенно важно для:

- task evidence photos
- profile avatar
- biometric frames if size grows

## 9. Mobile Technical Architecture

## 9.1 Platform Choice

Решение:

- продолжаем на `Expo + React Native`
- один кодбейс для `iOS` и `Android`
- используем `Expo Router`
- для production biometric integration готовим `Expo prebuild + custom dev client`

`Flutter` ветку не развиваем параллельно, чтобы не раздвоить продукт и команду.

## 9.2 Client State

Рекомендуется разделить state на 3 слоя:

- auth/session state
- cached server data
- short-lived UI state

Рекомендуемый набор:

- `expo-secure-store` для токенов и device data
- query layer для server cache
- локальный store только для UI flow state

## 9.3 Required Mobile Capabilities

Добавить в приложение:

- `expo-secure-store`
- `expo-location`
- `expo-image-picker` или camera-only capture flow
- production-safe background / retry handling
- notification deep links

## 9.4 Realtime and Notifications

Используем 2 канала:

- push notifications для reminders и event-driven wake-ups
- websocket / socket flow для live updates, если экран уже открыт

Push cases:

- shift starts soon
- you forgot to say hi
- overdue task
- meeting reminder
- do not forget to say goodbye
- biometric review result if manual review occurred

## 10. Security and Compliance Rules

- access token и refresh token только в secure storage
- server time authoritative for attendance
- mobile cannot spoof primary device status
- biometric result and location validation only on server
- attendance action from web for employee is disallowed
- full audit log for:
  - login
  - logout
  - device registration
  - device rebind
  - biometric enrollment
  - biometric verification
  - check-in
  - check-out
  - task completion

## 11. Platform-Specific Notes

### 11.1 iOS

- carefully explain location permission before system prompt
- if background location is not required, do not request it
- face capture must work inside custom dev client, not rely on Expo Go

### 11.2 Android

- учитывать более широкий разброс по quality of camera and GPS
- строить UI c tolerance к медленным permission confirmations
- отдельно тестировать дешёвые устройства и плохую сеть

## 12. Gap Between Current App and Target App

Что нужно поменять в текущем `apps/mobile`:

- заменить demo auth/session на real secure auth
- убрать manager-oriented экраны из employee primary nav
- заменить текущий `workspace` на полноценный `Today`
- собрать attendance, tasks, reminders, meetings в одном экране
- внедрить custom bottom tabs: `Calendar`, `Today`, `Profile`
- сделать `Say Hi / Say Goodbye` центральным action flow
- добавить task photo evidence flow
- добавить explicit device-binding routing
- добавить access-status routing

## 13. Delivery Phases

### Phase 1. Foundation

- убрать demo session
- secure token storage
- real refresh flow
- auth routing by employee status
- company code / invite entry

### Phase 2. Identity and Access

- complete profile screen
- waiting for approval screen
- primary device binding screen
- biometric enrollment screen

### Phase 3. Core Daily Flow

- new `Today` screen
- `Say Hi` preflight + submit
- `Say Goodbye` submit
- shift status block
- reminders block

### Phase 4. Tasks Flow

- today tasks list
- task detail screen
- checklist completion
- photo evidence capture
- final completion flow

### Phase 5. Calendar and Profile

- calendar tab
- upcoming work view
- profile summary
- device and biometric status
- attendance history

### Phase 6. Notifications and Reliability

- push reminders
- websocket refresh
- retry states under poor network
- graceful permission recovery

### Phase 7. Release Hardening

- QA on iOS and Android
- low-end Android test pass
- store metadata
- privacy texts
- analytics and crash monitoring

## 14. Acceptance Criteria

Flow считается готовым, когда:

- новый сотрудник может пройти onboarding без помощи менеджера
- повторный сотрудник открывает приложение и видит только нужное действие дня
- `Say Hi` работает за один понятный сценарий с гео и face verification
- после check-in сотрудник сразу видит сегодняшние задачи и встречи
- task with required photo закрывается end-to-end с upload и сохранением
- `Say Goodbye` завершает смену и фиксирует итог дня
- второй телефон не может тихо получить рабочий доступ
- manager продолжает управлять задачами и политиками через веб-админку

## 15. Recommended Immediate Next Step

Следующий практический шаг в репозитории:

1. зафиксировать этот flow как source of truth
2. переделать `apps/mobile` information architecture под `Calendar / Today / Profile`
3. убрать demo auth и подключить real session storage
4. сделать новый `Today` read model на backend
5. после этого реализовывать `Say Hi` и task completion как два первых production сценария
