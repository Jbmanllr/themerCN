import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { expect, it } from "vitest"

import { uiComponents } from "./design-system"

// The DocsShell nav must list every packages/ui component, so a component
// added with `shadcn add` shows up (or this fails until it is listed).
it("lists every packages/ui component", () => {
  const dir = fileURLToPath(
    new URL("../../../packages/ui/src/components", import.meta.url)
  )
  const onDisk = readdirSync(dir)
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => file.replace(/\.tsx$/, ""))
    .sort()

  expect(uiComponents.map((c) => c.slug).sort()).toEqual(onDisk)
})
