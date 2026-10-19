"use client"

// The cart: an in-memory client store (no backend, no persistence; a reload
// empties it). The site header reads the count; the shop screens own the
// rest of the cart's behaviour.
//
// Client-only: this is one module-level store, so on the server every request
// would share it. Call its actions only from client event handlers, never
// during render or on the server; server renders must only read the empty
// initial state.
import { create } from "zustand"

import type { CartLine } from "@/lib/mock/types"
import { lineKey } from "@/lib/shop"

type CartState = {
  lines: CartLine[]
  /** Adds `qty` of a product with these options, merging an identical line. */
  add: (line: CartLine) => void
  /** Sets a line's quantity; 0 or less removes it. */
  setQty: (index: number, qty: number) => void
  clear: () => void
}

export const useCart = create<CartState>()((set) => ({
  lines: [],
  add: (line) =>
    set(({ lines }) => {
      const key = lineKey(line)
      const index = lines.findIndex((l) => lineKey(l) === key)
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
