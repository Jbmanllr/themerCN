// @vitest-environment happy-dom

// The editor chooses its desktop overlay or mobile drawer from this hook. It
// must be right on the first render: components that mount while the editor is
// open used to draw one frame in the desktop layout on a narrow screen and
// flip after paint.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { useIsMobile } from "./use-is-mobile";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

/** A matchMedia that answers for one viewport width and can resize. */
function stubViewport(initialWidth: number) {
  let width = initialWidth;
  const listeners = new Set<() => void>();
  const queries: string[] = [];
  window.matchMedia = ((query: string) => {
    queries.push(query);
    const max = Number(/max-width: (\d+)px/u.exec(query)?.[1]);
    return {
      get matches() {
        return width <= max;
      },
      media: query,
      addEventListener: (_type: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) =>
        listeners.delete(listener),
    };
  }) as unknown as typeof window.matchMedia;
  return {
    queries,
    listenerCount: () => listeners.size,
    resize(next: number) {
      width = next;
      for (const listener of [...listeners]) listener();
    },
  };
}

async function mount(breakpoint?: number) {
  const rendered: boolean[] = [];
  function Harness() {
    const isMobile = useIsMobile(breakpoint);
    rendered.push(isMobile);
    return null;
  }
  root = createRoot(document.createElement("div"));
  await act(async () => root?.render(<Harness />));
  return rendered;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
});

describe("useIsMobile", () => {
  it("is right on the first render, with no desktop frame first", async () => {
    stubViewport(390);
    expect(await mount(1280)).toEqual([true]);
  });

  it("is false on a wide viewport and treats the breakpoint itself as desktop", async () => {
    stubViewport(1280);
    expect(await mount(1280)).toEqual([false]);
  });

  it("follows the viewport crossing the breakpoint, and stops listening on unmount", async () => {
    const viewport = stubViewport(1400);
    const rendered = await mount(1280);
    expect(rendered.at(-1)).toBe(false);
    expect(viewport.queries.at(-1)).toBe("(max-width: 1279px)");

    await act(async () => viewport.resize(900));
    expect(rendered.at(-1)).toBe(true);
    await act(async () => viewport.resize(1500));
    expect(rendered.at(-1)).toBe(false);

    await act(async () => root?.unmount());
    root = null;
    expect(viewport.listenerCount()).toBe(0);
  });

  it("renders the desktop layout on the server, where there is no viewport", () => {
    function Probe() {
      return <span>{String(useIsMobile())}</span>;
    }
    expect(renderToString(<Probe />)).toContain("false");
  });
});
