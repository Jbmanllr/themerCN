// @vitest-environment happy-dom

// The host's pre-paint restore: a plain inline script carrying exactly the
// generated restore code in the server HTML, which hydrates without a
// warning; and, when the document renders again on the client (a not-found
// page under next dev), a data block React does not warn about and the
// browser never runs. These checks fail if the script stops being a raw
// element (next/script's inline `beforeInteractive` need not run before first
// paint), if its body drifts from generateThemeScript (whose behaviour
// theme-script.test.ts covers), if a client render brings back React's
// "Encountered a script tag" warning, or if it renders outside development.
import { act } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { generateThemeScript } from "../utils/theme-script";
import { ThemerHeadScript } from "./head-script";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  container = document.createElement("div");
  document.body.append(container);
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container.remove();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("puts the restore code in the server HTML as a raw inline script", () => {
  expect(renderToString(<ThemerHeadScript />)).toBe(
    `<script id="themer-head-script">${generateThemeScript()}</script>`,
  );
});

it("hydrates the server's script as it is, without a warning", async () => {
  container.innerHTML = renderToString(<ThemerHeadScript />);
  const script = container.querySelector("script");

  await act(async () => {
    root = hydrateRoot(container, <ThemerHeadScript />);
  });

  expect(container.querySelector("script")).toBe(script);
  expect(script?.textContent).toBe(generateThemeScript());
  expect(consoleError).not.toHaveBeenCalled();
});

it("renders an inert data block, without a warning, when drawn on the client", async () => {
  root = createRoot(container);
  await act(async () => root?.render(<ThemerHeadScript />));

  expect(container.querySelector("script")?.type).toBe("application/json");
  expect(consoleError).not.toHaveBeenCalled();
});

it("renders nothing outside development", () => {
  vi.stubEnv("NODE_ENV", "production");
  expect(renderToString(<ThemerHeadScript />)).toBe("");
});
