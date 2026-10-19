"use client"

import { HSLAdjustments } from "../editor/hsl-adjustments"
import { RadiusControl } from "../editor/radius-control"
import { SpacingControl } from "../editor/spacing-controls"
import { ShadowControl } from "../editor/shadow-control"
import { ControlSection } from "../editor/control-section"

/**
 * Other panel - HSL Adjustments + Radius + Spacing + Shadows
 */
export function OtherPanel() {
  return (
    <div>
      <ControlSection
        id="other-hsl"
        title="HSL Adjustments"
        description="Adjust all colors at once"
      >
        <HSLAdjustments />
      </ControlSection>

      <ControlSection
        id="other-radius"
        title="Border Radius"
        description="Corner rounding"
      >
        <RadiusControl />
      </ControlSection>

      <ControlSection
        id="other-spacing"
        title="Base Spacing"
        description="Component spacing scale"
      >
        <SpacingControl />
      </ControlSection>

      <ControlSection
        id="other-shadows"
        title="Shadows"
        description="Customize shadow appearance"
      >
        <ShadowControl />
      </ControlSection>
    </div>
  )
}
