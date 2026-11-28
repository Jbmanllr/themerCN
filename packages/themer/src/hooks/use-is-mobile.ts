"use client"

// Viewport hooks for the editor's layout switch (desktop vs mobile drawer).

import { useSyncExternalStore } from "react"

// The editor switches to its mobile drawer below 1280 (1280px).
// Its desktop layout renders the stock @workspace/ui Sidebar, which becomes a
// Sheet below shadcn's own 768px, so this value must never drop under 768:
// the desktop layout would then draw around a Sidebar in Sheet mode.
const MOBILE_BREAKPOINT = 1280

const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia(MOBILE_QUERY)
  media.addEventListener("change", onStoreChange)
  return () => media.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

function getServerSnapshot() {
  return false
}

/**
 * Hook to detect mobile viewport. Reads the media query with
 * useSyncExternalStore, so a component that mounts while the editor is open
 * gets the right value on its first render; the server snapshot is false.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
