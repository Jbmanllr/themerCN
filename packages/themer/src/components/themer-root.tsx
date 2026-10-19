"use client"

// Puts the Themer UI beside the Host app's tree: the floating trigger and the
// Themer UI, portaled to document.body inside the Themer's CSS scope
// (ThemerScope), and the cleanups that run while it is open. It wraps
// nothing: the Host's page renders beside `<Themer>`, never under it.
// `<Themer>` renders it only on a hydrated client, so it portals at once.
//
// See: packages/themer/ARCHITECTURE.md ("Core Entry Points").

import * as React from "react"
import { createPortal } from "react-dom"
import { useThemerUIStore } from "../stores/themer-ui-store"
import { useThemerContext } from "../hooks/use-themer-context"
import { useIsMobile } from "../hooks/use-is-mobile"
import { useThemerLayout } from "../hooks/use-themer-layout"
import { Z_INDEX } from "../config/constants"
import { ThemerUI } from "./themer-ui"
import { THEMER_LAYOUTS } from "../config/themer-layouts"
import { ThemerScope } from "./themer-scope"
import { ThemerTrigger } from "./themer-trigger"
import { LenisPause } from "./lenis-pause"

/**
 * The Themer UI's root: the trigger and ThemerUI in a portal on <body>, the
 * Lenis pause while the open Themer UI hides the page (the mobile drawer, a
 * layout that covers the page), and the body scroll lock while it is open on
 * mobile.
 */
export function ThemerRoot() {
  const isOpen = useThemerUIStore((state) => state.isOpen)
  const { config } = useThemerContext()
  const isMobile = useIsMobile()
  const layout = useThemerLayout()
  const hidesPage = isMobile || THEMER_LAYOUTS[layout].coversPage

  // Disable body scroll when open on mobile
  // Save/restore previous overflow value to avoid conflicts
  React.useEffect(() => {
    if (!isOpen || !isMobile) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, isMobile])

  return (
    <>
      <LenisPause active={isOpen && hidesPage} />

      {createPortal(
        <ThemerScope popupLayer={(config.zIndex ?? Z_INDEX.sidebar) + 1}>
          <ThemerTrigger />
          <ThemerUI />
        </ThemerScope>,
        document.body
      )}
    </>
  )
}
