"use client"

// The Themer UI: the desktop Themer layout in force (useThemerLayout), or a
// Drawer below breakpoints.wide (1280px, hooks/use-is-mobile.ts) whatever the
// layout. Renders nothing while closed. ThemerRoot mounts it in a portal on
// document.body, inside the Themer's `[data-themer]` scope (themer-scope.tsx).
//
// Contract:
// - LAYOUT_COMPONENTS is the one map from a layout to its component; the
//   rest of what a layout is lives in config/themer-layouts.ts.
// - The layer is `config.zIndex`, else Z_INDEX.sidebar (config/constants.ts).
//   Popups portal into ThemerScope's container one layer above.
// - Layouts read every editing state from the stores, so switching layout
//   keeps the Theme, undo history and active panel. The inspector is the
//   exception: each layout inspects its own surface (Preview tabs or the
//   Host page), so a switch turns it off, as closing does: the switch action
//   clears it, and a Host-driven switch leaves it inactive
//   (hooks/use-themer-layout.ts), then clears it as the old layout leaves.
// - The action dialogs render here, once, beside the layout (ThemerDialogs):
//   a dialog survives the surface that opened it, and a layout switch.
//
// See: packages/themer/ARCHITECTURE.md ("Themer layouts").

import { useLayoutEffect, type ComponentType } from "react"
import { useThemerUIStore } from "../../stores/themer-ui-store"
import { useThemerContext } from "../../hooks/use-themer-context"
import { useIsMobile } from "../../hooks/use-is-mobile"
import { useThemerLayout } from "../../hooks/use-themer-layout"
import { Z_INDEX } from "../../config/constants"
import type { ThemerLayout } from "../../types"
import { MobileDrawer } from "./mobile-drawer"
import { ThemerDialogs } from "../actions/themer-dialogs"
import { useFullscreenSync } from "../../hooks/use-fullscreen"
import { OverlayLayout } from "./layouts/overlay-layout"
import { PushLayout } from "./layouts/push-layout"
import { ToolbarLayout } from "./layouts/toolbar-layout"
import { WorkspaceLayout } from "./layouts/workspace-layout"
import type { ThemerLayoutProps } from "./layouts/types"

const LAYOUT_COMPONENTS: Record<
  ThemerLayout,
  ComponentType<ThemerLayoutProps>
> = {
  workspace: WorkspaceLayout,
  overlay: OverlayLayout,
  push: PushLayout,
  toolbar: ToolbarLayout,
}

const getFullscreen = () => useThemerUIStore.getState().fullscreenPreview
const setFullscreen = (fullscreenPreview: boolean) =>
  useThemerUIStore.setState({ fullscreenPreview })

export function ThemerUI() {
  const isOpen = useThemerUIStore((state) => state.isOpen)
  const close = useThemerUIStore((state) => state.close)
  const isFullscreen = useThemerUIStore((state) => state.fullscreenPreview)
  const { config } = useThemerContext()
  const isMobile = useIsMobile()
  const layout = useThemerLayout()

  // Mounted here, not in Workspace (the only layout with a fullscreen
  // preview): closing unmounts the layout, and leaving native fullscreen on
  // close must still run.
  useFullscreenSync({
    enabled: isOpen && !isMobile,
    active: isFullscreen,
    getActive: getFullscreen,
    setActive: setFullscreen,
  })

  // A Host-driven switch has no event to turn the inspector off in, and the
  // derived check alone would turn it back on when the Host switches back.
  // So the layout that leaves (unmounts) drops an inspector it owned; it is
  // already inactive by then, so no listener binds in between.
  useLayoutEffect(() => {
    if (!isOpen || isMobile) return undefined
    return () => {
      const { inspectorLayout, turnOffInspector } = useThemerUIStore.getState()
      if (inspectorLayout === layout) turnOffInspector()
    }
  }, [isOpen, isMobile, layout])

  if (!isOpen) {
    return null
  }

  if (isMobile) {
    return <MobileDrawer isOpen={isOpen} onClose={close} />
  }

  const Layout = LAYOUT_COMPONENTS[layout]
  return (
    <>
      <Layout onClose={close} zIndex={config.zIndex ?? Z_INDEX.sidebar} />
      <ThemerDialogs />
    </>
  )
}
