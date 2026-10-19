"use client"

// Wheel containment for the editor's portaled scroll lists (font picker,
// Tailwind palette popover): at the top or bottom edge a wheel turn stops
// there instead of chaining into the live preview behind the editor.
//
// Contract: the listener is a native, non-passive `wheel` listener on the
// scrolling element, because React's synthetic wheel handlers are passive and
// cannot `preventDefault`. CSS `overscroll-contain` alone is not enough for
// portaled content.
//
// See: packages/themer/ARCHITECTURE.md (Font Picker Positioning and Scroll
// Ownership).

import * as React from "react"

type ScrollBoundaryWheelEvent = Pick<
  WheelEvent,
  "deltaY" | "preventDefault" | "stopPropagation"
>

type ScrollBoundaryElement = Pick<
  HTMLElement,
  "clientHeight" | "scrollHeight" | "scrollTop"
>

/**
 * Clamp wheel events at a portaled scroll area's edges so the page behind the
 * editor does not take over scrolling. Not exported: useScrollBoundary binds it.
 */
function containScrollBoundary(
  event: ScrollBoundaryWheelEvent,
  scrollable: ScrollBoundaryElement
) {
  if (event.deltaY === 0) return

  const maxScrollTop = scrollable.scrollHeight - scrollable.clientHeight

  if (maxScrollTop <= 0) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  const nextScrollTop = scrollable.scrollTop + event.deltaY
  const scrollingUpPastStart = event.deltaY < 0 && nextScrollTop < 0
  const scrollingDownPastEnd = event.deltaY > 0 && nextScrollTop > maxScrollTop

  if (scrollingUpPastStart || scrollingDownPastEnd) {
    event.preventDefault()
    event.stopPropagation()
    scrollable.scrollTop = Math.max(0, Math.min(maxScrollTop, nextScrollTop))
  }
}

/**
 * While `enabled`, contain wheel scrolling at the edges of `ref`'s element, or
 * of the descendant matching `viewportSelector` (a ScrollArea's viewport).
 * Binds a frame after mount so portaled content is in place, and rebinds when
 * `rebindKey` changes (the scrolling element may have been replaced).
 */
export function useScrollBoundary(
  ref: React.RefObject<HTMLElement | null>,
  {
    enabled,
    viewportSelector,
    rebindKey,
  }: { enabled: boolean; viewportSelector?: string; rebindKey?: unknown }
) {
  React.useEffect(() => {
    if (!enabled) return undefined

    let scrollable: HTMLElement | null | undefined
    const handleWheel = (event: WheelEvent) => {
      if (scrollable) containScrollBoundary(event, scrollable)
    }
    const animationFrameId = requestAnimationFrame(() => {
      scrollable = viewportSelector
        ? ref.current?.querySelector<HTMLElement>(viewportSelector)
        : ref.current
      scrollable?.addEventListener("wheel", handleWheel, { passive: false })
    })

    return () => {
      cancelAnimationFrame(animationFrameId)
      scrollable?.removeEventListener("wheel", handleWheel)
    }
  }, [enabled, ref, viewportSelector, rebindKey])
}
