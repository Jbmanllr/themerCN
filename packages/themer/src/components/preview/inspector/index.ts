// Barrel of the inspector: the overlay card, its toggle, the session hook
// its two entry points (PreviewTabs, PageInspector) share, and
// `readFrameDocument` (null for a cross-origin frame). `useInspector` and
// `segmentClassName` stay inside the module.
export { InspectorOverlay } from "./inspector-overlay"
export { InspectorToggle } from "./inspector-toggle"
export { readFrameDocument } from "./use-inspector"
export { useInspectorSession } from "./use-inspector-session"
