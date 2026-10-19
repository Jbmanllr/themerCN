// @vitest-environment happy-dom
// Every portalled @workspace/ui component the Themer UI uses must mount its
// popup in the PortalContainerContext container: the Themer's CSS is scoped
// to its own root, so a popup portalled to <body> renders unstyled. A
// `shadcn add -o` reinstall drops the container prop; this test catches it.
import * as React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
} from "@workspace/ui/components/navigation-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Sheet, SheetContent, SheetTitle } from "@workspace/ui/components/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { PortalContainerContext } from "@workspace/ui/lib/portal-container"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const POPUP = "popup-under-test"

const portalled: Record<string, () => React.ReactNode> = {
  Popover: () => (
    <Popover open>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent data-testid={POPUP}>Body</PopoverContent>
    </Popover>
  ),
  Select: () => (
    <Select open defaultValue="a">
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent data-testid={POPUP}>
        <SelectItem value="a">A</SelectItem>
      </SelectContent>
    </Select>
  ),
  DropdownMenu: () => (
    <DropdownMenu open>
      <DropdownMenuTrigger>Open</DropdownMenuTrigger>
      <DropdownMenuContent data-testid={POPUP}>
        <DropdownMenuItem>Item</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  Tooltip: () => (
    <TooltipProvider>
      <Tooltip open>
        <TooltipTrigger>Hover</TooltipTrigger>
        <TooltipContent data-testid={POPUP}>Tip</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
  Dialog: () => (
    <Dialog open>
      <DialogContent data-testid={POPUP}>
        <DialogTitle>Dialog</DialogTitle>
      </DialogContent>
    </Dialog>
  ),
  Sheet: () => (
    <Sheet open>
      <SheetContent data-testid={POPUP}>
        <SheetTitle>Sheet</SheetTitle>
      </SheetContent>
    </Sheet>
  ),
  AlertDialog: () => (
    <AlertDialog open>
      <AlertDialogContent data-testid={POPUP}>
        <AlertDialogTitle>Alert</AlertDialogTitle>
      </AlertDialogContent>
    </AlertDialog>
  ),
  Combobox: () => (
    <Combobox open items={["a"]}>
      <ComboboxInput />
      <ComboboxContent data-testid={POPUP}>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
  ContextMenu: () => (
    <ContextMenu open>
      <ContextMenuTrigger>Area</ContextMenuTrigger>
      <ContextMenuContent data-testid={POPUP}>
        <ContextMenuItem>Item</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
  HoverCard: () => (
    <HoverCard open>
      <HoverCardTrigger>Hover</HoverCardTrigger>
      <HoverCardContent data-testid={POPUP}>Card</HoverCardContent>
    </HoverCard>
  ),
  NavigationMenu: () => (
    <NavigationMenu value="a">
      <NavigationMenuList>
        <NavigationMenuItem value="a">
          <NavigationMenuTrigger>Menu</NavigationMenuTrigger>
          <NavigationMenuContent>Content</NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
      <NavigationMenuPositioner data-testid={POPUP} />
    </NavigationMenu>
  ),
  Drawer: () => (
    <Drawer open>
      <DrawerContent data-testid={POPUP}>
        <DrawerTitle>Drawer</DrawerTitle>
      </DrawerContent>
    </Drawer>
  ),
}

let root: Root | null = null

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  document.body.innerHTML = ""
})

async function render(node: React.ReactNode) {
  const host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root?.render(node))
}

function popup() {
  const el = document.querySelector(`[data-testid="${POPUP}"]`)
  if (!el) throw new Error("popup not rendered")
  return el
}

describe("portalled @workspace/ui components", () => {
  it.each(Object.keys(portalled))(
    "%s mounts its popup in the provided portal container",
    async (name) => {
      const Popup = portalled[name]!
      const container = document.createElement("div")
      document.body.append(container)

      await render(
        <PortalContainerContext.Provider value={container}>
          <Popup />
        </PortalContainerContext.Provider>
      )

      expect(container.contains(popup())).toBe(true)
    }
  )

  it.each(Object.keys(portalled))(
    "%s mounts its popup on <body> without a container",
    async (name) => {
      const Popup = portalled[name]!

      await render(<Popup />)

      expect(popup().closest("[data-base-ui-portal]")?.parentElement).toBe(
        document.body
      )
    }
  )
})
