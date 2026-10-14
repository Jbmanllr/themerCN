"use client";

// The editor as a host app mounts it for local development, beside the host's
// tree (host/gate.tsx): ThemerProvider and the trigger and overlay
// (ThemerOverlayOnly), with the editor's own QueryClient.
//
// Contract:
// - It takes no children: the host page renders beside it, never inside it,
//   so the page is not remounted when the editor arrives and never sits under
//   the editor's providers. The editor applies its theme to <html>.
// - Its own QueryClient, for the editor alone: the font catalog cache must
//   not share or be cleared with the host's product cache, and the host's
//   queries keep the host's client and its freshness rules, because no host
//   component renders below this one (themer-dev-shell.test.tsx).
// - The edited theme persists in this browser's localStorage only.
// - The host stays in charge of the light/dark class (next-themes); the
//   editor only overrides CSS variables.
// - The host compiles the editor's Tailwind utilities itself: its themer.css
//   references its own globals.css and imports the shared
//   ../host/themer.css (`@layer themer`, ordered below the app's
//   `utilities`; README "Host integration contract"). It also passes its own
//   gated font route.
// - Host presets (`presets`, e.g. the host's own brand built from its tokens)
//   and `defaultPreset` pass straight to ThemerConfig; pass `presets` as a
//   module-level constant so the registry is not rebuilt on every render.
// - Host extra colours (`extraColors`, tokens beyond the shadcn set) pass to
//   ThemerConfig.extraColors; a module-level constant too.
// - Host preview tabs (`previewTabs`, lazy components) and the wrapper that
//   gives them the host's providers (`previewWrapper`) pass straight to
//   ThemerConfig too; both must be module-level constants for the same reason.
//
// See: packages/themer/README.md ("Host integration contract").

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type { ThemePreset, ThemerConfig, ThemerPreviewTab } from "../types";

import { ThemerProvider } from "./themer-provider";
import { ThemerOverlayOnly } from "./themer-root";

const DAY_MS = 24 * 60 * 60 * 1000;

export function ThemerDevShell({
  defaultPreset,
  extraColors,
  fontCatalogEndpoint,
  presets,
  previewTabs,
  previewWrapper,
}: {
  /** Preset a fresh editor starts on (ThemerConfig.defaultPreset). */
  defaultPreset?: string;
  /** Host extra colours (ThemerConfig.extraColors); a module-level constant. */
  extraColors?: ThemerConfig["extraColors"];
  /** The host's gated font route (ThemerConfig.fontCatalogEndpoint). */
  fontCatalogEndpoint: string;
  /** Host presets (ThemerConfig.presets); a module-level constant. */
  presets?: readonly ThemePreset[];
  /** Host preview tabs (ThemerConfig.previewTabs); a module-level constant. */
  previewTabs?: readonly ThemerPreviewTab[];
  /** Providers around host preview tabs (ThemerConfig.previewWrapper). */
  previewWrapper?: ThemerConfig["previewWrapper"];
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: DAY_MS,
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: DAY_MS,
          },
        },
      }),
  );

  const config = useMemo<ThemerConfig>(
    () => ({
      defaultPreset,
      extraColors,
      fontCatalogEndpoint,
      presets,
      previewTabs,
      previewWrapper,
      showTrigger: true,
    }),
    [
      defaultPreset,
      extraColors,
      fontCatalogEndpoint,
      presets,
      previewTabs,
      previewWrapper,
    ],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemerProvider config={config}>
        <ThemerOverlayOnly />
      </ThemerProvider>
    </QueryClientProvider>
  );
}
