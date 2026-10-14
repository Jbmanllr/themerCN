"use client";

// Puts the editor beside the host's tree: the floating trigger, the overlay
// portaled to document.body, and the cleanups that run when it closes. The
// host's children must stay un-wrapped (see ThemerRoot below).
//
// See: packages/themer/docs/API.md ("ThemerRoot").

import * as React from "react";
import { createPortal } from "react-dom";
import { useOverlayStore } from "../stores/overlay-store";
import { useThemerContext } from "./themer-provider";
import { useIsMobile } from "../hooks/use-is-mobile";
import { ThemerOverlay } from "./themer-overlay";
import { ThemerTrigger } from "./themer-trigger";
import { LenisPause } from "./lenis-pause";

const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

interface ThemerRootProps {
  children: React.ReactNode;
}

/**
 * Root component that wraps the app and adds the themer overlay.
 *
 * The host's children render as they are, with no wrapper element: a
 * transformed (or `will-change: transform`) ancestor becomes the containing
 * block of every `position: fixed` descendant, which broke host headers and
 * dialogs, and adding the wrapper after hydration remounted the whole app.
 */
export function ThemerRoot({ children }: ThemerRootProps) {
  const isOpen = useOverlayStore((state) => state.isOpen);
  const { isReady } = useThemerContext();
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

  // Wait for client-side hydration to complete before rendering portal
  // This prevents hydration mismatch between server and client
  const isClient = React.useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerSnapshot,
  );

  if (!isReady) {
    return <>{children}</>;
  }

  return (
    <>
      {children}

      {/* Floating trigger button */}
      <ThemerTrigger />

      {/* Pause Lenis when overlay is open */}
      <LenisPause />

      {/* Overlay portal - only render on client to avoid hydration mismatch */}
      {isClient && createPortal(<ThemerOverlay />, document.body)}
    </>
  );
}

/**
 * The trigger and overlay with no host content: ThemerRoot around nothing, so
 * it shares the root's close cleanup (AI chat reset, mobile scroll lock, Lenis
 * pause) and renders nothing until the themer context is ready.
 */
export function ThemerOverlayOnly() {
  return <ThemerRoot>{null}</ThemerRoot>;
}
