// @vitest-environment happy-dom

// The AI chat's image thumbnails: the images a sent message carried, and the
// ones the prompt input holds. Each removable thumbnail needs a name saying
// which image it removes (an unnamed icon button was announced as nothing),
// and images are identified by position since the same picture can be attached
// twice.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImageAttachments } from "./image-attachments";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
});

describe("ImageAttachments", () => {
  it("draws nothing without images", () => {
    expect(
      renderToStaticMarkup(<ImageAttachments images={[]} altPrefix="Image" />),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        <ImageAttachments images={undefined} altPrefix="Image" />,
      ),
    ).toBe("");
  });

  it("numbers each image in its alt text and is read-only without a remover", () => {
    const html = renderToStaticMarkup(
      <ImageAttachments
        images={["data:image/png;base64,AAA", "data:image/png;base64,BBB"]}
        altPrefix="Attached image"
      />,
    );
    expect(html).toContain('alt="Attached image 1"');
    expect(html).toContain('alt="Attached image 2"');
    expect(html).not.toContain("<button");
  });

  it("names each remove button by its image and removes the one pressed, even among duplicates", async () => {
    const onRemove = vi.fn();
    const same = "data:image/png;base64,AAA";
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <ImageAttachments
          images={[same, "data:image/png;base64,BBB", same]}
          altPrefix="Image"
          onRemove={onRemove}
        />,
      ),
    );

    const buttons = [...container.querySelectorAll("button")];
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Remove image 1",
      "Remove image 2",
      "Remove image 3",
    ]);

    await act(async () => buttons[2]?.click());
    expect(onRemove).toHaveBeenCalledExactlyOnceWith(2);
  });
});
