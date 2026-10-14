import * as React from "react"

/** Where portalled popups mount; null means document.body. */
export const PortalContainerContext = React.createContext<HTMLElement | null>(null)

export function usePortalContainer() {
  return React.useContext(PortalContainerContext) ?? undefined
}
