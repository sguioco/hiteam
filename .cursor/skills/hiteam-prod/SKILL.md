---
name: hiteam-prod
description: >-
  SSH into HiTeam production server (k3s) and run kubectl diagnostics. Use when
  investigating prod logs, Altegio integration, deploy status, secrets in
  hiteam-main-runtime, or when the user mentions HiTeam prod, hiteam.net,
  api.hiteam.net, 85.237.211.182, or srv824870629.
---

# HiTeam production server

## Credentials

Read [credentials.local.md](credentials.local.md) before connecting. That file is gitignored and contains SSH host/user/password.

If missing, copy from [credentials.local.example.md](credentials.local.example.md) and fill in the password. HiTeam prod shares the same host as FastSign — you can copy values from `../FastSign/.cursor/skills/fastsign-prod/credentials.local.md`.

**Never commit credentials.local.md.**

## Connect

**Agent: run `ssh-prod.sh` via Shell with `required_permissions: ["all"]`.**  
Default sandbox blocks outbound SSH; the skill does not bypass that — full permissions do.

Prefer the wrapper script (uses `sshpass` when available):

```bash
.cursor/skills/hiteam-prod/scripts/ssh-prod.sh 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml; kubectl -n hiteam-main get pods'
```

Interactive shell:

```bash
.cursor/skills/hiteam-prod/scripts/ssh-prod.sh
```

Manual fallback:

```bash
ssh root@85.237.211.182
```

## Environment

| Item | Value |
|------|-------|
| Host | `85.237.211.182` |
| User | `root` |
| Hostname | `srv824870629` |
| K8s | k3s (`KUBECONFIG=/etc/rancher/k3s/k3s.yaml`) |
| Namespace | `hiteam-main` |
| Runtime secret | `hiteam-main-runtime` |
| Chart secret | `envs-api` |
| ArgoCD app | `hiteam-main` |
| Frontend | `https://hiteam.net` |
| API | `https://api.hiteam.net` |
| API deployment label | `app=hiteam-api` |

Also see: [docs/ARGOCD_HITEAM.md](../../../docs/ARGOCD_HITEAM.md), [docs/ALTEGIO_MARKETPLACE.md](../../../docs/ALTEGIO_MARKETPLACE.md).

## Common commands

Namespace shortcut:

```bash
NS=hiteam-main
```

Pods / deploy / ingress:

```bash
.cursor/skills/hiteam-prod/scripts/ssh-prod.sh 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml; kubectl -n hiteam-main get pods,deploy,ingress'
```

List runtime secret keys (names only):

```bash
.cursor/skills/hiteam-prod/scripts/ssh-prod.sh 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml; kubectl -n hiteam-main get secret hiteam-main-runtime -o go-template="{{range \$k,\$v := .data}}{{println \$k}}{{end}}"'
```

API logs:

```bash
.cursor/skills/hiteam-prod/scripts/ssh-prod.sh 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml; kubectl -n hiteam-main logs -l app=hiteam-api --since=1h --timestamps | tail -100'
```

Altegio-related env keys:

```bash
.cursor/skills/hiteam-prod/scripts/ssh-prod.sh 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml; kubectl -n hiteam-main get secret hiteam-main-runtime -o go-template="{{range \$k,\$v := .data}}{{println \$k}}{{end}}" | grep ALTEGIO'
```

## Update runtime env

Merge keys into the existing runtime secret without wiping others:

```bash
.cursor/skills/hiteam-prod/scripts/ssh-prod.sh 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml; kubectl -n hiteam-main patch secret hiteam-main-runtime --type merge -p "{\"stringData\":{\"KEY\":\"VALUE\"}}"'
```

Restart API after secret changes:

```bash
.cursor/skills/hiteam-prod/scripts/ssh-prod.sh 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml; kubectl -n hiteam-main rollout restart deploy -l app=hiteam-api; kubectl -n hiteam-main rollout status deploy -l app=hiteam-api'
```

## Workflow

1. Read credentials.local.md.
2. Run diagnostics via `ssh-prod.sh` — do not ask the user to paste logs if SSH works.
3. Correlate with project docs and API code under `apps/api/src/modules/`.
4. Local `.env` does not affect prod; prod uses `hiteam-main-runtime` + `envs-api`.

## Security

- Read-only by default on prod (`get`, `describe`, `logs`, key names only).
- Do not run destructive kubectl/SQL unless the user explicitly asks.
- Never print secret values into chat; verify by key names only.
- Prefer SSH keys over password long term; rotate password if exposed in chat.
