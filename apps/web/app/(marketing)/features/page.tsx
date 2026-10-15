import {
  CalendarClockIcon,
  LeafIcon,
  MessageCircleQuestionIcon,
  PackageOpenIcon,
  PauseIcon,
  SlidersHorizontalIcon,
} from "lucide-react"
import Link from "next/link"

import { PageIntro } from "@/components/marketing/page-intro"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export const metadata = { title: "How it works" }

// A real sequence, so the steps are numbered.
const steps = [
  {
    title: "Tell us how you brew",
    body: "Espresso, pour-over, a French press you inherited. We grind for it, or send whole beans if you have a grinder you love.",
  },
  {
    title: "We roast on Monday",
    body: "Small batches, roasted for your order. Nothing sits in a warehouse waiting for you.",
  },
  {
    title: "It ships on Tuesday",
    body: "Your bag leaves within a day of roasting, with the roast date printed on the front.",
  },
  {
    title: "Brew, taste, adjust",
    body: "The Brew Assistant in your account helps you dial in. Tell it what the cup tastes like and it suggests one change.",
  },
]

const details = [
  {
    icon: SlidersHorizontalIcon,
    title: "Ground to your brewer",
    body: "Seven grind sizes, from Turkish to cold brew. Change it any time before Monday.",
  },
  {
    icon: CalendarClockIcon,
    title: "Your pace",
    body: "Every two or four weeks. Move a delivery if you are away.",
  },
  {
    icon: PauseIcon,
    title: "Skip without a phone call",
    body: "One click in your account skips the next bag. No forms, no guilt.",
  },
  {
    icon: MessageCircleQuestionIcon,
    title: "A Brew Assistant that knows the bag",
    body: "It has the roaster's notes for every coffee we send, so its advice fits what is in your cup.",
  },
  {
    icon: PackageOpenIcon,
    title: "Letterbox-sized",
    body: "Bags fit through the door, so nobody has to be home.",
  },
  {
    icon: LeafIcon,
    title: "Compostable bags",
    body: "The valve too. Put the whole thing in the green bin.",
  },
]

export default function FeaturesPage() {
  return (
    <>
      <PageIntro
        title="A subscription that brews with you"
        lede="Fresh coffee on a schedule that suits you, ground the way you brew, with help in your account when a cup tastes off."
        seed="dripper"
      >
        <Link href="/pricing" className={cn(buttonVariants({ size: "lg" }))}>
          See the plans
        </Link>
      </PageIntro>

      <section
        aria-labelledby="steps-heading"
        className="mx-auto max-w-6xl px-4 py-12 sm:px-6"
      >
        <h2 id="steps-heading" className="font-heading text-3xl">
          From roaster to cup in four steps
        </h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col gap-3 border-t-2 border-primary pt-4"
            >
              <span className="font-heading text-3xl text-primary">
                {index + 1}
              </span>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="details-heading"
        className="mx-auto max-w-6xl px-4 py-12 sm:px-6"
      >
        <h2 id="details-heading" className="font-heading text-3xl">
          The small things
        </h2>
        <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {details.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Icon aria-hidden className="size-5" />
              </span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-6">
        <div className="flex flex-col items-start gap-4 rounded-3xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 md:flex-row md:items-center md:justify-between">
          <p className="font-heading text-2xl text-balance">
            Start with a Sampler. Change your mind whenever you like.
          </p>
          <Link
            href="/pricing"
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
          >
            Compare plans
          </Link>
        </div>
      </section>
    </>
  )
}
