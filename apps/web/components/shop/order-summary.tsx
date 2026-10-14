import type { ReactNode } from "react"

import { formatPrice } from "@/lib/format"
import type { CartSummary } from "@/lib/shop"
import { Separator } from "@workspace/ui/components/separator"

/** Subtotal, shipping and total, as a definition list. */
export function OrderSummary({
  summary,
  shippingLabel,
  testIdPrefix,
  children,
}: {
  summary: CartSummary
  shippingLabel: string
  /** `cart` → `cart-subtotal`, `cart-total`, for the e2e journey. */
  testIdPrefix: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-muted/60 p-6">
      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            Subtotal ({summary.items} {summary.items === 1 ? "item" : "items"})
          </dt>
          <dd className="tabular-nums" data-testid={`${testIdPrefix}-subtotal`}>
            {formatPrice(summary.subtotal)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{shippingLabel}</dt>
          <dd className="tabular-nums">
            {summary.shipping === 0 ? "Free" : formatPrice(summary.shipping)}
          </dd>
        </div>
        <Separator />
        <div className="flex items-baseline justify-between gap-4">
          <dt className="font-medium">Total</dt>
          <dd
            className="font-heading text-2xl tabular-nums"
            data-testid={`${testIdPrefix}-total`}
          >
            {formatPrice(summary.total)}
          </dd>
        </div>
      </dl>
      {children}
    </div>
  )
}
