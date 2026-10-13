// When a host app runs the local theme editor: only under `next dev`, and only
// with the host's own flag (an env variable the host names) set to "1".
//
// Why it exists: the editor rewrites every design token on the live page, so
// it must never reach a preview or production deployment. Each host binds its
// flag once (its themer-gate.ts); its next.config.ts reads that to alias the
// editor mount to the passthrough, and its font route reads it to answer 404,
// so both agree on when the editor exists. The flag is read at config load,
// so changing it needs a dev server restart.
//
// Contract: on only when NODE_ENV is "development" and the flag is exactly
// "1"; `env` is a parameter so tests (and each host) can pass their own.
//
// See: packages/themer/README.md ("Host integration contract").

export function isThemerOn(
  flag: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.NODE_ENV === "development" && env[flag] === "1";
}
