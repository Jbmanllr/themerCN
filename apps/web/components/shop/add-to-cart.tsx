"use client"

import Link from "next/link"
import { useState } from "react"

import { QuantityStepper } from "@/components/shop/quantity-stepper"
import type { Product } from "@/lib/mock/types"
import { useCart } from "@/lib/stores/cart"
import { Button } from "@workspace/ui/components/button"

/**
 * The product page's buy box: options as chips, a quantity, Add to cart.
 * `method="post"`, as every Playground form: a submit before hydration
 * keeps the options out of the URL.
 */
export function AddToCart({ product }: { product: Product }) {
  const add = useCart((state) => state.add)
  const [option, setOption] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.options.map((o) => [o.name, o.values[0]!]))
  )
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState<number | null>(null)

  return (
    <form
      method="post"
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        add({ productSlug: product.slug, option, qty })
        setAdded(qty)
        setQty(1)
      }}
    >
      {product.options.map(({ name, values }) => (
        <fieldset key={name} className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{name}</legend>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => (
              <label key={value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name={name}
                  value={value}
                  checked={option[name] === value}
                  onChange={() => setOption({ ...option, [name]: value })}
                  className="peer absolute inset-0 cursor-pointer appearance-none rounded-full outline-none"
                />
                <span className="inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:border-foreground/40">
                  {value}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={qty} onChange={setQty} />
        <Button type="submit" size="lg" className="min-w-40 flex-1">
          Add to cart
        </Button>
      </div>

      <p role="status" className="min-h-5 text-sm text-muted-foreground">
        {added !== null ? (
          <>
            Added {added} to your cart.{" "}
            <Link
              href="/cart"
              className="font-medium text-foreground underline underline-offset-4"
            >
              View cart
            </Link>
          </>
        ) : null}
      </p>
    </form>
  )
}
