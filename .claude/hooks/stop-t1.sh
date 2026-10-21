#!/usr/bin/env bash
# Claude Code Stop and SubagentStop hook (wired in .claude/settings.json): T1
# of AGENTS.md "Verification tiers". It keeps the turn (or the subagent) from
# ending while the affected lint, typecheck, test (the root's repo-wide
# checks included), build and package checks fail. It never runs e2e or the
# visual baselines.
#
# Reads the hook input on stdin and works in its `cwd`, the session's (or the
# subagent's) worktree. The base is $TURBO_SCM_BASE, else `main`, else
# `origin/main` (never the branch's upstream: once pushed, that is the
# branch itself); changes are committed, staged, unstaged and untracked
# files against the merge base with it.
#
#   exit 0  stop: nothing changed, T1 passed, no base ref exists, or nothing
#           changed since the last block (blocking again could never
#           resolve). That last case is no pass: a `systemMessage` on stdout
#           tells the user T1 is still red.
#   exit 2  block: T1 failed, or the base shares no history with HEAD; the
#           reason (T1 output's tail) is on stderr
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

# Lets the turn end while T1 is red, and says so: Claude Code shows a
# systemMessage to the user, and never shows a passing hook's stderr.
give_up() {
  echo "Stop hook: $1" >&2
  node -e 'console.log(JSON.stringify({ systemMessage: process.argv[1] }))' \
    "Stop hook: $1"
  exit 0
}

if [ -n "${TURBO_SCM_BASE:-}" ]; then
  refs=("$TURBO_SCM_BASE")
else
  refs=(main origin/main)
fi
ref=
for candidate in "${refs[@]}"; do
  if git rev-parse --verify --quiet "$candidate^{commit}" >/dev/null; then
    ref=$candidate
    break
  fi
done
if [ -z "$ref" ]; then
  echo "Stop hook: no base to compare with (tried ${refs[*]}); T1 not run." \
    "Set TURBO_SCM_BASE to your integration branch." >&2
  exit 0
fi
if ! base=$(git merge-base "$ref" HEAD 2>/dev/null); then
  message="$ref shares no history with HEAD, so T1 can't run. Set"
  message+=" TURBO_SCM_BASE to your integration branch and run T1."
  [ "$continuing" = true ] && give_up "$message The work is not done."
  echo "Stop hook: $message" >&2
  exit 2
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
  give_up "T1 still fails, with nothing changed since the last block. The work is not done: don't report it done until T1 passes."
fi

if NO_COLOR=1 TURBO_SCM_BASE=$base pnpm turbo run lint typecheck test \
  test:repo build check:package --affected --output-logs=errors-only \
  >"$index.out" 2>&1; then
  rm -f "$blocked"
  exit 0
fi

echo "$tree" >"$blocked"
{
  echo "T1 fails (TURBO_SCM_BASE=$base pnpm turbo run lint typecheck test" \
    "test:repo build check:package --affected). Fix it before you stop;" \
    "never edit or delete a test to get green, and don't report the work" \
    "done while T1 is red. Last lines:"
  tail -n 60 "$index.out"
} >&2
exit 2
