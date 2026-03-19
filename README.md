# Smart Monorepo

## Apps

- `apps/api`: NestJS API with REST and GraphQL entry points
- `apps/web-admin`: Next.js admin interface
- `apps/mobile`: Expo mobile app for employees

## Packages

- `packages/ui`: shared UI tokens and helpers
- `packages/types`: shared app types

## Recommended local workflow

### Web + API

```bash
pnpm db:push
pnpm db:seed
pnpm dev
```

### Mobile separately

```bash
pnpm dev:mobile
```

Expo is kept separate because it is an interactive dev server and should not be multiplexed with Turborepo background processes.

## Why `pnpm dev` is still needed

Docker is useful for reproducible services and deployment-like checks. It is not the best default for inner-loop frontend/mobile development:

- `api` and `web-admin` on the host give faster hot reload and simpler debugging
- Expo mobile is interactive and is intentionally run outside Turborepo/Docker
- many teams use Docker for infra and host processes for app dev for exactly this reason

So the intended split is:

- `pnpm dev`: host development for `api` + `web-admin`
- `pnpm dev:mobile`: Expo separately
- `pnpm docker:infra`: containerized infra
- `pnpm db:push:docker` / `pnpm db:seed:docker`: push and seed Docker PostgreSQL on `localhost:5433`
- `pnpm docker:apps`: run `api` + `web-admin` in Docker when needed

## Docker workflow

### Infra only

```bash
pnpm docker:infra
```

This starts:

- PostgreSQL on `localhost:5433`
- Redis on `localhost:6379`
- MinIO API on `localhost:9000`
- MinIO Console on `localhost:9001`

`5433` is used intentionally so Docker Postgres does not collide with a locally installed PostgreSQL on `5432`.

### Full web stack in Docker

```bash
pnpm db:push:docker
pnpm db:seed:docker
pnpm docker:apps
```

Recommended sequence from a clean Docker state:

```bash
pnpm docker:infra
pnpm db:push:docker
pnpm db:seed:docker
pnpm docker:apps
```

`db:push` and `db:seed` target local PostgreSQL on `localhost:5432`.

`db:push:docker` and `db:seed:docker` target Docker PostgreSQL on `localhost:5433`, so there is no need to hand-edit `.env` files when switching between local and Docker.

`docker:apps` starts `api` and `web-admin` in Docker and wires them to the compose `postgres`, `redis`, and `minio` services.

Mobile Expo is not a good candidate for normal Docker desktop development.

## Demo credentials

After seeding the local database:

- tenant: `demo`
- email: `owner@demo.smart`
- password: `Admin12345!`

## Local services

- PostgreSQL: `localhost:5432`
- Docker PostgreSQL: `localhost:5433`
- Redis: `localhost:6379`
- MinIO API: `localhost:9000`
- MinIO Console: `localhost:9001`
- API: `http://localhost:4000`
- Web admin: `http://localhost:3000`
- Mobile Expo dev server: `http://localhost:8082`

## Key docs

- [PLAN.md](./PLAN.md)
- [PRD.md](./PRD.md)
- [DATA_MODEL.md](./DATA_MODEL.md)
- [API_SPEC.md](./API_SPEC.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
