#!/usr/bin/env bash
set -euo pipefail

TASK="${1:-}"
if [ -z "$TASK" ]; then
  echo '{"error":"missing task"}'
  exit 1
fi

ROOT="$(cd "${CLAUDE_SKILL_DIR}/../../../" && pwd)"
cd "$ROOT"

node dist/skillEntry.js --task "$TASK"
