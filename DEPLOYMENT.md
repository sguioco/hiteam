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
- `S3_PUBLIC_BASE_URL`
- `BIOMETRIC_PROVIDER`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REKOGNITION_SIMILARITY_THRESHOLD`
- `AWS_BIOMETRIC_ASSUME_ROLE_ARN` optional, only for web AWS liveness UI
- `AWS_BIOMETRIC_SESSION_DURATION_SECONDS` optional
- `AWS_BIOMETRIC_EXTERNAL_ID` optional
- `COMPRE_FACE_BASE_URL` optional fallback
- `COMPRE_FACE_API_KEY` optional fallback
- `COMPRE_FACE_SIMILARITY_THRESHOLD` optional fallback
- `FRONTEND_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`

In production, `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are mandatory,
must be different, and must each contain at least 32 characters. The API fails
startup validation when this contract is not satisfied, so a broken Kubernetes
rollout cannot replace the previous healthy pod.

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
- `S3_PUBLIC_BASE_URL`
- `BIOMETRIC_PROVIDER=aws-rekognition`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REKOGNITION_SIMILARITY_THRESHOLD=90`
- `AWS_BIOMETRIC_ASSUME_ROLE_ARN` optional, only for web AWS liveness UI
- `AWS_BIOMETRIC_SESSION_DURATION_SECONDS=900` optional
- `AWS_BIOMETRIC_EXTERNAL_ID` optional
- `COMPRE_FACE_BASE_URL` optional fallback
- `COMPRE_FACE_API_KEY` optional fallback
- `COMPRE_FACE_SIMILARITY_THRESHOLD=0.75` optional fallback
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

### Biometric note

For the mobile attendance flow the app captures a selfie locally and sends it to `apps/api`.
The backend then calls AWS Rekognition `CompareFaces` and returns the verification result.
This flow does not require opening the AWS liveness widget window in mobile.
The optional AWS liveness bootstrap variables are only needed for the web liveness UI path.

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

## 11. HiTeam VPS Setup For Current Repo

For HiTeam production, keep `web-admin` and `mobile` on the same VPS API service.

Recommended production layout:

- one VPS deployment for `apps/api`
- one PostgreSQL database for that API
- one Redis instance for that API
- `web-admin` and `mobile` both use that same API base URL

Use these client environment variables:

- `NEXT_PUBLIC_API_URL=https://api.hiteam.net`
- `INTERNAL_API_URL=https://api.hiteam.net`
- `EXPO_PUBLIC_API_URL=https://api.hiteam.net`

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

## 12. Multi-organization and multi-location rollout

Deploy this feature in the following order:

1. Put API writes into a short maintenance window.
2. Apply the Prisma schema explicitly:

```bash
pnpm --filter @smart/api prisma:push
```

3. Backfill the current primary location of every employee:

```bash
pnpm --filter @smart/api prisma:backfill-locations
```

4. Run the backfill command a second time. It must report `Created 0 assignment(s)`.
5. Deploy the API and verify `/api/v1/health/ready`.
6. Deploy `web-admin`, then publish the mobile update.
7. Smoke-test with two companies and two locations: create an address, move an
   employee, create a location template and shift, check in/out, and confirm the
   location in Activity and Analytics.

Rollback order:

1. Roll back clients first so they stop using the new endpoints.
2. Roll back the API.
3. Keep the new nullable columns and assignment table in place. They are
   backward-compatible and preserve location history; remove them only in a
   separate reviewed maintenance change.
