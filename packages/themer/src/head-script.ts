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
//
// See: utils/theme-script.ts for what the script does.

import { generateThemeScript } from "./utils/theme-script";

export interface ThemerHeadScriptOptions {
  /** The `storageNamespace` of the Host's `<Themer>`. Default `"themercn"`. */
  storageNamespace?: string;
}

/** The body of the pre-paint restore script, for an inline `<script>`. */
export function getThemerHeadScript({
  storageNamespace,
}: ThemerHeadScriptOptions = {}): string {
  return generateThemeScript({ storageNamespace });
}
