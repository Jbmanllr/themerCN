// focusColor opens the Colors panel and the token's section, and posts the
// token as the focus request the Themer layout answers, first; then waits for
// the picker to mount (a frame more for its section to open) before it
// scrolls and highlights, withdrawing the request; a newer jump cancels the
// older one, and one whose picker never mounts gives up. The registry removes only the
// element it registered, and closing the editor resets the colour search. A
// frame queue stands in for requestAnimationFrame.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useColorFocusStore } from "../stores/color-focus-store";
import { useThemerUIStore } from "../stores/themer-ui-store";
import { usePreferencesStore } from "../stores/preferences-store";
import {
  focusColor,
  getColorElement,
  registerColorElement,
  type FocusColorScheduler,
} from "./use-color-focus";

class FrameQueue implements FocusColorScheduler {
  private callbacks = new Map<number, () => void>();
  private nextId = 1;
  requestFrame = (callback: () => void) => {
    const id = this.nextId++;
    this.callbacks.set(id, callback);
    return id;
  };
  cancelFrame = (id: number) => {
    this.callbacks.delete(id);
  };
  get pending() {
    return this.callbacks.size;
  }
  flush() {
    const callbacks = [...this.callbacks.values()];
    this.callbacks.clear();
    for (const callback of callbacks) callback();
  }
}

function fakeElement() {
  const calls: unknown[] = [];
  const element = {
    scrollIntoView: (options: unknown) => calls.push(options),
  } as unknown as HTMLElement;
  return { element, calls };
}

describe("focusColor", () => {
  let frames: FrameQueue;
  const cleanups: Array<() => void> = [];

  beforeEach(() => {
    frames = new FrameQueue();
    useThemerUIStore.setState({ activePanel: "other", isOpen: true });
    usePreferencesStore.setState({ sidebarCollapsed: true, sectionStates: {} });
    useColorFocusStore.setState({ highlightTarget: null, colorSearch: "" });
  });

  afterEach(() => {
    while (cleanups.length) cleanups.pop()?.();
  });

  it("opens the Colors panel and the token's section, and requests the token's control, first", () => {
    cleanups.push(focusColor("sidebar-ring", frames));
    expect(useThemerUIStore.getState().activePanel).toBe("colors");
    expect(useColorFocusStore.getState().focusRequest).toBe("sidebar-ring");
    expect(usePreferencesStore.getState().sectionStates).toEqual({
      "colors-sidebar": true,
    });
    expect(useColorFocusStore.getState().highlightTarget).toBeNull();
  });

  it("withdraws the request once the control is highlighted, or the jump gives up", () => {
    const { element } = fakeElement();
    cleanups.push(registerColorElement("primary", element));
    cleanups.push(focusColor("primary", frames));
    frames.flush();
    frames.flush();
    expect(useColorFocusStore.getState().highlightTarget).toBe("primary");
    expect(useColorFocusStore.getState().focusRequest).toBeNull();

    cleanups.push(focusColor("ring", frames));
    for (let i = 0; i < 30; i += 1) frames.flush();
    expect(useColorFocusStore.getState().focusRequest).toBeNull();
  });

  it("leaves fullscreen preview so the picker can mount", () => {
    useThemerUIStore.setState({ fullscreenPreview: true });
    cleanups.push(focusColor("primary", frames));
    expect(useThemerUIStore.getState().fullscreenPreview).toBe(false);
    expect(useThemerUIStore.getState().activePanel).toBe("colors");
  });

  it("waits for the picker to mount, then scrolls and highlights a frame later", () => {
    cleanups.push(focusColor("primary", frames));
    frames.flush();
    expect(useColorFocusStore.getState().highlightTarget).toBeNull();

    const { element, calls } = fakeElement();
    cleanups.push(registerColorElement("primary", element));
    frames.flush(); // picker seen, section opening
    expect(calls).toHaveLength(0);
    frames.flush();
    expect(calls).toEqual([{ behavior: "smooth", block: "center" }]);
    expect(useColorFocusStore.getState().highlightTarget).toBe("primary");
    expect(frames.pending).toBe(0);
  });

  it("clears a search that hides the token, keeps one that shows it", () => {
    useColorFocusStore.setState({ colorSearch: "chart" });
    cleanups.push(focusColor("border", frames));
    expect(useColorFocusStore.getState().colorSearch).toBe("");

    useColorFocusStore.setState({ colorSearch: "bord" });
    cleanups.push(focusColor("border", frames));
    expect(useColorFocusStore.getState().colorSearch).toBe("bord");
  });

  it("cancels the previous jump and gives up when no picker mounts", () => {
    cleanups.push(focusColor("primary", frames));
    cleanups.push(focusColor("ring", frames));
    expect(frames.pending).toBe(1);
    for (let i = 0; i < 30; i += 1) frames.flush();
    expect(frames.pending).toBe(0);
    expect(useColorFocusStore.getState().highlightTarget).toBeNull();
  });
});

describe("color registry", () => {
  it("unregisters only the element it registered", () => {
    const first = fakeElement().element;
    const second = fakeElement().element;
    const unregisterFirst = registerColorElement("accent", first);
    const unregisterSecond = registerColorElement("accent", second);
    unregisterFirst();
    expect(getColorElement("accent")).toBe(second);
    unregisterSecond();
    expect(getColorElement("accent")).toBeUndefined();
  });
});

describe("colour search lifetime", () => {
  it("resets the search when the editor closes", () => {
    useThemerUIStore.setState({ isOpen: true });
    useColorFocusStore.setState({ colorSearch: "chart" });
    useThemerUIStore.getState().close();
    expect(useColorFocusStore.getState().colorSearch).toBe("");
  });
});
