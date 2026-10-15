import { describe, expect, it } from "vitest"

import {
  authors,
  categories,
  chatThreads,
  getPostsInCategory,
  getProduct,
  orders,
  plans,
  postCategories,
  posts,
  products,
  scriptedReplies,
} from "."
import type { Block } from "./types"

const dupes = (values: string[]) =>
  values.filter((value, index) => values.indexOf(value) !== index)

const productRefs = (blocks: Block[]) =>
  blocks.flatMap((block) =>
    block.type === "product" ? [block.productSlug] : []
  )

describe("mock data", () => {
  it("has unique slugs and ids", () => {
    expect(dupes(products.map((p) => p.slug))).toEqual([])
    expect(dupes(categories.map((c) => c.slug))).toEqual([])
    expect(dupes(posts.map((p) => p.slug))).toEqual([])
    expect(dupes(plans.map((p) => p.id))).toEqual([])
    expect(dupes(orders.map((o) => o.id))).toEqual([])
    expect(dupes(chatThreads.map((t) => t.id))).toEqual([])
  })

  it("only references things that exist", () => {
    const categorySlugs = categories.map((c) => c.slug)
    for (const product of products) {
      expect(categorySlugs).toContain(product.category)
    }
    for (const post of posts) {
      expect(authors.map((a) => a.id)).toContain(post.author)
      expect(postCategories.map((c) => c.slug)).toContain(post.category)
    }
    const referenced = [
      ...posts.flatMap((p) => productRefs(p.body)),
      ...chatThreads.flatMap((t) =>
        t.messages.flatMap((m) => productRefs(m.content))
      ),
      ...scriptedReplies.flatMap((r) => productRefs(r.reply)),
    ]
    for (const slug of referenced) {
      expect(getProduct(slug), slug).toBeDefined()
    }
  })

  it("gives the Brew Assistant exactly one fallback reply, last", () => {
    const fallbacks = scriptedReplies.filter((r) => r.match === "fallback")
    expect(fallbacks).toHaveLength(1)
    expect(scriptedReplies.at(-1)?.match).toBe("fallback")
  })

  it("lists journal posts newest first, and every category has a post", () => {
    const dates = posts.map((p) => p.publishedAt)
    expect(dates).toEqual([...dates].sort().reverse())
    for (const category of postCategories) {
      expect(getPostsInCategory(category.slug), category.slug).not.toEqual([])
    }
    expect(getPostsInCategory("origins").map((p) => p.slug)).toEqual([
      "visiting-guji",
      "decaf-without-apology",
    ])
  })

  it("highlights exactly one plan", () => {
    expect(plans.filter((p) => p.highlighted)).toHaveLength(1)
  })
})
