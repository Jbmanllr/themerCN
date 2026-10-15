// Barrel for the editor's components, re-exported by the package root
// Internal: the package root (src/index.ts) exports only <Themer> and its
// types. Not listed here: Themer, ThemerRoot and LenisPause.

// Main components
export { ThemerProvider, useThemerContext } from "./themer-provider";
export { ThemerTrigger } from "./themer-trigger";
export { ThemerOverlay } from "./themer-overlay";
export { ThemerSidebar } from "./themer-sidebar";
export { ActionBar } from "./action-bar";

// Theme initialization: the pre-paint script is src/head-script.ts (the
// `themercn/head-script` entry); ThemerProvider mounts DynamicFontLoader itself
export { DynamicFontLoader } from "./dynamic-font-loader";

// Editor components
export { ControlSection } from "./editor/control-section";
export { SectionContext, useSectionContext } from "./editor/section-context";
export { SliderWithInput } from "./editor/slider-with-input";
export { ColorPicker } from "./editor/color-picker";
export { ColorSelectorPopover } from "./editor/color-selector-popover";
export { ColorControls } from "./editor/color-controls";
export { FontPicker, FontControls } from "./editor/font-picker";
export { ShadowControl } from "./editor/shadow-control";
export { RadiusControl } from "./editor/radius-control";
export { SpacingControl, SpacingControls } from "./editor/spacing-controls";
export { HSLAdjustments as HSLAdjustmentControls } from "./editor/hsl-adjustments";
export { ContrastChecker, ContrastBadge } from "./editor/contrast-checker";
export { ContrastCheckerDialog } from "./editor/contrast-checker-popover";
export { LetterSpacingControl } from "./editor/letter-spacing-control";
export { PresetSliderControl } from "./editor/preset-slider-control";

// Action components
export { PresetSelect } from "./actions/preset-select";
export { CodePanelDialog } from "./actions/code-panel-dialog";
export { CssImportDialog } from "./actions/css-import-dialog";

// Preview components
export { InspectorOverlay } from "./preview/inspector-overlay";
export { PreviewCards } from "./preview/preview-cards";
export { PreviewTabs } from "./preview/preview-tabs";

// Overlay components
export {
  MobileDrawer,
  MobilePanelContent,
  ThemerHeader,
  PreviewPanel,
} from "./overlay";

// Panel components
export {
  ColorsPanel,
  TypographyPanel,
  OtherPanel,
} from "./panels";

// Sidebar components
export {
  PANELS,
  type Panel,
  type PanelConfig,
  CollapsedNavigation,
  ExpandedContent,
  PanelContent,
} from "./sidebar";

// UI components
export { LoadingDots, SparklesIcon } from "./ui";
