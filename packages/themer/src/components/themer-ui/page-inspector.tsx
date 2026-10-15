"use client";

// The inspector on the Host app's real page, for the in-place Themer layouts
// (registry `coversPage: false`: Overlay, Push, Toolbar). Workspace inspects
// its Preview tabs instead (PreviewTabs).
//
// A layout mounts two pieces:
// - <PageInspector />, once, inside its root: binds useInspector to the Host
//   document, renders the highlight and card in a viewport-sized layer that
//   ignores the pointer, and registers Ctrl+I;
// - <PageInspectorToggle />, in its header or bar.
//
// Contract:
// - The Themer's own tree (`[data-themer]`: the Themer UI, its trigger and
//   popups) is never inspected, and its clicks are never swallowed.
// - State is `inspectorMode` in the ThemerUIStore: closing the Themer UI or
//   switching layout turns it off (ThemerUI).

import * as React from "react";
import { useColorFocusTrigger } from "../../hooks/use-color-focus";
import {
  themerShortcuts,
  useKeyboardShortcut,
} from "../../hooks/use-keyboard-shortcut";
import { useThemerUIStore } from "../../stores/themer-ui-store";
import {
  InspectorOverlay,
  InspectorToggle,
  segmentClassName,
  useInspector,
} from "../preview/inspector";

/** The Themer's own tree, left alone by the page inspector. */
const THEMER_TREE_SELECTOR = "[data-themer]";

export function PageInspector() {
  const inspectorMode = useThemerUIStore((state) => state.inspectorMode);
  const toggleInspector = useThemerUIStore((state) => state.toggleInspector);
  const { focusColor } = useColorFocusTrigger();
  // The Themer renders only on a hydrated client, so the document exists.
  const hostRef = React.useRef<HTMLElement>(document.documentElement);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handlePick = React.useCallback(
    (className: string) => {
      const { value } = segmentClassName(className);
      if (value) focusColor(value);
    },
    [focusColor],
  );

  const { state } = useInspector({
    enabled: inspectorMode,
    frame: false,
    bindingKey: "page",
    hostRef,
    containerRef,
    ignore: THEMER_TREE_SELECTOR,
    onPick: handlePick,
  });

  useKeyboardShortcut({
    key: themerShortcuts.inspector.key,
    modifiers: themerShortcuts.inspector.modifiers,
    callback: toggleInspector,
  });

  return (
    <div
      ref={containerRef}
      data-testid="themer-page-inspector"
      className="pointer-events-none fixed inset-0"
    >
      <InspectorOverlay state={state} onFocusColor={focusColor} />
    </div>
  );
}

export function PageInspectorToggle() {
  const inspectorMode = useThemerUIStore((state) => state.inspectorMode);
  const toggleInspector = useThemerUIStore((state) => state.toggleInspector);

  return (
    <InspectorToggle
      pressed={inspectorMode}
      onToggle={toggleInspector}
      data-testid="themer-page-inspector-toggle"
    />
  );
}
