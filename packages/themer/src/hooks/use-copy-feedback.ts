"use client"

// Copy text to the clipboard and report `copied` for `duration` ms, for a
// button that swaps its icon or label while the feedback shows. A new copy
// restarts the timer; the timer is cleared on unmount. `copy` resolves to
// whether the text reached the clipboard: `false` when the Clipboard API is
// missing or refuses, and the feedback state is then left as it was.

import * as React from "react"

export function useCopyFeedback(
  duration = 2000
): [copied: boolean, copy: (text: string) => Promise<boolean>] {
  const [copied, setCopied] = React.useState(false)
  const timeoutRef = React.useRef<number | null>(null)

  React.useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    },
    []
  )

  const copy = React.useCallback(
    async (text: string) => {
      if (!navigator.clipboard?.writeText) return false
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        return false
      }
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
      setCopied(true)
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null
        setCopied(false)
      }, duration)
      return true
    },
    [duration]
  )

  return [copied, copy]
}
