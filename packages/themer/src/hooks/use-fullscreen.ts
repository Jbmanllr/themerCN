"use client"

// Fullscreen preview, the React side: `useFullscreenSync` mounts the
// document subscription (utils/fullscreen.ts) while the editor is open,
// leaves native fullscreen when the flag drops (closing the editor clears
// it), and dispatches a window `resize` after each change so measured
// layouts (the Live tab's ResizablePanel) recalculate.

import { useEffect, useRef } from "react"
import { isNativeFullscreen, subscribeFullscreen } from "../utils/fullscreen"

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
