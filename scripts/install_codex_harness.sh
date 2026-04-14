#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/install_codex_harness.sh [--force] /path/to/target-repo

Legacy wrapper around `rein init --repo`.
EOF
}

FORCE=0
TARGET_REPO=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -n "$TARGET_REPO" ]]; then
        echo "Unexpected extra argument: $1" >&2
        usage >&2
        exit 1
      fi
      TARGET_REPO="$1"
      shift
      ;;
  esac
done

if [[ -z "$TARGET_REPO" ]]; then
  usage >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ "$FORCE" -eq 1 ]]; then
  node "$REPO_ROOT/bin/rein.js" init --repo "$TARGET_REPO" --force
else
  node "$REPO_ROOT/bin/rein.js" init --repo "$TARGET_REPO"
fi
