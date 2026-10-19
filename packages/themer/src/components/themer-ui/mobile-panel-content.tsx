"use client"

// The mobile drawer's body; the desktop twin is sidebar/expanded-content.tsx.

import { PanelTabs } from "../sidebar/panel-tabs"

/**
 * Mobile drawer content: the same panel tabs and panels as the desktop
 * sidebar (PanelTabs), filling the drawer.
 */
export function MobilePanelContent() {
  return (
    <PanelTabs className="h-full" contentClassName="mt-4 overflow-y-auto" />
  )
}
