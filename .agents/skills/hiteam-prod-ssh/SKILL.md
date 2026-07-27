---
name: hiteam-prod-ssh
description: >-
  SSH into the HiTeam production server as root@85.237.211.182. Use when the user
  asks to connect to HiTeam prod, check hiteam.net / api.hiteam.net, inspect
  k3s/ArgoCD for hiteam-main, update hiteam-main-runtime secrets, restart API
  pods, or run kubectl against the HiTeam production cluster.
---

# HiTeam Production SSH

## Access

```bash
ssh root@85.237.211.182
```

One-shot remote command:

```bash
ssh -o BatchMode=yes root@85.237.211.182 '<command>'
```

- Auth: local SSH key (`~/.ssh/id_rsa`)
- Host: `85.237.211.182`
- User: `root`
- Hostname: `srv824870629`

## Kubernetes

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

| Thing | Value |
| --- | --- |
| Namespace | `hiteam-main` |
| Runtime secret | `hiteam-main-runtime` |
| Chart secret | `envs-api` (from Helm values) |
| ArgoCD app | `hiteam-main` |
| Frontend | `https://hiteam.net` |
| API | `https://api.hiteam.net` |

Common checks:

```bash
ssh -o BatchMode=yes root@85.237.211.182 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml; kubectl -n hiteam-main get pods,deploy,ingress,secret'
ssh -o BatchMode=yes root@85.237.211.182 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml; kubectl -n hiteam-main get secret hiteam-main-runtime -o go-template="{{range \$k,\$v := .data}}{{\$k}}{{\"\\n\"}}{{end}}"'
```

## Update runtime env

Merge keys into the existing runtime secret without wiping others:

```bash
ssh -o BatchMode=yes root@85.237.211.182 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml; kubectl -n hiteam-main patch secret hiteam-main-runtime --type merge -p "{\"stringData\":{\"KEY\":\"VALUE\"}}"'
```

Restart API after secret changes:

```bash
ssh -o BatchMode=yes root@85.237.211.182 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml; kubectl -n hiteam-main rollout restart deploy -l app=hiteam-api; kubectl -n hiteam-main rollout status deploy -l app=hiteam-api'
```

If the label selector misses, list deployments first:

```bash
kubectl -n hiteam-main get deploy
```

## Safety

- Prefer read-only inspection first (`get`, `describe`, `logs`).
- Do not delete namespaces, force-push, or wipe secrets without explicit approval.
- Never print secret values into chat; verify by key names only.
- Local `.env` does not affect prod; prod uses `hiteam-main-runtime` + `envs-api`.
