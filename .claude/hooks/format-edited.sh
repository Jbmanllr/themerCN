#!/usr/bin/env bash
# Claude Code PostToolUse hook (wired in .claude/settings.json for Edit,
# Write and MultiEdit): T0 of TESTING.md "Verification tiers". Formats the
# file the tool wrote with Prettier, from that file's repository root, so an
# agent never formats by hand. It never blocks: a file Prettier cannot
# format is left as written, and the Stop hook's format check reports it.
set -uo pipefail

file=$(node -e '
  const input = JSON.parse(process.argv[1] || "{}")
  console.log(input.tool_input?.file_path ?? "")
' "$(cat)") || exit 0
[ -f "$file" ] || exit 0
root=$(git -C "$(dirname "$file")" rev-parse --show-toplevel 2>/dev/null) ||
  exit 0
cd "$root" || exit 0
pnpm exec prettier --write --ignore-unknown -- "$file" >/dev/null 2>&1
exit 0
