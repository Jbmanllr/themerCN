"use client";

// The host's pre-paint restore of a saved theme edit: the body of
// generateThemeScript as a plain inline <script>, for the host's root layout
// <head>. It runs while the HTML is parsed, so a page opened with a saved
// edit paints in it at once instead of switching when the editor's chunk
// loads after hydration.
//
// Contract:
// - Reached only through the host's alias-gated mount module
//   (dev-themer-gate.tsx re-exports it; passthrough.tsx exports a no-op), so
//   no other build compiles it or ships its script, and it renders nothing
//   outside development. With nothing saved, or the theme override off, the
//   script changes nothing.
// - A raw element, not next/script: an inline `beforeInteractive` script is
//   run by Next's runtime, which need not come before first paint.
// - It runs once, from the server HTML. When the document renders again on
//   the client (a not-found page under next dev), React 19 warns about any
//   client-rendered script, and the browser flows fail on a warning; so
//   once hydrated it renders as a data block, which React accepts and the
//   browser never runs (brand-ui's ThemeProvider does the same for
//   next-themes). The hydration flag is false for the server HTML and during
//   hydration, so the hydrated markup matches the server's.
//
// See: ../utils/theme-script.ts, packages/themer/README.md ("Host
// integration contract").

import { useSyncExternalStore } from "react";

import { generateThemeScript } from "../utils/theme-script";

const subscribeToHydration = () => () => {};

export function ThemerHeadScript() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: generateThemeScript() }}
      id="themer-head-script"
      type={hydrated ? "application/json" : undefined}
    />
  );
}
