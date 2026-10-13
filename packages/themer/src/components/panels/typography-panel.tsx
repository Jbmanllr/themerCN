"use client";

// The Typography tab: the four font slots and letter spacing, each in a
// ControlSection whose open state persists (ids `typography-fonts`,
// `typography-letter-spacing`).

import { FontControls, FontSlotPicker } from "../editor/font-picker";
import { LetterSpacingControl } from "../editor/letter-spacing-control";
import { ControlSection } from "../editor/control-section";

/**
 * Heading font (`--font-heading`), shared by both modes. Uses the same
 * picker as the serif slot; presets without a heading font start on their
 * serif (resolvePresetStyles).
 */
export function HeadingFontControl() {
  return <FontSlotPicker slot="font-heading" />;
}

/**
 * Typography panel - Font pickers (sans, heading, serif, mono) + Letter
 * spacing. Shared by the desktop sidebar and the mobile drawer (PanelTabs).
 */
export function TypographyPanel() {
  return (
    <div>
      <ControlSection
        id="typography-fonts"
        title="Font Families"
        description="Choose fonts for your theme"
      >
        {/* FontControls already includes the Heading row, so
            HeadingFontControl above is not mounted here; it is exported from
            this file only (not from the components/index.ts barrel). */}
        <FontControls />
      </ControlSection>

      <ControlSection
        id="typography-letter-spacing"
        title="Letter Spacing"
        description="Adjust character spacing"
      >
        <LetterSpacingControl />
      </ControlSection>
    </div>
  );
}
