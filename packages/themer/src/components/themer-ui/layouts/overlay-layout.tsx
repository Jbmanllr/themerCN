"use client";

// Overlay: the Themer layout where the sidebar floats over the Host app's
// real page, on the left, and the page stays usable beside it. Its markup and
// contract are the in-place sidebar layout's (in-place-sidebar-layout.tsx),
// with nothing added.

import { InPlaceSidebarLayout } from "./in-place-sidebar-layout";
import type { ThemerLayoutProps } from "./types";

export function OverlayLayout(props: ThemerLayoutProps) {
  return <InPlaceSidebarLayout layout="overlay" {...props} />;
}
