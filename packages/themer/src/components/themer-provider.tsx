"use client"

// The editor's context root, mounted by <Themer> (components/themer.tsx)
// beside the Host app's tree: registers Host Presets and extra colours, applies
// the edited theme to the Host app's document, and binds the keyboard shortcuts.
//
// Contract:
// - Registration (configurePresets, configureExtraColors) happens during
//   render, before any child reads the registries; hosts pass `presets` and
//   `extraColors` as module-level constants.
// - The light/dark mode comes from useColorMode (hooks/use-color-mode.ts,
//   provided by components/color-mode.tsx: the Host's controlled
//   `colorMode`, or the `.dark` class on <html>). The store's mode mirrors
//   it (hydration, then this provider's mode sync), and the Theme is applied
//   in the store's mode. It writes CSS variables (and the shadow override
//   sheet), never the class.
// - The CSS variables, the shadow override sheet and the theme's font links
//   are removed when the theme override preference goes off or the provider
//   unmounts.
// - The head script's restore sheet (RESTORE_STYLE_ID) is removed in the same
//   effect that first applies the Theme, or at once when the override is off,
//   so the page never shows a stale copy of the Theme.
//
// See: packages/themer/ARCHITECTURE.md ("Core Entry Points").

import * as React from "react"
import { useShallow } from "zustand/react/shallow"
import type {
  ThemeEditorState,
  ThemerConfig,
  ThemerContextValue,
} from "../types"
import {
  useKeyboardShortcut,
  parseShortcut,
  themerShortcuts,
} from "../hooks/use-keyboard-shortcut"
import { useThemerUIStore } from "../stores/themer-ui-store"
import { useEditorStore } from "../stores/editor-store"
import { usePreferencesStore } from "../stores/preferences-store"
import {
  applyThemeToElement,
  removeThemeFromElement,
} from "../utils/apply-theme"
import { useColorMode } from "../hooks/use-color-mode"
import { ThemerContext } from "../hooks/use-themer-context"
import { DynamicFontLoader } from "./dynamic-font-loader"
import { RESTORE_STYLE_ID, SHORTCUTS } from "../config/constants"
import { configurePresets, getDefaultPresetId } from "../config/presets"
import { configureExtraColors } from "../config/extra-colors"
import { isProduction } from "../utils/is-production"
import { selectCurrentMode } from "../selectors"

interface ThemerProviderProps {
  children: React.ReactNode
  config?: ThemerConfig
}

/**
 * Provider for the themer package
 * Sets up keyboard shortcuts and theme application
 */
/**
 * Invalid shortcuts already warned about, so StrictMode's second mount (or a
 * remount) does not repeat the warning.
 */
const warnedShortcuts = new Set<string>()

