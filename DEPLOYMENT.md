# Smart Deployment and Accounts

## 1. Accounts You Should Create

### Required now

- GitHub: source control and CI
- Railway: backend API, worker, PostgreSQL, Redis
- Vercel: web admin deployment

### Required soon

- Expo: mobile build and OTA updates
- Object storage provider: AWS S3, Cloudflare R2, or Supabase Storage
- Sentry: error tracking

### Required later for biometric production flow

- biometric / liveness vendor account
- examples: AWS Rekognition, FaceIO, Onfido, or another provider selected after legal review

## 2. What You Need To Send Me Later

When you are ready for staging or production, send these values:

- GitHub repository URL
- Railway project URL or service names
- Railway PostgreSQL connection string
- Railway Redis connection string
- Vercel project URL
- production frontend domain
- chosen object storage credentials and bucket name
- chosen biometric vendor and API keys
- Sentry DSN if used

Do not send secrets into chat if you do not want them persisted. You can also add them directly into provider dashboards and only send me variable names / domains.

## 3. Local Environment Variables

### API

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `REDIS_URL`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET`
- `FRONTEND_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`

### Web Admin

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_GRAPHQL_URL`

### Mobile

- `EXPO_PUBLIC_API_URL`

## 4. Production Environment Variables

### Railway API service

- `NODE_ENV=production`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET`
- `FRONTEND_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN=15m`
- `JWT_REFRESH_EXPIRES_IN=7d`

### Vercel Web Admin project

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_GRAPHQL_URL`

### Mobile build environment

- `EXPO_PUBLIC_API_URL`

## 5. Recommended Provider Layout

### Railway

Create separate services inside one project:

- `smart-api`
- `smart-postgres`
- `smart-redis`
- later: `smart-worker`

### Vercel

Create one project for:

- `apps/web-admin`

### GitHub

Repository should stay monorepo.

## 6. Railway Setup Checklist

1. Create Railway account.
2. Create new project.
3. Add PostgreSQL service.
4. Add Redis service.
5. Connect GitHub repository.
6. Create API service from repo.
7. Set root directory to `apps/api` if deploying app service separately, or use Dockerfile-based build from repo root with correct context.
8. Add environment variables from section 4.
9. Run Prisma push or migrations against Railway PostgreSQL.

## 7. Vercel Setup Checklist

1. Create Vercel account.
2. Import GitHub repository.
3. Set project root directory to `apps/web-admin`.
4. Add environment variables.
5. Deploy preview.
6. Point production domain later.

## 8. NEST and Railway Clarification

`NestJS` is the backend framework already used in `apps/api`.

What Railway needs from Nest:

- Dockerfile or Node build command
- exposed port from `PORT`
- environment variables
- database connection string
- Redis connection string

There is no separate external registration for Nest itself.

## 9. Database Setup Flow

### Local

```bash
pnpm dev:infra
pnpm db:push
pnpm db:seed
```

### Railway

After PostgreSQL is provisioned:

```bash
pnpm --filter @smart/api prisma:push
```

Run this against Railway `DATABASE_URL`.

## 10. Immediate Recommendation

Do these registrations first:

1. GitHub
2. Railway
3. Vercel
4. Expo

After that, send me:

## 11. Render Setup For Current Repo

If you are already using Render for the backend consumed by `web-admin`, keep `mobile` on the same API service.

Recommended production layout:

- one Render web service for `apps/api`
- one PostgreSQL database for that API
- one Redis instance for that API
- `web-admin` and `mobile` both use that same API base URL

Use these client environment variables:

- `NEXT_PUBLIC_API_URL=https://your-api-service.onrender.com`
- `INTERNAL_API_URL=https://your-api-service.onrender.com`
- `EXPO_PUBLIC_API_URL=https://your-api-service.onrender.com`

Important:

- do not run `prisma db push` in the container startup command
- run schema changes separately before or during deploy as an explicit maintenance step
- use `GET /api/v1/health/live` for liveness checks
- use `GET /api/v1/health/ready` for readiness checks when you want database verification

For this repo, the professional model is not "one backend for web and another for mobile".
It is "one domain backend (`apps/api`) with multiple clients".

1. GitHub repo link
2. Railway project link
3. Vercel project link
4. which object storage provider you want to use

Then I can finish deployment wiring and environment setup precisely.
