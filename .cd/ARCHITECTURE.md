# HiTeam Helm Chart (.cd/)

This chart is intended for ArgoCD and Kubernetes deployment of:

- `api` (`apps/api`)
- `web-admin` (`apps/web-admin`)
- optional `migrations` Job
- optional in-cluster `postgres`, `redis`, and `minio`
- Traefik ingresses and redirect middlewares

## Safety-first defaults

The chart is conservative by default:

- it does not affect the current VPS/docker-compose setup
- `postgres`, `redis`, and `minio` are disabled by default
- `migrations` are disabled by default
- ingresses are disabled by default

That lets you create the chart in Git and review ArgoCD config before switching any production traffic.

## Recommended first rollout

For the first ArgoCD deployment:

1. Build and push `api` and `web-admin` images to your registry.
2. Keep existing external services first:
   - PostgreSQL
   - Redis
   - MinIO
   - CompreFace
3. Set only:
   - `api.image`
   - `webAdmin.image`
   - external env values in `api.env.*` and `webAdmin.env.*`
   - ingress hosts/tls secrets
4. Deploy to a new namespace and new hostnames.
5. Validate manually.

Only after that should you decide whether to move stateful services into the cluster.

## ArgoCD application settings

Typical ArgoCD app fields:

- Repository URL: this repo URL
- Target revision: `main`
- Path: `.cd`
- Project: `default`
- Namespace: for example `hiteam-main`

Recommended sync settings:

- `CreateNamespace`
- `Automated`
- `Prune`
- `Self Heal`

## Images

The chart assumes images are built outside ArgoCD and pulled from a registry.

You must provide:

- `api.image`
- `webAdmin.image`

If the registry is private, also set:

- `sharedInfo.pullSecret.name`
- `sharedInfo.pullSecret.dockerConfigJson`

## Migrations

The `migrations` Job is disabled by default because the current production `api` image is optimized for runtime and may not always include everything needed for Prisma CLI workflows.

If you enable migrations, use an image that can successfully run the configured migration command.

## Runtime env

The chart creates:

- `envs-api` secret
- `envs-web-admin` secret

Values are injected from `values.yaml` and/or ArgoCD Helm parameters.

## Ingress

The chart is prepared for Traefik and cert-manager similar to the existing cluster setup.

You can enable:

- `ingress.frontend.enabled`
- `ingress.backend.enabled`

And then set:

- frontend host
- backend host
- TLS secret names

## Notes on `web-admin`

`web-admin` is a Next.js app. Runtime envs are injected via Kubernetes, but client-visible `NEXT_PUBLIC_*` values may also need to be baked into the image during CI build time for fully correct client-side behavior.
