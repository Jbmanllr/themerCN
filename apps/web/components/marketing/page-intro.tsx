import type { ReactNode } from "react"

import { Illustration } from "@/components/illustrations/illustration"
import type { IllustrationSeed } from "@/lib/mock/types"
import { cn } from "@workspace/ui/lib/utils"

/**
 * The opening of a marketing or journal page: the page's one `<h1>`, a lede,
 * optional actions and a decorative illustration on the right. Without a
 * `seed` there is no illustration, and the text takes the full width.
 */
export function PageIntro({
  title,
  lede,
  seed,
  children,
}: {
  title: string
  lede: ReactNode
  seed?: IllustrationSeed
  children?: ReactNode
}) {
  return (
    <section
      className={cn(
        "mx-auto grid max-w-6xl items-center gap-10 px-4 pt-14 pb-10 sm:px-6 md:pt-20",
        seed ? "md:grid-cols-[1fr_auto]" : "md:grid-cols-1"
      )}
    >
      <div className="flex max-w-2xl flex-col items-start gap-5">
        <h1 className="font-heading text-4xl leading-[1.08] text-balance sm:text-5xl">
          {title}
        </h1>
        <div className="max-w-xl text-lg text-pretty text-muted-foreground">
          {lede}
        </div>
        {children}
      </div>
      {seed ? (
        <Illustration
          seed={seed}
          className="hidden size-48 md:block lg:size-56"
        />
      ) : null}
    </section>
  )
}
