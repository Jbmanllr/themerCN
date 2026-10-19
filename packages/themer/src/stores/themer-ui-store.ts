"use client"

// Themer UI state: open/closed, the active sidebar panel, the two preview
// modes (inspector, fullscreen) and the open action dialog. Transient:
// nothing here persists.
//
// Contract:
// - Closing the editor (close or toggle) turns both modes off and closes the
//   dialog. The inspector is kept with the Themer layout it was turned on in
//   (useInspectorMode derives whether it is active): a switch made in the UI
//   turns it off (useSetThemerLayout), and a Host-driven switch leaves it
//   inactive. The colour focus store watches `isOpen` to reset its own state.
// - `dialog` is the only open-dialog state. Menus and the action bar call
//   openDialog; ThemerUI renders the dialogs once (actions/
//   themer-dialogs.tsx), so a dialog outlives the surface that opened it.
// - `fullscreenPreview` means the preview covers the editor (a CSS layout),
//   not that the browser is in native fullscreen: enterFullscreen
//   (utils/fullscreen.ts) sets it before asking for native fullscreen,
//   and a refused request leaves it on. That module also keeps it in step
//   with the Fullscreen API (ThemerUI mounts that sync).
// - toggleFullscreen must run inside the user's click handler, because
//   requestFullscreen needs that gesture.
//
// See: packages/themer/ARCHITECTURE.md (ThemerUIStore)

import { create } from "zustand"
import type { ThemerUIStore } from "../types"
import { enterFullscreen, exitFullscreen } from "../utils/fullscreen"

export const useThemerUIStore = create<ThemerUIStore>()((set, get) => {
  const setFullscreen = (fullscreenPreview: boolean) =>
    set({ fullscreenPreview })

  return {
    // State
    isOpen: false,
    activePanel: "colors",
    inspectorLayout: null,
    fullscreenPreview: false,
    dialog: null,

    // Actions
    open: () => set({ isOpen: true }),
    close: () =>
      set({
        isOpen: false,
        inspectorLayout: null,
        fullscreenPreview: false,
        dialog: null,
      }),
    toggle: () =>
      set((state) => ({
        isOpen: !state.isOpen,
        // Reset modes and the dialog when closing
        inspectorLayout: state.isOpen ? null : state.inspectorLayout,
        fullscreenPreview: state.isOpen ? false : state.fullscreenPreview,
        dialog: state.isOpen ? null : state.dialog,
      })),
    setActivePanel: (panel) => set({ activePanel: panel }),
    toggleInspector: (layout) =>
      set((state) => ({
        inspectorLayout: state.inspectorLayout === layout ? null : layout,
      })),
    turnOffInspector: () => set({ inspectorLayout: null }),
    // Runs inside the click handler, so the browser sees the user gesture
    // that requestFullscreen needs.
    toggleFullscreen: () => {
      if (typeof document === "undefined") return
      if (get().fullscreenPreview) void exitFullscreen(document, setFullscreen)
      else void enterFullscreen(document, setFullscreen)
    },
    openDialog: (dialog) => set({ dialog }),
    closeDialog: () => set({ dialog: null }),
  }
})
