"use client"

// The resolved ThemerConfig, provided by ThemerProvider
// (components/themer-provider.tsx). Kept here, below the components, so hooks
// read the config without importing a component.

import * as React from "react"
import type { ThemerContextValue } from "../types"

export const ThemerContext = React.createContext<ThemerContextValue | null>(
  null
)

/** The Themer's context; throws outside a ThemerProvider. */
export function useThemerContext() {
  const context = React.use(ThemerContext)
  if (!context) {
    throw new Error("useThemerContext must be used within a ThemerProvider")
  }
  return context
}

/** The Themer's context, or `null` outside a ThemerProvider. */
export function useOptionalThemerContext() {
  return React.use(ThemerContext)
}
