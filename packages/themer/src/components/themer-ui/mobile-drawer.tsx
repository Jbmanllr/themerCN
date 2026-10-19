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
import {
  useApplyThemePreset,
  usePreset,
} from "../../hooks/use-editor-selectors"
import { PresetSelect } from "../actions/preset-select"
import { MobilePanelContent } from "./mobile-panel-content"

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Calls `onClose` whenever the drawer asks to close; an open request does
 * nothing.
 */
export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  // Narrow selections: the drawer re-renders on preset changes only.
  const preset = usePreset()
  const applyPreset = useApplyThemePreset()

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerHeader className="border-b px-4">
          <DrawerTitle>Theme Editor</DrawerTitle>
        </DrawerHeader>
        <div className="border-b p-4">
          <PresetSelect value={preset ?? "default"} onChange={applyPreset} />
        </div>
        <div className="overflow-y-auto p-4" data-lenis-prevent>
          <MobilePanelContent />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
