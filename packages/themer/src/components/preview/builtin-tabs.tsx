"use client";

// The editor's own preview tabs. Demos are lazy so their code (recharts in
// Cards and Dashboard, the data table, the mail fixtures) loads only when a
// tab opens; the Live frame and the colour palette are small and eager.
// Wide demos keep a minimum width and scroll on both axes.
//
// Contract: a tab `id` is persisted as the `previewTab` preference, and an
// unknown persisted id falls back to the first tab, so renaming an id resets
// that choice. Orders (0, 10, 20, ...) leave room for host tabs between them;
// the host list (`ThemerConfig.previewTabs`) is merged in by
// `mergePreviewTabs` (./preview-tab-registry.ts), never here.
//
// See: packages/themer/ARCHITECTURE.md (Preview System)

import { lazy } from "react";
import { useEditorStore } from "../../stores/editor-store";
import ColorPreview from "./theme-preview/color-preview";
import { LivePreview } from "./live-preview";
import type { BuiltinPreviewTab } from "./preview-tab-registry";

const DemoCards = lazy(() => import("./examples/cards"));
const DemoMail = lazy(() => import("./examples/mail"));
const DemoDashboard = lazy(() => import("./examples/dashboard"));
const DemoPricing = lazy(() => import("./examples/pricing/pricing"));
const TypographyDemo = lazy(
  () => import("./examples/typography/typography-demo"),
);

function DashboardTab() {
  return (
    <div className="size-full min-w-[1400px]">
      <DemoDashboard />
    </div>
  );
}

function MailTab() {
  return (
    <div className="size-full min-w-[1300px] rounded-lg border">
      <DemoMail />
    </div>
  );
}

/**
 * The demos read no editor state (they follow the CSS variables the editor
 * writes on <html>); the palette lists token values, so it subscribes to the
 * theme, and only to the part it shows.
 */
function ColorPaletteTab() {
  const styles = useEditorStore((state) => state.themeState.styles);
  const currentMode = useEditorStore((state) => state.themeState.currentMode);
  return (
    <div className="p-4">
      <ColorPreview styles={styles} currentMode={currentMode} />
    </div>
  );
}

/** Built-in tabs; orders leave room for host tabs in between. */
export const BUILTIN_TABS: readonly BuiltinPreviewTab[] = [
  {
    id: "live",
    label: "Live",
    component: LivePreview,
    scroll: "none",
    order: 0,
    frame: true,
    bare: true,
  },
  { id: "cards", label: "Cards", component: DemoCards, scroll: "y", order: 10 },
  {
    id: "dashboard",
    label: "Dashboard",
    component: DashboardTab,
    scroll: "xy",
    order: 20,
    wideOnly: true,
  },
  {
    id: "mail",
    label: "Mail",
    component: MailTab,
    scroll: "xy",
    order: 30,
    wideOnly: true,
  },
  {
    id: "pricing",
    label: "Pricing",
    component: DemoPricing,
    scroll: "y",
    order: 40,
  },
  {
    id: "colors",
    label: "Color Palette",
    component: ColorPaletteTab,
    scroll: "y",
    order: 50,
  },
  {
    id: "typography",
    label: "Typography",
    component: TypographyDemo,
    scroll: "y",
    order: 60,
    inMenu: true,
  },
];
