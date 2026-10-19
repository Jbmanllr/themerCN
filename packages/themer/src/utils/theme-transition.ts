// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified for themercn.
//
// The circular "reveal" when the editor flips light/dark (tweakcn
// components/theme-provider.tsx handleThemeToggle + app/globals.css). The
// new theme grows as a circle from the click point, or from the centre of
// the viewport for keyboard and programmatic toggles.
//
// Differences from tweakcn, and why:
// - The CSS (packages/themer/src/styles/view-transition.css) only matches while
//   `html[data-themer-vt]` is set, so the host's own view transitions (page
//   navigations) keep their animation. The attribute and the origin
//   variables (`--themer-vt-x/-y`, not tweakcn's bare `--x/--y`, which a
//   host could use) are removed once the transition finishes.
// - The mode change runs inside flushSync so React commits the new class and
//   variables (next-themes applies the class in an effect, flushed with the
//   sync render) before the browser takes the "new" snapshot. flushSync must
//   not run during a render: call this from event handlers only.
// - No View Transitions API, or prefers-reduced-motion: the update runs
//   directly, with no animation.
//
// See: packages/themer/ARCHITECTURE.md ("Colour mode").

// react-doctor-disable-next-line react-doctor/no-flush-sync -- flushSync runs only inside document.startViewTransition's update callback, from event handlers: it is what puts the committed mode in the browser's "new" snapshot (next-themes sets the class in an effect React's <ViewTransition> does not capture)
import { flushSync } from "react-dom"

export interface TransitionOrigin {
  /** Viewport x in CSS pixels (MouseEvent.clientX). */
  x: number
  /** Viewport y in CSS pixels (MouseEvent.clientY). */
  y: number
}

/** The parts of the browser the transition touches; injectable for tests. */
export interface ThemeTransitionEnvironment {
  document: {
    documentElement: {
      setAttribute(name: string, value: string): void
      removeAttribute(name: string): void
      style: {
        setProperty(name: string, value: string): void
        removeProperty(name: string): string
      }
    }
    startViewTransition?: (callback: () => void) => {
      finished: Promise<unknown>
    }
  }
  window: {
    innerWidth: number
    innerHeight: number
    matchMedia(query: string): { matches: boolean }
  }
  /** Commits a React update synchronously (react-dom flushSync). */
  flush: (update: () => void) => void
}

export const THEME_TRANSITION_ATTRIBUTE = "data-themer-vt"
export const THEME_TRANSITION_X = "--themer-vt-x"
export const THEME_TRANSITION_Y = "--themer-vt-y"

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

// Each call bumps the token; only the latest transition clears the
// attribute, so a quick second toggle keeps its own origin.
let activeToken = 0

function browserEnvironment(): ThemeTransitionEnvironment | null {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return null
  }
  return {
    document: document as unknown as ThemeTransitionEnvironment["document"],
    window,
    flush: (update) => flushSync(update),
  }
}

/** Origin as a percentage of the viewport; the centre when unknown. */
export function transitionOriginPercent(
  origin: TransitionOrigin | undefined,
  viewport: { innerWidth: number; innerHeight: number }
): { x: string; y: string } {
  if (!origin || viewport.innerWidth <= 0 || viewport.innerHeight <= 0) {
    return { x: "50%", y: "50%" }
  }
  const clamp = (value: number) => Math.min(100, Math.max(0, value))
  return {
    x: `${clamp((origin.x / viewport.innerWidth) * 100)}%`,
    y: `${clamp((origin.y / viewport.innerHeight) * 100)}%`,
  }
}

/**
 * Run `update` (a light/dark switch) behind the circular reveal when the
 * browser supports it and the user allows motion; otherwise run it directly.
 * Returns whether a view transition was started.
 */
export function runThemeTransition(
  update: () => void,
  origin?: TransitionOrigin,
  environment: ThemeTransitionEnvironment | null = browserEnvironment()
): boolean {
  const startViewTransition = environment?.document.startViewTransition
  if (
    !environment ||
    typeof startViewTransition !== "function" ||
    environment.window.matchMedia(REDUCED_MOTION_QUERY).matches
  ) {
    update()
    return false
  }

  const root = environment.document.documentElement
  const { x, y } = transitionOriginPercent(origin, environment.window)
  const token = ++activeToken
  root.setAttribute(THEME_TRANSITION_ATTRIBUTE, "")
  root.style.setProperty(THEME_TRANSITION_X, x)
  root.style.setProperty(THEME_TRANSITION_Y, y)

  const clear = () => {
    if (token !== activeToken) return
    root.removeAttribute(THEME_TRANSITION_ATTRIBUTE)
    root.style.removeProperty(THEME_TRANSITION_X)
    root.style.removeProperty(THEME_TRANSITION_Y)
  }

  try {
    // Called as a method: the DOM API needs `document` as `this`.
    const transition = startViewTransition.call(environment.document, () =>
      environment.flush(update)
    )
    // A skipped or failed transition still applied (or will apply) the
    // update; only the cleanup matters here.
    transition.finished.then(clear, clear)
  } catch {
    // startViewTransition threw before running the callback.
    clear()
    update()
    return false
  }
  return true
}
