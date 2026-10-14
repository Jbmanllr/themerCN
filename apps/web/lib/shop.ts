// Shop pricing: what a cart costs, shared by /cart and /checkout. Fixed rules,
// no backend. Prices come from the catalog (lib/mock/catalog.ts).
import { getProduct } from "./mock"
import type { CartLine, Cents } from "./mock/types"

export type ShippingId = "standard" | "express"

export type ShippingOption = {
  id: ShippingId
  label: string
  description: string
}

/** Standard ships free from this subtotal. */
export const FREE_SHIPPING_FROM: Cents = 4000

const SHIPPING_PRICE: Record<ShippingId, Cents> = {
  standard: 500,
  express: 1200,
}

export const shippingOptions: ShippingOption[] = [
  {
    id: "standard",
    label: "Standard",
    description: "3 to 5 days. Free from $40.00, otherwise $5.00.",
  },
  {
    id: "express",
    label: "Express",
    description: "Next day if you order before 2 pm. $12.00.",
  },
]

export type CartSummary = {
  /** Number of items (sum of quantities). */
  items: number
  subtotal: Cents
  shipping: Cents
  total: Cents
}

/** A line's unit price, from the catalog (0 if the product is unknown). */
export function unitPrice(line: CartLine): Cents {
  return getProduct(line.productSlug)?.price ?? 0
}

/** What `lines` cost with this shipping option. */
export function cartSummary(
  lines: CartLine[],
  shippingId: ShippingId
): CartSummary {
  const items = lines.reduce((sum, line) => sum + line.qty, 0)
  const subtotal = lines.reduce(
    (sum, line) => sum + unitPrice(line) * line.qty,
    0
  )
  const shipping =
    items === 0 || (shippingId === "standard" && subtotal >= FREE_SHIPPING_FROM)
      ? 0
      : SHIPPING_PRICE[shippingId]
  return { items, subtotal, shipping, total: subtotal + shipping }
}
