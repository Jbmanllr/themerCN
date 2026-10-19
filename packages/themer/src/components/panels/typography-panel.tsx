"use client"

// The Typography tab: the four font slots and letter spacing, each in a
// ControlSection whose open state persists (ids `typography-fonts`,
// `typography-letter-spacing`).

import { FontControls } from "../editor/font-picker"
import { LetterSpacingControl } from "../editor/letter-spacing-control"
import { ControlSection } from "../editor/control-section"

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
  )
}
