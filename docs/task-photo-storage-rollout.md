# Защищённые фотоотчёты: выпуск

## Контракт

API `GET /api/v1/media/task-photo-proofs/:id/file` требует Bearer JWT. При каждом запросе проверяются актуальный пользователь, workspace/billing, tenant, доступ к задаче и состояние proof. Удалённые/заменённые proof и удалённые задачи недоступны. Для повторяющихся задач проверяются completion и активный template. Недоступный чужой proof возвращает 404, не раскрывая его существование.

Ответ: `Cache-Control: private, no-store`. HTTP response cache исключает `/media`. Серверный hot-object cache хранит только байты и не заменяет проверку прав перед чтением.

Web использует same-origin `/api/task-photo-proofs/:id` с session cookie: proxy передаёт JWT только своему настроенному API. Превью и открытие изображения используют тот же proxy. Mobile передаёт Authorization только фото на origin настроенного API; локальные снимки и demo-изображения не получают JWT. Публичный prefetch фото задач отключён. JWT не помещается в URL.

## Storage — обязательный шаг production-выпуска

Push кода **не изменяет production bucket policy/CDN**. Не считать F-03 полностью закрытым до проверки прямого пути.

1. Снять копию текущих bucket policy, ACL и конфигурации CDN. Определить фактический bucket/endpoint и все публичные grant, включая website/CDN origin.
2. Исключить `tenants/*/tasks/*` из всех anonymous/public GetObject grants. API identity должна сохранить авторизованный GetObject. Проверить существующие object ACL: публичный ACL может обходить отсутствие bucket allow.
3. Сохранить предусмотренную продуктом доступность других префиксов. Локальная политика `infra/storage/local-public-policy.json` сохраняет прежние публичные non-task префиксы; это **не** универсальный безопасный production-шаблон. Экспорты, requests и biometric требуют отдельного privacy review, не считать их защищёнными этой правкой.
4. Очистить CDN/reverse-proxy кэш для старых media URLs и task object URLs: прежний endpoint выставлял годовой public immutable cache. Проверить origin и CDN анонимным запросом к существующему файлу: оба должны отказать.
5. Совместно выпустить API/web и новую мобильную сборку. Старый mobile без Authorization перестанет получать защищённые фото — это намеренная граница безопасности, не возвращать публичный fallback.
6. Приёмка: anonymous 401 API и 403 storage, чужой tenant/задача 404, scoped manager вне локации 404, разрешённый пользователь 200; удаление/замена proof и удаление task прекращают выдачу; проверить web proxy и Android/iOS на актуальной сборке.

Уже скачанные пользователями копии и ранее закэшированные браузером immutable-ответы невозможно обещать отозвать серверной правкой. Для старых публичных объектов при необходимости согласовать ротацию keys и удаление старых объектов после проверки ссылок/резервной копии. Нельзя считать смену URL достаточной, если старый object остаётся публичным.

## Production-проверка 5 октября 2026

- API работает на образе `main-5532159a1dd7cb41320e141601b2dd66950c7903`; ArgoCD сообщает Synced/Healthy.
- Анонимный HEAD к media endpoint существующего proof возвращает 401.
- MinIO bucket `smart-local` имеет anonymous `s3:GetObject` для `arn:aws:s3:::smart-local/*`, а также anonymous ListBucket/GetBucketLocation.
- Анонимный HEAD существующего свежего task object непосредственно к MinIO origin возвращает **200**. Проверка выполнялась без скачивания содержимого и без вывода ключей объектов/секретов.
- Тот же свежий объект через публичный HTTPS storage ingress также возвращает **200** без авторизации.
- Следовательно, защита API уже выпущена, но ACCESS-03 не закрыт: storage позволяет обойти её. Объекты и policy в ходе проверки не изменялись.
- Следующее действие требует согласованного production-изменения: сохранить исходную policy для отката, исключить task prefix из anonymous grants, сохранить авторизованный доступ API и проверить остальные публичные префиксы. Отдельно найти декларативный источник MinIO bucket job, чтобы следующий релиз не вернул широкую policy.

## Production-изменение 5 октября 2026

- Полная пагинированная инвентаризация: biometric — 101, avatars — 22, task photos — 15, announcements — 4; неизвестных префиксов нет. Ключи объектов не выводились.
- Исходная policy сохранена вне контейнера в `docs/storage-policy-backup-2026-10-05.json`, без credentials. Откат: PutBucketPolicy с этим JSON.
- Anonymous GetObject ограничен non-task allowlist. Прежние GetBucketLocation/ListBucket сохранены. Публичность biometric и других non-task файлов требует отдельной проверки безопасности.
- После применения: существующий task object через публичный HTTPS — **403**, авторизованный S3 HeadObject — **200**; существующие файлы всех трёх non-task категорий — **200**.
- Операция проверяла неизменность исходной policy и отсутствие неизвестных префиксов до записи; при ошибке итоговых проверок предусмотрен откат.
- Helm job исправлен: применяет ограниченную policy и не скрывает ошибки её установки. Helm lint/template и `node scripts/test-minio-policy.cjs` прошли.
- Авторизованный S3 HeadObject подтверждает права API identity, но не заменяет runtime-приёмку web/mobile и проверку всех task scopes.

## Локальная проверка

После запуска `createbuckets` новая allowlist применяется ко всему существующему bucket без удаления объектов. `test-access-http.cjs` создаёт собственные временные task/proof/object в синтетическом tenant, проверяет авторизованные байты, no-store, anonymous/raw storage отказ и удалённые task/proof, затем удаляет только созданные им данные.
