"use client";

// Who owns light/dark. `<Themer>` passes its `colorMode` and
// `onColorModeChange` props here.
//
// Contract:
// - Controlled (either prop set): the mode is `colorMode` and a switch calls
//   `onColorModeChange`; the Host sets the `.dark` class. Until the Host
//   knows its mode (`colorMode` undefined), the mode is read from the class.
// - Uncontrolled: the `.dark` class on <html> is the mode. A switch toggles
//   it, and a MutationObserver follows toggles made by the Host or anyone
//   else.
// - Outside a provider, useColorMode behaves as uncontrolled.

import * as React from "react";

import type { ThemeMode, ThemerColorMode } from "../types";

interface ColorModeValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ColorModeContext = React.createContext<ColorModeValue | null>(null);

function subscribeToRootClass(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getRootClassMode(): ThemeMode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerMode(): ThemeMode {
  return "light";
}

function setRootClassMode(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

function useRootClassMode(): ThemeMode {
  return React.useSyncExternalStore(
    subscribeToRootClass,
    getRootClassMode,
    getServerMode,
  );
}

const noop = () => {};

export function ColorModeProvider({
  children,
  colorMode,
  onColorModeChange,
}: {
  children: React.ReactNode;
  colorMode?: ThemerColorMode;
  onColorModeChange?: (mode: ThemerColorMode) => void;
}) {
  const rootClassMode = useRootClassMode();
  const controlled = colorMode !== undefined || onColorModeChange !== undefined;
  const mode = controlled ? (colorMode ?? rootClassMode) : rootClassMode;
  const setMode = controlled ? (onColorModeChange ?? noop) : setRootClassMode;

  const value = React.useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <ColorModeContext.Provider value={value}>
      {children}
    </ColorModeContext.Provider>
  );
}

/** The current light/dark mode and the function that switches it. */
export function useColorMode(): ColorModeValue {
  const context = React.useContext(ColorModeContext);
  const rootClassMode = useRootClassMode();
  return context ?? { mode: rootClassMode, setMode: setRootClassMode };
}
