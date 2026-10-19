"use client"

// Border radius: PresetSliderControl bound to `radius` (rem), with a preview
// of four shapes. Shown in the Other panel.

import { PresetSliderControl } from "./preset-slider-control"
import { RADIUS_PRESETS } from "../../config/constants"

function RadiusPreview(radius: string) {
  return (
    <div className="grid grid-cols-4 gap-2 pt-2">
      <div
        className="h-10 w-full bg-primary"
        style={{ borderRadius: radius }}
      />
      <div
        className="h-10 w-full border-2 border-primary"
        style={{ borderRadius: radius }}
      />
      <div
        className="h-10 w-full bg-secondary"
        style={{ borderRadius: `calc(${radius} - 2px)` }}
      />
      <div
        className="h-10 w-full bg-muted"
        style={{ borderRadius: `calc(${radius} + 4px)` }}
      />
    </div>
  )
}

/**
 * Border radius control with presets and slider (both modes).
 */
export function RadiusControl() {
  return (
    <PresetSliderControl
      styleKey="radius"
      presets={RADIUS_PRESETS}
      presetsLabel="Radius presets"
      sliderLabel="Custom"
      fallback={0.625}
      renderPreview={RadiusPreview}
    />
  )
}
