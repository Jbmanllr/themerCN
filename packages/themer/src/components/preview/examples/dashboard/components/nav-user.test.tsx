// @vitest-environment happy-dom

// The Dashboard demo's user menu opens on a header that names the person. A
// menu label has to sit inside a menu group: outside one, opening the menu
// threw and took the preview tab down.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SidebarProvider } from "@workspace/ui/components/sidebar";

import { NavUser } from "./nav-user";

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

describe("NavUser", () => {
  it("opens the user menu with the person's name and the log-out item", async () => {
    window.matchMedia ??= (() => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <SidebarProvider>
          <NavUser
            user={{
              name: "Ada Lovelace",
              email: "ada@example.com",
              avatar: "",
            }}
          />
        </SidebarProvider>,
      ),
    );

    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-haspopup="menu"]',
    );
    if (!trigger) throw new Error("no user menu trigger");
    await act(async () => trigger.click());

    await vi.waitFor(() => {
      const menu = document.querySelector('[role="menu"]');
      expect(menu?.textContent).toContain("Ada Lovelace");
      expect(menu?.textContent).toContain("ada@example.com");
      expect(menu?.textContent).toContain("Log out");
    });
  });
});
