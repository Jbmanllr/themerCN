// Proves the colour list's search and lookup: a blank query keeps every
// group, a query matches a label, key or group title case-insensitively, a
// token's group and section id are found, and host extra groups follow the
// built-in ones without built-in keys, are searchable, and keep one identity
// until the registration changes.
import { afterEach, describe, expect, it } from "vitest"

import { configureExtraColors, getExtraColorKeys } from "../config/extra-colors"

import {
  COLOR_LIST_GROUPS,
  colorMatchesSearch,
  getColorListGroups,
  filterColorGroups,
  findColorGroup,
  getColorSectionId,
} from "./color-groups"

const keys = (query: string) =>
  filterColorGroups(query).flatMap((group) =>
    group.colors.map((color) => color.key)
  )

describe("filterColorGroups", () => {
  it("returns every group for an empty or blank query", () => {
    expect(filterColorGroups("")).toBe(COLOR_LIST_GROUPS)
    expect(filterColorGroups("   ")).toBe(COLOR_LIST_GROUPS)
  })

  it("matches labels case-insensitively and drops empty groups", () => {
    const groups = filterColorGroups("FOREGROUND")
    expect(groups.every((group) => group.colors.length > 0)).toBe(true)
    expect(keys("FOREGROUND")).toContain("card-foreground")
    expect(keys("FOREGROUND")).not.toContain("card")
  })

  it("matches token keys", () => {
    expect(keys("chart-3")).toEqual(["chart-3"])
  })

  it("keeps a whole group when its title matches", () => {
    expect(keys("ui elements")).toEqual(["border", "input", "ring"])
  })

  it("finds nothing for an unknown query", () => {
    expect(filterColorGroups("zzz")).toEqual([])
  })
})

describe("colour section lookup", () => {
  it("finds the section of a token", () => {
    const group = findColorGroup("sidebar-ring")
    expect(group?.title).toBe("Sidebar")
    expect(getColorSectionId(group!)).toBe("colors-sidebar")
    expect(getColorSectionId({ title: "Primary & Secondary" })).toBe(
      "colors-primary-secondary"
    )
    expect(findColorGroup("font-sans")).toBeUndefined()
  })

  it("tells whether a search hides a token", () => {
    expect(colorMatchesSearch("primary", "prim")).toBe(true)
    expect(colorMatchesSearch("border", "chart")).toBe(false)
  })
})

describe("host extra colour groups", () => {
  const HOST = [
    {
      title: "Status",
      description: "Feedback colours",
      colors: [
        { key: "success", label: "Success" },
        { key: "success-foreground", label: "Success Foreground" },
        // Collides with a built-in key: ignored.
        { key: "primary", label: "Primary again" },
        { key: "Bad Key", label: "Invalid" },
      ],
    },
    { title: "Empty", colors: [{ key: "ring", label: "Ring" }] },
  ]

  afterEach(() => configureExtraColors())

  it("lists host groups after the built-in ones, without built-in keys", () => {
    configureExtraColors(HOST)
    const groups = getColorListGroups()
    expect(groups.slice(0, COLOR_LIST_GROUPS.length)).toEqual(COLOR_LIST_GROUPS)
    expect(groups.map((group) => group.title).at(-1)).toBe("Status")
    expect(getExtraColorKeys()).toEqual(["success", "success-foreground"])
    // Stable until the registration changes.
    expect(getColorListGroups()).toBe(groups)
  })

  it("searches and finds extra colours", () => {
    configureExtraColors(HOST)
    expect(keys("success")).toEqual(["success", "success-foreground"])
    expect(keys("feedback")).toEqual([])
    expect(keys("status")).toEqual(["success", "success-foreground"])
    expect(findColorGroup("success-foreground")?.title).toBe("Status")
    expect(colorMatchesSearch("success", "succ")).toBe(true)
    expect(findColorGroup("primary")?.title).toBe("Primary & Secondary")
  })

  it("is the built-in list when the host has none", () => {
    expect(getColorListGroups()).toBe(COLOR_LIST_GROUPS)
    expect(findColorGroup("success")).toBeUndefined()
  })
})
