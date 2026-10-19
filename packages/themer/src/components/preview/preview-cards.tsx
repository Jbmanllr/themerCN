"use client"

// The Cards preview as a standalone export. Lazy like the preview tabs' copy:
// a static import here would pull the preview (and recharts) into every bundle
// that imports the package barrel.

import { lazy, Suspense } from "react"

const CardsPreview = lazy(() => import("./examples/cards"))

export function PreviewCards() {
  return (
    <Suspense fallback={null}>
      <CardsPreview />
    </Suspense>
  )
}
