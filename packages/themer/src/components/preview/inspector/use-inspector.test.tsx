// @vitest-environment happy-dom

// The inspector binds to the preview and must give everything back when it
// turns off or unmounts. Its Esc handling shares the key with the editor's
// fallback fullscreen: an Esc that closes a pinned card must not also leave
// fullscreen, while a card that is only hovered does not claim the key.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { subscribeFullscreen } from "../../../hooks/use-fullscreen";
import { useInspector, type InspectorState } from "./use-inspector";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement;
let target: HTMLButtonElement;

type Exposed = { state: InspectorState | null };

async function mount(onPick: (className: string) => void = () => {}) {
  const exposed: Exposed = { state: null };
  const hostRef = { current: host };
  const containerRef = { current: host };
  function Harness({ enabled }: { enabled: boolean }) {
    exposed.state = useInspector({
      enabled,
      frame: false,
      bindingKey: "cards",
      hostRef,
      containerRef,
      onPick,
    }).state;
    return null;
  }
  root = createRoot(document.createElement("div"));
  const render = (enabled: boolean) =>
    act(async () => root?.render(<Harness enabled={enabled} />));
  await render(true);
  return { exposed, render };
}

function key(name: string) {
  const event = new KeyboardEvent("keydown", {
    key: name,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

const hover = () =>
  act(() => {
    target.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
  });

const click = () => {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
};

beforeEach(() => {
  host = document.createElement("div");
  target = document.createElement("button");
  target.className = "bg-primary text-primary-foreground";
  host.append(target);
  document.body.append(host);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  host.remove();
});

describe("useInspector", () => {
  it("pins a clicked element, picks its first token class and swallows the click", async () => {
    const onPick = vi.fn();
    const { exposed } = await mount(onPick);
    const pageHandler = vi.fn();
    target.addEventListener("click", pageHandler);

    const event = click();

    expect(event.defaultPrevented).toBe(true);
    expect(pageHandler).not.toHaveBeenCalled();
    expect(onPick).toHaveBeenCalledWith("bg-primary");
    expect(exposed.state).toMatchObject({
      pinned: true,
      classes: ["bg-primary", "text-primary-foreground"],
    });
  });

  it("takes Esc on a pinned card, so one press does not also leave fullscreen", async () => {
    const { exposed } = await mount();
    click();
    expect(exposed.state?.pinned).toBe(true);

    const escape = key("Escape");

    expect(escape.defaultPrevented).toBe(true);
    expect(exposed.state).toMatchObject({ pinned: false, rect: null });
  });

  it("leaves Esc to the editor when the card is only hovered", async () => {
    const { exposed } = await mount();
    hover();
    expect(exposed.state?.pinned).toBe(false);

    const escape = key("Escape");

    expect(escape.defaultPrevented).toBe(false);
    expect(exposed.state?.rect).toBeNull();
  });

  it("leaves a key that is not Esc, and Esc with no card, alone", async () => {
    const { exposed } = await mount();
    click();
    expect(key("Enter").defaultPrevented).toBe(false);
    expect(exposed.state?.pinned).toBe(true);

    key("Escape");
    expect(key("Escape").defaultPrevented).toBe(false);
  });

  it("lets the fallback fullscreen survive the Esc that closes a pinned card", async () => {
    let fullscreen = true;
    const unsubscribe = subscribeFullscreen(
      document as never,
      () => fullscreen,
      (next) => {
        fullscreen = next;
      },
    );
    try {
      await mount();
      click();

      key("Escape");
      expect(fullscreen).toBe(true);

      key("Escape");
      expect(fullscreen).toBe(false);
    } finally {
      unsubscribe();
    }
  });

  // A click measures at once while the hover's frame is still scheduled; that
  // frame fired after the cleanup and showed the card again on a switched-off
  // inspector.
  it("gives every listener back when it turns off, and the card stays gone", async () => {
    const onPick = vi.fn();
    const { exposed, render } = await mount(onPick);
    click();
    await render(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(exposed.state).toMatchObject({ pinned: false, rect: null });

    const pageHandler = vi.fn();
    target.addEventListener("click", pageHandler);
    const event = click();
    expect(event.defaultPrevented).toBe(false);
    expect(pageHandler).toHaveBeenCalledOnce();
    expect(onPick).toHaveBeenCalledOnce();
    expect(key("Escape").defaultPrevented).toBe(false);
  });

  it("gives every listener back on unmount, and cancels its pending frame", async () => {
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame");
    await mount();
    hover();

    await act(async () => root?.unmount());
    root = null;
    expect(cancelFrame).toHaveBeenCalled();

    const event = click();
    expect(event.defaultPrevented).toBe(false);
    expect(key("Escape").defaultPrevented).toBe(false);
  });
});
