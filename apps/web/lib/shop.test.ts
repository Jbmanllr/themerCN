import { describe, expect, it } from "vitest"

import { cartSummary, lineKey, shippingLabel } from "./shop"

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

describe("lineKey", () => {
  it("is the same for equal options, whatever their order", () => {
    expect(
      lineKey({
        productSlug: "ethiopia-guji",
        option: { Grind: "Filter", Size: "250g" },
      })
    ).toBe(
      lineKey({
        productSlug: "ethiopia-guji",
        option: { Size: "250g", Grind: "Filter" },
      })
    )
  })

  it("differs when the product or an option differs", () => {
    const base = lineKey({
      productSlug: "ethiopia-guji",
      option: { Grind: "Filter" },
    })
    expect(
      lineKey({ productSlug: "decaf-dusk", option: { Grind: "Filter" } })
    ).not.toBe(base)
    expect(
      lineKey({ productSlug: "ethiopia-guji", option: { Grind: "Espresso" } })
    ).not.toBe(base)
    expect(lineKey({ productSlug: "ethiopia-guji", option: {} })).not.toBe(base)
  })
})

describe("shippingLabel", () => {
  it("names the shipping option", () => {
    expect(shippingLabel("standard")).toBe("Standard shipping")
    expect(shippingLabel("express")).toBe("Express shipping")
  })
})
