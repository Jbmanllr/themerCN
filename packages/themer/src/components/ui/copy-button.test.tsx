// @vitest-environment happy-dom

// A copy button names itself for assistive technology, tells it when the copy
// happened, and never acts on a copy that did not reach the clipboard. A
// caller's own name ("Copy Primary") labels the idle button; the copied state
// still replaces it, which a name set before the spread used to lose.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { CopyButton, type CopyButtonProps } from "./copy-button";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;
const writeText = vi.fn<(text: string) => Promise<void>>();

async function mount(
  props: Partial<CopyButtonProps> = {},
  parentClick = vi.fn(),
) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <div onClick={parentClick}>
        <CopyButton textToCopy="oklch(0.5 0.1 200)" {...props} />
      </div>,
    ),
  );
  return parentClick;
}

const button = () => container.querySelector("button")!;

async function press() {
  await act(async () => {
    button().click();
  });
}

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  toast.success.mockReset();
  toast.error.mockReset();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container.remove();
});

describe("CopyButton", () => {
  it("copies its text, says so, and does not trigger the row around it", async () => {
    const parentClick = await mount({ showFeedbackTooltip: false });
    expect(button().getAttribute("aria-label")).toBe("Copy to clipboard");

    await press();

    expect(writeText).toHaveBeenCalledExactlyOnceWith("oklch(0.5 0.1 200)");
    expect(button().getAttribute("aria-label")).toBe("Copied to clipboard");
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("lets a caller's label name the idle button, then reports the copy over it", async () => {
    await mount({ "aria-label": "Copy Primary", showFeedbackTooltip: false });
    expect(button().getAttribute("aria-label")).toBe("Copy Primary");

    await press();
    expect(button().getAttribute("aria-label")).toBe("Copied to clipboard");
  });

  it("runs the caller's click only after a successful copy", async () => {
    const onClick = vi.fn();
    await mount({ onClick, showFeedbackTooltip: false });
    await press();
    expect(onClick).toHaveBeenCalledOnce();

    writeText.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    onClick.mockClear();
    await press();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("toasts the outcome only when asked to", async () => {
    await mount({ showFeedbackTooltip: false });
    await press();
    expect(toast.success).not.toHaveBeenCalled();
    await act(async () => root?.unmount());
    container.remove();

    await mount({
      showFeedbackTooltip: false,
      showFeedbackToast: true,
      toastMessage: "Colour copied",
    });
    await press();
    expect(toast.success).toHaveBeenCalledExactlyOnceWith("Colour copied");

    writeText.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    await press();
    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "Failed to copy to clipboard",
    );
  });

  it("stays idle when the clipboard refuses", async () => {
    writeText.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    await mount({ showFeedbackTooltip: false });
    await press();
    expect(button().getAttribute("aria-label")).toBe("Copy to clipboard");
    expect(button().textContent).toBe("Copy");
  });
});
