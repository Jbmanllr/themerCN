"use client";

// Hooks that hold Google font families in the Host app's document while a component
// shows them, and report whether each arrived. A hold goes through
// acquireGoogleFont (the reference-counted link registry in
// utils/font-loader.ts); arrival is judged by the 400 weight within
// LOAD_TIMEOUT_MS.
//
// Contract: a failed or timed-out family is reported once and never retried
// on a timer (only `loadFont` / `loadFonts` retry), so a font nothing shows
// cannot keep the page re-rendering. `weights` takes effect only when this
// hook is the family's first holder in the document (acquireGoogleFont: the
// first holder decides the weights).
//
// The editor does not call these: the theme's fonts load through
// DynamicFontLoader (setThemeFonts) and the font picker holds its own
// families. They are exported through the package root.

import { useState, useEffect, useCallback } from "react";
import {
  acquireGoogleFont,
  extractGoogleFontFamily,
  waitForFont,
} from "../utils/font-loader";

// Hoisted constant to avoid recreation on each render
const DEFAULT_WEIGHTS = [400, 500, 600, 700];
// How long a family may take to arrive before it counts as failed.
const LOAD_TIMEOUT_MS = 10_000;

interface UseFontLoaderOptions {
  /** Weights to load */
  weights?: number[];
  /** Auto-load the font */
  autoLoad?: boolean;
}

/** The weights back from their key (an empty key is no weights). */
function weightsFromKey(weightsKey: string): string[] {
  return weightsKey.split(",").filter(Boolean);
}

/**
 * Hook for loading and tracking Google Font loading state.
 *
 * The family is held (acquireGoogleFont) while the hook is mounted with it
 * and released on unmount or when the family changes. A failed load is not
 * retried on its own; `loadFont` tries again.
 */
export function useFontLoader(
  fontFamily: string | undefined,
  options: UseFontLoaderOptions = {},
) {
  const { weights = DEFAULT_WEIGHTS, autoLoad = true } = options;

  // Extract the Google Font family name from CSS font-family string
  const googleFontFamily = fontFamily
    ? extractGoogleFontFamily(fontFamily)
    : null;
  // A string, so a caller's inline weights array does not restart the load.
  const weightsKey = weights.join(",");

  // The last settled load: which family, and whether it arrived in time.
  const [result, setResult] = useState<{ family: string; ok: boolean } | null>(
    null,
  );
  // Bumped by loadFont: the first request when autoLoad is off, or a retry.
  const [attempt, setAttempt] = useState(0);

  const loadFont = useCallback(() => {
    setResult(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!googleFontFamily || (!autoLoad && attempt === 0)) return;
    let cancelled = false;
    const release = acquireGoogleFont(googleFontFamily, {
      weights: weightsFromKey(weightsKey),
    });
    void waitForFont(googleFontFamily, "400", LOAD_TIMEOUT_MS).then((ok) => {
      if (!cancelled) setResult({ family: googleFontFamily, ok });
    });
    return () => {
      cancelled = true;
      release();
    };
  }, [googleFontFamily, weightsKey, autoLoad, attempt]);

  // A result for another family says nothing about this one.
  const current = result?.family === googleFontFamily ? result : null;

  return {
    isLoaded: !googleFontFamily || current?.ok === true,
    isLoading:
      Boolean(googleFontFamily) &&
      (autoLoad || attempt > 0) &&
      current === null,
    error: current && !current.ok ? "Font load timeout" : null,
    loadFont,
    fontFamily: googleFontFamily,
  };
}

/**
 * Hook for loading multiple fonts.
 *
 * Holds every family while mounted with it, like useFontLoader. A family
 * that fails to arrive in time is not retried on its own; `loadFonts` tries
 * again.
 */
export function useFontsLoader(
  fontFamilies: string[],
  options: UseFontLoaderOptions = {},
) {
  const { weights = DEFAULT_WEIGHTS, autoLoad = true } = options;

  // Strings, so a caller's inline arrays do not restart the load.
  const familiesKey = fontFamilies
    .map(extractGoogleFontFamily)
    .filter((f): f is string => f !== null)
    .join("\n");
  const weightsKey = weights.join(",");

  const [loadedFonts, setLoadedFonts] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // The last load that settled, so isLoading can tell it from a newer one.
  const [settled, setSettled] = useState<{
    familiesKey: string;
    weightsKey: string;
    attempt: number;
  } | null>(null);
  // Bumped by loadFonts: the first request when autoLoad is off, or a retry.
  const [attempt, setAttempt] = useState(0);

  const loadFonts = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!familiesKey || (!autoLoad && attempt === 0)) return;
    const families = familiesKey.split("\n");
    const fontWeights = weightsFromKey(weightsKey);
    let cancelled = false;
    const releases = families.map((family) =>
      acquireGoogleFont(family, { weights: fontWeights }),
    );
    void Promise.all(
      families.map((family) => waitForFont(family, "400", LOAD_TIMEOUT_MS)),
    ).then((results) => {
      if (cancelled) return;
      const arrived = families.filter((_, index) => results[index]);
      setLoadedFonts((prev) =>
        arrived.every((family) => prev.has(family))
          ? prev
          : new Set([...prev, ...arrived]),
      );
      setSettled({ familiesKey, weightsKey, attempt });
    });
    return () => {
      cancelled = true;
      for (const release of releases) release();
    };
  }, [familiesKey, weightsKey, autoLoad, attempt]);

  const families = familiesKey ? familiesKey.split("\n") : [];
  const isSettled =
    settled?.familiesKey === familiesKey &&
    settled.weightsKey === weightsKey &&
    settled.attempt === attempt;

  return {
    isLoaded: families.every((family) => loadedFonts.has(family)),
    isLoading: families.length > 0 && (autoLoad || attempt > 0) && !isSettled,
    loadedFonts: Array.from(loadedFonts),
    loadFonts,
  };
}
