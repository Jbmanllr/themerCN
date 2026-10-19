# In-place Themer layouts draw over the Host page; Push shifts `<html>`

The Overlay, Push and Toolbar Themer layouts edit the Host app's real page, which the Themer already themes through `<html>`. They render in the Themer's portal beside the Host tree and never wrap it: the Themer loads after hydration, so a wrapper would remount the Host page when it arrives, and every Host would have to restructure its root layout. Push therefore cannot use the shadcn `SidebarInset`. Instead it sets `margin-left` on `<html>` to the sidebar's width and exposes that width as `--themer-inset-left`. Both are physical properties, like the sidebar, which is pinned to the left in every document direction: a logical `margin-inline-start` would shift a right-to-left page on the wrong side.

## Consequences

- The Host's `position: fixed` elements stay anchored to the viewport and sit under the sidebar unless the Host opts them in with `left: var(--themer-inset-left, 0)`. The Playground's `/app` AppShell sidebar is the reference example.
- The viewport does not shrink, so the page's breakpoints and viewport units do not react to Push. Seeing the Theme at other widths is what Workspace's Live frame is for.

## Considered Options

- Wrapping the Host tree in `SidebarProvider`/`SidebarInset`: rejected for the remount above.
- Overlay only, with no Push: rejected because covering the left edge of the page hides content that Push keeps visible.
