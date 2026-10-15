import Link from "next/link"

import { Illustration } from "@/components/illustrations/illustration"
import { SiteLayout } from "@/components/site/site-layout"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export const metadata = { title: "Page not found" }

/** The branded 404, inside the site layout. */
export default function NotFound() {
  return (
    <SiteLayout>
      <section className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-20 text-center">
        <Illustration seed="moon" className="size-40" />
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="font-heading text-4xl text-balance">
          This page flew off into the night.
        </h1>
        <p className="text-muted-foreground">
          Nightjars are hard to spot after dark, and so is this page. Check the
          address, or start again from the shop.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className={cn(buttonVariants())}>
            Go home
          </Link>
          <Link
            href="/shop"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Browse the shop
          </Link>
        </div>
      </section>
    </SiteLayout>
  )
}
