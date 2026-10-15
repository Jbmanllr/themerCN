import * as React from "react"

/**
 * Where portalled popups mount; null means document.body. A library that
 * scopes its CSS to its own root (the Themer) provides a container inside
 * that root. AlertDialog, Combobox, ContextMenu, Dialog, Drawer, DropdownMenu,
 * HoverCard, NavigationMenu, Popover, Select, Sheet and Tooltip read it:
 * re-apply `container={usePortalContainer()}` after `shadcn add -o`.
 */
export const PortalContainerContext = React.createContext<HTMLElement | null>(
  null
)

export function usePortalContainer() {
  return React.useContext(PortalContainerContext) ?? undefined
}
