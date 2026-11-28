"use client"

// The inspector's session rules, shared by its two entry points (paths ADR:
// Workspace's PreviewTabs and the in-place layouts' PageInspector):
// - active: the inspector mode for the Themer layout in force
//   (useInspectorMode), and the toggle;
// - the pick: a picked class is segmented to its token, whose colour control
//   gets focus;
// - Ctrl+I toggles it, bound only while the inspector is available: always,
//   except on a frame the Themer cannot read.
//
// An entry point passes its surface, and renders the overlay and toggle. This runs per render, not per pointer
// move: its only listener is the shortcut's, and it adds no work to a move.

import * as React from "react"
import { focusColor } from "../../../hooks/use-color-focus"
import {
  themerShortcuts,
  useKeyboardShortcut,
} from "../../../hooks/use-keyboard-shortcut"
import { useInspectorMode } from "../../../hooks/use-themer-layout"
import { segmentClassName } from "./segment-classname"
import { useInspector, type InspectorState } from "./use-inspector"

export function useInspectorSession({
  frame,
  bindingKey,
  hostRef,
  containerRef,
  ignore,
}: {
  /** The surface is an iframe (first `iframe` inside the host). */
  frame: boolean
  /** Changes when the inspected surface changes, so the inspector rebinds. */
  bindingKey: string
  hostRef: React.RefObject<HTMLElement | null>
  containerRef: React.RefObject<HTMLElement | null>
  /** Selector of elements inside the host that are not inspected. */
  ignore?: string
}): {
  state: InspectorState
  /** The inspector mode is on for the Themer layout in force. */
  active: boolean
  toggle: () => void
  /** False only on a frame the Themer cannot read (another origin). */
  available: boolean
} {
  const { active, toggle } = useInspectorMode()

  const handlePick = React.useCallback((className: string) => {
    const { value } = segmentClassName(className)
    if (value) focusColor(value)
  }, [])

  const { state, frameBlocked } = useInspector({
    enabled: active,
    frame,
    bindingKey,
    hostRef,
    containerRef,
    ignore,
    onPick: handlePick,
  })
  const available = !(frame && frameBlocked)

  useKeyboardShortcut({
    key: themerShortcuts.inspector.key,
    modifiers: themerShortcuts.inspector.modifiers,
    callback: toggle,
    enabled: available,
  })

  return { state, active, toggle, available }
}
