"use client"

// The Host page's `dir` attribute on <html>, followed as it changes (a
// MutationObserver, as useRootClassMode follows `.dark`). Internal: Host
// preview tabs take the page's direction back from the Themer root's
// `dir="ltr"` (themer-scope.tsx). A direction set only in CSS is not seen.

import { useSyncExternalStore } from "react"

function subscribeToRootDir(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["dir"],
  })
  return () => observer.disconnect()
}

const getRootDir = () => document.documentElement.dir
const getServerDir = () => ""

/** `<html dir>`, or undefined when the Host sets none. */
export function useHostDirection(): string | undefined {
  return (
    useSyncExternalStore(subscribeToRootDir, getRootDir, getServerDir) ||
    undefined
  )
}
