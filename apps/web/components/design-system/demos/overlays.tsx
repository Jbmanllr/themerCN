"use client"

import {
  CoffeeIcon,
  LogOutIcon,
  PackageIcon,
  SettingsIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react"

import { State } from "@/components/design-system/specimen"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@workspace/ui/components/command"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

export function DialogDemo() {
  return (
    <State label="Closed; open it">
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Edit delivery address
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delivery address</DialogTitle>
            <DialogDescription>
              We ship on Tuesdays. Changes made before Monday noon apply to the
              next box.
            </DialogDescription>
          </DialogHeader>
          <Input aria-label="Address" defaultValue="12 Lark Lane, London" />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <DialogClose render={<Button />}>Save address</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </State>
  )
}

export function AlertDialogDemo() {
  return (
    <State label="Closed; open it">
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" />}>
          Cancel subscription
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your last box ships on Tuesday. You can subscribe again at any
              time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction>Cancel subscription</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </State>
  )
}

export function SheetDemo() {
  return (
    <State label="Closed; open from the right or the bottom">
      {(["right", "bottom"] as const).map((side) => (
        <Sheet key={side}>
          <SheetTrigger render={<Button variant="outline" />}>
            Open from the {side}
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Your bag</SheetTitle>
              <SheetDescription>2 items, ready to check out.</SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <Button>Check out</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ))}
    </State>
  )
}

export function DrawerDemo() {
  return (
    <State label="Closed; open it, then swipe it away">
      <Drawer>
        <DrawerTrigger render={<Button variant="outline" />}>
          Brew timer
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Bloom for 45 seconds</DrawerTitle>
            <DrawerDescription>
              Pour twice the coffee&apos;s weight in water, then wait.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose render={<Button />}>Start pouring</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </State>
  )
}

export function PopoverDemo() {
  return (
    <State label="Closed; open it">
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>
          Grind guide
        </PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Medium-fine</PopoverTitle>
            <PopoverDescription>
              Like table salt. Right for a V60 or an AeroPress.
            </PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    </State>
  )
}

export function HoverCardDemo() {
  return (
    <State label="Hover or focus the link">
      <HoverCard>
        <HoverCardTrigger
          href="#"
          className="text-sm font-medium underline underline-offset-4"
        >
          Ethiopia Guji
        </HoverCardTrigger>
        <HoverCardContent>
          <p className="font-medium">Ethiopia Guji, natural</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Blueberry, jasmine and milk chocolate. Grown at 2,100 m.
          </p>
        </HoverCardContent>
      </HoverCard>
    </State>
  )
}

export function TooltipDemo() {
  return (
    <State label="Hover or focus a button">
      <Tooltip>
        <TooltipTrigger
          render={<Button variant="outline" size="icon" aria-label="Account" />}
        >
          <UserIcon />
        </TooltipTrigger>
        <TooltipContent>Account</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>
          Free delivery
        </TooltipTrigger>
        <TooltipContent side="bottom">On orders over £30</TooltipContent>
      </Tooltip>
    </State>
  )
}

export function DropdownMenuDemo() {
  return (
    <State label="Closed; open it">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          My account
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Ada Lovelace</DropdownMenuLabel>
            <DropdownMenuItem>
              <PackageIcon />
              Orders
              <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <SettingsIcon />
              Settings
            </DropdownMenuItem>
            <DropdownMenuCheckboxItem defaultChecked>
              Email me new roasts
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <LogOutIcon />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </State>
  )
}

export function ContextMenuDemo() {
  return (
    <State label="Right-click the area" className="grid">
      <ContextMenu>
        <ContextMenuTrigger className="grid h-28 place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground">
          Right-click this bag
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem>
            <CoffeeIcon />
            Brew guide
          </ContextMenuItem>
          <ContextMenuItem>
            Add to bag
            <ContextMenuShortcut>⌘B</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive">
            <Trash2Icon />
            Remove
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </State>
  )
}

export function CommandDemo() {
  return (
    <State label="Inline, with groups and shortcuts" className="grid">
      <Command className="rounded-2xl border">
        <CommandInput placeholder="Search the shop" />
        <CommandList>
          <CommandEmpty>Nothing matches.</CommandEmpty>
          <CommandGroup heading="Coffee">
            <CommandItem>
              <CoffeeIcon />
              Ethiopia Guji
            </CommandItem>
            <CommandItem>
              <CoffeeIcon />
              Colombia Huila
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Account">
            <CommandItem>
              <PackageIcon />
              Orders
              <CommandShortcut>⌘O</CommandShortcut>
            </CommandItem>
            <CommandItem disabled>
              <SettingsIcon />
              Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </State>
  )
}
