// @vitest-environment happy-dom

// A selected row in the Dashboard table has to look selected, and a dragged
// row keeps its drag opacity. The row's class was built from a template
// literal missing a space ("...opacity-80bg-muted"): the highlight never
// applied and the drag opacity class was corrupted. Selection now rides on
// data-state, which the stock table row styles.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import { DataTable } from "./data-table"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container.remove()
})

const rows = [1, 2].map((id) => ({
  id,
  header: `Section ${id}`,
  type: "Narrative",
  target: "18",
  limit: "5",
  reviewer: "Eddie Lake",
}))

describe("DataTable demo", () => {
  it("marks a selected row so the stock row style highlights it, and keeps the drag classes whole", async () => {
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    await act(async () => root?.render(<DataTable data={rows} />))

    const bodyRows = () =>
      [...container.querySelectorAll("tbody tr")] as HTMLElement[]
    expect(bodyRows()).toHaveLength(2)
    expect(bodyRows().map((row) => row.dataset.state)).toEqual([
      undefined,
      undefined,
    ])

    const checkbox =
      bodyRows()[0]?.querySelector<HTMLElement>('[role="checkbox"]')
    if (!checkbox) throw new Error("no row checkbox")
    await act(async () => checkbox.click())

    expect(bodyRows().map((row) => row.dataset.state)).toEqual([
      "selected",
      undefined,
    ])
    for (const row of bodyRows()) {
      expect(row.className.split(/\s+/u)).toContain(
        "data-[dragging=true]:opacity-80"
      )
    }
  })
})
