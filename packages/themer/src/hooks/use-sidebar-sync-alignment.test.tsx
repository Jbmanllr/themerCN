// @vitest-environment happy-dom

// While Sidebar Sync is on, the theme's sidebar colours stay on their base
// twins. The alignment writes in place: an undo that lands on an unsynced
// state is re-aligned without becoming an undo entry or clearing redo, and the
// HSL checkpoint follows only when it is the very theme that was aligned.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { defaultThemeState } from "../config/defaults"
import { useEditorStore } from "../stores/editor-store"
import { usePreferencesStore } from "../stores/preferences-store"
import type { ThemeEditorState } from "../types"
import { useSidebarSyncAlignment } from "./use-sidebar-sync-alignment"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

function Harness() {
  useSidebarSyncAlignment()
  return null
}

async function mount() {
  root = createRoot(document.createElement("div"))
  await act(async () => root?.render(<Harness />))
}

/** A theme whose sidebar colours differ from their base twins. */
function unsyncedTheme(primary: string): ThemeEditorState {
  return {
    ...defaultThemeState,
    styles: {
      light: {
        ...defaultThemeState.styles.light,
        primary,
        sidebar: "#abcdef",
        "sidebar-primary": "#fedcba",
      },
      dark: {
        ...defaultThemeState.styles.dark,
        primary,
        sidebar: "#123456",
        "sidebar-primary": "#654321",
      },
    },
  }
}

const sidebarOf = (state: ThemeEditorState) => ({
  light: [state.styles.light.sidebar, state.styles.light["sidebar-primary"]],
  dark: [state.styles.dark.sidebar, state.styles.dark["sidebar-primary"]],
})

beforeEach(() => {
  usePreferencesStore.setState({ sidebarColorSync: true })
  useEditorStore.setState({
    themeState: unsyncedTheme("#111111"),
    themeCheckpoint: null,
    presetBaseline: null,
    history: [],
    future: [],
  })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  usePreferencesStore.setState({ sidebarColorSync: false })
})

describe("useSidebarSyncAlignment", () => {
  it("aligns both modes on mount without an undo entry", async () => {
    const before = useEditorStore.getState().themeState
    await mount()

    const state = useEditorStore.getState()
    expect(state.themeState).not.toBe(before)
    expect(state.themeState.styles.light.sidebar).toBe(
      state.themeState.styles.light.background
    )
    expect(sidebarOf(state.themeState)).toEqual({
      light: [
        state.themeState.styles.light.background,
        state.themeState.styles.light.primary,
      ],
      dark: [
        state.themeState.styles.dark.background,
        state.themeState.styles.dark.primary,
      ],
    })
    expect(state.history).toEqual([])
  })

  it("re-aligns an undo to an unsynced state and leaves the redo stack alone", async () => {
    const unsyncedEarlier = unsyncedTheme("#222222")
    useEditorStore.setState({
      history: [{ state: unsyncedEarlier, timestamp: 0 }],
    })
    await mount()
    const synced = useEditorStore.getState().themeState

    await act(async () => useEditorStore.getState().undo())

    const state = useEditorStore.getState()
    expect(state.themeState.styles.light.primary).toBe("#222222")
    expect(state.themeState.styles.light.sidebar).toBe(
      state.themeState.styles.light.background
    )
    expect(state.themeState.styles.dark.sidebar).toBe(
      state.themeState.styles.dark.background
    )
    // The state undo left is what redo returns to, untouched by the alignment.
    expect(state.future).toHaveLength(1)
    expect(state.future[0]?.state).toBe(synced)
    expect(state.history).toEqual([])
  })

  it("moves the checkpoint along only when it is the theme just aligned", async () => {
    const theme = unsyncedTheme("#333333")
    useEditorStore.setState({ themeState: theme, themeCheckpoint: theme })
    await mount()
    let state = useEditorStore.getState()
    expect(state.themeCheckpoint).toBe(state.themeState)

    const other = unsyncedTheme("#444444")
    await act(async () =>
      useEditorStore.setState({
        themeState: unsyncedTheme("#555555"),
        themeCheckpoint: other,
      })
    )
    state = useEditorStore.getState()
    expect(state.themeCheckpoint).toBe(other)
    expect(state.themeState.styles.light.primary).toBe("#555555")
    expect(state.themeState.styles.light.sidebar).toBe(
      state.themeState.styles.light.background
    )
  })

  it("keeps a theme that is still on its preset on it when it re-aligns", async () => {
    const theme = unsyncedTheme("#333333")
    useEditorStore.setState({
      themeState: theme,
      presetBaseline: { preset: "p", styles: theme.styles },
    })
    await mount()
    let state = useEditorStore.getState()
    expect(state.presetBaseline?.styles).toEqual(state.themeState.styles)

    const edited = unsyncedTheme("#777777")
    await act(async () => useEditorStore.setState({ themeState: edited }))
    state = useEditorStore.getState()
    expect(state.presetBaseline?.styles.light.primary).toBe("#333333")
  })

  it("does nothing while the preference is off, and aligns when it is turned on", async () => {
    usePreferencesStore.setState({ sidebarColorSync: false })
    const before = useEditorStore.getState().themeState
    await mount()
    expect(useEditorStore.getState().themeState).toBe(before)

    await act(async () =>
      usePreferencesStore.setState({ sidebarColorSync: true })
    )
    const { themeState } = useEditorStore.getState()
    expect(themeState.styles.light.sidebar).toBe(
      themeState.styles.light.background
    )
  })

  it("stops following the stores once unmounted", async () => {
    await mount()
    await act(async () => root?.unmount())
    root = null

    const unsynced = unsyncedTheme("#666666")
    useEditorStore.setState({ themeState: unsynced })
    expect(useEditorStore.getState().themeState).toBe(unsynced)
  })
})
