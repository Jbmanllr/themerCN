"use client"

// The editor on a phone-sized viewport: a bottom drawer with the preset
// select and the same panel tabs as the desktop sidebar (MobilePanelContent).
// ThemerUI renders it instead of the desktop layout when useIsMobile() is
// true; there is no preview pane here. `data-lenis-prevent` leaves the
// drawer's scrolling native in a host that runs Lenis smooth scroll (see
// LenisPause).

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import { PresetSelect } from "../actions/preset-select"
import { MobilePanelContent } from "./mobile-panel-content"

interface MobileDrawerProps {
  onClose: () => void
}

/**
 * Open for as long as it is mounted: ThemerUI renders it only while the
 * Themer UI is open. Calls `onClose` whenever the drawer asks to close.
 */
export function MobileDrawer({ onClose }: MobileDrawerProps) {
  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerHeader className="border-b px-4">
          <DrawerTitle>Themer</DrawerTitle>
        </DrawerHeader>
        <div className="border-b p-4">
          <PresetSelect />
        </div>
        <div className="overflow-y-auto p-4" data-lenis-prevent>
          <MobilePanelContent />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
