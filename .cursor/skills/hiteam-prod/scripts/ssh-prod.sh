#!/usr/bin/env bash
# Run a command on HiTeam prod via SSH, or open interactive shell if no args.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREDS_FILE="${SCRIPT_DIR}/../credentials.local.md"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
FASTSIGN_CREDS="${REPO_ROOT}/../FastSign/.cursor/skills/fastsign-prod/credentials.local.md"

load_creds() {
  if [[ -f "${CREDS_FILE}" ]]; then
    # shellcheck disable=SC2046
    eval "$(grep -E '^export HITEAM_PROD_' "${CREDS_FILE}" || true)"
  fi

  HOST="${HITEAM_PROD_SSH_HOST:-}"
  USER="${HITEAM_PROD_SSH_USER:-}"
  PASS="${HITEAM_PROD_SSH_PASSWORD:-}"

  if [[ -z "${PASS}" && -f "${FASTSIGN_CREDS}" ]]; then
    # shellcheck disable=SC2046
    eval "$(grep -E '^export FASTSIGN_PROD_' "${FASTSIGN_CREDS}" || true)"
    HOST="${HOST:-${FASTSIGN_PROD_SSH_HOST:-}}"
    USER="${USER:-${FASTSIGN_PROD_SSH_USER:-}}"
    PASS="${FASTSIGN_PROD_SSH_PASSWORD:-}"
  fi

  HOST="${HOST:-85.237.211.182}"
  USER="${USER:-root}"
}

load_creds

SSH_OPTS=(
  -o StrictHostKeyChecking=accept-new
  -o ConnectTimeout=15
)

run_ssh() {
  if [[ -n "${PASS}" ]] && command -v sshpass >/dev/null 2>&1; then
    sshpass -p "${PASS}" ssh "${SSH_OPTS[@]}" "${USER}@${HOST}" "$@"
  elif [[ -n "${PASS}" ]]; then
    echo "sshpass not found; install with: brew install sshpass (macOS) or apt install sshpass (Linux)" >&2
    echo "Or set up SSH key: ssh-copy-id ${USER}@${HOST}" >&2
    exit 1
  else
    ssh "${SSH_OPTS[@]}" "${USER}@${HOST}" "$@"
  fi
}

if [[ $# -eq 0 ]]; then
  exec run_ssh -t bash -l
fi

if [[ $# -eq 1 ]]; then
  run_ssh "$1"
else
  run_ssh "$*"
fi
