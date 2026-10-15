import Link from "next/link"

import { PostCard } from "@/components/blog/post-card"
import {
  Illustration,
  ImageRefIllustration,
} from "@/components/illustrations/illustration"
import { BrewTimeline } from "@/components/marketing/brew-timeline"
import { formatPrice } from "@/lib/format"
import { getProductsInCategory, plans, posts } from "@/lib/mock"
import { BRAND } from "@/lib/site"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export default function HomePage() {
  const roasting = getProductsInCategory("beans").slice(0, 3)
  const featuredPlan = plans.find((plan) => plan.highlighted)

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-16 pb-8 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pt-24">
        <div className="flex flex-col items-start gap-6">
          <h1 className="font-heading text-5xl leading-[1.02] text-balance sm:text-7xl">
            {BRAND.tagline}
          </h1>
          <p className="max-w-md text-lg text-pretty text-muted-foreground">
            Small-batch beans roasted on Mondays, brew guides from the people
            who roast them, and a subscription that remembers how you like it.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/shop" className={cn(buttonVariants({ size: "lg" }))}>
              Shop beans
            </Link>
            <Link
              href="/features"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              How the subscription works
            </Link>
          </div>
        </div>
        <Illustration
          seed="nightjar"
          alt="A nightjar perched on a branch under the moon"
          className="mx-auto max-w-md"
        />
      </section>

      <BrewTimeline />

      <section
        aria-labelledby="roasting-heading"
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="roasting-heading" className="font-heading text-3xl">
            On the roaster this week
          </h2>
          <Link
            href="/shop/beans"
            className="rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            All coffees
          </Link>
        </div>
        <ul className="mt-8 grid gap-8 sm:grid-cols-3">
          {roasting.map((product) => (
            <li key={product.slug} className="relative flex flex-col gap-4">
              <div className="flex aspect-square items-center justify-center rounded-3xl bg-secondary p-10">
                <ImageRefIllustration image={{ ...product.image, alt: "" }} />
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-heading text-xl">
                  <Link
                    href={`/shop/p/${product.slug}`}
                    className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-3xl hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {product.name}
                  </Link>
                </h3>
                <span className="text-muted-foreground">
                  {formatPrice(product.price)}
                </span>
              </div>
              <p className="-mt-2 text-sm text-muted-foreground">
                {product.details.slice(0, 3).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {featuredPlan ? (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid items-center gap-8 rounded-3xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 md:grid-cols-[1fr_auto]">
            <div className="flex max-w-xl flex-col gap-3">
              <h2 className="font-heading text-3xl text-balance">
                {featuredPlan.name}: {featuredPlan.description.toLowerCase()}
              </h2>
              <p className="text-primary-foreground/80">
                From {formatPrice(featuredPlan.yearly).replace(/\.00$/, "")} a
                month. Skip, pause or switch any time.
              </p>
            </div>
            <Link
              href="/pricing"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" })
              )}
            >
              Compare plans
            </Link>
          </div>
        </section>
      ) : null}

      <section
        aria-labelledby="journal-heading"
        className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="journal-heading" className="font-heading text-3xl">
            From the journal
          </h2>
          <Link
            href="/blog"
            className="rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            All posts
          </Link>
        </div>
        <div className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {posts.slice(0, 3).map((post) => (
            <PostCard key={post.slug} post={post} headingLevel={3} />
          ))}
        </div>
      </section>
    </>
  )
}
