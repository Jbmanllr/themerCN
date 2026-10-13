// @vitest-environment happy-dom

// The copied flag a copy button swaps its icon on: it shows for the given
// duration, a second copy restarts that time, nothing is left running once the
// button is gone, and a clipboard that is missing or refuses reports false
// without showing "copied".
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCopyFeedback } from "./use-copy-feedback";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Exposed = { current: ReturnType<typeof useCopyFeedback> | null };

let root: Root | null = null;

async function mount(duration?: number): Promise<Exposed> {
  const exposed: Exposed = { current: null };
  function Harness() {
    exposed.current = useCopyFeedback(duration);
    return null;
  }
  root = createRoot(document.createElement("div"));
  await act(async () => root?.render(<Harness />));
  return exposed;
}

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

async function copy(exposed: Exposed, text: string) {
  let result: boolean | undefined;
  await act(async () => {
    result = await exposed.current?.[1](text);
  });
  return result;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  vi.useRealTimers();
});

describe("useCopyFeedback", () => {
  it("shows copied for the duration after the text reached the clipboard", async () => {
    const writeText = vi.fn(async () => undefined);
    stubClipboard(writeText);
    const hook = await mount(1200);
    expect(hook.current?.[0]).toBe(false);

    expect(await copy(hook, "pnpm dlx shadcn add")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("pnpm dlx shadcn add");
    expect(hook.current?.[0]).toBe(true);

    await act(async () => vi.advanceTimersByTime(1199));
    expect(hook.current?.[0]).toBe(true);
    await act(async () => vi.advanceTimersByTime(1));
    expect(hook.current?.[0]).toBe(false);
  });

  it("restarts the time on a second copy", async () => {
    stubClipboard(async () => undefined);
    const hook = await mount(1000);

    await copy(hook, "a");
    await act(async () => vi.advanceTimersByTime(800));
    await copy(hook, "b");
    await act(async () => vi.advanceTimersByTime(800));
    // The first copy's time ran out here; the second one's has not.
    expect(hook.current?.[0]).toBe(true);
    await act(async () => vi.advanceTimersByTime(200));
    expect(hook.current?.[0]).toBe(false);
  });

  it("leaves no timer behind when the button unmounts while copied", async () => {
    stubClipboard(async () => undefined);
    const hook = await mount();
    await copy(hook, "a");
    expect(vi.getTimerCount()).toBe(1);

    await act(async () => root?.unmount());
    root = null;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports false and shows nothing when the clipboard refuses", async () => {
    stubClipboard(async () => {
      throw new DOMException("denied", "NotAllowedError");
    });
    const hook = await mount();

    expect(await copy(hook, "a")).toBe(false);
    expect(hook.current?.[0]).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports false when the browser has no Clipboard API", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    const hook = await mount();

    expect(await copy(hook, "a")).toBe(false);
    expect(hook.current?.[0]).toBe(false);
  });
});
