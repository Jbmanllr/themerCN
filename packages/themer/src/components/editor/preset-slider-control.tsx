"use client";

// One control for a shared length style (radius, spacing, letter spacing):
// a row of named presets as a single-select ToggleGroup and a slider with a
// numeric input. Reads the current mode's value narrowly from the store and
// writes through updateCommonStyle, so both modes change together and every
// write is a functional update (no stale snapshot of the theme state).

import * as React from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@villa/ui/components/toggle-group";
import { cn } from "@villa/ui/lib/utils";
import { useEditorStore } from "../../stores/editor-store";
import { CONTROL_RANGES } from "../../config/constants";
import type { CommonStyleKey } from "../../types";
import { parseLength } from "../../utils/length";
import { SliderWithInput } from "./slider-with-input";

type PresetSliderKey = Extract<
  CommonStyleKey,
  "radius" | "spacing" | "letter-spacing"
>;

export interface PresetSliderControlProps {
  /** The shared style this control edits; its range is CONTROL_RANGES[key]. */
  styleKey: PresetSliderKey;
  /** Named preset values, shown in order as toggle items. */
  presets: Readonly<Record<string, string>>;
  /** Accessible name of the preset group, e.g. "Radius presets". */
  presetsLabel: string;
  /** Label of the slider's numeric input. */
  sliderLabel: string;
  /** Value used when the stored one cannot be parsed. */
  fallback: number;
  /** Extra classes for each preset item (e.g. `capitalize`). */
  presetClassName?: string;
  /** Preview below the slider, given the stored CSS value. */
  renderPreview?: (value: string) => React.ReactNode;
}

/**
 * Preset toggles plus a slider for one shared length style.
 */
export function PresetSliderControl({
  styleKey,
  presets,
  presetsLabel,
  sliderLabel,
  fallback,
  presetClassName,
  renderPreview,
}: PresetSliderControlProps) {
  const storedValue = useEditorStore(
    (state) => state.themeState.styles[state.themeState.currentMode][styleKey],
  );
  const updateCommonStyle = useEditorStore((state) => state.updateCommonStyle);
  const range = CONTROL_RANGES[styleKey];

  const handleChange = React.useCallback(
    (value: string) => updateCommonStyle(styleKey, value),
    [styleKey, updateCommonStyle],
  );

  const handlePresetChange = React.useCallback(
    (values: unknown[]) => {
      // Single select: clicking the active item again empties the group;
      // keep the current value instead of writing nothing.
      const [next] = values;
      if (typeof next !== "string") return;
      const value = presets[next];
      if (value !== undefined) handleChange(value);
    },
    [handleChange, presets],
  );

  const activePreset = Object.entries(presets).find(
    ([, value]) => value === storedValue,
  )?.[0];

  return (
    <div className="space-y-3">
      <ToggleGroup
        aria-label={presetsLabel}
        variant="outline"
        size="sm"
        spacing={1}
        className="flex-wrap"
        value={activePreset ? [activePreset] : []}
        onValueChange={handlePresetChange}
      >
        {Object.keys(presets).map((name) => (
          <ToggleGroupItem
            key={name}
            value={name}
            className={cn("text-xs", presetClassName)}
          >
            {name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <SliderWithInput
        label={sliderLabel}
        value={parseLength(storedValue, range.unit, fallback)}
        onChange={(value) => handleChange(`${value}${range.unit}`)}
        min={range.min}
        max={range.max}
        step={range.step}
        unit={range.unit}
      />

      {renderPreview?.(storedValue ?? "")}
    </div>
  );
}
