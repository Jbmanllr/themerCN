"use client";

// Puts the Themer UI beside the Host app's tree: the floating trigger and the
// overlay, portaled to document.body inside the Themer's CSS scope
// (ThemerScope), and the cleanups that run while it is open. It wraps
// nothing: the Host's page renders beside `<Themer>`, never under it.
// `<Themer>` renders it only on a hydrated client, so it portals at once.
//
// See: packages/themer/ARCHITECTURE.md ("Core Entry Points").

import * as React from "react";
import { createPortal } from "react-dom";
import { useOverlayStore } from "../stores/overlay-store";
import { useThemerContext } from "./themer-provider";
import { useIsMobile } from "../hooks/use-is-mobile";
import { Z_INDEX } from "../config/constants";
import { ThemerOverlay } from "./themer-overlay";
import { ThemerScope } from "./themer-scope";
import { ThemerTrigger } from "./themer-trigger";
import { LenisPause } from "./lenis-pause";

/**
 * The Themer UI's root: the trigger and overlay in a portal on <body>, the
 * Lenis pause, and the body scroll lock while the overlay is open on mobile.
 */
export function ThemerRoot() {
  const isOpen = useOverlayStore((state) => state.isOpen);
  const { config } = useThemerContext();
  const isMobile = useIsMobile();

  // Disable body scroll when open on mobile
  // Save/restore previous overflow value to avoid conflicts
  React.useEffect(() => {
    if (!isOpen || !isMobile) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isMobile]);

  return (
    <>
      {/* Pause Lenis when overlay is open */}
      <LenisPause />

      {createPortal(
        <ThemerScope popupLayer={(config.zIndex ?? Z_INDEX.sidebar) + 1}>
          <ThemerTrigger />
          <ThemerOverlay />
        </ThemerScope>,
        document.body,
      )}
    </>
  );
}
