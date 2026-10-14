import Link from "next/link"
import type { ReactNode } from "react"

import { Logo } from "@/components/brand/logo"
import { Illustration } from "@/components/illustrations/illustration"
import { BRAND } from "@/lib/site"

/**
 * The `(auth)` layout: one centred card on a dusk backdrop. Pages render the
 * card's content (a `<Card>` from @workspace/ui, typically).
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden bg-muted/50 px-4 py-12">
      <Illustration
        seed="moon"
        className="pointer-events-none absolute -top-24 -right-24 size-72 opacity-60 sm:size-96"
      />
      <Logo className="relative" />
      <main id="main" className="relative w-full max-w-sm">
        {children}
      </main>
      <p className="relative text-sm text-muted-foreground">
        {BRAND.tagline}{" "}
        <Link href="/" className="text-foreground underline underline-offset-4">
          Back to the shop
        </Link>
      </p>
    </div>
  )
}
