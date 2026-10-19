"use client"

// The Themer's CSS boundary: its precompiled CSS (src/styles/themer.css,
// built into src/generated/themer-css.ts) applies only under the
// `[data-themer]` root rendered here, and stops at `[data-themer-host]`.
//
// Contract:
// - `[data-themer]` is a bare wrapper with no class or style: `@scope` rules
//   match the root's descendants, so anything styled goes inside it.
// - The root sets `dir="ltr"`: the Themer UI, popups included, is laid out
//   left-to-right in every Host direction, matching its left-pinned sidebar.
// - Base UI popups portal into the `[data-themer-portals]` container (through
//   @workspace/ui's PortalContainerContext), never to <body>, where the
//   scoped CSS would not reach them. The container is fixed at the viewport
//   origin with no size and no overflow clipping, one layer above the
//   Themer UI, so popups position against the viewport and show above it.
// - The <style> is injected while a Themer is mounted and removed after.

import * as React from "react"
import { PortalContainerContext } from "@workspace/ui/lib/portal-container"

import { THEMER_CSS } from "../generated/themer-css"

export const THEMER_STYLE_ATTRIBUTE = "data-themer-style"

/** Injects the Themer's CSS into <head> while the caller is mounted. */
export function useThemerStyle() {
  React.useInsertionEffect(() => {
    const style = document.createElement("style")
    style.setAttribute(THEMER_STYLE_ATTRIBUTE, "")
    style.textContent = THEMER_CSS
    document.head.append(style)
    return () => style.remove()
  }, [])
}

interface ThemerScopeProps {
  children: React.ReactNode
  /** The z-index of the popup layer; above the Themer UI's. */
  popupLayer: number
}

/** The `[data-themer]` root, with the container its popups portal into. */
export function ThemerScope({ children, popupLayer }: ThemerScopeProps) {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null)

  return (
    <div data-themer="" dir="ltr">
      <PortalContainerContext value={container}>
        {children}
      </PortalContainerContext>
      <div
        ref={setContainer}
        data-themer-portals=""
        style={{ position: "fixed", top: 0, left: 0, zIndex: popupLayer }}
      />
    </div>
  )
}
