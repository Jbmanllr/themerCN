"use client"

// The dialogs the Themer's actions open (contrast checker, CSS import, code
// export), rendered once by ThemerUI beside the Themer layout. They read the
// open dialog from the ThemerUIStore, so the surface that opened one (action
// bar, Toolbar menu, collapsed rail menu) can unmount without closing it.

import { useThemerUIStore } from "../../stores/themer-ui-store"
import { ContrastCheckerDialog } from "../editor/contrast-checker-dialog"
import { CodePanelDialog } from "./code-panel-dialog"
import { CssImportDialog } from "./css-import-dialog"

export function ThemerDialogs() {
  const dialog = useThemerUIStore((state) => state.dialog)
  const closeDialog = useThemerUIStore((state) => state.closeDialog)
  const onOpenChange = (open: boolean) => {
    if (!open) closeDialog()
  }

  return (
    <>
      <ContrastCheckerDialog
        open={dialog === "contrast"}
        onOpenChange={onOpenChange}
      />
      <CssImportDialog
        open={dialog === "importCss"}
        onOpenChange={onOpenChange}
      />
      {/* Mounted only while open: it builds three exports of the theme. */}
      {dialog === "code" ? (
        <CodePanelDialog open onOpenChange={onOpenChange} />
      ) : null}
    </>
  )
}
