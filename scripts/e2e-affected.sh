#!/usr/bin/env bash
# CI's e2e detector: decides whether the e2e job runs, from the Turbo graph.
#
#   scripts/e2e-affected.sh <task>...
#
# Writes `e2e=true` or `e2e=false` to $GITHUB_OUTPUT (and logs it). It fails
# open: e2e is skipped only on a pull request whose base (the checkout's
# first parent: GitHub's merge commit is built on the base branch tip)
# resolves and on which `turbo query affected --tasks <task>... --exit-code`
# exits 0, nothing affected. Exit 1 (affected), exit 2 (query error), any
# other failure, a missing base and every other event run e2e.
set -euo pipefail

e2e=true
if [ "${GITHUB_EVENT_NAME:-}" != pull_request ]; then
  reason="${GITHUB_EVENT_NAME:-unknown} event: every task runs"
elif ! base=$(git rev-parse --verify --quiet 'HEAD^1'); then
  reason="no base: the checkout has no first parent"
else
  status=0
  pnpm exec turbo query affected --tasks "$@" --base "$base" --exit-code ||
    status=$?
  case $status in
    0)
      e2e=false
      reason="no $* task affected since $base"
      ;;
    1) reason="affected since $base" ;;
    *) reason="turbo query exited $status" ;;
  esac
fi

echo "e2e=$e2e ($reason)"
echo "e2e=$e2e" >>"${GITHUB_OUTPUT:?GITHUB_OUTPUT is not set}"
