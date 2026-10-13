// @vitest-environment happy-dom

// A labelled slider with a number field. Every handle has to announce its name
// (an aria-label on the slider root names only the group, so Hue, Radius,
// Spacing and the rest were read out with no name). While the person types
// only values inside the range reach the theme, so typing the start of a
// number never jumps the theme to a clamped bound; leaving the field clamps
// whatever is there.
import { act, useImperativeHandle, useState, type Ref } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SliderWithInput } from "./slider-with-input";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;
const onChange = vi.fn<(value: number) => void>();

type StoredHandle = { set: (value: number) => void };

/** The stored value follows what the control reports, as the editor's does. */
function Stored({ initial, ref }: { initial: number; ref: Ref<StoredHandle> }) {
  const [value, setValue] = useState(initial);
  useImperativeHandle(ref, () => ({ set: setValue }));
  return (
    <SliderWithInput
      label="Radius"
      value={value}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
      min={0.5}
      max={2}
      step={0.1}
      unit="rem"
    />
  );
}

const stored: { current: StoredHandle | null } = { current: null };

async function mount(value: number) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Stored initial={value} ref={stored} />));
}

const field = () =>
  container.querySelector<HTMLInputElement>('input[type="number"]')!;

async function type(value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(field(), value);
    field().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function leaveField() {
  await act(async () => {
    field().dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container.remove();
  onChange.mockReset();
});

describe("SliderWithInput", () => {
  it("names the slider handle and the number field by the label", async () => {
    await mount(1);

    const label = container.querySelector("label");
    expect(label?.textContent).toBe("Radius");
    expect(label?.getAttribute("for")).toBe(field().id);

    const handle = container.querySelector('input[type="range"]');
    const nameId = handle?.getAttribute("aria-labelledby");
    expect(nameId).toBe(label?.id);
    expect(document.getElementById(nameId ?? "")?.textContent).toBe("Radius");
  });

  it("commits a typed value inside the range straight away", async () => {
    await mount(1);
    await type("1.5");
    expect(onChange).toHaveBeenCalledExactlyOnceWith(1.5);
  });

  it("holds back a value outside the range while typing, and does not jump to a bound", async () => {
    await mount(1);
    await type("0.");
    await type("5");
    expect(onChange).not.toHaveBeenCalled();
    // What was typed stays in the field until the person leaves it.
    expect(field().value).toBe("5");
  });

  it("clamps on leaving the field and commits the clamped value", async () => {
    await mount(1);
    await type("5");
    await leaveField();

    expect(onChange).toHaveBeenCalledExactlyOnceWith(2);
    expect(field().value).toBe("2");
  });

  it("restores the stored value when the field is left empty", async () => {
    await mount(1.2);
    await type("");
    await leaveField();

    expect(onChange).not.toHaveBeenCalled();
    expect(field().value).toBe("1.2");
  });

  it("shows a new value from outside, over what was being typed", async () => {
    await mount(1);
    await type("5");
    await act(async () => stored.current?.set(1.7));
    expect(field().value).toBe("1.7");
    expect(onChange).not.toHaveBeenCalled();
  });
});
