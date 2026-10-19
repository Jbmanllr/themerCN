// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "enableIframePageLoading": true } }

// The Live tab's address bar writes the frame's src itself. React refuses a
// javascript: URL in a src prop, so that guard is gone once the bar sets the
// property directly: a typed script address would run inside the same-origin
// frame. The bar must also reach the page the frame started on after the frame
// has moved away from it, the bar must follow links clicked inside the frame,
// and the size buttons must snap the panel back.
import { act, useImperativeHandle, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const panel = vi.hoisted(() => ({ resize: vi.fn() }))

// The real panels measure the layout, which a test DOM has none of; the page
// asks the panel for a width through its imperative handle, which is recorded.
vi.mock("@workspace/ui/components/resizable", () => ({
  ResizablePanelGroup: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  ResizableHandle: () => null,
  ResizablePanel: ({
    children,
    panelRef,
  }: {
    children?: ReactNode
    panelRef?: React.Ref<{ resize: (size: string) => void }>
  }) => {
    useImperativeHandle(panelRef, () => ({ resize: panel.resize }))
    return <div>{children}</div>
  },
}))

import { LivePreview } from "./live-preview"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement

beforeAll(() => {
  // The frame loads an empty page instead of the network.
  ;(
    window as unknown as {
      happyDOM: {
        settings: {
          fetch: {
            interceptor: {
              beforeAsyncRequest: (context: {
                window: { Response: typeof Response }
              }) => Promise<Response>
            }
          }
        }
      }
    }
  ).happyDOM.settings.fetch.interceptor = {
    beforeAsyncRequest: async ({ window: requester }) =>
      new requester.Response("<!doctype html><html><body></body></html>", {
        headers: { "content-type": "text/html" },
      }),
  }
})

beforeEach(async () => {
  panel.resize.mockClear()
  window.history.replaceState(null, "", "/start?tab=1")
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root?.render(<LivePreview />))
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container.remove()
})

function frame() {
  const iframe = container.querySelector("iframe")
  if (!iframe) throw new Error("no preview frame")
  return iframe
}

function urlBar() {
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Preview URL"]'
  )
  if (!input) throw new Error("no URL bar")
  return input
}

/** Types into the bar the way a person does, then presses Enter. */
async function submit(address: string) {
  const input = urlBar()
  await act(async () => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set
    setValue?.call(input, address)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await act(async () => {
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    )
  })
}

/** Every value the frame's src is given from now on. */
function recordSrcWrites() {
  const iframe = frame()
  const writes: string[] = []
  Object.defineProperty(iframe, "src", {
    configurable: true,
    get: () => writes.at(-1) ?? "",
    set: (value: string) => writes.push(value),
  })
  return writes
}

describe("LivePreview address bar", () => {
  it("starts on the page the editor was opened from", () => {
    expect(urlBar().value).toBe("/start?tab=1")
    expect(frame().getAttribute("src")).toBe("/start?tab=1")
  })

  it("loads the typed address into the frame", async () => {
    const writes = recordSrcWrites()
    await submit("/dashboard")
    expect(writes).toEqual(["/dashboard"])
  })

  it("loads the same address again, so the first page is reachable after the frame moved", async () => {
    const writes = recordSrcWrites()
    await submit("/start?tab=1")
    await submit("/start?tab=1")
    expect(writes).toEqual(["/start?tab=1", "/start?tab=1"])
  })

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "  javascript:alert(1)  ",
    // The URL parser drops tabs and line breaks inside the scheme.
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
  ])("refuses the script address %j", async (address) => {
    const writes = recordSrcWrites()
    await submit(address)
    expect(writes).toEqual([])
  })

  it("still loads addresses that merely mention javascript", async () => {
    const writes = recordSrcWrites()
    await submit("/docs/javascript:intro")
    await submit("https://example.com/?next=javascript:alert(1)")
    expect(writes).toEqual([
      "/docs/javascript:intro",
      "https://example.com/?next=javascript:alert(1)",
    ])
  })

  it("falls back to the site root for an empty bar", async () => {
    const writes = recordSrcWrites()
    await submit("   ")
    expect(writes).toEqual(["/"])
  })
})

describe("LivePreview width presets", () => {
  const preset = (name: string) => {
    const button = container.querySelector<HTMLButtonElement>(
      `button[aria-label="${name}"]`
    )
    if (!button) throw new Error(`no ${name} button`)
    return button
  }

  it("sizes the panel to the chosen preset", async () => {
    await act(async () => preset("Tablet").click())
    expect(panel.resize).toHaveBeenLastCalledWith("60%")
    await act(async () => preset("Mobile").click())
    expect(panel.resize).toHaveBeenLastCalledWith("30%")
  })

  // After the handle was dragged, the highlighted preset no longer matches the
  // width; clicking it again sends an empty selection and must snap back.
  it("snaps the panel back when the pressed preset is clicked again", async () => {
    await act(async () => preset("Tablet").click())
    panel.resize.mockClear()

    await act(async () => preset("Tablet").click())

    expect(panel.resize).toHaveBeenCalledExactlyOnceWith("60%")
    expect(preset("Tablet").getAttribute("aria-pressed")).toBe("true")
  })
})

describe("LivePreview address bar follows the frame", () => {
  async function loadedFrameWindow() {
    const iframe = frame()
    await vi.waitFor(() =>
      expect(iframe.contentDocument?.defaultView).toBeTruthy()
    )
    const win = iframe.contentDocument?.defaultView
    if (!win) throw new Error("the frame has no window")
    return win
  }

  // A link inside the framed app changes its address with history.pushState,
  // which fires no load on the frame: only the frame's own window hears it.
  it("shows the page the frame moved to without a reload", async () => {
    const win = await loadedFrameWindow()
    // Let the load event settle so the listeners are bound to this document.
    await act(async () => {
      frame().dispatchEvent(new Event("load"))
    })

    win.history.pushState({}, "", "/pricing?plan=pro")
    await act(async () => {
      win.dispatchEvent(new PopStateEvent("popstate"))
    })

    expect(urlBar().value).toBe("/pricing?plan=pro")
  })

  it("stops listening to the frame's window once the tab is gone", async () => {
    const win = await loadedFrameWindow()
    await act(async () => {
      frame().dispatchEvent(new Event("load"))
    })
    const removed = vi.spyOn(win, "removeEventListener")

    await act(async () => root?.unmount())
    root = null

    const removedTypes = removed.mock.calls.map(([type]) => type)
    expect(removedTypes).toContain("popstate")
    expect(removedTypes).toContain("hashchange")
  })
})
