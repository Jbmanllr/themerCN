// @vitest-environment happy-dom

// The editor mount arrives after hydration without disturbing the page. When
// it wrapped the page in its shell, React remounted the whole page about a
// second after load: a counter went back to zero, a typed value and picked
// files were dropped, and every element was replaced. These checks fail if
// the page is remounted, if the editor loads outside local development or
// inside the editor's own preview frame, or if a late load lands after the
// page has gone.
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDevThemerGate } from "./gate";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Editor() {
  return <aside data-testid="editor" />;
}

function Page() {
  const [count, setCount] = useState(0);
  return (
    <main>
      <button onClick={() => setCount((value) => value + 1)} type="button">
        {count}
      </button>
      <input aria-label="note" />
    </main>
  );
}

/** A shell loader the test resolves when it wants the editor to arrive. */
function deferredShell() {
  let arrive: () => void = () => {};
  const load = vi.fn(
    () =>
      new Promise<{ DevThemerShell: typeof Editor }>((resolve) => {
        arrive = () => resolve({ DevThemerShell: Editor });
      }),
  );
  return { load, arrive: () => act(async () => arrive()) };
}

let root: Root | null = null;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container.remove();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function mount(load: Parameters<typeof createDevThemerGate>[0]) {
  const Gate = createDevThemerGate(load);
  await act(async () =>
    root?.render(
      <Gate>
        <Page />
      </Gate>,
    ),
  );
}

describe("the editor mount", () => {
  it("keeps the page, its state and its elements when the editor arrives", async () => {
    const shell = deferredShell();
    await mount(shell.load);
    const button = container.querySelector("button");
    const input = container.querySelector("input");
    if (!button || !input) throw new Error("the page did not render");

    await act(async () => button.click());
    await act(async () => button.click());
    input.value = "typed before the editor";
    await shell.arrive();

    expect(container.querySelector('[data-testid="editor"]')).not.toBeNull();
    expect(container.querySelector("button")).toBe(button);
    expect(container.querySelector("input")).toBe(input);
    expect(button.textContent).toBe("2");
    expect(input.value).toBe("typed before the editor");
  });

  it("puts the editor beside the page, never around it", async () => {
    const shell = deferredShell();
    await mount(shell.load);
    await shell.arrive();

    const [page, editor] = [...container.children];
    expect(page?.tagName).toBe("MAIN");
    expect(editor?.getAttribute("data-testid")).toBe("editor");
    expect(page?.querySelector('[data-testid="editor"]')).toBeNull();
  });

  it("loads nothing outside local development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const shell = deferredShell();
    await mount(shell.load);

    expect(shell.load).not.toHaveBeenCalled();
    expect(container.querySelector("main")).not.toBeNull();
  });

  it("loads nothing inside the editor's own preview frame", async () => {
    vi.spyOn(window, "top", "get").mockReturnValue({} as Window);
    const shell = deferredShell();
    await mount(shell.load);

    expect(shell.load).not.toHaveBeenCalled();
  });

  it("drops an editor that arrives after the page has gone", async () => {
    const shell = deferredShell();
    await mount(shell.load);
    await act(async () => root?.unmount());
    root = null;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await shell.arrive();

    expect(error).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="editor"]')).toBeNull();
  });
});
