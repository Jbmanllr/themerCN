#!/usr/bin/env bash
# CI's e2e detector: decides whether the e2e job runs, from the Turbo graph.
#
#   scripts/e2e-affected.sh <task>...
#
# Writes `e2e=true` or `e2e=false` to $GITHUB_OUTPUT (and logs it). It fails
# open: e2e is skipped only on a pull request whose base (the checkout's
# first parent: GitHub's merge commit is built on the base branch tip)
# resolves and on which `turbo query` reports no affected <task> that has a
# script. Turbo also lists the scriptless <task> of every package in an
# affected task's graph, and the tasks they need (builds): neither starts a
# browser, so neither counts. A query that fails or answers with anything
# but the affected tasks, a missing base and every other event run e2e.
# $TURBO_SCM_HEAD, when set, replaces HEAD as the change's tip.
set -euo pipefail

e2e=true
if [ "${GITHUB_EVENT_NAME:-}" != pull_request ]; then
  reason="${GITHUB_EVENT_NAME:-unknown} event: every task runs"
elif ! base=$(git rev-parse --verify --quiet 'HEAD^1'); then
  reason="no base: the checkout has no first parent"
else
  head=${TURBO_SCM_HEAD:-HEAD}
  tasks=$(printf '"%s", ' "$@")
  query="query { affectedTasks(base: \"$base\", head: \"$head\", tasks: [${tasks%, }]) { items { fullName name script } } }"
  status=0
  answer=$(pnpm exec turbo query "$query") || status=$?
  if [ "$status" -ne 0 ]; then
    reason="turbo query exited $status"
  # Prints the affected <task>s that have a script, one per line; fails on
  # an answer it can't read.
  elif ! runnable=$(node -e '
    const [answer, ...tasks] = process.argv.slice(1)
    const { data, errors } = JSON.parse(answer)
    if (errors?.length || !Array.isArray(data?.affectedTasks?.items))
      throw new Error("unexpected answer")
    for (const task of data.affectedTasks.items)
      if (tasks.includes(task.name) && task.script) console.log(task.fullName)
  ' "$answer" "$@" 2>/dev/null); then
    reason="turbo query's answer is unreadable"
  elif [ -n "$runnable" ]; then
    reason="affected since $base: ${runnable//$'\n'/ }"
  else
    e2e=false
    reason="no $* task with a script affected since $base"
  fi
fi

echo "e2e=$e2e ($reason)"
echo "e2e=$e2e" >>"${GITHUB_OUTPUT:?GITHUB_OUTPUT is not set}"
