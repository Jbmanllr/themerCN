// @vitest-environment happy-dom

// Pressing Enter in the Mail demo's search box must not submit a form. The demo
// runs inside the host's own page and its search box sits in a <form>: an
// unhandled submit reloads that page.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import MailPage from "../index";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container.remove();
});

async function mount() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<MailPage />));
}

describe("Mail demo", () => {
  it("swallows Enter in the search box instead of submitting the host page", async () => {
    await mount();
    const form = container
      .querySelector('input[placeholder="Search"]')
      ?.closest("form");
    if (!form) throw new Error("no search form");

    const submit = new Event("submit", { bubbles: true, cancelable: true });
    await act(async () => {
      form.dispatchEvent(submit);
    });

    expect(submit.defaultPrevented).toBe(true);
  });
});
