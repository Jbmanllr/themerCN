import { beforeEach, describe, expect, it } from "vitest"

import { useCart } from "./cart"

const cart = () => useCart.getState()
const filter = { Grind: "Filter", Size: "250g" }

describe("the cart store", () => {
  beforeEach(() => cart().clear())

  it("merges the same product with the same options into one line", () => {
    cart().add({ productSlug: "night-owl-blend", option: filter, qty: 1 })
    cart().add({
      productSlug: "night-owl-blend",
      option: { Size: "250g", Grind: "Filter" },
      qty: 2,
    })
    cart().add({
      productSlug: "night-owl-blend",
      option: { Grind: "Espresso", Size: "250g" },
      qty: 1,
    })

    expect(cart().lines).toEqual([
      { productSlug: "night-owl-blend", option: filter, qty: 3 },
      {
        productSlug: "night-owl-blend",
        option: { Grind: "Espresso", Size: "250g" },
        qty: 1,
      },
    ])
  })

  it("sets a quantity, and removes the line at zero", () => {
    cart().add({ productSlug: "ethiopia-guji", option: {}, qty: 1 })
    cart().add({ productSlug: "decaf-dusk", option: {}, qty: 1 })

    cart().setQty(0, 4)
    expect(cart().lines.map((l) => l.qty)).toEqual([4, 1])

    cart().setQty(0, 0)
    expect(cart().lines).toEqual([
      { productSlug: "decaf-dusk", option: {}, qty: 1 },
    ])
  })
})
