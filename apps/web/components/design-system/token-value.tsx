"use client"

import { useEffect, useRef, useState } from "react"

/**
 * The live value of a CSS variable where this element sits, so each half
 * shows its own mode's value. Re-reads when <html>'s class or style changes:
 * the mode switch and the Themer's edits both land there.
 */
export function TokenValue({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState("")

  useEffect(() => {
    const read = () => {
      if (!ref.current) return
      setValue(getComputedStyle(ref.current).getPropertyValue(name).trim())
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    })
    return () => observer.disconnect()
  }, [name])

  return (
    <span
      ref={ref}
      className="block min-w-0 font-mono text-xs break-words text-muted-foreground"
    >
      {value || " "}
    </span>
  )
}
