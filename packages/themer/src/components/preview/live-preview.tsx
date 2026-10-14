"use client";

// The Live tab: the host's own pages in a same-origin iframe, themed by the
// editor, with a URL bar, refresh, open-in-new-tab, Desktop/Tablet/Mobile
// widths and a resizable panel. It is the one built-in tab whose body is a
// frame (`frame: true` in ./builtin-tabs.tsx), so the inspector binds to the
// frame's document instead of an element tree. The frame carries
// `data-testid="themer-live-preview-frame"`.
//
// - Starts on the page the editor was opened from: that is the page being
//   themed, and a CMS root can be an unpublished 404.
// - The theme is written into the frame's document with applyThemeToDocument
//   (variables, shadow overrides, Google font links: fonts are per document)
//   on every load and every change, and removed again when the override
//   switch goes off or the tab unmounts. The document last themed is kept, so
//   cleanup reaches it even after the frame navigated or was detached.
// - next-themes inside the frame owns its light/dark class, as on the page.
// - A cross-origin URL cannot be themed (or inspected); reading it throws or
//   yields null, which is ignored.
// - Each host sends same-origin framing headers only while its editor gate is
//   on; that is what lets this frame load the host's pages.
//
// See: packages/themer/ARCHITECTURE.md (Preview System, Applying a theme) and
// packages/themer/README.md (Host integration contract, framing headers)

import * as React from "react";
import {
  ExternalLink,
  Monitor,
  RotateCcw,
  Smartphone,
  Tablet,
} from "lucide-react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { Input } from "@workspace/ui/components/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { useEditorStore } from "../../stores/editor-store";
import { usePreferencesStore } from "../../stores/preferences-store";
import {
  applyThemeToDocument,
  removeThemeFromDocument,
} from "../../utils/apply-theme";
import { ActionButton } from "../ui/action-button";
import { readFrameDocument } from "./inspector";

type PreviewViewportSize = "100" | "60" | "30";

const LIVE_PREVIEW_VIEWPORTS = [
  { value: "100", label: "Desktop", icon: Monitor },
  { value: "60", label: "Tablet", icon: Tablet },
  { value: "30", label: "Mobile", icon: Smartphone },
] satisfies Array<{
  value: PreviewViewportSize;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}>;

