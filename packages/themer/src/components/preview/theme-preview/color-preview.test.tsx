// @vitest-environment happy-dom

// The palette tab lists every colour with an Edit and a Copy button. Each one
// has to be named after its colour: with every copy button reading the same
// "Copy to clipboard", a screen-reader user could not tell which colour a
// button copied.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import { defaultThemeState } from "../../../config/defaults"
import ColorPreview from "./color-preview"

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

async function mount() {
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await act(async () =>
    root?.render(
      <ColorPreview styles={defaultThemeState.styles} currentMode="light" />
    )
  )
}

const names = (prefix: string) =>
  [...container.querySelectorAll("button")]
    .map((button) => button.getAttribute("aria-label") ?? "")
    .filter((name) => name.startsWith(prefix))

describe("ColorPreview", () => {
  it("gives every colour its own Copy and Edit button name", async () => {
    await mount()

    const copy = names("Copy ")
    const edit = names("Edit ")
    expect(copy.length).toBeGreaterThan(10)
    expect(new Set(copy).size).toBe(copy.length)
    expect(new Set(edit).size).toBe(edit.length)
    // The same colours, named the same way.
    expect(copy.map((name) => name.replace("Copy ", ""))).toEqual(
      edit.map((name) => name.replace("Edit ", ""))
    )
    expect(copy).not.toContain("Copy to clipboard")
  })
})
