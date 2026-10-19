// RETIRED (#64): nothing imports this file. It was unused; the editor uses
// @workspace/ui's Spinner. It stays only until the owner removes it from the
// repo.
"use client"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Three bouncing dots, announced to assistive technology as "Loading". The
 * editor no longer draws it (a stock Spinner replaced it, in the AI chat and
 * the preview's loading state); it stays exported from `components/index.ts`.
 */
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div role="status" className={cn("flex items-center gap-1", className)}>
      <span className="sr-only">Loading</span>
      <div
        aria-hidden
        className="h-2 w-2 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.3s]"
      />
      <div
        aria-hidden
        className="h-2 w-2 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.15s]"
      />
      <div
        aria-hidden
        className="h-2 w-2 animate-bounce rounded-full bg-foreground/50"
      />
    </div>
  )
}
