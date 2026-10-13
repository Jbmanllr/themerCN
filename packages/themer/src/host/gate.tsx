"use client";

// The host's editor mount, built around the host's own shell loader (which
// imports the host's themer.css with the editor). The host's next.config.ts
// replaces the mount with passthrough.tsx unless the editor is on; the
// NODE_ENV check below is a second guard, not the boundary.
//
// The shell loads after hydration, not through lazy() + Suspense: during
// server rendering Suspense streamed the page twice (a fallback copy plus the
// shell's copy in a hidden segment), and the visible copy stayed dead HTML
// whose menus never opened.
//
// Contract: the page keeps its place. Children always render first in the
// same fragment and the shell mounts after them as a sibling, so when it
// arrives React keeps the page as it is: no remount, no lost state, no
// replaced DOM. Wrapping the children in the shell once it loaded remounted
// the whole page about a second after load and dropped whatever the visitor
// had done in it (gate.test.tsx). The shell takes no children: the editor
// applies its theme to <html>, and nothing in a host page reads its context.
//
// See: packages/themer/README.md ("Host integration contract").

import { useEffect, useState, type ComponentType, type ReactNode } from "react";

/** The editor beside the page: its providers, trigger and overlay. */
type Shell = ComponentType;

export function createDevThemerGate(
  loadShell: () => Promise<{ DevThemerShell: Shell }>,
) {
  return function DevThemerGate({ children }: { children: ReactNode }) {
    const [Shell, setShell] = useState<Shell | null>(null);

    useEffect(() => {
      if (process.env.NODE_ENV !== "development") return;
      // The editor's Live tab frames this page; a second editor inside it
      // would stack its trigger and overlay into the preview.
      if (window.self !== window.top) return;
      let active = true;
      void loadShell().then(({ DevThemerShell }) => {
        if (active) setShell(() => DevThemerShell);
      });
      return () => {
        active = false;
      };
    }, []);

    return (
      <>
        {children}
        {Shell ? <Shell /> : null}
      </>
    );
  };
}
