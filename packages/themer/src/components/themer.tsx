"use client"

// The Themer as a Host app mounts it: one component beside the Host's tree,
// configured by flat props (ThemerProps). Everything under it is internal.
//
// Contract:
// - It takes no children: the Host page renders beside it, never inside it,
//   so the page is not remounted when the Themer arrives and never sits under
//   the Themer's providers. The Themer applies its Theme to <html>.
// - Its own QueryClient, for the Themer alone: the font catalog cache must
//   not share or be cleared with the Host's cache, and the Host's queries
//   keep the Host's client (themer-query-client.test.tsx).
// - It renders nothing on the server, during hydration, and inside an iframe
//   (`window.self !== window.top`): the Live preview frames the Host page,
//   whose own <Themer> must not stack a second Themer UI.
// - It brings its own CSS: a <style data-themer-style> injected while it is
//   mounted, scoped to its `[data-themer]` root (themer-scope.tsx). The Host
//   app compiles and imports nothing of the Themer's.
// - The persisted stores hydrate from `<storageNamespace>:editor` and
//   `<storageNamespace>:preferences` when it first renders on the client; an
//   uncontrolled light/dark mode is saved under `<storageNamespace>:color-mode`
//   (color-mode.tsx).
// - `presets`, `extraColors`, `previewTabs` and `previewWrapper` must be
//   stable module-level values: a new identity re-registers or rebuilds them.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

import type { ThemerConfig, ThemerProps } from "../types"
import { DEFAULT_STORAGE_NAMESPACE, getStorageKeys } from "../config/constants"
import { useHydrated } from "../hooks/use-hydrated"
import { hydrateThemerStores } from "../stores/hydrate"

import { ColorModeProvider } from "./color-mode"
import { ThemerProvider } from "./themer-provider"
import { ThemerRoot } from "./themer-root"
import { useThemerStyle } from "./themer-scope"

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The Themer: a live editor for the page's shadcn Theme. Mount it once, next
 * to (never around) your app tree; it takes no children and brings its own
 * providers. It renders nothing on the server and inside an iframe.
 *
 * @example
 * ```tsx
 * <body>
 *   {children}
 *   <Themer defaultPreset="brand" presets={PRESETS} />
 * </body>
 * ```
 */
export function Themer(props: ThemerProps) {
  // Everything under it may assume a hydrated client.
  const hydrated = useHydrated()

  if (!hydrated || window.self !== window.top) return null

  return <ThemerApp {...props} />
}

function ThemerApp({
  colorMode,
  onColorModeChange,
  storageNamespace = DEFAULT_STORAGE_NAMESPACE,
  ...editorProps
}: ThemerProps) {
  // Before any child reads the stores, so the first render already shows
  // the persisted Theme of this namespace.
  hydrateThemerStores(storageNamespace)
  useThemerStyle()

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: DAY_MS,
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: DAY_MS,
          },
        },
      })
  )

  const config = useShallowStable<ThemerConfig>(editorProps)

  return (
    <QueryClientProvider client={queryClient}>
      <ColorModeProvider
        colorMode={colorMode}
        onColorModeChange={onColorModeChange}
        storageKey={getStorageKeys(storageNamespace).colorMode}
      >
        <ThemerProvider config={config}>
          <ThemerRoot />
        </ThemerProvider>
      </ColorModeProvider>
    </QueryClientProvider>
  )
}

/**
 * `value` itself, or the previous value while every field is the same, so a
 * Host re-render with unchanged props keeps the config's identity.
 */
function useShallowStable<T extends object>(value: T): T {
  const [stable, setStable] = useState(value)
  if (stable === value || isShallowEqual(stable, value)) return stable
  setStable(value)
  return value
}

function isShallowEqual(a: object, b: object): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  return (
    aKeys.length === bKeys.length &&
    aKeys.every((key) =>
      Object.is(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    )
  )
}
