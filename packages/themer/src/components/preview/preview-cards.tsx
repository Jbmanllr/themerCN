"use client";

// The cards demo as a standalone export. Lazy like the preview tabs' copy:
// a static import here would pull the demo (and recharts) into every bundle
// that imports the package barrel.

import { lazy, Suspense } from "react";

const CardsDemo = lazy(() => import("./examples/cards"));

export function PreviewCards() {
  return (
    <Suspense fallback={null}>
      <CardsDemo />
    </Suspense>
  );
}
