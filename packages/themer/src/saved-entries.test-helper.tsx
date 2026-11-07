// Saves what a Host app's page saves, for the head-script tests: a Theme and
// the theme override through the editor and preferences stores' public
// actions, a colour mode through the colour-mode provider. The head script
// then reads the entries the stores really write, so a store or the provider
// changing the shape, key or version it saves fails those tests. Only
// storage keeps the save: the provider's `.dark` switch and its colour-mode
// record are undone, so a test sees the page a reload's head script finds.
// Needs happy-dom.
import { act } from "react"
import { createRoot } from "react-dom/client"

import { ColorModeProvider } from "./components/color-mode"
import {
  COLOR_MODE_RECORD,
  colorModeRecordHost,
  getStorageKeys,
} from "./config/constants"
import { useColorMode } from "./hooks/use-color-mode"
import { useEditorStore } from "./stores/editor-store"
import { hydrateThemerStores } from "./stores/hydrate"
import { usePreferencesStore } from "./stores/preferences-store"
import type { ThemeMode, ThemerColorMode } from "./types"
import type { ImportedThemeStyles } from "./types/editor"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

/** Saves `styles` over the default Preset as the Theme of `namespace`, with
 *  `mode` as the editor's mode, through the editor store. */
export function saveThemeStyles(
  namespace: string,
  styles: ImportedThemeStyles,
  mode: ThemeMode = "light"
) {
  hydrateThemerStores(namespace, mode)
  const editor = useEditorStore.getState()
  editor.setCurrentMode(mode)
  editor.importThemeStyles(styles, { replace: true })
}

/** Saves the theme override preference of `namespace` through the
 *  preferences store. */
export function saveThemeOverride(namespace: string, enabled: boolean) {
  hydrateThemerStores(namespace, "light")
  usePreferencesStore.getState().setThemeOverrideEnabled(enabled)
}

/** Switches an uncontrolled colour mode through the provider, as the
 *  Themer's toggle does, and lets the provider save it under `namespace`. */
export async function saveColorMode(namespace: string, mode: ThemerColorMode) {
  const html = document.documentElement
  const className = html.className
  let setMode: ((mode: ThemerColorMode) => void) | undefined
  function Switch() {
    setMode = useColorMode().setMode
    return null
  }
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  await act(async () =>
    root.render(
      <ColorModeProvider storageKey={getStorageKeys(namespace).colorMode}>
        <Switch />
      </ColorModeProvider>
    )
  )
  await act(async () => setMode?.(mode))
  await act(async () => root.unmount())
  container.remove()
  html.className = className
  delete colorModeRecordHost()[COLOR_MODE_RECORD]
}
