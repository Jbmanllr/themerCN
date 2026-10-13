// @vitest-environment happy-dom

// What useThemer() hands to a host: the CSS and Tailwind config it exports
// carry the host's extra colours (the ones configureExtraColors registered) the
// theme sets, like the editor's own Code dialog does.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { configureExtraColors } from "../config/extra-colors";
import { defaultThemeState } from "../config/defaults";
import { useEditorStore } from "../stores/editor-store";
import { useThemer } from "./use-themer";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Exposed = { current: ReturnType<typeof useThemer> | null };

let root: Root | null = null;

async function mount(): Promise<Exposed> {
  const exposed: Exposed = { current: null };
  function Harness() {
    exposed.current = useThemer();
    return null;
  }
  root = createRoot(document.createElement("div"));
  await act(async () => root?.render(<Harness />));
  return exposed;
}

const EXTRAS = [
  { title: "Brand", colors: [{ key: "signal", label: "Signal" }] },
] as const;

beforeEach(() => {
  configureExtraColors(EXTRAS);
  useEditorStore.setState({
    themeState: {
      ...defaultThemeState,
      styles: {
        light: { ...defaultThemeState.styles.light, signal: "#3457FF" },
        dark: { ...defaultThemeState.styles.dark, signal: "#6E86FF" },
      },
    },
  });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  configureExtraColors();
});

describe("useThemer exports", () => {
  it("include a host extra colour the theme sets", async () => {
    const themer = await mount();
    const css = themer.current?.exportCSS("hex") ?? "";
    expect(css).toContain("--signal: #3457ff");
    expect(css).toContain("--signal: #6e86ff");
  });

  it("put it in the Tailwind config too", async () => {
    const themer = await mount();
    expect(themer.current?.exportTailwindConfig("hex")).toContain("signal");
  });
});
