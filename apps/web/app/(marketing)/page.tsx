// Placeholder home from the Playground foundation (#23). The marketing
// screens ticket (#24) replaces this page.
import Link from "next/link"

import { Illustration } from "@/components/illustrations/illustration"
import { BRAND } from "@/lib/site"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export default function HomePage() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_1fr] md:py-24">
      <div className="flex flex-col items-start gap-6">
        <h1 className="font-heading text-5xl leading-[1.05] text-balance sm:text-6xl">
          {BRAND.tagline}
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Small-batch beans, brew guides, and a subscription that remembers how
          you like it.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/shop" className={cn(buttonVariants({ size: "lg" }))}>
            Shop beans
          </Link>
          <Link
            href="/blog"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Read the brew guides
          </Link>
        </div>
      </div>
      <Illustration
        seed="nightjar"
        alt="A nightjar perched on a branch under the moon"
        className="mx-auto max-w-sm"
      />
    </section>
  )
}