function currentPagePath(): string {
  return typeof window === "undefined"
    ? "/"
    : `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/** Path + query + hash of a same-origin frame's location, else null. */
function readFramePath(iframe: HTMLIFrameElement): string | null {
  const doc = readFrameDocument(iframe);
  if (!doc) return null;
  const { pathname, search, hash } = doc.location;
  return `${pathname}${search}${hash}`;
}

/**
 * Whether a typed address would run script in the frame. React blocks these
 * URLs in a src prop; the URL bar writes the frame's src itself, so it must
 * refuse them too.
 */
function isScriptUrl(address: string): boolean {
  try {
    return new URL(address, window.location.href).protocol === "javascript:";
  } catch {
    return false;
  }
}

/** The window's Navigation API, where the browser has one. */
type NavigationEvents = Pick<
  EventTarget,
  "addEventListener" | "removeEventListener"
>;
function readNavigation(
  win: Window & { navigation?: NavigationEvents },
): NavigationEvents | undefined {
  // A frame has its own EventTarget constructor; an instanceof check against
  // the parent window rejects its native Navigation API.
  return win.navigation;
}

/** Theme the frame's document on load and on every theme change. */
function useThemeInjectedIframe(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
) {
  const themeState = useEditorStore((state) => state.themeState);
  const themeOverrideEnabled = usePreferencesStore(
    (state) => state.themeOverrideEnabled,
  );
  const themedDocRef = React.useRef<Document | null>(null);

  React.useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !themeOverrideEnabled) return undefined;

    const inject = () => {
      const doc = readFrameDocument(iframe);
      const previous = themedDocRef.current;
      if (previous && previous !== doc) {
        // The frame navigated: the old document is gone, drop its records.
        removeThemeFromDocument(previous);
        themedDocRef.current = null;
      }
      if (!doc) return;
      try {
        applyThemeToDocument(doc, themeState, {
          loadFonts: true,
          updateClass: false,
        });
        themedDocRef.current = doc;
      } catch {
        // The document went away mid-navigation; the next load re-applies.
      }
    };

    inject();
    iframe.addEventListener("load", inject);
    return () => iframe.removeEventListener("load", inject);
  }, [iframeRef, themeOverrideEnabled, themeState]);

  // Override off or tab unmounted: remove everything from the themed doc.
  React.useEffect(() => {
    if (!themeOverrideEnabled) return undefined;
    return () => {
      const doc = themedDocRef.current;
      themedDocRef.current = null;
      if (!doc) return;
      try {
        removeThemeFromDocument(doc);
      } catch {
        // Detached document: nothing left to clean.
      }
    };
  }, [themeOverrideEnabled]);
}

export function LivePreview() {
  // Only the first address goes through React: later ones set the frame's
  // src directly (handleNavigate), so the frame is never remounted.
  const [initialSrc] = React.useState(currentPagePath);
  const [inputValue, setInputValue] = React.useState(initialSrc);
  const [viewportSize, setViewportSize] =
    React.useState<PreviewViewportSize>("100");
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const resizablePanelRef = React.useRef<PanelImperativeHandle>(null);

  useThemeInjectedIframe(iframeRef);

  // Narrow screens have no room for device widths: stay at full width.
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    const resizeToFullWidth = () => {
      if (!mediaQuery.matches) return;

      resizablePanelRef.current?.resize("100%");
      setViewportSize("100");
    };

    resizeToFullWidth();
    mediaQuery.addEventListener("change", resizeToFullWidth);
    return () => mediaQuery.removeEventListener("change", resizeToFullWidth);
  }, []);

  // Keep the URL bar on the page the frame is showing after in-frame links.
  // A full page load fires `load` on the iframe; a client-side navigation
  // (history.pushState) only reaches the frame's own window, so its listeners
  // are bound again on every load.
  // react-doctor-disable-next-line react-doctor/effect-needs-cleanup -- the cleanup removes the load listener and calls unbindWindow, which removes the navigation or popstate/hashchange listeners bindWindow added
  React.useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return undefined;
    let boundWindow: Window | null = null;

    const syncLocation = () => {
      const path = readFramePath(iframe);
      if (path) setInputValue(path);
    };

    const unbindWindow = () => {
      const win = boundWindow;
      boundWindow = null;
      if (!win) return;
      try {
        const navigation = readNavigation(win);
        if (navigation) {
          navigation.removeEventListener("currententrychange", syncLocation);
        } else {
          win.removeEventListener("popstate", syncLocation);
          win.removeEventListener("hashchange", syncLocation);
        }
      } catch {
        // The window went away with its document: nothing left to remove.
      }
    };

    const bindWindow = () => {
      unbindWindow();
      // Cross-origin frames yield no document: there is nothing to read.
      const win = readFrameDocument(iframe)?.defaultView;
      if (!win) return;
      try {
        const navigation = readNavigation(win);
        if (navigation) {
          navigation.addEventListener("currententrychange", syncLocation);
        } else {
          win.addEventListener("popstate", syncLocation);
          win.addEventListener("hashchange", syncLocation);
        }
        boundWindow = win;
      } catch {
        // The document went away mid-navigation; the next load binds again.
      }
    };

    const handleLoad = () => {
      bindWindow();
      syncLocation();
    };

    bindWindow();
    iframe.addEventListener("load", handleLoad);
    return () => {
      iframe.removeEventListener("load", handleLoad);
      unbindWindow();
    };
  }, []);

  const handleNavigate = React.useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const target = inputValue.trim() || "/";
    if (isScriptUrl(target)) return;
    // Setting src navigates even when the value is unchanged, so the frame's
    // first page can be reached again after the frame moved away from it.
    iframe.src = target;
  }, [inputValue]);

  const handleRefresh = React.useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = readFrameDocument(iframe);
    if (doc) {
      doc.location.reload();
      return;
    }
    // Cross-origin: reload by resetting the source.
    const currentSrc = iframe.src;
    iframe.src = "about:blank";
    iframe.src = currentSrc;
  }, []);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        handleNavigate();
      }
    },
    [handleNavigate],
  );

  const handleViewportChange = React.useCallback(
    (value: string[]) => {
      // Clicking the pressed preset sends an empty value: snap the panel back
      // to that preset, since a drag may have moved it.
      const nextValue =
        (value[0] as PreviewViewportSize | undefined) ?? viewportSize;

      resizablePanelRef.current?.resize(`${nextValue}%`);
      setViewportSize(nextValue);
    },
    [viewportSize],
  );

  const handleOpenPreview = React.useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    // Cross-origin: the address last sent to the frame.
    const target = readFramePath(iframe) ?? iframe.src;
    window.open(target, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div
      data-slot="block-viewer"
      className="group/block-viewer bg-background @container isolate flex size-full min-w-0 flex-col overflow-clip rounded-lg border"
    >
      <div
        data-slot="block-viewer-toolbar"
        className="h-12 w-full border-b p-2"
      >
        <div className="flex size-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div aria-hidden className="hidden shrink-0 gap-1.5 sm:flex">
              <div className="bg-destructive/50 size-3 rounded-full" />
              <div className="bg-muted-foreground/40 size-3 rounded-full" />
              <div className="bg-primary/50 size-3 rounded-full" />
            </div>

            <Input
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter URL..."
              aria-label="Preview URL"
              className="bg-background h-7 min-w-0 flex-1 text-xs"
            />

            <ActionButton
              label="Refresh"
              size="icon-sm"
              onClick={handleRefresh}
            >
              <RotateCcw className="size-3" />
            </ActionButton>

            <ActionButton
              label="Open in a new tab"
              size="icon-sm"
              onClick={handleOpenPreview}
            >
              <ExternalLink className="size-3" />
            </ActionButton>
          </div>

          <div className="hidden items-center justify-between lg:group-has-data-[slot=block-viewer-display]/block-viewer:flex">
            <ToggleGroup
              aria-label="Preview width"
              size="sm"
              className="bg-background flex gap-0.5 rounded-lg border p-0.5"
              value={[viewportSize]}
              onValueChange={handleViewportChange}
            >
              {LIVE_PREVIEW_VIEWPORTS.map((preview) => {
                const Icon = preview.icon;

                return (
                  <ToggleGroupItem
                    key={preview.value}
                    value={preview.value}
                    aria-label={preview.label}
                  >
                    <Icon className="size-4" />
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </div>
        </div>
      </div>

      <div
        data-slot="block-viewer-display"
        className="size-full min-h-0 overflow-hidden"
      >
        <ResizablePanelGroup
          orientation="horizontal"
          className="relative isolate z-10 size-full"
        >
          <div className="bg-muted absolute inset-0 right-3 [background-image:radial-gradient(var(--muted-foreground),transparent_1px)] [background-size:1rem_1rem] opacity-60 dark:opacity-35" />

          <ResizablePanel
            panelRef={resizablePanelRef}
            className="bg-background relative min-w-[350px] lg:aspect-auto"
            defaultSize="100%"
            minSize="30%"
          >
            {/* react-doctor-disable-next-line react-doctor/iframe-missing-sandbox -- the frame shows the host's own same-origin pages, which the editor must script to theme and inspect; a sandbox would need allow-scripts with allow-same-origin, which lets the page lift it */}
            <iframe
              ref={iframeRef}
              data-testid="themer-live-preview-frame"
              src={initialSrc}
              className="size-full border-0"
              title="Live Site Preview"
            />
          </ResizablePanel>

          <ResizableHandle className="after:bg-border relative inset-x-0 mx-auto hidden w-3 border-l bg-transparent after:absolute after:top-1/2 after:h-8 after:w-[4px] after:-translate-y-1/2 after:rounded-full after:transition-all hover:after:h-12 active:after:h-12 lg:block" />
          <ResizablePanel defaultSize="0%" minSize="0%" />
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
