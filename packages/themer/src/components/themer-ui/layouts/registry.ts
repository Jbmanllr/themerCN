// What the Themer knows about each Themer layout, apart from its component
// (../themer-ui.tsx maps a layout to its component): its name and icon in the
// layout switcher, whether it covers the Host page, and which layout is in
// force. Adding a layout means adding it to `ThemerLayout` (types/index.ts),
// here, and to `LAYOUT_COMPONENTS`; both records are typed by the union, so
// the compiler lists what is missing.
//
// Contract:
// - The switcher lists THEMER_LAYOUTS in key order: only implemented layouts.
// - The layout in force is the user's choice, else the Host's default, else
//   Workspace. A value that names no layout here (a stale or hand-edited
//   preference, an untyped Host) is skipped, never rendered.
//
// See: packages/themer/ARCHITECTURE.md ("Themer layouts").

import {
  Layers2,
  LayoutPanelLeft,
  SquareSplitHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { ThemerLayout } from "../../../types";

export interface ThemerLayoutDefinition {
  /** Name in the layout switcher. */
  label: string;
  /** Icon in the layout switcher (its trigger shows the current one). */
  icon: LucideIcon;
  /**
   * The layout hides the Host page, so the page is paused while it is open
   * (Lenis smooth scroll). In-place layouts leave the page usable.
   */
  coversPage: boolean;
}

export const THEMER_LAYOUTS: Record<ThemerLayout, ThemerLayoutDefinition> = {
  workspace: { label: "Workspace", icon: LayoutPanelLeft, coversPage: true },
  overlay: { label: "Overlay", icon: Layers2, coversPage: false },
  push: { label: "Push", icon: SquareSplitHorizontal, coversPage: false },
};

export const DEFAULT_THEMER_LAYOUT: ThemerLayout = "workspace";

export function isThemerLayout(value: unknown): value is ThemerLayout {
  return typeof value === "string" && Object.hasOwn(THEMER_LAYOUTS, value);
}

/** The layout in force: the user's choice, else the Host's, else Workspace. */
export function resolveThemerLayout(
  userChoice: unknown,
  hostDefault: unknown,
): ThemerLayout {
  if (isThemerLayout(userChoice)) return userChoice;
  if (isThemerLayout(hostDefault)) return hostDefault;
  return DEFAULT_THEMER_LAYOUT;
}
