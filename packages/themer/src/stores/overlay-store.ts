"use client";

// Overlay state: open/closed, the active sidebar panel, and the two preview
// modes (inspector, fullscreen). Transient: nothing here persists.
//
// Contract:
// - Closing the editor (close or toggle) turns both modes off. The colour
//   focus store watches `isOpen` to reset its own state.
// - `fullscreenPreview` means the preview covers the editor (a CSS layout),
//   not that the browser is in native fullscreen: enterFullscreen
//   (hooks/use-fullscreen.ts) sets it before asking for native fullscreen,
//   and a refused request leaves it on. That module also keeps it in step
//   with the Fullscreen API (ThemerOverlay mounts that sync).
// - toggleFullscreen must run inside the user's click handler, because
//   requestFullscreen needs that gesture.
//
// See: packages/themer/ARCHITECTURE.md (OverlayStore)

import { create } from "zustand";
import type { ThemerOverlayStore } from "../types";
import { enterFullscreen, exitFullscreen } from "../hooks/use-fullscreen";

export const useOverlayStore = create<ThemerOverlayStore>()((set, get) => {
  const setFullscreen = (fullscreenPreview: boolean) =>
    set({ fullscreenPreview });

  return {
    // State
    isOpen: false,
    activePanel: "colors",
    inspectorMode: false,
    fullscreenPreview: false,

    // Actions
    open: () => set({ isOpen: true }),
    close: () =>
      set({ isOpen: false, inspectorMode: false, fullscreenPreview: false }),
    toggle: () =>
      set((state) => ({
        isOpen: !state.isOpen,
        // Reset modes when closing
        inspectorMode: state.isOpen ? false : state.inspectorMode,
        fullscreenPreview: state.isOpen ? false : state.fullscreenPreview,
      })),
    setActivePanel: (panel) => set({ activePanel: panel }),
    toggleInspector: () =>
      set((state) => ({ inspectorMode: !state.inspectorMode })),
    // Runs inside the click handler, so the browser sees the user gesture
    // that requestFullscreen needs.
    toggleFullscreen: () => {
      if (typeof document === "undefined") return;
      if (get().fullscreenPreview) void exitFullscreen(document, setFullscreen);
      else void enterFullscreen(document, setFullscreen);
    },
  };
});
