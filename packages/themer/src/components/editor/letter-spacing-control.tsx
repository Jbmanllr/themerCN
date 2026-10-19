"use client"

// Letter spacing: PresetSliderControl bound to `letter-spacing` (em), with a
// sample-sentence preview. Shown in the Typography panel.

import { PresetSliderControl } from "./preset-slider-control"
import { LETTER_SPACING_PRESETS } from "../../config/constants"

function LetterSpacingPreview(letterSpacing: string) {
  return (
    <div
      className="mt-2 rounded bg-muted p-3 text-sm text-foreground"
      style={{ letterSpacing }}
    >
      The quick brown fox jumps over the lazy dog.
    </div>
  )
}

/**
 * Letter spacing control for the typography panel. Letter spacing is shared
 * by both modes (a common style key).
 */
export function LetterSpacingControl() {
  return (
    <PresetSliderControl
      styleKey="letter-spacing"
      presets={LETTER_SPACING_PRESETS}
      presetsLabel="Letter spacing presets"
      sliderLabel="Custom Letter Spacing"
      fallback={0}
      presetClassName="capitalize"
      renderPreview={LetterSpacingPreview}
    />
  )
}
