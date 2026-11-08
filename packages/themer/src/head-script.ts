// `themercn/head-script`: the pre-paint restore of a saved Theme, as a string
// a Host app inlines in a <script> in its <head> (a Vite `transformIndexHtml`
// hook, or `<ThemerHeadScript>` from `themercn/next`). It runs while the HTML
// is parsed, so a page opened with a saved edit paints in it at once instead
// of switching when the Themer loads after hydration.
//
// Contract:
// - No directive, and nothing but the string generator: the built entry
//   imports nothing and reaches no Themer code (scripts/check-entries.mjs),
//   so a Vite config or a server can call it with the Themer off.
// - `storageNamespace` must match the `<Themer storageNamespace>` that saved
//   the Theme (default "themercn"). With nothing saved, or the Theme override
//   off, the script changes nothing.
// - The string never contains `data-themer` (the marker the Vite smoke app
//   greps for in a build with the Themer off).
// - Uncached: each call builds the string again. It depends only on
//   `storageNamespace`, so a caller builds it once per namespace and reuses
//   it (the Next Adapter keeps one per namespace; the Vite recipe builds it
//   with the plugin). The page-load count test counts builds on this export.
//
// See: utils/theme-script.ts for what the script does.

import { generateThemeScript } from "./utils/theme-script"

/** Options of `getThemerHeadScript`. */
export interface ThemerHeadScriptOptions {
  /** The `storageNamespace` of the Host's `<Themer>`. Default `"themercn"`. */
  storageNamespace?: string
}

/**
 * The body of the pre-paint restore script (no `<script>` tag), for an
 * inline `<script>` at the top of `<head>`. It applies the Theme saved under
 * `storageNamespace` while the HTML is parsed, and links the Google family of
 * each of its font slots (sans, heading, serif, mono); with nothing saved, or
 * the Theme override switched off, it changes nothing.
 *
 * Each call builds the string again, and it depends only on
 * `storageNamespace`: build it once and reuse it, not on every request.
 *
 * @example
 * ```ts
 * // A Vite plugin in vite.config.ts: built once, with the plugin
 * const script = getThemerHeadScript()
 * transformIndexHtml: () => [
 *   { tag: "script", children: script, injectTo: "head-prepend" },
 * ]
 * ```
 */
export function getThemerHeadScript({
  storageNamespace,
}: ThemerHeadScriptOptions = {}): string {
  return generateThemeScript({ storageNamespace })
}
