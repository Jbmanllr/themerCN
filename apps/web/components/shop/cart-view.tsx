"use client"

import { XIcon } from "lucide-react"
import Link from "next/link"

import { CartLineItem } from "@/components/shop/cart-line"
import { EmptyCart } from "@/components/shop/empty-cart"
import { OrderSummary } from "@/components/shop/order-summary"
import { QuantityStepper } from "@/components/shop/quantity-stepper"
import { formatPrice } from "@/lib/format"
import { getProduct } from "@/lib/mock"
import { FREE_SHIPPING_FROM, cartSummary } from "@/lib/shop"
import { useCart } from "@/lib/stores/cart"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Progress } from "@workspace/ui/components/progress"
import { cn } from "@workspace/ui/lib/utils"

/** /cart: edit quantities, remove lines, see what it costs, check out. */
export function CartView() {
  const lines = useCart((state) => state.lines)
  const setQty = useCart((state) => state.setQty)

  if (lines.length === 0) return <EmptyCart />

  const summary = cartSummary(lines, "standard")
  const toFree = FREE_SHIPPING_FROM - summary.subtotal

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-heading text-4xl sm:text-5xl">Your cart</h1>
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_22rem]">
        <ul className="divide-y border-y">
          {lines.map((line, index) => {
            const name = getProduct(line.productSlug)?.name ?? line.productSlug
            return (
              <CartLineItem
                key={`${line.productSlug}-${JSON.stringify(line.option)}`}
                line={line}
              >
                <div className="mt-2 flex items-center gap-2">
                  <QuantityStepper
                    value={line.qty}
                    onChange={(qty) => setQty(index, qty)}
                    of={name}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${name}`}
                    onClick={() => setQty(index, 0)}
                    className="text-muted-foreground"
                  >
                    <XIcon aria-hidden />
                    Remove
                  </Button>
                </div>
              </CartLineItem>
            )
          })}
        </ul>

        <OrderSummary summary={summary} shippingLabel="Standard shipping">
          <div className="flex flex-col gap-2">
            <Progress
              value={Math.min(
                100,
                (summary.subtotal / FREE_SHIPPING_FROM) * 100
              )}
              aria-label="Progress to free shipping"
            />
            <p className="text-sm text-muted-foreground">
              {toFree > 0
                ? `${formatPrice(toFree)} more and standard shipping is free.`
                : "Standard shipping is on us."}
            </p>
          </div>
          <Link
            href="/checkout"
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            Check out
          </Link>
          <Link
            href="/shop"
            className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Keep shopping
          </Link>
        </OrderSummary>
      </div>
    </div>
  )
}
