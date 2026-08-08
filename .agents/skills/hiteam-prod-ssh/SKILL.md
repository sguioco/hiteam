---
name: hiteam-prod-ssh
description: >-
  SSH into the HiTeam production server as root@85.237.211.182. Use when the user
  asks to connect to HiTeam prod, check hiteam.net / api.hiteam.net, inspect
  k3s/ArgoCD for hiteam-main, update hiteam-main-runtime secrets, restart API
  pods, or run kubectl against the HiTeam production cluster.
---

# HiTeam Production SSH

Use the project skill at [.cursor/skills/hiteam-prod/SKILL.md](../../../.cursor/skills/hiteam-prod/SKILL.md).

Quick connect:

```bash
.cursor/skills/hiteam-prod/scripts/ssh-prod.sh '<command>'
```

Credentials: `.cursor/skills/hiteam-prod/credentials.local.md` (gitignored).
