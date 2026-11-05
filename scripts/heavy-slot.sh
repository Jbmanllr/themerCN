#!/usr/bin/env bash
# Runs a heavy suite (a build, Playwright, the Docker visual run) in the
# clone's one heavy slot, shared by all its worktrees: AGENTS.md
# "Verification tiers", one heavy suite per host at a time. The T1 Stop hook
# runs its Turbo tasks through it.
#
#   scripts/heavy-slot.sh <command> [<arg>...]
#
# The slot is the directory `heavy-slot` in git's common directory, holding
# its holder's pid. While a live process holds it, this waits, up to
# $HEAVY_SLOT_WAIT seconds (default 900); a slot whose holder has exited is
# taken over.
#
#   exit 75  the slot stayed busy; the command did not run
#   else     the command's own status
set -uo pipefail

if [ $# -eq 0 ]; then
  echo "usage: scripts/heavy-slot.sh <command> [<arg>...]" >&2
  exit 64
fi

common=$(git rev-parse --path-format=absolute --git-common-dir) || exit 1
slot=$common/heavy-slot
wait=${HEAVY_SLOT_WAIT:-900}
deadline=$((SECONDS + wait))

until mkdir "$slot" 2>/dev/null; do
  holder=$(cat "$slot/pid" 2>/dev/null)
  if [ -n "$holder" ] && ! kill -0 "$holder" 2>/dev/null; then
    rm -rf "$slot"
    continue
  fi
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "heavy slot busy: held by pid ${holder:-unknown} for over ${wait}s" \
      "($slot); the command did not run." >&2
    exit 75
  fi
  sleep 1
done
trap 'rm -rf "$slot"' EXIT
echo "$$" >"$slot/pid"

"$@"
