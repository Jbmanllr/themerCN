"use client"

// The Themer layout in force: the user's choice (the `layout` preference),
// else the Host's `layout` prop, else Workspace (resolveThemerLayout).
//
// Each layout inspects its own surface (Preview tabs or the Host page), so
// the inspector belongs to the layout it was turned on in:
// - useSetThemerLayout, the user's switch, turns it off in the same action;
// - useInspectorMode derives "active" during render, so a Host-driven switch
//   (a new `layout` prop) leaves it inactive without binding its listeners;
//   ThemerUI clears it as the old layout unmounts, so a switch back keeps it
//   off.

import { useCallback } from "react"
import { usePreferencesStore } from "../stores/preferences-store"
import { useThemerUIStore } from "../stores/themer-ui-store"
import { useThemerContext } from "./use-themer-context"
import { resolveThemerLayout } from "../config/themer-layouts"
import type { ThemerLayout } from "../types"

export function useThemerLayout(): ThemerLayout {
  const { config } = useThemerContext()
  const userChoice = usePreferencesStore((state) => state.layout)
  return resolveThemerLayout(userChoice, config.layout)
}

/** The user's switch: saves the layout and turns the inspector off. */
export function useSetThemerLayout() {
  const setLayout = usePreferencesStore((state) => state.setLayout)
  const turnOffInspector = useThemerUIStore((state) => state.turnOffInspector)

  return useCallback(
    (layout: ThemerLayout) => {
      turnOffInspector()
      setLayout(layout)
    },
    [setLayout, turnOffInspector]
  )
}

/** Whether the inspector is on in the layout in force, and its toggle. */
export function useInspectorMode() {
  const layout = useThemerLayout()
  const active = useThemerUIStore((state) => state.inspectorLayout === layout)
  const toggleInspector = useThemerUIStore((state) => state.toggleInspector)
  const toggle = useCallback(
    () => toggleInspector(layout),
    [toggleInspector, layout]
  )

  return { active, toggle }
}
