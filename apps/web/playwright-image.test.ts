import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

// Visual baselines are rendered in the mcr.microsoft.com/playwright image
// (scripts/playwright-docker.sh derives its tag from this package's pin), and
// CI's e2e job must run in the same image or every screenshot drifts.
const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")
const pin = (path: string) =>
  JSON.parse(read(path)).devDependencies["@playwright/test"] as string

describe("the Playwright image", () => {
  it("CI's e2e job runs in the image matching the @playwright/test pin", () => {
    const images = [
      ...read("../../.github/workflows/ci.yml").matchAll(
        /mcr\.microsoft\.com\/playwright:(\S+)/g
      ),
    ].map((match) => match[1])
    expect(images).toEqual([`v${pin("./package.json")}-noble`])
  })

  it("both apps pin the same @playwright/test version", () => {
    expect(pin("../vite/package.json")).toBe(pin("./package.json"))
  })
})
