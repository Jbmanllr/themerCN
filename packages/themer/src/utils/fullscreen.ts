// Fullscreen preview, the document logic: the preview area covers the editor
// chrome (sidebar, header, action bar) and, where the browser allows it, the
// page itself goes fullscreen through the Fullscreen API on <html>.
//
// The flag lives in the Themer UI store (`fullscreenPreview`) so the Themer UI,
// the preview tab bar and `useThemer()` agree. This module never imports the
// store, so the store can call it:
// - `enterFullscreen` sets the flag at once (the CSS layout is the fallback)
//   and then asks for native fullscreen; a missing API or a refused request
//   leaves the CSS fallback in place.
// - `exitFullscreen` clears the flag and leaves native fullscreen if it is on.
// - `subscribeFullscreen` keeps the flag in step with the browser: leaving
//   native fullscreen (Esc, browser UI) fires `fullscreenchange`; in the CSS
//   fallback the browser does nothing on Esc, so a keydown listener exits,
//   unless an earlier listener already took that Esc (preventDefault).
// The React side (useFullscreenSync) is in hooks/use-fullscreen.ts.
//
// The document is passed in, so tests drive the state machine with a fake.

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

/** Whether <html> itself is natively fullscreen (another element is not ours). */
export function isNativeFullscreen(doc: FullscreenDocument): boolean {
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
