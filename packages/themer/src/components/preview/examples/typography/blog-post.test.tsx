// Every image the Typography demo draws must carry its own data (a `data:`
// URI), never ask the host for a file. The demo runs inside the host app,
// which serves no /placeholder.svg: asking for it shows a broken image and
// logs a 404 in the host.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BlogPost } from "./blog-post";

describe("BlogPost demo", () => {
  it("asks the host for no image file", () => {
    const html = renderToStaticMarkup(<BlogPost />);

    expect(html).not.toContain("placeholder.svg");
    const imageSources = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]*)"/gu)].map(
      (match) => match[1],
    );
    for (const source of imageSources) {
      expect(source, "an image that is not inline").toMatch(/^data:/u);
    }
  });
});
