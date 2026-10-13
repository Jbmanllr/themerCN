"use client";

// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified by Banter.
// Sources: hooks/inspector/use-theme-inspector.ts, use-inspector-state.ts,
// use-inspector-mouse-events.ts, use-inspector-scroll.ts.
//
// Binds the inspector to the active preview tab. tweakcn listens on one root
// div; here a tab is either a plain element tree (Cards, host tabs…) or a
// same-origin iframe (Live), so the hook binds to `hostRef.current` or to the
// frame's `contentDocument`, and rebinds after every frame load (a navigation
// is a new document). Element rects from the frame are in its own viewport,
// so they are shifted by the frame's position; all rects end up relative to
// `containerRef`, the positioned box the overlay renders in.
//
// Behaviour while enabled:
// - hover follows the nearest ancestor with token classes (one measure per
//   animation frame instead of tweakcn's 20 ms debounce);
// - pointer presses and clicks inside the preview are swallowed (capture
//   phase, so links, menus and buttons do not act); a click pins the card to
//   that element and reports its first token class (`onPick`), so the card
//   stays put while the pointer travels to it; Esc hides the card, and a
//   pinned card takes that Esc (preventDefault) so the fallback fullscreen
//   does not exit on the same key;
// - scrolling anywhere (capture phase: scroll does not bubble) and resizing
//   re-measure the pinned or hovered element instead of hiding it;
// - moving into the rest of the editor clears the card unless it is pinned.
// Everything is removed when the inspector turns off, the tab changes or the
// component unmounts. A cross-origin frame cannot be read: `frameBlocked`
// tells the toggle to disable itself.

import { useCallback, useEffect, useRef, useState } from "react";
import { findThemeClasses, type ElementLike } from "./theme-class-regex";

/** Attribute on the overlay card: pointer events there are the editor's. */
export const INSPECTOR_CARD_ATTRIBUTE = "data-themer-inspector-card";

interface InspectorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface InspectorState {
  /** Element box relative to the container, or null when nothing is shown. */
  rect: InspectorRect | null;
  /** Token classes of the element. */
  classes: readonly string[];
  /** Container size, for placing the card inside it. */
  bounds: { width: number; height: number };
  /** The card is pinned by a click. */
  pinned: boolean;
}

const EMPTY_INSPECTOR_STATE: InspectorState = {
  rect: null,
  classes: [],
  bounds: { width: 0, height: 0 },
  pinned: false,
};

function sameState(a: InspectorState, b: InspectorState): boolean {
  if (a.pinned !== b.pinned) return false;
  if (a.bounds.width !== b.bounds.width) return false;
  if (a.bounds.height !== b.bounds.height) return false;
  if (a.classes.join(" ") !== b.classes.join(" ")) return false;
  if (!a.rect || !b.rect) return a.rect === b.rect;
  return (
    a.rect.top === b.rect.top &&
    a.rect.left === b.rect.left &&
    a.rect.width === b.rect.width &&
    a.rect.height === b.rect.height
  );
}

/** The frame's document when it is readable (same origin), else null. */
export function readFrameDocument(
  frame: HTMLIFrameElement | null,
): Document | null {
  if (!frame) return null;
  try {
    const doc = frame.contentDocument;
    return doc?.documentElement ? doc : null;
  } catch {
    return null;
  }
}

const INTERCEPTED_EVENTS = [
  "pointerdown",
  "mousedown",
  "pointerup",
  "mouseup",
  "click",
  "auxclick",
  "dblclick",
] as const;

