"use client"

// `themercn/loader`: how a Host app keeps the Themer out of builds where it
// is off. The Host passes `() => import("themercn")` when it wants the
// Themer, or `null` when it doesn't; with `null` the bundler never sees the
// import, so nothing of the Themer ships.
//
// Contract:
// - Imports only types from the rest of the package, so this entry reaches no
//   Themer code (checked after the build by scripts/check-entries.mjs).
// - Renders nothing on the server and during hydration, then loads once and
//   renders `<Themer>` with the props it was given. It never takes children:
//   the Host page renders beside it, so the page is not remounted when the
//   Themer arrives (loader.test.tsx).
// - Loads after hydration in an effect, not through lazy() + Suspense: under
//   server rendering Suspense streamed the page twice (a fallback copy plus
//   the Themer's copy in a hidden segment).
// - A load that resolves after the loader unmounted is dropped.
// - A load that rejects (a chunk missing after a deploy, a network error) is
//   logged once as a `[themercn]` console error; the Themer stays absent and
//   nothing retries.

import { useEffect, useState, type ComponentType } from "react"

import type { ThemerProps } from "./types"

/** What `load` resolves to: the `themercn` module, or anything with its `Themer`. */
export interface ThemerModule {
  /** The `<Themer>` component the loader renders. */
  Themer: ComponentType<ThemerProps>
}

/**
 * Returns a component that renders `<Themer>` once `load` has resolved after
 * hydration, or nothing at all when `load` is `null`. Create it once, at
 * module level, and render it beside (never around) your app tree. A load
 * that rejects is logged once as a `[themercn]` console error and the Themer
 * stays absent.
 *
 * @example
 * ```tsx
 * const ThemerLoader = createThemerLoader(
 *   enabled ? () => import("themercn") : null,
 * )
 * // …
 * <body>
 *   {children}
 *   <ThemerLoader storageNamespace="my-app" />
 * </body>
 * ```
 */
export function createThemerLoader(
  load: (() => Promise<ThemerModule>) | null
): ComponentType<ThemerProps> {
  if (load === null)
    return function ThemerLoader() {
      return null
    }

  return function ThemerLoader(props: ThemerProps) {
    const [Themer, setThemer] = useState<ComponentType<ThemerProps> | null>(
      null
    )

    useEffect(() => {
      let active = true
      load().then(
        (module) => {
          if (active) setThemer(() => module.Themer)
        },
        (error: unknown) => {
          // Only the live effect reports: StrictMode's discarded first
          // mount loads too.
          if (active)
            console.error("[themercn] Failed to load the Themer:", error)
        }
      )
      return () => {
        active = false
      }
    }, [])

    return Themer ? <Themer {...props} /> : null
  }
}
