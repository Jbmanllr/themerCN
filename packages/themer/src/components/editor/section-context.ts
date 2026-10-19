// RETIRED (#64): nothing imports this file. It was a context nothing read, so
// ControlSection no longer provides it. It stays only until the owner removes
// it from the repo.
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
