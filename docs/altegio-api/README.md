# Altegio OpenAPI specifications

Скачано с официального портала: https://developer.alteg.io  
Дата: 2026-07-22

Оригинал у Altegio — YAML (`/_bundle/en/.../openapi.yaml`).  
JSON — конвертация из YAML для удобства.

| Файл | API | Base URL | Paths |
|------|-----|----------|-------|
| `en-b2b-v2.openapi.*` | Business Management v2 (рекомендуется для новых интеграций) | `https://api.alteg.io/api/v2` | 32 |
| `en-b2b-v1.openapi.*` | Business Management v1 (deprecated, backward compat) | `https://api.alteg.io/api/v1` | 202 |
| `en-public.openapi.*` | Online Booking (публичная запись) | `https://api.alteg.io/api/v1` | 22 |
| `en-developers.openapi.*` | Developer Tools (партнёрские интеграции) | `https://api.alteg.io/api/v1` | 19 |

## Источники

```
https://developer.alteg.io/_bundle/en/b2b-v2/openapi.yaml
https://developer.alteg.io/_bundle/en/b2b-v1/openapi.yaml
https://developer.alteg.io/_bundle/en/public/openapi.yaml
https://developer.alteg.io/_bundle/en/developers/openapi.yaml
```

Документация в браузере:
- https://developer.alteg.io/en/b2b-v2/openapi
- https://developer.alteg.io/en/b2b-v1/openapi
- https://developer.alteg.io/en/public/openapi
- https://developer.alteg.io/en/developers/openapi

## Обновление

```bash
cd docs/altegio-api
curl -fsSL -o en-b2b-v2.openapi.yaml https://developer.alteg.io/_bundle/en/b2b-v2/openapi.yaml
curl -fsSL -o en-b2b-v1.openapi.yaml https://developer.alteg.io/_bundle/en/b2b-v1/openapi.yaml
curl -fsSL -o en-public.openapi.yaml https://developer.alteg.io/_bundle/en/public/openapi.yaml
curl -fsSL -o en-developers.openapi.yaml https://developer.alteg.io/_bundle/en/developers/openapi.yaml
```
