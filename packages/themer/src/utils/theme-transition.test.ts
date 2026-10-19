// Proves runThemeTransition through an injected environment: the update runs
// directly without animation when the View Transitions API is missing or the
// user prefers reduced motion; otherwise the reveal starts at the click point
// (the centre without one) and commits the update synchronously; and an older
// transition finishing never clears a newer one's origin.
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  runThemeTransition,
  THEME_TRANSITION_ATTRIBUTE,
  THEME_TRANSITION_X,
  THEME_TRANSITION_Y,
  transitionOriginPercent,
  type ThemeTransitionEnvironment,
} from "./theme-transition"

function createEnvironment({
  viewTransitions = true,
  reducedMotion = false,
}: { viewTransitions?: boolean; reducedMotion?: boolean } = {}) {
  const attributes = new Map<string, string>()
  const properties = new Map<string, string>()
  const finishers: (() => void)[] = []
  const flush = vi.fn((update: () => void) => update())
  const startViewTransition = vi.fn((callback: () => void) => {
    callback()
    return {
      finished: new Promise<void>((resolve) => {
        finishers.push(resolve)
      }),
    }
  })

  const environment: ThemeTransitionEnvironment = {
    document: {
      documentElement: {
        setAttribute: (name, value) => void attributes.set(name, value),
        removeAttribute: (name) => void attributes.delete(name),
        style: {
          setProperty: (name, value) => void properties.set(name, value),
          removeProperty: (name) => {
            properties.delete(name)
            return ""
          },
        },
      },
      ...(viewTransitions ? { startViewTransition } : {}),
    },
    window: {
      innerWidth: 1000,
      innerHeight: 500,
      matchMedia: () => ({ matches: reducedMotion }),
    },
    flush,
  }

  return {
    environment,
    attributes,
    properties,
    flush,
    startViewTransition,
    finish: (index = finishers.length - 1) => finishers[index]?.(),
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
  vi.restoreAllMocks()
})

describe("runThemeTransition", () => {
  it("updates directly when the View Transitions API is missing", () => {
    const env = createEnvironment({ viewTransitions: false })
    const update = vi.fn()

    expect(runThemeTransition(update, { x: 10, y: 10 }, env.environment)).toBe(
      false
    )
    expect(update).toHaveBeenCalledOnce()
    expect(env.attributes.size).toBe(0)
    expect(env.properties.size).toBe(0)
  })

  it("updates directly when the user prefers reduced motion", () => {
    const env = createEnvironment({ reducedMotion: true })
    const update = vi.fn()

    expect(runThemeTransition(update, undefined, env.environment)).toBe(false)
    expect(update).toHaveBeenCalledOnce()
    expect(env.startViewTransition).not.toHaveBeenCalled()
    expect(env.attributes.size).toBe(0)
  })

  it("reveals from the click point and commits the update synchronously", async () => {
    const env = createEnvironment()
    const update = vi.fn()

    expect(
      runThemeTransition(update, { x: 250, y: 125 }, env.environment)
    ).toBe(true)
    expect(env.flush).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledOnce()
    expect(env.attributes.has(THEME_TRANSITION_ATTRIBUTE)).toBe(true)
    expect(env.properties.get(THEME_TRANSITION_X)).toBe("25%")
    expect(env.properties.get(THEME_TRANSITION_Y)).toBe("25%")

    env.finish()
    await settle()
    expect(env.attributes.size).toBe(0)
    expect(env.properties.size).toBe(0)
  })

  it("reveals from the centre without a point", () => {
    const env = createEnvironment()
    runThemeTransition(() => {}, undefined, env.environment)
    expect(env.properties.get(THEME_TRANSITION_X)).toBe("50%")
    expect(env.properties.get(THEME_TRANSITION_Y)).toBe("50%")
  })

  it("leaves a newer transition's origin in place when an older one ends", async () => {
    const env = createEnvironment()
    runThemeTransition(() => {}, { x: 100, y: 100 }, env.environment)
    // Second toggle before the first finishes.
    runThemeTransition(() => {}, { x: 900, y: 100 }, env.environment)

    env.finish(0)
    await settle()
    expect(env.attributes.has(THEME_TRANSITION_ATTRIBUTE)).toBe(true)
    expect(env.properties.get(THEME_TRANSITION_X)).toBe("90%")

    env.finish(1)
    await settle()
    expect(env.attributes.size).toBe(0)
  })
})

describe("transitionOriginPercent", () => {
  it("clamps points outside the viewport", () => {
    expect(
      transitionOriginPercent(
        { x: -20, y: 900 },
        { innerWidth: 400, innerHeight: 300 }
      )
    ).toEqual({ x: "0%", y: "100%" })
  })
})
