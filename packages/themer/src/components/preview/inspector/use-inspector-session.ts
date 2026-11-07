"use client"

// The inspector's session rules, shared by its two entry points (paths ADR:
// Workspace's PreviewTabs and the in-place layouts' PageInspector):
// - active: the inspector mode for the Themer layout in force
//   (useInspectorMode), and the toggle;
// - the pick: a picked class is segmented to its token, whose colour control
//   gets focus;
// - Ctrl+I toggles it, bound only while the inspector is available on the
//   entry point's surface (and not on a frame the Themer cannot read).
//
// An entry point passes its surface and whether the inspector can run there,
// and renders the overlay and toggle. This runs per render, not per pointer
// move: its only listener is the shortcut's, and it adds no work to a move.

import * as React from "react"
import { useColorFocusTrigger } from "../../../hooks/use-color-focus"
import {
  themerShortcuts,
  useKeyboardShortcut,
} from "../../../hooks/use-keyboard-shortcut"
import { useInspectorMode } from "../../../hooks/use-themer-layout"
import { segmentClassName } from "./segment-classname"
import { useInspector, type InspectorState } from "./use-inspector"

export function useInspectorSession({
  surfaceAvailable,
  frame,
  bindingKey,
  hostRef,
  containerRef,
  ignore,
}: {
  /** The entry point's surface can be inspected (e.g. not on mobile). */
  surfaceAvailable: boolean
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
  /** `surfaceAvailable`, unless the frame cannot be read. */
  available: boolean
  focusColor: (value: string) => void
} {
  const { active, toggle } = useInspectorMode()
  const { focusColor } = useColorFocusTrigger()

  const handlePick = React.useCallback(
    (className: string) => {
      const { value } = segmentClassName(className)
      if (value) focusColor(value)
    },
    [focusColor]
  )

  const { state, frameBlocked } = useInspector({
    enabled: active && surfaceAvailable,
    frame,
    bindingKey,
    hostRef,
    containerRef,
    ignore,
    onPick: handlePick,
  })
  const available = surfaceAvailable && !(frame && frameBlocked)

  useKeyboardShortcut({
    key: themerShortcuts.inspector.key,
    modifiers: themerShortcuts.inspector.modifiers,
    callback: toggle,
    enabled: available,
  })

  return { state, active, toggle, available, focusColor }
}
