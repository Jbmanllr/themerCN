#!/usr/bin/env bash
# Claude Code Stop hook (wired in .claude/settings.json): T1 of AGENTS.md
# "Verification tiers". It keeps the turn from ending while the affected
# lint, typecheck, test, build and package checks fail. It never runs e2e or
# the visual baselines.
#
# Reads the hook input on stdin and works in its `cwd`, the session's
# worktree. The base is $TURBO_SCM_BASE, else the branch's upstream, else
# `main`; changes are committed, staged, unstaged and untracked files
# against the merge base with it.
#
#   exit 0  stop: nothing changed, T1 passed, or nothing changed since the
#           last block (so blocking again could never resolve)
#   exit 2  block: T1 failed; its output's tail is the reason on stderr
set -uo pipefail

input=$(cat)
read_input() {
  node -e '
    const input = JSON.parse(process.argv[1] || "{}")
    console.log(input.cwd ?? process.cwd())
    console.log(input.stop_hook_active === true)
  ' "$input"
}
{
  read -r cwd
  read -r continuing
} < <(read_input)

cd "$cwd" 2>/dev/null || exit 0
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

ref=${TURBO_SCM_BASE:-}
if [ -z "$ref" ]; then
  ref=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' \
    2>/dev/null) || ref=main
fi
if ! base=$(git merge-base "$ref" HEAD 2>/dev/null); then
  echo "Stop hook: no merge base with $ref; T1 not run." >&2
  exit 0
fi

if git diff --quiet "$base" -- &&
  [ -z "$(git ls-files --others --exclude-standard)" ]; then
  exit 0
fi

# The working tree as a tree object (untracked files included), to tell
# whether anything changed since the run that last blocked.
index=$(mktemp)
trap 'rm -f "$index" "$index.out"' EXIT
cp -p "$(git rev-parse --git-path index)" "$index" 2>/dev/null || rm -f "$index"
GIT_INDEX_FILE=$index git add --all &&
  tree=$(GIT_INDEX_FILE=$index git write-tree) || tree=unknown
blocked=$(git rev-parse --git-path claude-stop-t1)

if [ "$continuing" = true ] && [ "$tree" = "$(cat "$blocked" 2>/dev/null)" ]; then
  echo "Stop hook: T1 still fails, unchanged since the last block." >&2
  exit 0
fi

if NO_COLOR=1 TURBO_SCM_BASE=$base pnpm turbo run lint typecheck test \
  build check:package --affected --output-logs=errors-only \
  >"$index.out" 2>&1; then
  rm -f "$blocked"
  exit 0
fi

echo "$tree" >"$blocked"
{
  echo "T1 fails (TURBO_SCM_BASE=$base pnpm turbo run lint typecheck test" \
    "build check:package --affected). Fix it before you stop; never edit" \
    "or delete a test to get green. Last lines:"
  tail -n 60 "$index.out"
} >&2
exit 2
