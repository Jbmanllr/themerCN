// Nightjar's flat illustrations, drawn in-repo. Every fill and stroke is a
// Theme token (or `currentColor`), so the imagery follows the Theme the
// Themer edits. Each takes the full size of its box; size it from outside.
//
// Tokens used: background (the "sky" disc), muted, primary, accent,
// foreground (outlines) and chart-* for small details.

import type { ComponentProps, ReactNode } from "react"

import type { IllustrationSeed, ImageRef } from "@/lib/mock/types"
import { cn } from "@workspace/ui/lib/utils"

const ink = "stroke-foreground"
const line = {
  strokeWidth: 4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const

function Disc() {
  return <circle cx="100" cy="100" r="92" className="fill-muted" />
}

const drawings: Record<IllustrationSeed, ReactNode> = {
  nightjar: (
    <>
      <Disc />
      <circle cx="160" cy="42" r="12" className="fill-chart-1" />
      {/* branch */}
      <path
        d="M18 150 Q100 136 186 154"
        className={cn(ink, "fill-none")}
        {...line}
      />
      {/* tail */}
      <path d="M58 132 L20 146 L30 128 Z" className="fill-primary" />
      {/* body */}
      <path
        d="M52 128 C56 96 84 78 118 82 C140 84 152 98 150 114 C146 134 116 142 84 140 C70 139 58 136 52 128 Z"
        className="fill-primary"
      />
      {/* wing mottling */}
      <path
        d="M74 112 C90 100 112 100 128 108"
        className="fill-none stroke-accent"
        {...line}
      />
      <path
        d="M80 124 C96 116 112 116 124 120"
        className="fill-none stroke-accent"
        {...line}
      />
      {/* head and wide flat beak */}
      <circle cx="140" cy="88" r="20" className="fill-primary" />
      <path d="M156 92 L172 96 L156 100 Z" className="fill-accent" />
      <circle cx="146" cy="84" r="4" className="fill-background" />
      {/* feet */}
      <path
        d="M100 140 L98 150 M114 139 L114 150"
        className={cn(ink, "fill-none")}
        {...line}
      />
    </>
  ),
  kettle: (
    <>
      <Disc />
      <path
        d="M58 150 L66 92 C68 82 76 76 86 76 L120 76 C130 76 138 82 140 92 L148 150 Z"
        className="fill-primary"
      />
      <path d="M78 76 C78 62 128 62 128 76" className="fill-accent" />
      <path
        d="M140 104 C162 104 164 132 150 142"
        className="fill-none stroke-primary"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* gooseneck spout */}
      <path
        d="M66 110 C44 110 40 82 26 70"
        className="fill-none stroke-primary"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M96 66 L110 66" className={cn(ink, "fill-none")} {...line} />
      <path d="M52 150 L154 150" className={cn(ink, "fill-none")} {...line} />
      <path
        d="M86 112 L118 112"
        className="fill-none stroke-accent"
        {...line}
      />
    </>
  ),
  beans: (
    <>
      <Disc />
      {[
        [70, 82, -30],
        [118, 70, 20],
        [96, 120, 60],
        [140, 120, -10],
        [62, 132, 30],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <ellipse
            rx="22"
            ry="30"
            className={i % 2 ? "fill-chart-5" : "fill-primary"}
          />
          <path
            d="M0 -24 C-8 -8 8 8 0 24"
            className="fill-none stroke-accent"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      ))}
    </>
  ),
  cup: (
    <>
      <Disc />
      <path
        d="M86 58 C80 48 92 42 86 32 M110 58 C104 48 116 42 110 32"
        className="fill-none stroke-chart-2"
        {...line}
      />
      <path
        d="M50 74 L150 74 L142 134 C140 146 130 152 118 152 L82 152 C70 152 60 146 58 134 Z"
        className="fill-primary"
      />
      <path
        d="M148 88 C172 88 172 124 144 124"
        className="fill-none stroke-primary"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <ellipse cx="100" cy="74" rx="50" ry="8" className="fill-accent" />
      <path d="M36 160 L164 160" className={cn(ink, "fill-none")} {...line} />
    </>
  ),
  grinder: (
    <>
      <Disc />
      <rect
        x="70"
        y="72"
        width="60"
        height="84"
        rx="10"
        className="fill-primary"
      />
      <rect x="70" y="112" width="60" height="10" className="fill-accent" />
      <path
        d="M100 72 L100 50 L150 40"
        className={cn(ink, "fill-none")}
        {...line}
      />
      <circle cx="154" cy="40" r="10" className="fill-accent" />
      <path d="M60 156 L140 156" className={cn(ink, "fill-none")} {...line} />
    </>
  ),
  dripper: (
    <>
      <Disc />
      <path d="M52 62 L148 62 L112 118 L88 118 Z" className="fill-primary" />
      <path
        d="M74 84 L96 112 M100 84 L100 112 M126 84 L104 112"
        className="fill-none stroke-accent"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M70 124 L130 124" className={cn(ink, "fill-none")} {...line} />
      <path
        d="M100 124 L100 136"
        className="fill-none stroke-chart-3"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="2 6"
      />
      <path d="M72 140 L128 140 L122 164 L78 164 Z" className="fill-accent" />
    </>
  ),
  moon: (
    <>
      <circle cx="100" cy="100" r="92" className="fill-chart-2" />
      <path
        d="M128 40 A50 50 0 1 0 150 120 A40 40 0 1 1 128 40 Z"
        className="fill-chart-1"
      />
      {[
        [56, 52],
        [150, 150],
        [44, 128],
        [160, 74],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" className="fill-background" />
      ))}
    </>
  ),
}

type IllustrationProps = Omit<ComponentProps<"svg">, "children"> & {
  seed: IllustrationSeed
  /** Alt text. Omit (or pass "") for a purely decorative illustration. */
  alt?: string
}

/** One of Nightjar's illustrations, tinted by the current Theme. */
export function Illustration({
  seed,
  alt,
  className,
  ...props
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={cn("size-full", className)}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      {...props}
    >
      {drawings[seed]}
    </svg>
  )
}

/** The illustration an `ImageRef` names, with its alt text. */
export function ImageRefIllustration({
  image,
  ...props
}: Omit<IllustrationProps, "seed" | "alt"> & { image: ImageRef }) {
  return <Illustration seed={image.seed} alt={image.alt} {...props} />
}
