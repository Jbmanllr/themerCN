// Barrel of the inspector: the overlay card, its toggle, the hook that binds
// it to the active tab or the Host page, `readFrameDocument` (null for a
// cross-origin frame) and `segmentClassName`.
export { InspectorOverlay } from "./inspector-overlay"
export { InspectorToggle } from "./inspector-toggle"
export { readFrameDocument, useInspector } from "./use-inspector"
export { segmentClassName } from "./segment-classname"
