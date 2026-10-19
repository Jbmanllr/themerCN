"use client"

// Jump to a colour control from anywhere (contrast dialog, palette preview,
// inspector): open the Colors panel (leaving fullscreen preview, which covers
// the sidebar; on mobile the same activePanel selects the drawer tab), post
// the token as `focusRequest` so the Themer layout shows that panel (the
// sidebar layouts expand their sidebar, the Toolbar opens its Colors popup),
// open the token's section, clear a search that hides it, then, once the
// picker has rendered, scroll it into view and highlight it.
//
// The element registry is a module-level Map, not store state: registering a
// picker per colour token must not re-render anyone, and DOM nodes do not
// belong in reactive (or persisted) state. Pickers subscribe only to
// `highlightTarget === name`, so a highlight re-renders two pickers at most.

import { useCallback, useEffect, useRef } from "react"
import { useColorFocusStore } from "../stores/color-focus-store"
import { useThemerUIStore } from "../stores/themer-ui-store"
import { usePreferencesStore } from "../stores/preferences-store"
import { HIGHLIGHT_ANIMATION_MS } from "../config/constants"
import {
  colorMatchesSearch,
  findColorGroup,
  getColorSectionId,
} from "../utils/color-groups"

const colorRegistry = new Map<string, HTMLElement>()

/** Frames focusColor waits for a picker to mount before giving up. */
const MAX_FOCUS_FRAMES = 20

/**
 * Register a picker element under a token name. Returns the unregister
 * function; it only removes the entry if it still points at this element
 * (a remount may already have replaced it).
 */
export function registerColorElement(
  name: string,
  element: HTMLElement
): () => void {
  colorRegistry.set(name, element)
  return () => {
    if (colorRegistry.get(name) === element) colorRegistry.delete(name)
  }
}

/** The registered element for a token, if its picker is mounted. */
export function getColorElement(name: string): HTMLElement | undefined {
  return colorRegistry.get(name)
}

export interface FocusColorScheduler {
  requestFrame: (callback: () => void) => number
  cancelFrame: (id: number) => void
}

const browserScheduler: FocusColorScheduler = {
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (id) => cancelAnimationFrame(id),
}

let cancelPendingFocus: (() => void) | null = null

/**
 * Open the Colors panel on a token's control, then scroll to and highlight
 * it. Calling again cancels a jump still waiting for its picker. Returns a
 * cancel function.
 */
export function focusColor(
  name: string,
  scheduler: FocusColorScheduler = browserScheduler
): () => void {
  cancelPendingFocus?.()

  // The picker lives in the sidebar, which fullscreen preview covers: leave it
  // (useFullscreenSync then leaves native fullscreen too).
  useThemerUIStore.setState({ activePanel: "colors", fullscreenPreview: false })
  useColorFocusStore.setState({ focusRequest: name })
  const preferences = usePreferencesStore.getState()

  const group = findColorGroup(name)
  if (group) preferences.setSectionOpen(getColorSectionId(group), true)

  const focusStore = useColorFocusStore.getState()
  if (
    focusStore.colorSearch &&
    !colorMatchesSearch(name, focusStore.colorSearch)
  ) {
    focusStore.setColorSearch("")
  }

  let frameId: number | null = null
  let framesLeft = MAX_FOCUS_FRAMES
  // Wait one frame after the picker exists too, so the section has opened
  // (no `hidden` panel) before scrolling.
  let seenElement = false

  const cancel = () => {
    if (frameId !== null) scheduler.cancelFrame(frameId)
    frameId = null
    if (cancelPendingFocus === cancel) {
      cancelPendingFocus = null
      useColorFocusStore.setState({ focusRequest: null })
    }
  }

  const tick = () => {
    frameId = null
    const element = colorRegistry.get(name)
    if (element && seenElement) {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
      useColorFocusStore.getState().setHighlightTarget(name)
      cancel()
      return
    }
    if (element) seenElement = true
    framesLeft -= 1
    if (framesLeft <= 0) {
      cancel()
      return
    }
    frameId = scheduler.requestFrame(tick)
  }

  frameId = scheduler.requestFrame(tick)
  cancelPendingFocus = cancel
  return cancel
}

/**
 * Register a colour control for focus jumps and report whether it is the
 * current highlight (cleared after HIGHLIGHT_ANIMATION_MS).
 */
export function useColorFocus(name: string | undefined) {
  const ref = useRef<HTMLDivElement>(null)
  const isHighlighted = useColorFocusStore(
    (state) => name !== undefined && state.highlightTarget === name
  )

  useEffect(() => {
    const element = ref.current
    if (!name || !element) return undefined
    return registerColorElement(name, element)
  }, [name])

  useEffect(() => {
    if (!isHighlighted) return undefined
    const timer = setTimeout(() => {
      const store = useColorFocusStore.getState()
      if (store.highlightTarget === name) store.setHighlightTarget(null)
    }, HIGHLIGHT_ANIMATION_MS)
    return () => clearTimeout(timer)
  }, [isHighlighted, name])

  return { ref, isHighlighted }
}

/**
 * Hook form of focusColor for components (stable reference).
 */
export function useColorFocusTrigger() {
  const focus = useCallback((name: string) => {
    focusColor(name)
  }, [])
  return { focusColor: focus }
}
