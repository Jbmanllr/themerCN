"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useState, type ReactNode } from "react"

import { PortalContainerContext } from "@workspace/ui/lib/portal-container"
import { cn } from "@workspace/ui/lib/utils"

export type Mode = "light" | "dark"

const MODES = {
  light: { label: "Light", Icon: SunIcon },
  dark: { label: "Dark", Icon: MoonIcon },
} as const

/**
 * One half of a specimen, pinned to a mode with `data-mode` (see
 * mode-scope.ts). Popups that read the portal container (Popover, Select,
 * DropdownMenu, Tooltip, Dialog, Sheet, Drawer) mount inside it, so they take
 * the half's mode too.
 */
export function ModePanel({
  mode,
  className,
  children,
}: {
  mode: Mode
  className?: string
  children: ReactNode
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const { label, Icon } = MODES[mode]

  return (
    <section
      aria-label={label}
      data-mode={mode}
      className={cn("min-w-0 bg-background text-foreground", className)}
    >
      <p className="flex items-center gap-1.5 px-5 pt-4 text-xs text-muted-foreground sm:px-6">
        <Icon aria-hidden className="size-3.5" />
        {label}
      </p>
      <PortalContainerContext.Provider value={container}>
        {children}
      </PortalContainerContext.Provider>
      <div ref={setContainer} data-specimen-portals="" />
    </section>
  )
}

/**
 * The same content twice, light and dark side by side: the design system's
 * one signature. The halves share one frame, split at a hairline, so the
 * comparison reads as a single object rather than two cards.
 */
export function SpecimenSplit({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid rounded-3xl border lg:grid-cols-2", className)}>
      <ModePanel
        mode="light"
        className="rounded-t-3xl lg:rounded-l-3xl lg:rounded-tr-none"
      >
        {children}
      </ModePanel>
      <ModePanel
        mode="dark"
        className="rounded-b-3xl border-t lg:rounded-r-3xl lg:rounded-bl-none lg:border-t-0 lg:border-l"
      >
        {children}
      </ModePanel>
    </div>
  )
}

/** One state of a component inside a specimen, with a short caption. */
export function State({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <figure className="flex min-w-0 flex-col gap-3 border-b border-dashed px-5 py-6 last:border-b-0 sm:px-6">
      <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
      <div
        className={cn("flex min-w-0 flex-wrap items-center gap-3", className)}
      >
        {children}
      </div>
    </figure>
  )
}
