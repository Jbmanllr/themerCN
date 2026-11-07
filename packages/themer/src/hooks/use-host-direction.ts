"use client"

// The Host page's `dir` attribute on <html>, followed as it changes through
// the shared <html> observer (html-attribute-observer.ts). Internal: Host
// preview tabs take the page's direction back from the Themer root's
// `dir="ltr"` (themer-scope.tsx). A direction set only in CSS is not seen.

import { useSyncExternalStore } from "react"

import { subscribeToHtmlAttribute } from "./html-attribute-observer"

const subscribeToRootDir = (onChange: () => void) =>
  subscribeToHtmlAttribute("dir", onChange)

const getRootDir = () => document.documentElement.dir
const getServerDir = () => ""

/** `<html dir>`, or undefined when the Host sets none. */
export function useHostDirection(): string | undefined {
  return (
    useSyncExternalStore(subscribeToRootDir, getRootDir, getServerDir) ||
    undefined
  )
}
