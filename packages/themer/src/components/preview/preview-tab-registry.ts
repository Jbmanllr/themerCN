// The preview tab list is data: built-in tabs (Live, Cards, …) plus the
// host's `ThemerConfig.previewTabs`. These pure helpers merge the two and
// resolve the persisted selection, so the tab bar and the body render from
// one list and an unknown persisted id (a removed host tab, an old build)
// falls back to the first tab in render, without an effect writing it back.
//
// Contract: pure functions; the merge never mutates its inputs. The host-facing
// rules (replace by id, `order`, `scroll` default) are public behavior of
// `ThemerProps.previewTabs`.
//
// See: packages/themer/README.md ("`<Themer>` props")

import type { ComponentType } from "react";
import type { ThemerPreviewTab } from "../../types";

/** A resolved tab: built-in or host, with the fields the preview area uses. */
export interface PreviewTabDefinition {
  id: string;
  label: string;
  component: ComponentType;
  scroll: "y" | "xy" | "none";
  order: number;
  /** Host tabs render inside `ThemerConfig.previewWrapper`. */
  source: "builtin" | "host";
  /** Listed in the "More previews" menu instead of the tab bar. */
  inMenu?: boolean;
  /** Hidden from the tab bar below `md` (wide demos). */
  wideOnly?: boolean;
  /** The body is a same-origin frame the inspector binds to. */
  frame?: boolean;
  /** Fills the area edge to edge (no inner padding or rounding). */
  bare?: boolean;
}

/** A built-in tab before merging (order and scroll are required there). */
export type BuiltinPreviewTab = Omit<PreviewTabDefinition, "source">;

/**
 * Merge built-in and host tabs, sorted by `order`. A host tab replaces a
 * built-in tab with the same id (as Host Presets do); a Host tab without
 * `order` goes after every built-in tab, keeping array order. Duplicate host
 * ids keep the first.
 */
export function mergePreviewTabs(
  builtins: readonly BuiltinPreviewTab[],
  hostTabs: readonly ThemerPreviewTab[] = [],
): PreviewTabDefinition[] {
  const lastBuiltinOrder = builtins.reduce(
    (max, tab) => Math.max(max, tab.order),
    0,
  );
  const hostById = new Map<string, PreviewTabDefinition>();
  hostTabs.forEach((tab, index) => {
    if (hostById.has(tab.id)) return;
    hostById.set(tab.id, {
      id: tab.id,
      label: tab.label,
      component: tab.component,
      scroll: tab.scroll ?? "y",
      // Fractional offsets keep array order among host tabs without `order`.
      order: tab.order ?? lastBuiltinOrder + 1 + index / (hostTabs.length + 1),
      source: "host",
    });
  });

  const merged: PreviewTabDefinition[] = [
    ...builtins
      .filter((tab) => !hostById.has(tab.id))
      .map((tab) => ({ ...tab, source: "builtin" as const })),
    ...hostById.values(),
  ];
  // Array.prototype.sort is stable, so equal orders keep insertion order
  // (built-ins first).
  return merged.sort((a, b) => a.order - b.order);
}

/** The tab to show for a persisted id: that tab, else the first one. */
export function resolveActiveTabId(
  tabs: readonly PreviewTabDefinition[],
  persisted: string | undefined,
): string {
  if (persisted && tabs.some((tab) => tab.id === persisted)) return persisted;
  return tabs[0]?.id ?? "";
}
