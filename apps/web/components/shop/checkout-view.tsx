"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { Illustration } from "@/components/illustrations/illustration"
import { CartLineItem } from "@/components/shop/cart-line"
import { EmptyCart } from "@/components/shop/empty-cart"
import { OrderSummary } from "@/components/shop/order-summary"
import type { CartLine } from "@/lib/mock/types"
import {
  type CartSummary,
  type ShippingId,
  cartSummary,
  shippingOptions,
} from "@/lib/shop"
import { useCart } from "@/lib/stores/cart"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"

/** The fake order number every checkout ends on (fixed, for screenshots). */
const ORDER_ID = "NJ-1042"

type PlacedOrder = {
  firstName: string
  email: string
  lines: CartLine[]
  summary: CartSummary
  shipping: ShippingId
}

/**
 * /checkout: a fake form. Nothing is sent anywhere: placing the order empties
 * the cart and shows a confirmation built from what was in it.
 */
export function CheckoutView() {
  const lines = useCart((state) => state.lines)
  const clear = useCart((state) => state.clear)
  const [shipping, setShipping] = useState<ShippingId>("standard")
  const [placed, setPlaced] = useState<PlacedOrder | null>(null)

  if (placed) return <Confirmation order={placed} />
  if (lines.length === 0) return <EmptyCart />

  const summary = cartSummary(lines, shipping)
  const shippingLabel =
    shippingOptions.find((o) => o.id === shipping)!.label + " shipping"

  return (
    <form
      className="flex flex-col gap-10"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        setPlaced({
          firstName: String(data.get("name")).trim().split(/\s+/)[0]!,
          email: String(data.get("email")),
          lines,
          summary,
          shipping,
        })
        clear()
        window.scrollTo({ top: 0 })
      }}
    >
      <h1 className="font-heading text-4xl sm:text-5xl">Checkout</h1>
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_24rem]">
        <FieldGroup className="gap-10">
          <FieldSet>
            <FieldLegend>Contact</FieldLegend>
            <Field>
              <FieldLabel htmlFor="checkout-email">Email</FieldLabel>
              <Input
                id="checkout-email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
              <FieldDescription>
                For the receipt and a note when it ships.
              </FieldDescription>
            </Field>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Shipping address</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="checkout-name">Full name</FieldLabel>
                <Input
                  id="checkout-name"
                  name="name"
                  autoComplete="name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="checkout-address">Address</FieldLabel>
                <Input
                  id="checkout-address"
                  name="address"
                  autoComplete="street-address"
                  required
                />
              </Field>
              <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
                <Field>
                  <FieldLabel htmlFor="checkout-city">City</FieldLabel>
                  <Input
                    id="checkout-city"
                    name="city"
                    autoComplete="address-level2"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="checkout-postcode">Postcode</FieldLabel>
                  <Input
                    id="checkout-postcode"
                    name="postcode"
                    autoComplete="postal-code"
                    required
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="checkout-country">Country</FieldLabel>
                <NativeSelect
                  id="checkout-country"
                  name="country"
                  autoComplete="country-name"
                  defaultValue="United States"
                  className="w-full"
                >
                  <NativeSelectOption>United States</NativeSelectOption>
                  <NativeSelectOption>Canada</NativeSelectOption>
                  <NativeSelectOption>United Kingdom</NativeSelectOption>
                  <NativeSelectOption>France</NativeSelectOption>
                </NativeSelect>
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Delivery</FieldLegend>
            <RadioGroup
              value={shipping}
              onValueChange={(value) => setShipping(value as ShippingId)}
            >
              {shippingOptions.map((option) => (
                <FieldLabel
                  key={option.id}
                  htmlFor={`checkout-shipping-${option.id}`}
                >
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{option.label}</FieldTitle>
                      <FieldDescription>{option.description}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem
                      value={option.id}
                      id={`checkout-shipping-${option.id}`}
                    />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Payment</FieldLegend>
            <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              This shop is a Playground, so there is no card to enter and
              nothing is charged. Placing the order empties your cart and shows
              a receipt.
            </p>
          </FieldSet>
        </FieldGroup>

        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <h2 className="font-heading text-xl">Your order</h2>
          <ul className="divide-y border-y">
            {lines.map((line) => (
              <CartLineItem
                key={`${line.productSlug}-${JSON.stringify(line.option)}`}
                line={line}
                compact
              />
            ))}
          </ul>
          <OrderSummary summary={summary} shippingLabel={shippingLabel}>
            <Button type="submit" size="lg" className="w-full">
              Place order
            </Button>
          </OrderSummary>
        </div>
      </div>
    </form>
  )
}

function Confirmation({ order }: { order: PlacedOrder }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])
  const shippingLabel =
    shippingOptions.find((o) => o.id === order.shipping)!.label + " shipping"

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <div className="flex flex-col items-center gap-5 text-center">
        <Illustration seed="kettle" className="size-36" />
        <p className="rounded-full border px-3 py-1 font-mono text-sm">
          Order {ORDER_ID}
        </p>
        <h1
          ref={heading}
          tabIndex={-1}
          className="font-heading text-4xl text-balance outline-none sm:text-5xl"
        >
          Thanks, {order.firstName}. Your coffee is on its way.
        </h1>
        <p className="max-w-md text-muted-foreground">
          A receipt would be on its way to {order.email} if this shop were real.
          It isn&apos;t, so nothing was charged and nothing will ship.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <h2 className="font-heading text-xl">What you ordered</h2>
        <ul className="divide-y border-y">
          {order.lines.map((line) => (
            <CartLineItem
              key={`${line.productSlug}-${JSON.stringify(line.option)}`}
              line={line}
              compact
            />
          ))}
        </ul>
        <OrderSummary summary={order.summary} shippingLabel={shippingLabel} />
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/shop" className={buttonVariants()}>
          Keep shopping
        </Link>
        <Link href="/blog" className={buttonVariants({ variant: "outline" })}>
          Read a brew guide
        </Link>
      </div>
    </div>
  )
}
