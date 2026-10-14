// PROTOTYPE (wayfinder ticket #11). A stand-in for the Themer UI: the same
// packages/ui primitives the real Themer uses, including the portalled ones.
// scripts/gen.mjs copies this file and packages/ui into gen/plain and gen/tm.
import * as React from "react"
import { cn } from "cn"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
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
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { PortalContainerContext } from "@workspace/ui/lib/portal-container"

type Props = {
  /** Keep the popups open so their computed styles can be probed. */
  openPopups: boolean
  /** Portal Base UI popups into a container inside the Themer root. */
  containPortals: boolean
  /** A Host app component rendered inside the Themer, like a Preview tab. */
  hostPreview?: React.ReactNode
}

export function ThemerPanel({ openPopups, containPortals, hostPreview }: Props) {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null)
  const [dense, setDense] = React.useState(false)
  const open = openPopups ? true : undefined

  return (
    // FINDING: rules inside @scope ([data-themer]) match the root's
    // descendants only, so the scope root is a bare wrapper, never styled.
    <div data-themer="" data-themer-overlay="">
    <div className="fixed inset-y-3 right-3 z-[9999] flex w-[380px] flex-col rounded-2xl border bg-background text-foreground shadow-2xl">
      <PortalContainerContext.Provider value={containPortals ? container : null}>
        <TooltipProvider>
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <h2 data-probe="themer.h2" className="font-heading text-base font-medium">
              Themer
            </h2>
            <Tooltip open={open}>
              <TooltipTrigger render={<Button size="sm" variant="ghost" />}>
                Help
              </TooltipTrigger>
              <TooltipContent side="left" data-probe="themer.tooltip">
                Tooltip from the Themer
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            <Tabs defaultValue="colors">
              <TabsList>
                <TabsTrigger value="colors" data-probe="themer.tab">
                  Colors
                </TabsTrigger>
                <TabsTrigger value="type">Type</TabsTrigger>
                <TabsTrigger value="other">Other</TabsTrigger>
              </TabsList>
            </Tabs>

            <Card data-probe="themer.card" size="sm">
              <CardHeader>
                <CardTitle>Primary</CardTitle>
                <CardDescription data-probe="themer.muted">
                  Every control follows the edited Theme.
                </CardDescription>
              </CardHeader>
              <CardContent className={cn("flex flex-col gap-3", dense && "gap-1")}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tm-hex" data-probe="themer.label">
                    Value
                  </Label>
                  <Input id="tm-hex" defaultValue="oklch(0.6 0.2 250)" data-probe="themer.input" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="tm-dense" checked={dense} onCheckedChange={setDense} data-probe="themer.switch" />
                  <Label htmlFor="tm-dense">Dense</Label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button data-probe="themer.button">Apply</Button>
                  <Button variant="outline" data-probe="themer.button-outline">
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Separator />

            <div className="flex flex-wrap items-center gap-2">
              <Select defaultValue="luma" open={open} modal={false}>
                <SelectTrigger className="w-32" data-probe="themer.select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent data-probe="themer.select-popup">
                  <SelectItem value="luma">Luma</SelectItem>
                  <SelectItem value="nova">Nova</SelectItem>
                  <SelectItem value="vega">Vega</SelectItem>
                </SelectContent>
              </Select>

              <Popover open={open} modal={false}>
                <PopoverTrigger render={<Button variant="outline" size="sm" />}>
                  Popover
                </PopoverTrigger>
                <PopoverContent side="left" className="w-60" data-probe="themer.popover">
                  <p className="text-sm font-medium">Themer popover</p>
                  <Button size="sm" data-probe="themer.popover-button">
                    Inside a portal
                  </Button>
                </PopoverContent>
              </Popover>

              <DropdownMenu open={open} modal={false}>
                <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                  Menu
                </DropdownMenuTrigger>
                <DropdownMenuContent side="left" data-probe="themer.menu">
                  <DropdownMenuItem data-probe="themer.menu-item">Duplicate</DropdownMenuItem>
                  <DropdownMenuItem>Export</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog>
                <DialogTrigger render={<Button variant="secondary" size="sm" />}>
                  Dialog
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Themer dialog</DialogTitle>
                    <DialogDescription>
                      Opened from the Themer. Check radius, spacing, font and
                      that it sits above the panel.
                    </DialogDescription>
                  </DialogHeader>
                  <Input defaultValue="Inside the dialog" />
                </DialogContent>
              </Dialog>
            </div>

            {hostPreview ? (
              <div className="flex flex-col gap-2 rounded-xl border border-dashed p-3">
                <p className="text-xs text-muted-foreground">
                  Preview tab supplied by the Host app
                </p>
                <div data-themer-host="">{hostPreview}</div>
              </div>
            ) : null}
          </div>
        </TooltipProvider>
      </PortalContainerContext.Provider>
      <div ref={setContainer} data-themer-portals="" />
    </div>
    </div>
  )
}
