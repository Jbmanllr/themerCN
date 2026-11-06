import { expect, test, type Frame, type Page } from "@playwright/test"

import { checkCounts, registerOf } from "../../../tests/counting"
import { loadRegister } from "../../../tests/register"
import { hydrated } from "./page"
import { themerTrigger } from "./themer-ui"

// The merge-gate frame chunk count (Quality register, Page load: frame chunk
// imports; spec #119). One unit is one Live frame navigation: the Live tab
// frames the Host page, whose own Themer loader runs again in the frame's
// realm. The count is the requests for the Themer chunk made from that realm,
// compared with the register's figure through the register reader; while the
// row reads "unmeasured", checkCounts prints the count.
//
// Tagged @count and never @smoke: it needs a production build and a real
// browser, so it runs in CI's e2e job (T2) and stays out of T1's
// `e2e:smoke`, which selects @smoke.
//
// The Themer chunk is the chunk that holds `<Themer>`: the one script whose
// body carries its scope attribute, `data-themer-style` (themer-scope.tsx,
// imported statically by themer.tsx). The Host page must load exactly one
// such chunk, which proves the marker still identifies it. Requests are read
// from the page's request events, not a route: the frame shares the Host's
// memory cache, whose hits a route never sees but the events report.

const PATH = "Page load"
const ROW = "frame chunk imports"
const OUTCOMES = ["Live frame navigation"]
const THEMER_CHUNK_MARKER = "data-themer-style"
const CHUNK = /\/_next\/static\/chunks\/[^?]+\.js(\?.*)?$/

type ChunkRequest = { url: string; fromHost: boolean }

// A chunk is known by its path: a query does not make it another chunk.
const chunkOf = (url: string) => new URL(url).pathname

/** Records the chunk requests on `page`, by the realm they came from, and
 *  tells the Themer chunk apart by the body the Host page received. */
function recordChunks(page: Page) {
  const requests: ChunkRequest[] = []
  const themerChunks = new Set<string>()
  const reads: Promise<void>[] = []
  page.on("request", (request) => {
    if (!CHUNK.test(request.url())) return
    requests.push({
      url: request.url(),
      fromHost: request.frame() === page.mainFrame(),
    })
  })
  page.on("response", (response) => {
    if (!CHUNK.test(response.url())) return
    if (response.request().frame() !== page.mainFrame()) return
    reads.push(
      response.text().then((body) => {
        if (body.includes(THEMER_CHUNK_MARKER))
          themerChunks.add(chunkOf(response.url()))
      })
    )
  })
  return {
    /** The Themer chunk requests so far. */
    async themer() {
      await Promise.all(reads)
      return requests.filter((request) =>
        themerChunks.has(chunkOf(request.url))
      )
    },
  }
}

/** Opens the Live tab and waits until its frame has hydrated and gone quiet,
 *  so its loader has run (and imported, if it imports at all). */
async function navigateLiveFrame(page: Page): Promise<Frame> {
  await page.goto("/")
  await hydrated(page)
  await themerTrigger(page).click()
  await page.getByTestId("themer-preview-tab-live").click()
  const element = page.getByTestId("themer-live-preview-frame")
  await expect(element).toBeVisible()
  const frame = await (await element.elementHandle())!.contentFrame()
  if (!frame) throw new Error("the Live frame has no content frame")
  await expect.poll(() => new URL(frame.url()).pathname).toBe("/")
  // The Themer renders nothing in a frame, so hydration is read from React's
  // own mark on <body>; the loader's effect runs right after it.
  await frame.waitForFunction(() =>
    Object.keys(document.body).some((key) => key.startsWith("__reactFiber$"))
  )
  await frame.waitForLoadState("networkidle")
  return frame
}

const fromFrame = (requests: readonly ChunkRequest[]) =>
  requests.filter((request) => !request.fromHost).length

/** The register's frame chunk row alone: the page-load count test measures
 *  every other Page load row in Vitest. */
const frameChunkRow = () => {
  const register = loadRegister()
  return {
    row: register.row,
    rows: (path: string) =>
      register.rows(path).filter((row) => row.row === ROW),
  }
}

test.describe("frame chunk count", { tag: "@count" }, () => {
  test("a Live frame navigation imports the Themer chunk within the register's figure", async ({
    page,
  }) => {
    const chunks = recordChunks(page)
    await navigateLiveFrame(page)
    const requests = await chunks.themer()

    expect(requests.filter((request) => request.fromHost)).toHaveLength(1)
    checkCounts({
      path: PATH,
      outcomes: OUTCOMES,
      counts: { [ROW]: fromFrame(requests) },
      register: frameChunkRow(),
    })
  })

  test("one more import in the frame fails the comparison", async ({
    page,
  }) => {
    const chunks = recordChunks(page)
    const frame = await navigateLiveFrame(page)
    const before = await chunks.themer()
    const unseeded = fromFrame(before)
    const chunk = before.find((request) => request.fromHost)!.url

    // The seed: the frame's realm imports the Themer chunk once more. The
    // query keeps the document's own script cache from answering it without
    // a request, as a second import by other code would not be.
    await frame.evaluate(
      (src) =>
        new Promise<void>((resolve, reject) => {
          const script = document.createElement("script")
          script.src = src
          script.onload = () => resolve()
          script.onerror = () => reject(new Error(`no ${src}`))
          document.head.append(script)
        }),
      `${chunk}?seed`
    )
    const seeded = fromFrame(await chunks.themer())

    expect(() =>
      checkCounts({
        path: PATH,
        outcomes: OUTCOMES,
        counts: { [ROW]: seeded },
        register: registerOf(PATH, { [ROW]: unseeded }),
      })
    ).toThrow(
      `${PATH}: ${ROW} (${OUTCOMES[0]}): measured ${unseeded + 1}, register ${unseeded}`
    )
  })
})
