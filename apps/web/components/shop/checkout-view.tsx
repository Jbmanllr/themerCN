"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useState, type ReactNode } from "react"
import { Controller, useForm, useWatch, type Control } from "react-hook-form"
import * as z from "zod"

import { Illustration } from "@/components/illustrations/illustration"
import { CartLineItem } from "@/components/shop/cart-line"
import { EmptyCart } from "@/components/shop/empty-cart"
import { OrderSummary } from "@/components/shop/order-summary"
import { emailAddress, focusOnMount } from "@/lib/forms"
import type { CartLine } from "@/lib/mock/types"
import {
  type CartSummary,
  type ShippingId,
  cartSummary,
  lineKey,
  shippingLabel,
  shippingOptions,
} from "@/lib/shop"
import { useCart } from "@/lib/stores/cart"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
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

const COUNTRIES = ["United States", "Canada", "United Kingdom", "France"]

const checkoutSchema = z.object({
  email: emailAddress,
  name: z.string().trim().min(1, "Enter your full name."),
  address: z.string().trim().min(1, "Enter your street address."),
  city: z.string().trim().min(1, "Enter your city."),
  postcode: z.string().trim().min(1, "Enter your postcode."),
  country: z.string(),
  shipping: z.enum([
    "standard",
    "express",
  ] as const satisfies readonly ShippingId[]),
})

type CheckoutValues = z.infer<typeof checkoutSchema>

type PlacedOrder = {
  firstName: string
  email: string
  lines: CartLine[]
  summary: CartSummary
  shipping: ShippingId
}

/**
 * /checkout: a fake form, on shadcn's Field + React Hook Form + Zod pattern.
 * Nothing is sent anywhere: a valid submit empties the cart and shows a
 * confirmation built from what was in it. `method="post"` keeps a
 * pre-hydration submit out of the URL.
 */
export function CheckoutView() {
  const lines = useCart((state) => state.lines)
  const clear = useCart((state) => state.clear)
  const [placed, setPlaced] = useState<PlacedOrder | null>(null)
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: "",
      name: "",
      address: "",
      city: "",
      postcode: "",
      country: COUNTRIES[0],
      shipping: "standard",
    },
  })
  const shipping = useWatch({ control: form.control, name: "shipping" })

  if (placed) return <Confirmation order={placed} />
  if (lines.length === 0) return <EmptyCart />

  const summary = cartSummary(lines, shipping)

  return (
    <form
      method="post"
      noValidate
      className="flex flex-col gap-10"
      onSubmit={form.handleSubmit((values) => {
        setPlaced({
          firstName: values.name.split(/\s+/)[0]!,
          email: values.email,
          lines,
          summary,
          shipping: values.shipping,
        })
        clear()
        window.scrollTo({ top: 0 })
      })}
    >
      <h1 className="font-heading text-4xl sm:text-5xl">Checkout</h1>
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_24rem]">
        <FieldGroup className="gap-10">
          <FieldSet>
            <FieldLegend>Contact</FieldLegend>
            <TextField
              control={form.control}
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              description="For the receipt and a note when it ships."
            />
          </FieldSet>

          <FieldSet>
            <FieldLegend>Shipping address</FieldLegend>
            <FieldGroup>
              <TextField
                control={form.control}
                name="name"
                label="Full name"
                autoComplete="name"
              />
              <TextField
                control={form.control}
                name="address"
                label="Address"
                autoComplete="street-address"
              />
              <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
                <TextField
                  control={form.control}
                  name="city"
                  label="City"
                  autoComplete="address-level2"
                />
                <TextField
                  control={form.control}
                  name="postcode"
                  label="Postcode"
                  autoComplete="postal-code"
                />
              </div>
              <Controller
                name="country"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="checkout-country">Country</FieldLabel>
                    <NativeSelect
                      {...field}
                      id="checkout-country"
                      autoComplete="country-name"
                      className="w-full"
                    >
                      {COUNTRIES.map((country) => (
                        <NativeSelectOption key={country}>
                          {country}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              />
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Delivery</FieldLegend>
            <Controller
              name="shipping"
              control={form.control}
              render={({ field }) => (
                <RadioGroup
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  {shippingOptions.map((option) => (
                    <FieldLabel
                      key={option.id}
                      htmlFor={`checkout-shipping-${option.id}`}
                    >
                      <Field orientation="horizontal">
                        <FieldContent>
                          <FieldTitle>{option.label}</FieldTitle>
                          <FieldDescription>
                            {option.description}
                          </FieldDescription>
                        </FieldContent>
                        <RadioGroupItem
                          value={option.id}
                          id={`checkout-shipping-${option.id}`}
                        />
                      </Field>
                    </FieldLabel>
                  ))}
                </RadioGroup>
              )}
            />
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
              <CartLineItem key={lineKey(line)} line={line} compact />
            ))}
          </ul>
          <OrderSummary
            summary={summary}
            shippingLabel={shippingLabel(shipping)}
          >
            <Button type="submit" size="lg" className="w-full">
              Place order
            </Button>
          </OrderSummary>
        </div>
      </div>
    </form>
  )
}

type TextFieldName = "email" | "name" | "address" | "city" | "postcode"

/** One required text field: a Controller rendering Field, Input and its error. */
function TextField({
  control,
  name,
  label,
  type = "text",
  autoComplete,
  description,
}: {
  control: Control<CheckoutValues>
  name: TextFieldName
  label: string
  type?: "text" | "email"
  autoComplete: string
  description?: ReactNode
}) {
  const id = `checkout-${name}`
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...field}
            id={id}
            type={type}
            autoComplete={autoComplete}
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.invalid ? `${id}-error` : undefined}
          />
          {fieldState.invalid ? (
            <FieldError id={`${id}-error`} errors={[fieldState.error]} />
          ) : (
            description && <FieldDescription>{description}</FieldDescription>
          )}
        </Field>
      )}
    />
  )
}

function Confirmation({ order }: { order: PlacedOrder }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <div className="flex flex-col items-center gap-5 text-center">
        <Illustration seed="kettle" className="size-36" />
        <p className="rounded-full border px-3 py-1 font-mono text-sm">
          Order {ORDER_ID}
        </p>
        <h1
          ref={focusOnMount}
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
            <CartLineItem key={lineKey(line)} line={line} compact />
          ))}
        </ul>
        <OrderSummary
          summary={order.summary}
          shippingLabel={shippingLabel(order.shipping)}
        />
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
