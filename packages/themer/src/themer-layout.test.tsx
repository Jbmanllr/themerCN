// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "handleDisabledFileLoadingAsSuccess": true } }
// The Themer layout through the public <Themer>: the Host's default, the
// user's switch and its persistence, and what a switch keeps.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useEditorStore } from "./stores/editor-store";
import { useThemerUIStore } from "./stores/themer-ui-store";
import {
  PREFERENCES_VERSION,
  usePreferencesStore,
} from "./stores/preferences-store";
import { Themer, type ThemerProps } from "./index";

// See themer.test.tsx: happy-dom overflows on the real sheet.
vi.mock("./generated/themer-css", () => ({
  THEMER_CSS: "@scope ([data-themer]) to ([data-themer-host]) {}",
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | null = null;
// <Themer> hydrates the stores once per namespace: a fresh namespace per test
// makes every mount read what the test stored.
let namespace = "layout-0";
let namespaceCount = 0;

function setViewport(width: number) {
  (
    window as unknown as {
      happyDOM: { setViewport(size: { width: number; height: number }): void };
    }
  ).happyDOM.setViewport({ width, height: 900 });
}

async function mount(props: ThemerProps = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(<Themer storageNamespace={namespace} {...props} />),
  );
}

/**
 * A page reload: fresh stores, then the preferences read back from storage.
 * Resetting the persisted store writes its defaults over the saved entry, so
 * the entry is put back first.
 */
async function reload(props: ThemerProps = {}) {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  const saved = { ...localStorage };
  usePreferencesStore.setState(usePreferencesStore.getInitialState(), true);
  useThemerUIStore.setState(useThemerUIStore.getInitialState(), true);
  for (const [key, value] of Object.entries(saved)) {
    localStorage.setItem(key, value);
  }
  await usePreferencesStore.persist.rehydrate();
  await mount(props);
}

async function open() {
  await act(async () =>
    document
      .querySelector<HTMLElement>('[data-testid="themer-trigger"]')
      ?.click(),
  );
}

async function click(element: Element | null | undefined) {
  if (!(element instanceof HTMLElement)) throw new Error("nothing to click");
  await act(async () => element.click());
}

const query = (selector: string) => document.querySelector(selector);
const preview = () => query('[data-testid="themer-preview"]');
const sidebar = () => query('[data-testid="themer-ui"] [data-slot="sidebar"]');
const drawer = () => query('[data-testid="themer-mobile-drawer"]');
const toolbar = () => query('[data-testid="themer-ui"][role="toolbar"]');

const layoutSwitcher = () =>
  query<HTMLElement>('[aria-label^="Themer layout"]');

async function switchLayout(label: string) {
  await click(layoutSwitcher());
  const item = [
    ...document.querySelectorAll('[role="menuitemradio"]'),
  ].find((element) => element.textContent?.trim() === label);
  await click(item);
}

function layoutChoices() {
  return [...document.querySelectorAll('[role="menuitemradio"]')].map(
    (element) => element.textContent?.trim(),
  );
}

beforeEach(() => {
  namespace = `layout-${++namespaceCount}`;
  useEditorStore.setState(useEditorStore.getInitialState(), true);
  usePreferencesStore.setState(usePreferencesStore.getInitialState(), true);
  useThemerUIStore.setState(useThemerUIStore.getInitialState(), true);
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
  setViewport(1440);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("Themer layout", () => {
  it("opens the Workspace, sidebar beside the Preview, when the Host sets no layout", async () => {
    await mount();
    await open();

    expect(sidebar()).not.toBeNull();
    expect(preview()).not.toBeNull();
  });

  it("opens the Overlay, a sidebar without Preview, when the Host sets it", async () => {
    await mount({ layout: "overlay" });
    await open();

    expect(sidebar()).not.toBeNull();
    expect(preview()).toBeNull();
  });

  it("opens the Toolbar, a bar without sidebar or Preview, when the Host sets it", async () => {
    await mount({ layout: "toolbar" });
    await open();

    expect(toolbar()).not.toBeNull();
    expect(sidebar()).toBeNull();
    expect(preview()).toBeNull();
  });

  describe("the Toolbar's controls", () => {
    const inBar = (label: string) =>
      query(`[role="toolbar"] [aria-label="${label}"]`);

    it("has the preset picker, undo/redo, the colour mode and Close in the bar", async () => {
      await mount({ layout: "toolbar" });
      await open();

      expect(
        query('[role="toolbar"] [data-testid="themer-preset-trigger"]'),
      ).not.toBeNull();
      for (const label of [
        "Undo",
        "Redo",
        "Switch to dark mode",
        "Close theme editor",
      ]) {
        expect(inBar(label), label).not.toBeNull();
      }

      await click(inBar("Close theme editor"));
      expect(toolbar()).toBeNull();
    });

    it("has the other actions, the override switch and the layouts in its overflow menu", async () => {
      await mount({ layout: "toolbar" });
      await open();

      await click(inBar("More actions"));
      const items = [...document.querySelectorAll('[role^="menuitem"]')];
      expect(items.map((item) => item.textContent?.trim())).toEqual([
        "Code",
        "Import CSS",
        "Contrast checker",
        "Reset to preset",
        "Theme override",
        "Layout: Toolbar",
      ]);

      const override = items.find((item) =>
        item.textContent?.includes("Theme override"),
      );
      expect(override?.getAttribute("aria-checked")).toBe("true");
      await click(override);
      expect(usePreferencesStore.getState().themeOverrideEnabled).toBe(false);

      // The menu stays open after a checkbox item.
      await click(
        [...document.querySelectorAll('[role="menuitem"]')].find(
          (item) => item.textContent?.trim() === "Import CSS",
        ),
      );
      expect(query('[role="dialog"]')?.textContent).toContain("Import");
    });
  });

  describe("the Toolbar's panel groups", () => {
    const group = (label: string) =>
      query(`[role="toolbar"] button[aria-label="${label}"]`);
    const openPopups = () =>
      [...document.querySelectorAll('[data-slot="popover-content"]')].map(
        (popup) => popup.textContent ?? "",
      );

    it("opens a group's panel in a popup, and another group swaps it", async () => {
      await mount({ layout: "toolbar" });
      await open();

      await click(group("Typography"));
      expect(openPopups()).toEqual([
        expect.stringContaining("Font Families"),
      ]);

      await click(group("Other"));
      expect(openPopups()).toEqual([
        expect.stringContaining("Border Radius"),
      ]);
      expect(group("Other")?.getAttribute("aria-pressed")).toBe("true");
      expect(group("Typography")?.getAttribute("aria-pressed")).toBe("false");
    });

    it("keeps the popup open while the page is clicked or scrolled", async () => {
      const page = document.createElement("button");
      page.textContent = "A Host page button";
      document.body.append(page);
      await mount({ layout: "toolbar" });
      await open();
      await click(group("Colors"));

      await act(async () => {
        for (const type of ["pointerdown", "mousedown"]) {
          page.dispatchEvent(
            new PointerEvent(type, { bubbles: true, button: 0 }),
          );
        }
        page.focus();
        for (const type of ["pointerup", "mouseup", "click"]) {
          page.dispatchEvent(
            new PointerEvent(type, { bubbles: true, button: 0 }),
          );
        }
        window.dispatchEvent(new Event("scroll"));
      });

      expect(openPopups()).toHaveLength(1);
    });

    it("closes the popup on Escape, and on its trigger", async () => {
      await mount({ layout: "toolbar" });
      await open();

      await click(group("Colors"));
      await act(async () => {
        document.activeElement?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      });
      expect(openPopups()).toEqual([]);

      await click(group("Colors"));
      await click(group("Colors"));
      expect(openPopups()).toEqual([]);
    });
  });

  describe("the user's choice", () => {
    function seedPreferences(state: object, version: number) {
      localStorage.setItem(
        `${namespace}:preferences`,
        JSON.stringify({ state, version }),
      );
    }

    it("survives a reload and wins over the Host's default", async () => {
      await mount({ layout: "overlay" });
      await open();
      await switchLayout("Workspace");

      await reload({ layout: "overlay" });
      await open();

      expect(preview()).not.toBeNull();
    });

    it("is ignored when it names no layout, so the Host's default applies", async () => {
      seedPreferences({ layout: "sideways" }, PREFERENCES_VERSION);

      await mount({ layout: "overlay" });
      await open();

      expect(preview()).toBeNull();
      expect(sidebar()).not.toBeNull();
    });

    it("is dropped with preferences saved before layouts existed", async () => {
      seedPreferences({ layout: "overlay", sidebarCollapsed: true }, 0);

      await mount();
      await open();

      expect(preview()).not.toBeNull();
    });
  });

  it("keeps the Theme, undo history and active panel across a switch", async () => {
    await mount();
    await open();
    await click(query('[role="tab"][aria-label="Typography"]'));
    await click(query('[data-testid="themer-preset-trigger"]'));
    await click(query('[data-testid="themer-preset-random"]'));
    const editedPrimary =
      document.documentElement.style.getPropertyValue("--primary");

    await switchLayout("Overlay");

    expect(
      document.documentElement.style.getPropertyValue("--primary"),
    ).toBe(editedPrimary);
    expect(
      query('[role="tab"][aria-label="Typography"]')?.getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
    const undo = query<HTMLButtonElement>('button[aria-label="Undo"]');
    expect(undo?.disabled).toBe(false);
  });

  it("opens the bottom drawer below 1280 px, whatever the layout", async () => {
    setViewport(1279);
    await mount({ layout: "overlay" });
    await open();

    expect(query('[data-slot="drawer-content"]')).not.toBeNull();
    expect(sidebar()).toBeNull();
  });

  describe("the Host page", () => {
    function installLenis() {
      const lenis = { stop: vi.fn(), start: vi.fn() };
      (window as unknown as { lenis?: typeof lenis }).lenis = lenis;
      return lenis;
    }

    afterEach(() => {
      delete (window as unknown as { lenis?: unknown }).lenis;
    });

    it("keeps scrolling while the Overlay is open", async () => {
      const lenis = installLenis();
      await mount({ layout: "overlay" });
      await open();

      expect(lenis.stop).not.toHaveBeenCalled();
    });

    it("keeps scrolling while the Toolbar is open", async () => {
      const lenis = installLenis();
      await mount({ layout: "toolbar" });
      await open();

      expect(lenis.stop).not.toHaveBeenCalled();
    });

    it("pauses under the Workspace, and resumes when the user switches to Overlay", async () => {
      const lenis = installLenis();
      await mount();
      await open();
      expect(lenis.stop).toHaveBeenCalledTimes(1);

      await switchLayout("Overlay");

      expect(lenis.start).toHaveBeenCalledTimes(1);
    });
  });

  describe("inspector on the Host page", () => {
    let pageButton: HTMLButtonElement;

    beforeEach(() => {
      // The Host's page, beside <Themer> (it never wraps the page).
      pageButton = document.createElement("button");
      pageButton.className = "bg-primary text-primary-foreground";
      pageButton.textContent = "Buy";
      document.body.append(pageButton);
    });

    const inspectorToggle = () =>
      query<HTMLElement>('[data-testid="themer-ui"] [aria-label="Inspector"]');
    const card = () => query('[data-testid="themer-inspector-overlay"]');

    /** Pointer events land after a frame: the inspector measures on one. */
    async function pointer(type: "mousemove" | "click", target: Element) {
      await act(async () => {
        target.dispatchEvent(
          new MouseEvent(type, { bubbles: true, cancelable: true }),
        );
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    }

    it.each(["overlay", "push"] as const)(
      "shows the tokens of a hovered page element in the %s layout",
      async (layout) => {
        await mount({ layout });
        await open();

        await click(inspectorToggle());
        await pointer("mousemove", pageButton);

        expect(card()?.textContent).toContain("bg-primary");
        expect(card()?.textContent).toContain("text-primary-foreground");
      },
    );

    it("pins a clicked page element and opens its colour control, without the page acting", async () => {
      await mount({ layout: "overlay" });
      await open();
      await click(query('[role="tab"][aria-label="Typography"]'));
      const pageHandler = vi.fn();
      pageButton.addEventListener("click", pageHandler);

      await click(inspectorToggle());
      await pointer("click", pageButton);

      expect(pageHandler).not.toHaveBeenCalled();
      expect(card()?.textContent).toContain("Pinned");
      expect(
        query('[role="tab"][aria-label="Colors"]')?.getAttribute(
          "aria-selected",
        ),
      ).toBe("true");
    });

    it("leaves the Themer UI alone: nothing shows on hover, and its clicks act", async () => {
      await mount({ layout: "overlay" });
      await open();
      const themerSurface = query(
        '[data-testid="themer-ui"] [data-slot="sidebar-inner"]',
      );
      expect(themerSurface?.className).toContain("bg-sidebar");

      await click(inspectorToggle());
      await pointer("mousemove", themerSurface!);
      expect(card()).toBeNull();

      await click(query('[role="tab"][aria-label="Typography"]'));
      expect(
        query('[role="tab"][aria-label="Typography"]')?.getAttribute(
          "aria-selected",
        ),
      ).toBe("true");
      expect(card()).toBeNull();
    });

    const pressed = (toggle: Element | null) =>
      toggle?.getAttribute("aria-pressed");

    it("turns off when the user switches layout, both ways", async () => {
      await mount();
      await open();
      await click(query('[data-testid="themer-preview-inspector"]'));
      expect(pressed(query('[data-testid="themer-preview-inspector"]'))).toBe(
        "true",
      );

      await switchLayout("Overlay");
      expect(pressed(inspectorToggle())).toBe("false");
      await pointer("mousemove", pageButton);
      expect(card()).toBeNull();

      await click(inspectorToggle());
      await switchLayout("Workspace");
      expect(pressed(query('[data-testid="themer-preview-inspector"]'))).toBe(
        "false",
      );
    });

    it("turns off when the Themer UI closes", async () => {
      await mount({ layout: "overlay" });
      await open();
      await click(inspectorToggle());

      await click(query('[aria-label="Close theme editor"]'));
      await pointer("mousemove", pageButton);
      expect(card()).toBeNull();
      await open();

      expect(pressed(inspectorToggle())).toBe("false");
    });
  });

  describe("Push", () => {
    const html = () => document.documentElement;
    const inset = () =>
      html().style.getPropertyValue("--themer-inset-inline-start");
    const margin = () => html().style.getPropertyValue("margin-inline-start");

    it("shifts the Host page aside by the expanded sidebar's width", async () => {
      await mount({ layout: "push" });
      await open();

      expect(sidebar()).not.toBeNull();
      expect(preview()).toBeNull();
      expect(inset()).toBe("20rem");
      expect(margin()).toBe("20rem");
    });

    it("follows the sidebar as it collapses and expands", async () => {
      await mount({ layout: "push" });
      await open();
      const toggle = () => query('[data-slot="sidebar-trigger"]');

      await click(toggle());
      expect(inset()).toBe("3rem");
      expect(margin()).toBe("3rem");

      await click(toggle());
      expect(inset()).toBe("20rem");
      expect(margin()).toBe("20rem");
    });

    describe("gives the Host page back its place", () => {
      it("on close", async () => {
        await mount({ layout: "push" });
        await open();

        await click(query('button[aria-label="Close theme editor"]'));

        expect(inset()).toBe("");
        expect(margin()).toBe("");
      });

      it("on a switch to another layout", async () => {
        await mount({ layout: "push" });
        await open();

        await switchLayout("Overlay");

        expect(sidebar()).not.toBeNull();
        expect(inset()).toBe("");
        expect(margin()).toBe("");
      });

      it("when the Host unmounts the Themer", async () => {
        await mount({ layout: "push" });
        await open();

        await act(async () => root?.unmount());
        root = null;

        expect(inset()).toBe("");
        expect(margin()).toBe("");
      });
    });

    it("leaves the page alone below 1280 px, where the drawer opens", async () => {
      setViewport(1279);
      await mount({ layout: "push" });
      await open();

      expect(query('[data-slot="drawer-content"]')).not.toBeNull();
      expect(inset()).toBe("");
      expect(margin()).toBe("");
    });
  });

  describe("switcher", () => {
    it("offers the implemented layouts, the current one checked", async () => {
      await mount();
      await open();

      await click(layoutSwitcher());

      expect(layoutChoices()).toEqual(["Workspace", "Overlay", "Push", "Toolbar"]);
      const checked = query('[role="menuitemradio"][aria-checked="true"]');
      expect(checked?.textContent?.trim()).toBe("Workspace");
    });

    it("switches to Overlay from the Workspace header, and back from the Overlay's", async () => {
      await mount();
      await open();

      await switchLayout("Overlay");
      expect(preview()).toBeNull();
      expect(sidebar()).not.toBeNull();

      await switchLayout("Workspace");
      expect(preview()).not.toBeNull();
    });

    it("switches to the Toolbar, and back from its overflow menu, keeping the Theme, history and the panel opened there", async () => {
      await mount();
      await open();
      await click(query('[data-testid="themer-preset-trigger"]'));
      await click(query('[data-testid="themer-preset-random"]'));
      const editedPrimary =
        document.documentElement.style.getPropertyValue("--primary");

      await switchLayout("Toolbar");
      expect(toolbar()).not.toBeNull();
      expect(
        query<HTMLButtonElement>('[role="toolbar"] button[aria-label="Undo"]')
          ?.disabled,
      ).toBe(false);
      await click(query('[role="toolbar"] button[aria-label="Typography"]'));

      await click(query('[role="toolbar"] [aria-label="More actions"]'));
      await click(
        [...document.querySelectorAll('[role="menuitem"]')].find((item) =>
          item.textContent?.startsWith("Layout"),
        ),
      );
      await click(
        [...document.querySelectorAll('[role="menuitemradio"]')].find(
          (item) => item.textContent?.trim() === "Overlay",
        ),
      );

      expect(toolbar()).toBeNull();
      expect(sidebar()).not.toBeNull();
      expect(
        document.documentElement.style.getPropertyValue("--primary"),
      ).toBe(editedPrimary);
      expect(
        query('[role="tab"][aria-label="Typography"]')?.getAttribute(
          "aria-selected",
        ),
      ).toBe("true");
    });
  });
});
