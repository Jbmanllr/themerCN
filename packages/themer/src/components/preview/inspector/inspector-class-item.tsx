"use client"

// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified for themercn.
// Source: components/editor/inspector-class-item.tsx.
//
// One token class in the inspector card: swatch, segmented class name, and a
// click that focuses that colour's control. Changes from tweakcn: a real
// button (keyboard reachable), and the swatch reads the live CSS variable
// instead of subscribing to the editor store.

import { memo, useMemo } from "react"
import { SquarePen } from "lucide-react"
import { segmentClassName } from "./segment-classname"

export const InspectorClassItem = memo(function InspectorClassItem({
  className,
  onFocusColor,
}: {
  className: string
  onFocusColor: (colorKey: string) => void
}) {
  const segments = useMemo(() => segmentClassName(className), [className])
  const { value } = segments

  return (
    <button
      type="button"
      className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-md p-1.5 text-start transition-colors outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => {
        if (value) onFocusColor(value)
      }}
      aria-label={value ? `Edit ${value} (${className})` : className}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          aria-hidden
          style={value ? { backgroundColor: `var(--${value})` } : undefined}
          className="block size-4 shrink-0 rounded-md border border-foreground ring-1 ring-border"
        />
        <span className="truncate font-mono text-xs">
          {segments.selector && (
            <span className="text-foreground/60">{segments.selector}:</span>
          )}
          {segments.prefix && (
            <span className="text-foreground">{segments.prefix}</span>
          )}
          {value && (
            <>
              <span className="text-foreground/80">-</span>
              <span className="font-bold text-foreground">{value}</span>
            </>
          )}
          {segments.opacity && (
            <span className="text-foreground/60">/{segments.opacity}</span>
          )}
        </span>
      </span>
      <SquarePen
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </button>
  )
})
