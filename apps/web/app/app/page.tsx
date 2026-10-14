import Link from "next/link"

import {
  MetricCard,
  OrdersTable,
  RevenueChart,
  SubscriptionCard,
} from "@/components/app/dashboard"
import { Illustration } from "@/components/illustrations/illustration"
import { chatThreads, getProduct, metrics, orders } from "@/lib/mock"
import type { Product } from "@/lib/mock"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export const metadata = { title: "Dashboard" }

// The fixed "now" of the mock data: the week ending on the latest order.
const WEEK_ENDING = "2026-10-12"
const NEXT_ROAST = "2026-10-22"

export default function Page() {
  const revenue = metrics.find((metric) => metric.id === "revenue")
  const coffees = ["ethiopia-guji", "night-owl-blend"]
    .map(getProduct)
    .filter((product): product is Product => product !== undefined)
  const lastThread = chatThreads[0]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-3xl md:text-4xl">Good evening, Ada</h2>
        <p className="max-w-prose text-muted-foreground">
          The kettle&apos;s on. Here is your next box, and how the roastery did
          this week: we share our numbers with every subscriber.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SubscriptionCard
            plan="Night Shift"
            nextDelivery={NEXT_ROAST}
            coffees={coffees}
          />
        </div>
        <Card className="relative">
          <CardHeader>
            <CardDescription>Brew Assistant</CardDescription>
            <CardTitle>
              <h3 className="font-heading text-xl">Still a little sour?</h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pr-24">
            <p className="text-muted-foreground">
              Pick up where you left off in &ldquo;{lastThread?.title}&rdquo;,
              or ask something new.
            </p>
            <Illustration
              seed="cup"
              className="absolute right-4 bottom-16 size-20"
            />
          </CardContent>
          <CardFooter>
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href={`/app/chat/${lastThread?.id ?? ""}`} />}
            >
              Open the chat
            </Button>
          </CardFooter>
        </Card>
      </div>

      <section aria-labelledby="this-week" className="flex flex-col gap-4">
        <h2 id="this-week" className="font-heading text-2xl">
          This week at the roastery
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {revenue && (
            <RevenueChart metric={revenue} weekEnding={WEEK_ENDING} />
          )}
          <Card>
            <CardHeader>
              <CardTitle>
                <h3 className="font-heading text-xl">Roasting next</h3>
              </CardTitle>
              <CardDescription>Thursday&apos;s batch plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y">
                {[
                  ["Night Owl Blend", "42 kg"],
                  ["Ethiopia Guji", "18 kg"],
                  ["Kenya Kiambu", "12 kg"],
                  ["Decaf Dusk", "9 kg"],
                ].map(([name, weight]) => (
                  <li
                    key={name}
                    className="flex items-baseline justify-between py-2"
                  >
                    <span>{name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {weight}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <OrdersTable orders={orders} />
      </section>
    </div>
  )
}
