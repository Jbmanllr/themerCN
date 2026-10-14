"use client"

import { CheckIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { formatPrice } from "@/lib/format"
import type { Plan } from "@/lib/mock/types"
import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { cn } from "@workspace/ui/lib/utils"

type Billing = "monthly" | "yearly"

/** The subscription plans with a monthly / yearly billing switch. */
export function PlanGrid({ plans }: { plans: Plan[] }) {
  const [billing, setBilling] = useState<Billing>("monthly")

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          aria-label="Billing"
          variant="outline"
          spacing={0}
          value={[billing]}
          onValueChange={(value: string[]) => {
            const next = value[0] as Billing | undefined
            if (next) setBilling(next)
          }}
        >
          <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
          <ToggleGroupItem value="yearly">Yearly</ToggleGroupItem>
        </ToggleGroup>
        <p className="text-sm text-muted-foreground">
          Pay for the year and every bag costs a little less.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const titleId = `plan-${plan.id}`
          const price = billing === "monthly" ? plan.monthly : plan.yearly
          return (
            <article
              key={plan.id}
              aria-labelledby={titleId}
              className={cn(
                "flex flex-col gap-6 rounded-3xl border p-6 sm:p-8",
                plan.highlighted
                  ? "border-primary bg-primary text-primary-foreground lg:-my-4 lg:py-12"
                  : "bg-card text-card-foreground"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 id={titleId} className="font-heading text-2xl">
                  {plan.name}
                </h3>
                {plan.highlighted ? (
                  <Badge variant="secondary">Most brewed</Badge>
                ) : null}
              </div>
              <p
                className={cn(
                  plan.highlighted
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground"
                )}
              >
                {plan.description}
              </p>
              <p className="flex items-baseline gap-2">
                <span className="font-heading text-5xl">
                  {formatPrice(price).replace(/\.00$/, "")}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    plan.highlighted
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  a month
                  {billing === "yearly" ? ", billed yearly" : ""}
                </span>
              </p>
              <ul className="flex flex-1 flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <CheckIcon
                      aria-hidden
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        plan.highlighted ? "" : "text-primary"
                      )}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({
                    size: "lg",
                    variant: plan.highlighted ? "secondary" : "outline",
                  }),
                  "w-full"
                )}
              >
                Start {plan.name}
              </Link>
            </article>
          )
        })}
      </div>
    </div>
  )
}
