// @vitest-environment happy-dom

// The paste-a-stylesheet dialog. Its footer button reads Cancel until
// something was imported and Close after, and either one dismisses the dialog
// through the same path as the other ways of closing it, so the next opening
// starts blank instead of showing the summary of the last paste.
import { act, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { defaultThemeState } from "../../config/defaults"
import { useEditorStore } from "../../stores/editor-store"
import { CssImportDialog } from "./css-import-dialog"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement
const closed = vi.fn<(open: boolean) => void>()

function Host() {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button type="button" data-testid="reopen" onClick={() => setOpen(true)}>
        reopen
      </button>
      <CssImportDialog
        open={open}
        onOpenChange={(next) => {
          closed(next)
          setOpen(next)
        }}
      />
    </>
  )
}

const textarea = () =>
  document.querySelector<HTMLTextAreaElement>(
    '[data-testid="themer-css-import-input"]'
  )
const footerButton = () =>
  [
    ...document.querySelectorAll<HTMLButtonElement>("[role=dialog] button"),
  ].find((button) => /^(Cancel|Close)$/u.test(button.textContent ?? ""))

async function paste(css: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    )?.set?.call(textarea(), css)
    textarea()?.dispatchEvent(new Event("input", { bubbles: true }))
  })
}

beforeEach(async () => {
  closed.mockReset()
  useEditorStore.setState({
    themeState: defaultThemeState,
    themeCheckpoint: null,
    history: [],
    future: [],
  })
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root?.render(<Host />))
  await vi.waitFor(() => expect(textarea()).not.toBeNull())
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container.remove()
  document.body.innerHTML = ""
})

describe("CssImportDialog", () => {
  it("reads Cancel before an import and Close after one", async () => {
    expect(footerButton()?.textContent).toBe("Cancel")

    await paste(":root { --background: #fafafa; }")
    await act(async () => {
      document
        .querySelector("[role=dialog] form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        )
    })

    expect(useEditorStore.getState().themeState.styles.light.background).toBe(
      "#fafafa"
    )
    expect(
      document.querySelector('[data-testid="themer-css-import-result"]')
    ).not.toBeNull()
    expect(footerButton()?.textContent).toBe("Close")
  })

  it("dismisses on Cancel, and opens blank next time", async () => {
    await paste(":root { --background: #fafafa; }")
    await act(async () => footerButton()?.click())

    expect(closed).toHaveBeenCalledExactlyOnceWith(false)
    await vi.waitFor(() => expect(textarea()).toBeNull())

    await act(async () =>
      container.querySelector<HTMLElement>('[data-testid="reopen"]')?.click()
    )
    await vi.waitFor(() => expect(textarea()).not.toBeNull())
    expect(textarea()?.value).toBe("")
    expect(
      document.querySelector('[data-testid="themer-css-import-result"]')
    ).toBeNull()
  })

  it("labels its own replace switch when two dialogs are mounted", async () => {
    const second = document.createElement("div")
    document.body.append(second)
    const secondRoot = createRoot(second)
    await act(async () => secondRoot.render(<Host />))
    await vi.waitFor(() =>
      expect(document.querySelectorAll("[role=dialog]")).toHaveLength(2)
    )

    const targets = [...document.querySelectorAll("[role=dialog]")].map(
      (dialog) => {
        const label = [...dialog.querySelectorAll("label")].find((element) =>
          element.textContent?.includes("Replace tokens")
        )
        const target = document.getElementById(label?.htmlFor ?? "")
        expect(dialog.contains(target), "label targets its own dialog").toBe(
          true
        )
        return target
      }
    )
    expect(targets[0]).not.toBe(targets[1])

    await act(async () => secondRoot.unmount())
    second.remove()
  })

  it("imports nothing and says so for a stylesheet without theme variables", async () => {
    await paste("body { color: red; }")
    await act(async () => {
      document
        .querySelector("[role=dialog] form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        )
    })

    expect(
      document.querySelector('[data-testid="themer-css-import-empty"]')
    ).not.toBeNull()
    expect(useEditorStore.getState().history).toEqual([])
    expect(footerButton()?.textContent).toBe("Cancel")
  })
})
