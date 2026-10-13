// The editor keeps its own QueryClient for its font catalog, and the host's
// product queries keep the host's. On 2026-09-19 the web app's queries ran on
// the editor's client (fresh for a day, no refetch on focus) under
// BANTER_WEB_THEMER=1, because the shell wrapped the whole host app, so
// consent withdrawn on another device was never read again when the person
// came back to the tab. The shell now renders beside the host page
// (host/gate.tsx) and takes no children, so no host component sits under the
// editor's client.
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
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
    ThemerOverlayOnly: function OverlayOnly() {
      seen.editor = editorClient();
      return null;
    },
  };
});

import { ThemerDevShell } from "./themer-dev-shell";

it("runs the editor on its own client and leaves the host's to the host", () => {
  const host = new QueryClient();
  let hostSeen: QueryClient | undefined;
  function HostQuery() {
    hostSeen = useQueryClient();
    return null;
  }

  renderToString(
    <QueryClientProvider client={host}>
      <HostQuery />
      <ThemerDevShell fontCatalogEndpoint="/dev/themer/google-fonts" />
    </QueryClientProvider>,
  );

  expect(hostSeen).toBe(host);
  expect(seen.editor).toBeInstanceOf(QueryClient);
  expect(seen.editor).not.toBe(host);
});
