#!/usr/bin/env bash
# Runs the Playground's `visual` Playwright project inside the pinned
# mcr.microsoft.com/playwright image, the only place baselines are made.
#
#   pnpm e2e:update-snapshots   regenerate apps/web visual baselines
#   pnpm e2e:visual             compare against the committed baselines
#
# On any host. CI, already in that image, runs the same project as the
# Playground's `visual` Turbo task instead; `pnpm e2e` never runs it.
#
# Extra arguments go to `playwright test` (e.g. `-g pricing`).
#
# The repo is copied into the container (without node_modules or build
# output) so the host's platform-specific installs are never touched; only
# the snapshot directory is copied back, and only when updating.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
# The image tag must match the @playwright/test pin, or the browser build
# (and so the baselines) would differ from CI's.
version="$(node -p 'require(process.argv[1]).devDependencies["@playwright/test"]' "$root/apps/web/package.json")"
image="mcr.microsoft.com/playwright:v${version}-noble"

update=false
for arg in "$@"; do
  [[ "$arg" == "--update-snapshots" || "$arg" == "-u" ]] && update=true
done

docker run --rm --ipc=host --init \
  -v "$root:/src:ro" \
  -v "$root/apps/web/e2e:/out" \
  -v themercn-pnpm-store:/pnpm-store \
  -e CI=true \
  -e npm_config_store_dir=/pnpm-store \
  -e UPDATE="$update" \
  -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
  -w /work \
  "$image" \
  bash -euo pipefail -c '
    tar -C /src \
      --exclude=./.git --exclude=node_modules --exclude=.next --exclude=dist \
      --exclude=dist-e2e --exclude=.turbo --exclude=playwright-report \
      --exclude=test-results -cf - . | tar -xf -
    corepack enable
    CI=true pnpm install --frozen-lockfile
    pnpm turbo build --filter=web --output-logs=errors-only
    cd apps/web
    status=0
    pnpm exec playwright test --project=visual "$@" || status=$?
    if [[ "$UPDATE" == true ]]; then
      rm -rf /out/visual.spec.ts-snapshots
      cp -R e2e/visual.spec.ts-snapshots /out/
      chown -R "$HOST_UID:$HOST_GID" /out/visual.spec.ts-snapshots
    fi
    exit $status
  ' playwright-docker "$@"
