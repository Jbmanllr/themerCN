// @vitest-environment happy-dom
// The Themer keeps its own QueryClient for its font catalog, and the Host's
// queries keep the Host's. When an earlier shell wrapped the whole Host app,
// the Host's queries ran on the editor's client (fresh for a day, no refetch
// on focus), so data changed elsewhere was never read again. <Themer> renders
// beside the Host page and takes no children, so no Host component sits
// under its client.
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

const seen = vi.hoisted(() => ({ editor: undefined as unknown }));

// The editor's provider and overlay touch the DOM; the client wiring is what
// is tested here.
vi.mock("./themer-provider", () => ({
  ThemerProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./themer-root", async () => {
  const { useQueryClient: editorClient } =
    await import("@tanstack/react-query");
  return {
    ThemerRoot: function Root() {
      seen.editor = editorClient();
      return null;
    },
  };
});

import { Themer } from "./themer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

it("runs the Themer on its own client and leaves the Host's to the Host", async () => {
  const host = new QueryClient();
  let hostSeen: QueryClient | undefined;
  function HostQuery() {
    hostSeen = useQueryClient();
    return null;
  }

  const root = createRoot(document.createElement("div"));
  await act(async () =>
    root.render(
      <QueryClientProvider client={host}>
        <HostQuery />
        <Themer />
      </QueryClientProvider>,
    ),
  );
  await act(async () => root.unmount());

  expect(hostSeen).toBe(host);
  expect(seen.editor).toBeInstanceOf(QueryClient);
  expect(seen.editor).not.toBe(host);
});
