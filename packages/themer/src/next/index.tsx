"use client"

// `themercn/next`: the Next Adapter's client side. `<ThemerHeadScript>` puts
// the head-script string (../head-script.ts) in the root layout's <head> as a
// plain inline <script>, so a saved Theme paints before React runs.
//
// Contract:
// - Imports only React, ../head-script and constants: this entry reaches no
//   Themer code (scripts/check-entries.mjs), so it can render even where the
//   Themer is off. With nothing saved, the script changes nothing.
// - A raw element, not next/script: an inline `beforeInteractive` script is
//   run by Next's runtime, which need not come before first paint.
// - It runs once, from the server HTML. When the document renders again on
//   the client (a not-found page under next dev), React 19 warns about any
//   client-rendered script; so once hydrated it renders as a data block,
//   which React accepts and the browser never runs (next-themes does the
//   same). The hydration flag is false for the server HTML and during
//   hydration, so the hydrated markup matches the server's.
// - The string is built once per namespace (no prop counts as the default
//   one) for the module's life (once in the server realm, once in the
//   browser's), so the server,
//   hydration and post-hydration renders share it (the paths ADR's Page load
//   contract). getThemerHeadScript stays uncached: the cache lives here.
// - No CSP nonce or next.config helper: CSP is the Host app's job.

import { DEFAULT_STORAGE_NAMESPACE } from "../config/constants"
import { getThemerHeadScript } from "../head-script"
import { useHydrated } from "../hooks/use-hydrated"

// One head-script string per resolved storage namespace.
const headScripts = new Map<string, string>()

function headScriptFor(storageNamespace = DEFAULT_STORAGE_NAMESPACE): string {
  let script = headScripts.get(storageNamespace)
  if (script === undefined) {
    script = getThemerHeadScript({ storageNamespace })
    headScripts.set(storageNamespace, script)
  }
  return script
}

/** Props of `<ThemerHeadScript>`. */
export interface ThemerHeadScriptProps {
  /** The `storageNamespace` of the Host's `<Themer>`. Default `"themercn"`. */
  storageNamespace?: string
}

/**
 * Restores the saved Theme before first paint. Render it in the root
 * layout's `<head>`, with the same `storageNamespace` as your `<Themer>`.
 */
export function ThemerHeadScript({ storageNamespace }: ThemerHeadScriptProps) {
  const hydrated = useHydrated()
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: headScriptFor(storageNamespace),
      }}
      id="themer-head-script"
      type={hydrated ? "application/json" : undefined}
    />
  )
}
