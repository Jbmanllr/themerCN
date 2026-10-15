"use client";

// Keeps the editor's native scrolling working in a host that uses Lenis smooth
// scroll. Mounted by ThemerRoot, active while a Themer UI that hides the page
// is open (Workspace, the mobile drawer); the in-place layouts leave the
// page's scrolling alone. In a Host app without Lenis the fallback below only
// sets a `lenis-paused` class that nothing styles.

import { useEffect } from "react";

interface LenisLike {
  stop: () => void;
  start: () => void;
}

function findLenis(): LenisLike | null {
  const w = window as typeof window & {
    lenis?: Partial<LenisLike>;
    __lenis?: Partial<LenisLike>;
  };
  const lenis = w.lenis ?? w.__lenis;
  return lenis &&
    typeof lenis.stop === "function" &&
    typeof lenis.start === "function"
    ? (lenis as LenisLike)
    : null;
}

/**
 * Pauses Lenis smooth scroll while `active`, so native scroll works inside
 * the Themer UI.
 *
 * Looks for the Lenis instance on window.lenis or window.__lenis; without
 * one it sets the `lenis-paused` class on the root element instead. Exactly
 * one stop per open and one start per close (or unmount), on the instance
 * that was stopped.
 */
export function LenisPause({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return undefined;

    const lenis = findLenis();
    if (lenis) {
      lenis.stop();
      return () => lenis.start();
    }

    const root = document.documentElement;
    root.classList.add("lenis-paused");
    return () => root.classList.remove("lenis-paused");
  }, [active]);

  return null;
}
