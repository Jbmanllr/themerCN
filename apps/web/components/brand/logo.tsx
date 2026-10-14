import Link from "next/link"

import { BRAND } from "@/lib/site"
import { cn } from "@workspace/ui/lib/utils"

/** The nightjar mark: a bird in flight against a moon, in `currentColor`. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <circle cx="16" cy="16" r="15" fill="currentColor" opacity="0.14" />
      <path
        d="M4 18 C9 12 13 12 16 16 C19 12 23 12 28 18 C23 16 19 17 16 21 C13 17 9 16 4 18 Z"
        fill="currentColor"
      />
      <circle cx="23" cy="9" r="2.5" fill="currentColor" />
    </svg>
  )
}

/** The wordmark linking home, as the header and shells show it. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 rounded-md text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      <LogoMark />
      <span className="font-heading text-xl leading-none text-foreground">
        {BRAND.shortName}
      </span>
    </Link>
  )
}
