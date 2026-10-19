"use client"

// Fullscreen preview: the preview area covers the editor chrome (sidebar,
// header, action bar) and, where the browser allows it, the page itself goes
// fullscreen through the Fullscreen API on <html>.
//
// The flag lives in the Themer UI store (`fullscreenPreview`) so the Themer UI,
// the preview tab bar and `useThemer()` agree. This module holds the document
// logic only and never imports the store, so the store can call it:
// - `enterFullscreen` sets the flag at once (the CSS layout is the fallback)
//   and then asks for native fullscreen; a missing API or a refused request
//   leaves the CSS fallback in place.
// - `exitFullscreen` clears the flag and leaves native fullscreen if it is on.
// - `subscribeFullscreen` keeps the flag in step with the browser: leaving
//   native fullscreen (Esc, browser UI) fires `fullscreenchange`; in the CSS
//   fallback the browser does nothing on Esc, so a keydown listener exits,
//   unless an earlier listener already took that Esc (preventDefault).
// - `useFullscreenSync` mounts that subscription while the editor is open,
//   leaves native fullscreen when the flag drops (closing the editor clears
//   it), and dispatches a window `resize` after each change so measured
//   layouts (the Live tab's ResizablePanel) recalculate.
//
// The document is passed in, so tests drive the state machine with a fake.

import { useEffect, useRef } from "react"

type Listener = (event: Event) => void

/** The part of `Document` the fullscreen logic touches. */
export interface FullscreenDocument {
  readonly documentElement: {
    requestFullscreen?: () => Promise<void>
  }
  readonly fullscreenElement?: unknown
  readonly fullscreenEnabled?: boolean
  exitFullscreen?: () => Promise<void>
  addEventListener(type: string, listener: Listener): void
  removeEventListener(type: string, listener: Listener): void
}

/** How fullscreen was entered: the browser API or the CSS-only layout. */
export type FullscreenKind = "native" | "fallback"

function isNativeFullscreen(doc: FullscreenDocument): boolean {
  return (
    doc.fullscreenElement != null &&
    doc.fullscreenElement === doc.documentElement
  )
}

/**
 * Enter fullscreen: set the flag, then request native fullscreen on <html>.
 * Resolves with the kind that ended up active.
 */
export async function enterFullscreen(
  doc: FullscreenDocument,
  setActive: (active: boolean) => void
): Promise<FullscreenKind> {
  setActive(true)
  const root = doc.documentElement
  if (doc.fullscreenEnabled === false || !root.requestFullscreen) {
    return "fallback"
  }
  try {
    await root.requestFullscreen()
    return "native"
  } catch {
    // Refused (no user gesture, permissions policy, iframe without
    // allowfullscreen): the CSS layout already covers the editor.
    return "fallback"
  }
}

/** Leave fullscreen: clear the flag and exit native fullscreen if it is on. */
export async function exitFullscreen(
  doc: FullscreenDocument,
  setActive: (active: boolean) => void
): Promise<void> {
  setActive(false)
  if (!isNativeFullscreen(doc) || !doc.exitFullscreen) return
  try {
    await doc.exitFullscreen()
  } catch {
    // Already left (the browser raced us); nothing to undo.
  }
}

/**
 * Keep the flag in step with the browser. Returns the unsubscribe function.
 */
export function subscribeFullscreen(
  doc: FullscreenDocument,
  isActive: () => boolean,
  setActive: (active: boolean) => void
): () => void {
  let wasNative = isNativeFullscreen(doc)

  const handleChange: Listener = () => {
    const native = isNativeFullscreen(doc)
    // Only our own fullscreen counts: a video going fullscreen is not the
    // preview, but leaving ours (Esc, browser UI) must drop the flag.
    if (native) setActive(true)
    else if (wasNative) setActive(false)
    wasNative = native
  }

  const handleKeyDown: Listener = (event) => {
    const { key } = event as KeyboardEvent
    if (key !== "Escape" || event.defaultPrevented) return
    if (!isActive() || isNativeFullscreen(doc)) return
    setActive(false)
  }

  doc.addEventListener("fullscreenchange", handleChange)
  doc.addEventListener("keydown", handleKeyDown)
  return () => {
    doc.removeEventListener("fullscreenchange", handleChange)
    doc.removeEventListener("keydown", handleKeyDown)
  }
}

/**
 * Mount the fullscreen subscription while the editor is open. Call once, from
 * the Themer UI. `active` is the store flag, `setActive` writes it.
 */
export function useFullscreenSync({
  enabled,
  active,
  getActive,
  setActive,
}: {
  enabled: boolean
  active: boolean
  getActive: () => boolean
  setActive: (active: boolean) => void
}): void {
  useEffect(() => {
    if (!enabled) return undefined
    return subscribeFullscreen(document, getActive, setActive)
  }, [enabled, getActive, setActive])

  // The flag dropped (toggle, close, Esc in the fallback): leave native
  // fullscreen too, then let measured layouts pick up the new size.
  // Only transitions count: on mount nothing changed, and a page that was
  // fullscreen before the editor opened is not ours to leave.
  const previous = useRef(active)
  useEffect(() => {
    if (previous.current === active) return undefined
    previous.current = active
    if (!active && isNativeFullscreen(document)) {
      void document.exitFullscreen().catch(() => undefined)
    }
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [active])
}
