// Shop pricing: what a cart costs, shared by /cart and /checkout. Fixed rules,
// no backend. Prices come from the catalog (lib/mock/catalog.ts).
import { getProduct } from "./mock"
import type { CartLine, Cents } from "./mock/types"

/** Every shipping option's id; the checkout schema validates against it. */
export const SHIPPING_IDS = ["standard", "express"] as const

export type ShippingId = (typeof SHIPPING_IDS)[number]

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

/** How an order summary names a shipping option, e.g. "Standard shipping". */
export function shippingLabel(id: ShippingId): string {
  return `${shippingOptions.find((option) => option.id === id)!.label} shipping`
}

/**
 * A cart line's identity: its product and its options in a canonical order,
 * so `{ Grind, Size }` and `{ Size, Grind }` are the same line. The cart store
 * merges lines with equal keys, and cart lists use it as the React key.
 */
export function lineKey(
  line: Pick<CartLine, "productSlug" | "option">
): string {
  const option = Object.entries(line.option).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  )
  return JSON.stringify([line.productSlug, option])
}

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
