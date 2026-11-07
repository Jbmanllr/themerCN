"use client"

// useToggleMode: the light/dark toggle of the Themer UI (the mode toggle and
// the actions menu), with the circular reveal. Internal.
//
// Light/dark: useColorMode (hooks/use-color-mode.ts) owns the mode. The
// toggle only switches the colour mode; ThemerProvider's mode sync is the
// one writer of themeState.currentMode, and its subscription applies the
// Theme once. An uncontrolled switch re-renders the colour-mode provider at
// once, so that apply lands inside the transition and the reveal shows the
// new Theme. A controlled switch reaches the store when the Host commits
// its new mode; a declined one changes nothing.

import { useCallback } from "react"
import { useColorMode } from "./use-color-mode"
import {
  runThemeTransition,
  type TransitionOrigin,
} from "../utils/theme-transition"
import type { ThemeMode } from "../types"

/** A point, or a pointer event (`onClick={toggleMode}` works as is). */
export type ToggleModeOrigin =
  TransitionOrigin | { clientX: number; clientY: number }

/**
 * A usable click point, or undefined (centre). A keyboard-activated click
 * reports (0, 0), which would start the reveal from the corner.
 */
function toOrigin(
  origin: ToggleModeOrigin | undefined
): TransitionOrigin | undefined {
  if (!origin || typeof origin !== "object") return undefined
  const x = "clientX" in origin ? origin.clientX : origin.x
  const y = "clientY" in origin ? origin.clientY : origin.y
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined
  if (x === 0 && y === 0) return undefined
  return { x, y }
}

/**
 * Toggle light/dark with the circular reveal from `origin` (a pointer
 * position, e.g. the click event) or from the centre. Call from event
 * handlers only (the transition commits the change with flushSync).
 */
export function useToggleMode(): (origin?: ToggleModeOrigin) => void {
  const { mode, setMode } = useColorMode()

  return useCallback(
    (origin?: ToggleModeOrigin) => {
      const newMode: ThemeMode = mode === "light" ? "dark" : "light"
      runThemeTransition(() => setMode(newMode), toOrigin(origin))
    },
    [mode, setMode]
  )
}
