# HiTeam ArgoCD Setup

This repo now contains a separate GitOps path for HiTeam Kubernetes deployment.

It does not modify the existing `qr-form-altegio-main` app.

## What is in the repo

- Helm chart: [`.cd`](../.cd)
- Environment-specific values: [`.cd/values.hiteam-main.yaml`](../.cd/values.hiteam-main.yaml)
- ArgoCD application manifest: [`.cd/argocd-application.hiteam-main.yaml`](../.cd/argocd-application.hiteam-main.yaml)
- Image build and release workflow: [`.github/workflows/argocd-release.yml`](../.github/workflows/argocd-release.yml)

## Intended deployment model

1. Push app code to `main`.
2. GitHub Actions builds and pushes:
   - `ghcr.io/sguioco/hiteam-api`
   - `ghcr.io/sguioco/hiteam-web-admin`
3. The workflow updates [`.cd/values.hiteam-main.yaml`](../.cd/values.hiteam-main.yaml) with immutable image tags.
4. ArgoCD sees the new Git state and syncs `hiteam-main`.

## Required GitHub repository variables

Set these in `Settings -> Secrets and variables -> Actions -> Variables`:

- `ARGOCD_WEB_ADMIN_PUBLIC_API_URL`
- `ARGOCD_WEB_ADMIN_PUBLIC_GRAPHQL_URL`
- `ARGOCD_WEB_ADMIN_BASE_URL`
- `ARGOCD_WEB_ADMIN_GOOGLE_MAPS_API_KEY` (optional)

The release workflow fails fast if the first three are missing.

## Required values before first real sync

Edit [`.cd/values.hiteam-main.yaml`](../.cd/values.hiteam-main.yaml) and replace placeholders:

- frontend/backend public hosts
- ingress hosts and tls secret names

The tracked values file is now intended to keep only non-sensitive config.

Sensitive runtime values should go into a separate Kubernetes secret referenced by:

- `sharedInfo.runtimeSecretName`

## GHCR visibility

If GHCR packages are public, keep:

```yaml
sharedInfo:
  pullSecret:
    dockerConfigJson: ""
```

If GHCR packages are private:

1. Create a docker config json with GHCR credentials.
2. Base64 encode it.
3. Put it into:

```yaml
sharedInfo:
  pullSecret:
    name: hiteam-main-docker-secret
    dockerConfigJson: BASE64_DOCKER_CONFIG_JSON
```

## ArgoCD app creation

Use a new app and a new namespace:

- app name: `hiteam-main`
- project: `default`
- cluster: `https://kubernetes.default.svc`
- namespace: `hiteam-main`
- repo URL: `https://github.com/sguioco/hiteam.git`
- revision: `main`
- path: `.cd`
- value files:
  - `values.yaml`
  - `values.hiteam-main.yaml`

Recommended sync settings:

- automated
- prune
- self-heal
- create namespace

Or apply [`.cd/argocd-application.hiteam-main.yaml`](../.cd/argocd-application.hiteam-main.yaml) directly.

## Runtime secret

Before the first sync, create the runtime secret in the target namespace.

Example:

```bash
kubectl create namespace hiteam-main --dry-run=client -o yaml | kubectl apply -f -

kubectl -n hiteam-main create secret generic hiteam-main-runtime \
  --from-literal=DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require' \
  --from-literal=REDIS_URL='redis://svc-redis:6379' \
  --from-literal=S3_ACCESS_KEY='YOUR_ACCESS_KEY' \
  --from-literal=S3_SECRET_KEY='YOUR_SECRET_KEY' \
  --from-literal=GOOGLE_OAUTH_CLIENT_ID='YOUR_GOOGLE_CLIENT_ID' \
  --from-literal=GOOGLE_OAUTH_CLIENT_SECRET='YOUR_GOOGLE_CLIENT_SECRET' \
  --from-literal=GOOGLE_OAUTH_STATE_SECRET='YOUR_GOOGLE_STATE_SECRET' \
  --from-literal=JWT_ACCESS_SECRET='YOUR_JWT_ACCESS_SECRET' \
  --from-literal=JWT_REFRESH_SECRET='YOUR_JWT_REFRESH_SECRET' \
  --from-literal=SYSTEM_SECRET='YOUR_SYSTEM_SECRET' \
  --from-literal=HI_TEAM_INTERNAL_ACCESS_KEY='YOUR_INTERNAL_ACCESS_KEY' \
  --from-literal=COMPRE_FACE_API_KEY='YOUR_COMPRE_FACE_API_KEY'
```

If Redis stays in-cluster through this chart, you can omit `REDIS_URL` and let the chart generate it.

## Legacy VPS deploy

The old SSH/docker-compose workflow is still in the repo as a manual fallback:

- [`.github/workflows/deploy-hiteam-api.yml`](../.github/workflows/deploy-hiteam-api.yml)

It is no longer the primary deployment path.
