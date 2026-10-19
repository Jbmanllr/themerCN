"use client"

// Highlight target, colour-list search and the pending focus request, shared by the colour controls and
// everything that jumps to a colour through focusColor (contrast dialog,
// palette preview, inspector). Never keep DOM elements here: the picker
// registry is a module-level Map in hooks/use-color-focus.ts, so registering
// a picker never re-renders every subscriber.
//
// The search survives panel switches (the store outlives the panels). All
// three fields are cleared when the editor closes: the ThemerUIStore's close
// actions call clearColorFocus (no import-time subscription, so the module
// has no side effect).
//
// See: packages/themer/ARCHITECTURE.md (ColorFocusStore)

import { create } from "zustand"
import type { ColorFocusStore } from "../types"

export const useColorFocusStore = create<ColorFocusStore>()((set) => ({
  highlightTarget: null,
  colorSearch: "",
  focusRequest: null,

  setHighlightTarget: (target) => set({ highlightTarget: target }),
  setColorSearch: (query) => set({ colorSearch: query }),
}))

/** Clears the highlight, the search and any pending focus request. */
export function clearColorFocus() {
  useColorFocusStore.setState({
    colorSearch: "",
    highlightTarget: null,
    focusRequest: null,
  })
}
