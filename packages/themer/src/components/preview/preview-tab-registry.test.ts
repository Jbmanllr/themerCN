// Pins how built-in and host preview tabs merge (sorted by `order`; a Host tab
// without `order` after the built-ins; a host id replacing a built-in; the
// first of duplicate host ids) and how a persisted tab id resolves to the
// shown tab.
import { describe, expect, it } from "vitest"
import type { ThemerPreviewTab } from "../../types"
import {
  mergePreviewTabs,
  resolveActiveTabId,
  type BuiltinPreviewTab,
} from "./preview-tab-registry"

const Noop = () => null

const builtins: BuiltinPreviewTab[] = [
  { id: "live", label: "Live", component: Noop, scroll: "none", order: 0 },
  { id: "cards", label: "Cards", component: Noop, scroll: "y", order: 10 },
  { id: "colors", label: "Colors", component: Noop, scroll: "y", order: 20 },
]

const ids = (tabs: { id: string }[]) => tabs.map((tab) => tab.id)

describe("mergePreviewTabs", () => {
  it("keeps the built-in tabs when the host adds none", () => {
    const tabs = mergePreviewTabs(builtins)
    expect(ids(tabs)).toEqual(["live", "cards", "colors"])
    expect(tabs.every((tab) => tab.source === "builtin")).toBe(true)
  })

  it("appends host tabs without order after the built-ins, in array order", () => {
    const host: ThemerPreviewTab[] = [
      { id: "b", label: "B", component: Noop },
      { id: "a", label: "A", component: Noop },
    ]
    const tabs = mergePreviewTabs(builtins, host)
    expect(ids(tabs)).toEqual(["live", "cards", "colors", "b", "a"])
    expect(tabs.at(-1)).toMatchObject({ source: "host", scroll: "y" })
  })

  it("places a host tab by order between built-ins", () => {
    const tabs = mergePreviewTabs(builtins, [
      { id: "brand", label: "Brand", component: Noop, order: 5, scroll: "xy" },
    ])
    expect(ids(tabs)).toEqual(["live", "brand", "cards", "colors"])
    expect(tabs[1]).toMatchObject({ scroll: "xy", order: 5 })
  })

  it("lets a host tab replace a built-in with the same id", () => {
    const Replacement = () => null
    const tabs = mergePreviewTabs(builtins, [
      { id: "cards", label: "Our cards", component: Replacement },
    ])
    const cards = tabs.filter((tab) => tab.id === "cards")
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      label: "Our cards",
      component: Replacement,
      source: "host",
    })
  })

  it("keeps the first of duplicate host ids", () => {
    const tabs = mergePreviewTabs(builtins, [
      { id: "x", label: "First", component: Noop },
      { id: "x", label: "Second", component: Noop },
    ])
    expect(
      tabs.filter((tab) => tab.id === "x").map((tab) => tab.label)
    ).toEqual(["First"])
  })
})

describe("resolveActiveTabId", () => {
  const tabs = mergePreviewTabs(builtins, [
    { id: "host", label: "Host", component: Noop },
  ])

  it("keeps a known persisted tab, built-in or host", () => {
    expect(resolveActiveTabId(tabs, "colors")).toBe("colors")
    expect(resolveActiveTabId(tabs, "host")).toBe("host")
  })

  it("falls back to the first tab for an unknown or missing id", () => {
    expect(resolveActiveTabId(tabs, "custom")).toBe("live")
    expect(resolveActiveTabId(tabs, "removed-host-tab")).toBe("live")
    expect(resolveActiveTabId(tabs, undefined)).toBe("live")
  })

  it("returns an empty id when there are no tabs", () => {
    expect(resolveActiveTabId([], "live")).toBe("")
  })
})
