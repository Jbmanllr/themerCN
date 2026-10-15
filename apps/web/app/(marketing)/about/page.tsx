import Link from "next/link"

import { ImageRefIllustration } from "@/components/illustrations/illustration"
import { PageIntro } from "@/components/marketing/page-intro"
import { authors } from "@/lib/mock"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export const metadata = { title: "About" }

const principles = [
  {
    title: "Roast to order",
    body: "We roast on Mondays for the bags that ship on Tuesday. If nobody ordered it, we do not roast it.",
  },
  {
    title: "Pay for the cup",
    body: "We buy from the same washing stations every year and pay above the market for coffee that tastes like its place.",
  },
  {
    title: "Explain everything",
    body: "Every bag lists the farm, the process, the roast date and a recipe. If something is unclear, it is our fault.",
  },
]

export default function AboutPage() {
  return (
    <>
      <PageIntro
        title="A small roastery that takes its time"
        lede="Nightjar started in 2019 with a ten-kilo roaster in a garage and a stubborn idea: coffee tastes better when nobody rushes it."
        seed="nightjar"
      />

      <section
        aria-labelledby="story-heading"
        className="mx-auto max-w-6xl px-4 py-12 sm:px-6"
      >
        <div className="max-w-2xl space-y-5 text-lg leading-relaxed">
          <h2 id="story-heading" className="font-heading text-3xl">
            Why a nightjar
          </h2>
          <p>
            Nightjars are quiet birds that come out at dusk. You hear them long
            before you see them. We liked that: do the work well, out of sight,
            and let the cup do the talking.
          </p>
          <p className="text-muted-foreground">
            The garage became a roastery on Larkspur Yard. The roaster grew to
            thirty kilos. We still cup every batch before it ships, and we still
            argue about it.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="principles-heading"
        className="mx-auto max-w-6xl px-4 py-12 sm:px-6"
      >
        <h2 id="principles-heading" className="font-heading text-3xl">
          How we work
        </h2>
        <dl className="mt-8 grid gap-8 md:grid-cols-3">
          {principles.map((principle) => (
            <div
              key={principle.title}
              className="border-l-2 border-accent pl-5"
            >
              <dt className="text-lg font-semibold">{principle.title}</dt>
              <dd className="mt-2 text-muted-foreground">{principle.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="team-heading"
        className="mx-auto max-w-6xl px-4 py-12 sm:px-6"
      >
        <h2 id="team-heading" className="font-heading text-3xl">
          The people who write the journal
        </h2>
        <ul className="mt-8 grid gap-8 sm:grid-cols-3">
          {authors.map((author) => (
            <li key={author.id} className="flex items-center gap-4">
              <ImageRefIllustration
                image={{ ...author.avatar, alt: "" }}
                className="size-20 shrink-0"
              />
              <div>
                <p className="font-semibold">{author.name}</p>
                <p className="text-muted-foreground">{author.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto flex max-w-6xl flex-wrap gap-3 px-4 pt-4 pb-20 sm:px-6">
        <Link href="/blog" className={cn(buttonVariants({ size: "lg" }))}>
          Read the journal
        </Link>
        <Link
          href="/contact"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Write to us
        </Link>
      </section>
    </>
  )
}
