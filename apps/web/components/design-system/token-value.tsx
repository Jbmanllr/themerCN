"use client"

import { useState, useSyncExternalStore } from "react"

// One observer for every TokenValue on the page: it counts changes to
// <html>'s class or style (the mode switch and the Themer's edits both land
// there), and each TokenValue re-reads its own variable when the count moves.
let version = 0
const listeners = new Set<() => void>()
let observer: MutationObserver | null = null

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!observer) {
    observer = new MutationObserver(() => {
      version++
      for (const notify of listeners) notify()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    })
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      observer?.disconnect()
      observer = null
    }
  }
}

const getVersion = () => version
const getServerVersion = () => 0

/**
 * The live value of a CSS variable where this element sits, so each half
 * shows its own mode's value. Read during render, from the mounted element.
 */
export function TokenValue({ name }: { name: string }) {
  useSyncExternalStore(subscribe, getVersion, getServerVersion)
  const [element, setElement] = useState<HTMLSpanElement | null>(null)
  const value = element
    ? getComputedStyle(element).getPropertyValue(name).trim()
    : ""

  return (
    <span
      ref={setElement}
      className="block min-w-0 font-mono text-xs break-words text-muted-foreground"
    >
      {value || " "}
    </span>
  )
}
