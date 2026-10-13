// @vitest-environment happy-dom

// The Payments demo card is shown to everyone who opens the editor's preview.
// A menu label has to sit inside a menu group: outside one, opening a row's
// menu threw and took the preview tab down.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CardsPayments } from "./payments";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container.remove();
  document.body.innerHTML = "";
});

describe("CardsPayments", () => {
  it("opens a row's action menu with its label and items", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<CardsPayments />));

    const trigger = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Open menu"),
    );
    if (!trigger) throw new Error("no row menu trigger");
    await act(async () => trigger.click());

    await vi.waitFor(() => {
      const menu = document.querySelector('[role="menu"]');
      expect(menu?.textContent).toContain("Actions");
      expect(menu?.textContent).toContain("Copy payment ID");
      expect(menu?.textContent).toContain("View customer");
    });
  });
});
