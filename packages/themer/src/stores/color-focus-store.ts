"use client";

// Highlight target, colour-list search and the pending focus request, shared by the colour controls and
// everything that jumps to a colour through focusColor (contrast dialog,
// palette preview, inspector). Never keep DOM elements here: the picker
// registry is a module-level Map in hooks/use-color-focus.ts, so registering
// a picker never re-renders every subscriber.
//
// The search survives panel switches (the store outlives the panels). All
// three fields are cleared when the editor closes, by the Themer UI store
// subscription at the bottom of this file.
//
// See: packages/themer/ARCHITECTURE.md (ColorFocusStore)

import { create } from "zustand";
import type { ColorFocusStore } from "../types";
import { useThemerUIStore } from "./themer-ui-store";

export const useColorFocusStore = create<ColorFocusStore>()((set) => ({
  highlightTarget: null,
  colorSearch: "",
  focusRequest: null,

  setHighlightTarget: (target) => set({ highlightTarget: target }),
  setColorSearch: (query) => set({ colorSearch: query }),
}));

useThemerUIStore.subscribe((state, previous) => {
  if (previous.isOpen && !state.isOpen) {
    useColorFocusStore.setState({
      colorSearch: "",
      highlightTarget: null,
      focusRequest: null,
    });
  }
});
