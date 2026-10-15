import { describe, expect, it } from "vitest"

import { cartSummary } from "./shop"

describe("cartSummary", () => {
  it("adds up lines and charges standard shipping below the free threshold", () => {
    // Night Owl Blend $18.00 x 1 + Decaf Dusk $16.00 x 1 = $34.00, + $5.00.
    expect(
      cartSummary(
        [
          { productSlug: "night-owl-blend", option: {}, qty: 1 },
          { productSlug: "decaf-dusk", option: {}, qty: 1 },
        ],
        "standard"
      )
    ).toEqual({ items: 2, subtotal: 3400, shipping: 500, total: 3900 })
  })

  it("ships standard for free from $40", () => {
    // Ethiopia Guji $21.00 x 2 = $42.00.
    expect(
      cartSummary(
        [{ productSlug: "ethiopia-guji", option: {}, qty: 2 }],
        "standard"
      )
    ).toEqual({ items: 2, subtotal: 4200, shipping: 0, total: 4200 })
  })

  it("always charges for express", () => {
    expect(
      cartSummary(
        [{ productSlug: "ethiopia-guji", option: {}, qty: 2 }],
        "express"
      )
    ).toEqual({ items: 2, subtotal: 4200, shipping: 1200, total: 5400 })
  })

  it("charges nothing for an empty cart", () => {
    expect(cartSummary([], "standard")).toEqual({
      items: 0,
      subtotal: 0,
      shipping: 0,
      total: 0,
    })
  })
})