export function useInspector({
  enabled,
  frame,
  bindingKey,
  hostRef,
  containerRef,
  onPick,
}: {
  enabled: boolean;
  /** The tab body is an iframe (first `iframe` inside the host). */
  frame: boolean;
  /** Changes when the active tab changes, so the hook rebinds. */
  bindingKey: string;
  hostRef: React.RefObject<HTMLElement | null>;
  containerRef: React.RefObject<HTMLElement | null>;
  /** A click picked an element; receives its first token class. */
  onPick: (className: string) => void;
}): { state: InspectorState; frameBlocked: boolean } {
  const [state, setState] = useState<InspectorState>(EMPTY_INSPECTOR_STATE);
  const [frameBlocked, setFrameBlocked] = useState(false);
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  const update = useCallback((next: InspectorState) => {
    setState((prev) => (sameState(prev, next) ? prev : next));
  }, []);

  // Frame readability, tracked even while the inspector is off so the toggle
  // can say why it is disabled. Checked on each load (navigation).
  useEffect(() => {
    if (!frame) return undefined;
    const iframe = hostRef.current?.querySelector("iframe") ?? null;
    if (!iframe) return undefined;
    const check = () => setFrameBlocked(readFrameDocument(iframe) === null);
    iframe.addEventListener("load", check);
    return () => {
      iframe.removeEventListener("load", check);
      setFrameBlocked(false);
    };
  }, [frame, bindingKey, hostRef]);

  // react-doctor-disable-next-line react-doctor/effect-needs-cleanup -- the cleanup releases every listener, those on the host or frame surface through the unbindHost/unbindFrame closures that bindSurface and bindFrame set up and the rest directly, and cancels the pending animation frame
  useEffect(() => {
    const host = hostRef.current;
    const container = containerRef.current;
    if (!enabled || !host || !container) return undefined;

    const iframe = frame ? host.querySelector("iframe") : null;
    if (frame && !iframe) return undefined;

    let current: ElementLike | null = null;
    let classes: readonly string[] = [];
    let pinned = false;
    let frameDoc: Document | null = null;
    let raf = 0;

    const measure = () => {
      // Also called straight from a click, with a frame still scheduled by
      // select(): drop that frame, or it would outlive the cleanup, which
      // cancels only the frame it still knows.
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      if (!current) return;
      const box = current.getBoundingClientRect();
      const origin = container.getBoundingClientRect();
      let dx = -origin.left;
      let dy = -origin.top;
      if (iframe) {
        const frameBox = iframe.getBoundingClientRect();
        dx += frameBox.left + iframe.clientLeft;
        dy += frameBox.top + iframe.clientTop;
      }
      update({
        rect: {
          top: box.top + dy,
          left: box.left + dx,
          width: box.width,
          height: box.height,
        },
        classes,
        bounds: { width: origin.width, height: origin.height },
        pinned,
      });
    };

    const schedule = () => {
      if (!current || raf) return;
      raf = window.requestAnimationFrame(measure);
    };

    const clear = () => {
      current = null;
      classes = [];
      pinned = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      update(EMPTY_INSPECTOR_STATE);
    };

    const select = (target: EventTarget | null) => {
      const found = findThemeClasses(target, iframe ? null : host);
      if (!found) {
        if (current) clear();
        return false;
      }
      if (found.element === current) return true;
      current = found.element;
      classes = found.matches;
      schedule();
      return true;
    };

    // Hover inside the inspected tree.
    const handleMove = (event: Event) => {
      if (!pinned) select(event.target);
    };

    // Swallow presses so the preview does not act; a click pins and picks.
    const intercept = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.type !== "click") return;
      pinned = false;
      if (!select(event.target)) return;
      pinned = true;
      const first = classes[0];
      measure();
      if (first) onPickRef.current(first);
    };

    // Pointer elsewhere in the editor: hide unless pinned or on the card.
    const handleOutsideMove = (event: Event) => {
      if (pinned || !current) return;
      const target = event.target as Node | null;
      if (target && (iframe ?? host).contains(target)) return;
      if (
        (target as Element | null)?.closest?.(`[${INSPECTOR_CARD_ATTRIBUTE}]`)
      ) {
        return;
      }
      clear();
    };

    // Esc hides the card. A pinned card advertises Esc, so that Esc is taken:
    // the editor's own Esc handling (the fallback fullscreen's exit) skips a
    // prevented key. A hover card does not claim it.
    const handleKeyDown = (event: Event) => {
      if ((event as KeyboardEvent).key !== "Escape" || !current) return;
      if (pinned) event.preventDefault();
      clear();
    };

    // The inspected surface: the host element, or the frame's window (its
    // capture phase runs before the framed app's own React listeners).
    const bindSurface = (
      target: Pick<EventTarget, "addEventListener" | "removeEventListener">,
    ) => {
      target.addEventListener("mousemove", handleMove, { passive: true });
      for (const type of INTERCEPTED_EVENTS) {
        target.addEventListener(type, intercept, true);
      }
      return () => {
        target.removeEventListener("mousemove", handleMove);
        for (const type of INTERCEPTED_EVENTS) {
          target.removeEventListener(type, intercept, true);
        }
      };
    };

    let unbindFrame: (() => void) | null = null;
    const bindFrame = () => {
      unbindFrame?.();
      unbindFrame = null;
      clear();
      frameDoc = readFrameDocument(iframe);
      const frameWindow = frameDoc?.defaultView;
      if (!frameDoc || !frameWindow) return;
      const doc = frameDoc;
      const unbindSurface = bindSurface(frameWindow);
      doc.addEventListener("scroll", schedule, {
        capture: true,
        passive: true,
      });
      doc.addEventListener("keydown", handleKeyDown);
      unbindFrame = () => {
        unbindSurface();
        doc.removeEventListener("scroll", schedule, { capture: true });
        doc.removeEventListener("keydown", handleKeyDown);
      };
    };

    const ownerDoc = host.ownerDocument;
    const ownerWindow = ownerDoc.defaultView ?? window;
    let unbindHost: (() => void) | null = null;
    if (iframe) {
      bindFrame();
      iframe.addEventListener("load", bindFrame);
    } else {
      unbindHost = bindSurface(host);
    }
    ownerDoc.addEventListener("mousemove", handleOutsideMove, {
      passive: true,
    });
    // Capture on the window runs before any document listener sees the key.
    ownerWindow.addEventListener("keydown", handleKeyDown, true);
    ownerDoc.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    ownerWindow.addEventListener("resize", schedule);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      iframe?.removeEventListener("load", bindFrame);
      unbindFrame?.();
      unbindHost?.();
      ownerDoc.removeEventListener("mousemove", handleOutsideMove);
      ownerWindow.removeEventListener("keydown", handleKeyDown, true);
      ownerDoc.removeEventListener("scroll", schedule, { capture: true });
      ownerWindow.removeEventListener("resize", schedule);
      setState(EMPTY_INSPECTOR_STATE);
    };
  }, [enabled, frame, bindingKey, hostRef, containerRef, update]);

  return { state, frameBlocked };
}
