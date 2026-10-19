"use client"

// The open state of the enclosing ControlSection, for its children. Kept out
// of control-section.tsx so that file exports only components (Fast Refresh).

import * as React from "react"

export interface SectionContextValue {
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
}

export const SectionContext = React.createContext<SectionContextValue | null>(
  null
)

/** The enclosing ControlSection's open state; `null` outside any section. */
export function useSectionContext() {
  return React.useContext(SectionContext)
}
