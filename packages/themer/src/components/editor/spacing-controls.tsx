"use client"

// Base spacing: PresetSliderControl bound to `spacing` (rem). Shown in the
// Other panel.

import { PresetSliderControl } from "./preset-slider-control"
import { SPACING_PRESETS } from "../../config/constants"

/**
 * Base spacing control with presets and slider (both modes).
 */
export function SpacingControl() {
  return (
    <PresetSliderControl
      styleKey="spacing"
      presets={SPACING_PRESETS}
      presetsLabel="Spacing presets"
      sliderLabel="Custom"
      fallback={0.25}
      presetClassName="capitalize"
    />
  )
}

// Plural alias of SpacingControl; both barrels export both names.
export { SpacingControl as SpacingControls }
