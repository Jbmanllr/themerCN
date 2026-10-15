"use client"

import { Illustration } from "@/components/illustrations/illustration"
import { State } from "@/components/design-system/specimen"
import { AspectRatio } from "@workspace/ui/components/aspect-ratio"
import { DirectionProvider } from "@workspace/ui/components/direction"
import { Input } from "@workspace/ui/components/input"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Separator } from "@workspace/ui/components/separator"
import { Slider } from "@workspace/ui/components/slider"

export function AspectRatioDemo() {
  return (
    <State
      label="16:9 and square"
      className="grid grid-cols-[2fr_1fr] items-start"
    >
      <AspectRatio
        ratio={16 / 9}
        className="grid place-items-center rounded-2xl bg-muted"
      >
        <Illustration seed="kettle" className="h-3/4" />
      </AspectRatio>
      <AspectRatio
        ratio={1}
        className="grid place-items-center rounded-2xl bg-muted"
      >
        <Illustration seed="cup" className="h-3/4" />
      </AspectRatio>
    </State>
  )
}

export function SeparatorDemo() {
  return (
    <>
      <State label="Horizontal" className="grid">
        <div className="grid gap-3 text-sm">
          <span className="font-medium">Ethiopia Guji</span>
          <Separator />
          <span className="text-muted-foreground">Blueberry, jasmine</span>
        </div>
      </State>
      <State label="Vertical">
        <div className="flex h-5 items-center gap-3 text-sm">
          <span>Shop</span>
          <Separator orientation="vertical" />
          <span>Blog</span>
          <Separator orientation="vertical" />
          <span>Pricing</span>
        </div>
      </State>
    </>
  )
}

const origins = [
  "Brazil, Cerrado",
  "Burundi, Kayanza",
  "Colombia, Huila",
  "Costa Rica, Tarrazú",
  "El Salvador, Apaneca",
  "Ethiopia, Guji",
  "Ethiopia, Yirgacheffe",
  "Guatemala, Huehuetenango",
  "Honduras, Santa Bárbara",
  "Kenya, Nyeri",
  "Peru, Cajamarca",
  "Rwanda, Nyamasheke",
]

export function ScrollAreaDemo() {
  return (
    <State label="A list taller than its box" className="grid">
      <ScrollArea
        className="h-48 rounded-2xl border"
        tabIndex={0}
        aria-label="Origins"
      >
        <ul className="grid gap-2 p-4 text-sm">
          {origins.map((origin) => (
            <li key={origin}>{origin}</li>
          ))}
        </ul>
      </ScrollArea>
    </State>
  )
}

export function ResizableDemo() {
  return (
    <State label="Drag the handle" className="grid">
      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-40 rounded-2xl border"
      >
        <ResizablePanel defaultSize="40%">
          <div className="grid h-full place-items-center p-4 text-sm">
            Recipe
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="60%">
          <div className="grid h-full place-items-center p-4 text-sm">
            Timer
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </State>
  )
}

export function DirectionDemo() {
  return (
    <>
      <State label="Left to right" className="grid">
        <DirectionProvider direction="ltr">
          <div dir="ltr" className="grid gap-3">
            <Input aria-label="Name" defaultValue="Nightjar" />
            <Slider defaultValue={[30]} aria-label="Strength" />
          </div>
        </DirectionProvider>
      </State>
      <State label="Right to left" className="grid">
        <DirectionProvider direction="rtl">
          <div dir="rtl" className="grid gap-3">
            <Input aria-label="الاسم" defaultValue="قهوة" />
            <Slider defaultValue={[30]} aria-label="القوة" />
          </div>
        </DirectionProvider>
      </State>
    </>
  )
}
