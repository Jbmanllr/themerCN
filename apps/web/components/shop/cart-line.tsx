import Link from "next/link"
import type { ReactNode } from "react"

import { ImageRefIllustration } from "@/components/illustrations/illustration"
import { formatPrice } from "@/lib/format"
import { getProduct } from "@/lib/mock"
import type { CartLine } from "@/lib/mock/types"
import { unitPrice } from "@/lib/shop"

/** "Filter, 1kg": the options chosen for a line. */
export function optionLabel(line: CartLine): string {
  return Object.values(line.option).join(", ")
}

/**
 * One cart line as a list item: thumbnail, name, options, and its total.
 * `children` holds the controls (the cart's stepper, nothing at checkout).
 */
export function CartLineItem({
  line,
  children,
  compact = false,
}: {
  line: CartLine
  children?: ReactNode
  compact?: boolean
}) {
  const product = getProduct(line.productSlug)
  if (!product) return null
  const options = optionLabel(line)

  return (
    <li className="flex items-center gap-4 py-5">
      <div
        className={
          compact
            ? "size-14 shrink-0 rounded-2xl border bg-card p-1.5"
            : "size-20 shrink-0 rounded-3xl border bg-card p-2 sm:size-24"
        }
      >
        <ImageRefIllustration image={{ ...product.image, alt: "" }} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={`/shop/p/${product.slug}`}
          className="font-heading leading-snug underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {product.name}
        </Link>
        {options ? (
          <p className="text-sm text-muted-foreground">{options}</p>
        ) : null}
        <p className="text-sm text-muted-foreground tabular-nums">
          {compact
            ? `${line.qty} × ${formatPrice(unitPrice(line))}`
            : `${formatPrice(unitPrice(line))} each`}
        </p>
        {children}
      </div>
      <p className="shrink-0 font-medium tabular-nums">
        {formatPrice(unitPrice(line) * line.qty)}
      </p>
    </li>
  )
}
