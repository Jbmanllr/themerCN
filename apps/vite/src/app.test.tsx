import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { App } from "./app"

describe("App", () => {
  it("renders a @workspace/ui button", () => {
    const html = renderToString(<App />)

    expect(html).toMatch(/<button[^>]*data-slot="button"/)
  })
})
