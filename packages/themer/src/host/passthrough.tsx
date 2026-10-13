// What a host's editor mount module becomes when the editor is off: its
// next.config.ts aliases the mount here (README "Host integration contract"):
// the page as it is, and no head script. Keep this file
// free of imports from the rest of the package, so builds without the editor
// never compile it.

import type { ReactNode } from "react";

export function DevThemerGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function DevThemerHeadScript() {
  return null;
}