export function ThemerProvider({
  children,
  config: userConfig,
}: ThemerProviderProps) {
  // Merge user config with defaults
  // Unset (undefined) props keep the defaults. No zIndex default: the
  // Themer UI and the trigger fall back to their own Z_INDEX layers
  // (config/constants.ts); a Host value applies to both. No font endpoint
  // default: without one the picker searches the bundled list.
  // An unrecognisable shortcut falls back to the default toggle (warned
  // below), so config.shortcut always parses.
  const requestedShortcut = userConfig?.shortcut
  const requestedToggle =
    requestedShortcut === undefined ? null : parseShortcut(requestedShortcut)
  const shortcutInvalid =
    requestedShortcut !== undefined && requestedToggle === null
  const config = React.useMemo<ThemerConfig>(
    () => ({
      ...userConfig,
      showTrigger: userConfig?.showTrigger ?? true,
      shortcut:
        requestedShortcut === undefined || shortcutInvalid
          ? SHORTCUTS.toggle
          : requestedShortcut,
    }),
    [userConfig, requestedShortcut, shortcutInvalid]
  )

  React.useEffect(() => {
    if (!shortcutInvalid || isProduction()) return
    if (warnedShortcuts.has(requestedShortcut)) return
    warnedShortcuts.add(requestedShortcut)
    console.warn(
      `themercn: shortcut "${requestedShortcut}" is not a valid shortcut ` +
        `(modifiers: ctrl/control, alt/option, shift, meta/cmd/command). ` +
        `Using the default "${SHORTCUTS.toggle}".`
    )
  }, [requestedShortcut, shortcutInvalid])

  // Host presets must be in the registry before any child (preset picker,
  // store actions) reads it, so register during render. Idempotent for the
  // same `presets` array, which hosts pass as a module-level constant.
  configurePresets({
    presets: config.presets,
    defaultPreset: config.defaultPreset,
  })
  // Host extra colours likewise (colour list, search, inspector, apply).
  configureExtraColors(config.extraColors)

  // A fresh store (nothing persisted) starts on the Host app's default preset.
  const adoptDefaultPreset = useEditorStore((state) => state.adoptDefaultPreset)
  const refreshUntouchedPreset = useEditorStore(
    (state) => state.refreshUntouchedPreset
  )
  // A layout effect, so a first visit never paints the library default
  // before the Host Preset replaces it. Then a restored, unedited preset is
  // brought up to its current source (host tokens may have changed since it
  // was stored); this must run after configurePresets above, never at
  // module-load hydration, when Host Presets are not registered yet.
  React.useLayoutEffect(() => {
    adoptDefaultPreset(getDefaultPresetId())
    refreshUntouchedPreset()
  }, [
    adoptDefaultPreset,
    refreshUntouchedPreset,
    config.defaultPreset,
    config.presets,
  ])

  const { mode } = useColorMode()

  const { undo, redo, canUndo, canRedo } = useEditorStore(
    useShallow((state) => ({
      undo: state.undo,
      redo: state.redo,
      canUndo: state.canUndo,
      canRedo: state.canRedo,
    }))
  )
  const themeOverrideEnabled = usePreferencesStore(
    (state) => state.themeOverrideEnabled
  )

  // The mode sync: the store's mode mirrors the colour mode. Hydration put
  // the colour mode on the Theme, so at mount it has nothing to set. A layout
  // effect after the Preset adopt and refresh, so a later mode change lands
  // in the same commit as the controls that read the colour mode. It also
  // puts the store's mode back when it leaves the colour mode (the toggle
  // writes it with its switch, and a controlling Host may decline that
  // switch). It never applies: the subscription below does.
  const storeMode = useEditorStore(selectCurrentMode)
  React.useLayoutEffect(() => {
    if (storeMode !== mode) useEditorStore.getState().setCurrentMode(mode)
  }, [mode, storeMode])

  // The Theme-apply path: the Theme, in the store's mode, is applied once
  // after the layout effects above, then on every later Theme state change
  // (a mode change included) through a store subscription, so an edit never
  // re-renders this provider. Re-applying on every change is enough to drop
  // properties the new theme no longer sets (applyThemeToElement diffs
  // against its previous call), so the page never flashes between edits.
  // A layout effect, so its subscription ends in the commit that unmounts
  // this tree, before <Themer> rehydrates the stores for another
  // `storageNamespace`: the outgoing tree never applies the incoming state.
  // Everything it wrote, the shadow override sheet included, is removed only
  // when the override goes off or the editor unmounts.
  React.useLayoutEffect(() => {
    const restoreSheet = document.getElementById(RESTORE_STYLE_ID)
    if (!themeOverrideEnabled) {
      restoreSheet?.remove()
      return undefined
    }

    const apply = (state: ThemeEditorState) =>
      applyThemeToElement(state, document.documentElement, {
        updateClass: false,
      })
    apply(useEditorStore.getState().themeState)
    restoreSheet?.remove()
    return useEditorStore.subscribe((next, previous) => {
      if (next.themeState !== previous.themeState) apply(next.themeState)
    })
  }, [themeOverrideEnabled])

  React.useEffect(() => {
    if (!themeOverrideEnabled) return undefined
    return () => removeThemeFromElement(document.documentElement)
  }, [themeOverrideEnabled])

  // Keyboard shortcuts. useKeyboardShortcut keys its listener on the
  // shortcut string, so the fresh arrays and inline callbacks below do not
  // re-add listeners on every theme edit.
  const toggle = useThemerUIStore((state) => state.toggle)
  const isOpen = useThemerUIStore((state) => state.isOpen)
  const { key, modifiers } = requestedToggle ?? themerShortcuts.toggle

  useKeyboardShortcut({
    key,
    modifiers,
    callback: toggle,
  })

  // Undo keyboard shortcut (Ctrl+Z / Cmd+Z)
  useKeyboardShortcut({
    key: themerShortcuts.undo.key,
    modifiers: themerShortcuts.undo.modifiers,
    callback: () => {
      if (canUndo()) {
        undo()
      }
    },
    enabled: isOpen,
  })

  // Redo keyboard shortcut (Ctrl+Shift+Z / Cmd+Shift+Z)
  useKeyboardShortcut({
    key: themerShortcuts.redo.key,
    modifiers: themerShortcuts.redo.modifiers,
    callback: () => {
      if (canRedo()) {
        redo()
      }
    },
    enabled: isOpen,
  })

  const contextValue = React.useMemo<ThemerContextValue>(
    () => ({ config }),
    [config]
  )

  return (
    <ThemerContext value={contextValue}>
      <DynamicFontLoader />
      {children}
    </ThemerContext>
  )
}
