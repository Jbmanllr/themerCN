"use client"

// The cart: an in-memory client store (no backend, no persistence; a reload
// empties it). The site header reads the count; the shop screens own the
// rest of the cart's behaviour and may extend this store.
import { create } from "zustand"

import type { CartLine } from "@/lib/mock/types"

type CartState = {
  lines: CartLine[]
  /** Adds `qty` of a product with these options, merging an identical line. */
  add: (line: CartLine) => void
  /** Sets a line's quantity; 0 or less removes it. */
  setQty: (index: number, qty: number) => void
  clear: () => void
}

const sameOptions = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.entries(a).every(([key, value]) => b[key] === value)

export const useCart = create<CartState>()((set) => ({
  lines: [],
  add: (line) =>
    set(({ lines }) => {
      const index = lines.findIndex(
        (l) =>
          l.productSlug === line.productSlug &&
          sameOptions(l.option, line.option)
      )
      if (index === -1) return { lines: [...lines, line] }
      return {
        lines: lines.map((l, i) =>
          i === index ? { ...l, qty: l.qty + line.qty } : l
        ),
      }
    }),
  setQty: (index, qty) =>
    set(({ lines }) => ({
      lines:
        qty <= 0
          ? lines.filter((_, i) => i !== index)
          : lines.map((l, i) => (i === index ? { ...l, qty } : l)),
    })),
  clear: () => set({ lines: [] }),
}))

/** The number of items in the cart (sum of quantities). */
export function useCartCount(): number {
  return useCart((state) => state.lines.reduce((sum, l) => sum + l.qty, 0))
}
