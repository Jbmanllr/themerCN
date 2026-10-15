"use client";

// Push: the Themer layout where the sidebar sits beside the Host app's real
// page and shifts it aside instead of covering it. It is the in-place sidebar
// layout (in-place-sidebar-layout.tsx) plus a page inset. The Themer never
// wraps the Host tree (ADR 0001), so there is no SidebarInset: the page moves
// by a margin on <html>.
//
// Contract:
// - While open on desktop, <html> gets `margin-inline-start` and
//   `--themer-inset-inline-start` set to the sidebar's width (expanded or
//   collapsed, from useThemerSidebarWidth), and a 200ms linear margin
//   transition matching the sidebar's, as inline styles. When the layout
//   unmounts (close, a switch to another layout, the drawer below 1280 px,
//   the Themer unmounted) the Host's own inline values of those three
//   properties are put back as they were, priority included, and absent
//   ones removed.
// - Accepted limits: the Host's `position: fixed` elements stay on the
//   viewport unless they opt in with
//   `left: var(--themer-inset-inline-start, 0)`; the viewport does not
//   shrink, so breakpoints and viewport units do not react.

import * as React from "react";
import { useThemerSidebarWidth } from "../themer-sidebar-provider";
import { InPlaceSidebarLayout } from "./in-place-sidebar-layout";
import type { ThemerLayoutProps } from "./types";

/** The variable fixed Host elements opt in with (README, "Push"). */
const INSET_VARIABLE = "--themer-inset-inline-start";

/**
 * Shifts the Host page aside by `width` (margin-inline-start on <html>, with
 * the sidebar's own 200ms linear width transition) and exposes `width` as
 * INSET_VARIABLE, until the layout unmounts; then the Host's previous inline
 * values come back.
 */
function usePageInset(width: string) {
  React.useLayoutEffect(() => {
    const style = document.documentElement.style;
    const inset: Record<string, string> = {
      [INSET_VARIABLE]: width,
      "margin-inline-start": width,
      transition: "margin-inline-start 200ms linear",
    };
    const previous = Object.keys(inset).map((property) => ({
      property,
      value: style.getPropertyValue(property),
      priority: style.getPropertyPriority(property),
    }));
    for (const [property, value] of Object.entries(inset)) {
      style.setProperty(property, value);
    }
    return () => {
      for (const { property, value, priority } of previous) {
        if (value) style.setProperty(property, value, priority);
        else style.removeProperty(property);
      }
    };
  }, [width]);
}

export function PushLayout(props: ThemerLayoutProps) {
  usePageInset(useThemerSidebarWidth());
  return <InPlaceSidebarLayout layout="push" {...props} />;
}
