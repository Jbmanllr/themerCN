"use client";

// The Themer layout in force: the user's choice (the `layout` preference),
// else the Host's `layout` prop, else Workspace (resolveThemerLayout).

import { usePreferencesStore } from "../stores/preferences-store";
import { useThemerContext } from "../components/themer-provider";
import { resolveThemerLayout } from "../components/themer-ui/layouts/registry";
import type { ThemerLayout } from "../types";

export function useThemerLayout(): ThemerLayout {
  const { config } = useThemerContext();
  const userChoice = usePreferencesStore((state) => state.layout);
  return resolveThemerLayout(userChoice, config.layout);
}
