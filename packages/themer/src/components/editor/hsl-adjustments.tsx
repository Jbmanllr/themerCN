"use client";

// The HSL adjustment controls: a grid of presets (hslPresets) and three
// sliders (hue shift, saturation and lightness multipliers) that transform
// every colour of the theme at once (host extra colours the theme sets
// included; an unset extra stays unset).
//
// Contract: adjustments are applied from the checkpoint (the theme before the
// first adjustment), never from the current styles, so moving a slider back
// restores the original colours. The checkpoint is saved when an adjustment
// leaves the neutral state. The debounced updater is created once and reads
// the store when it fires: the checkpoint saved by the first change is always
// seen, and nothing is lost to a closure over an older theme.
//
// See: packages/themer/ARCHITECTURE.md (HSL Adjustments).

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@villa/ui/components/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@villa/ui/components/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@villa/ui/components/tooltip";
import { cn } from "@villa/ui/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { SliderWithInput } from "./slider-with-input";
import { useEditorStore } from "../../stores/editor-store";
import { hslPresets } from "../../config/presets";
import { defaultHSLAdjustments } from "../../config/defaults";
import { getExtraColorKeys } from "../../config/extra-colors";
import {
  adjustColor,
  adjustThemeStyles,
  isIdentityHslAdjustment,
} from "../../utils/hsl-adjust";
import { debounce } from "../../utils/debounce";
import type { HSLAdjustments } from "../../types";

const HSL_UPDATE_DEBOUNCE_MS = 10;

function applyHslAdjustments(adjustments: HSLAdjustments) {
  const { themeCheckpoint, themeState, setThemeState } =
    useEditorStore.getState();
  const base = (themeCheckpoint ?? themeState).styles;
  setThemeState((prev) => ({
    ...prev,
    hslAdjustments: adjustments,
    styles: adjustThemeStyles(base, adjustments, getExtraColorKeys()),
  }));
}

/** Save the checkpoint before the first adjustment away from neutral. */
function checkpointIfNeutral() {
  const { themeState, saveThemeCheckpoint } = useEditorStore.getState();
  if (
    isIdentityHslAdjustment(themeState.hslAdjustments ?? defaultHSLAdjustments)
  ) {
    saveThemeCheckpoint();
  }
}

/**
 * While collapsed, the grid is clipped to its first row; presets past that
 * row are hidden as well so keyboard focus cannot land on them. The breaks
 * follow the grid's column count at each container width.
 */
function collapsedPresetClass(index: number): string | undefined {
  if (index < 5) return undefined;
  if (index < 7) return "hidden @sm:block";
  if (index < 9) return "hidden @md:block";
  if (index < 11) return "hidden @lg:block";
  if (index < 13) return "hidden @xl:block";
  return "hidden";
}

/**
 * HSL adjustment presets and sliders. Slider ranges: hue shift -180 to 180
 * degrees, saturation multiplier 0 to 2, lightness multiplier 0.2 to 2.
 */
export function HSLAdjustments() {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const gridId = React.useId();
  const currentAdjustments = useEditorStore(
    (state) => state.themeState.hslAdjustments ?? defaultHSLAdjustments,
  );
  // Preset previews start from the same base the adjustment uses.
  const baseColors = useEditorStore(
    useShallow((state) => {
      const base = state.themeCheckpoint ?? state.themeState;
      const mode = state.themeState.currentMode;
      return {
        primary: base.styles[mode].primary,
        secondary: base.styles[mode].secondary,
      };
    }),
  );

  const debouncedUpdate = React.useMemo(
    () => debounce(applyHslAdjustments, HSL_UPDATE_DEBOUNCE_MS),
    [],
  );

  React.useEffect(() => () => debouncedUpdate.cancel(), [debouncedUpdate]);

  const handleAdjustmentChange = (key: keyof HSLAdjustments, value: number) => {
    checkpointIfNeutral();
    debouncedUpdate({ ...currentAdjustments, [key]: value });
  };

  const handlePresetClick = (preset: (typeof hslPresets)[number]) => {
    checkpointIfNeutral();
    debouncedUpdate({
      hueShift: preset.hueShift,
      saturationScale: preset.saturationScale,
      lightnessScale: preset.lightnessScale,
    });
  };

  const selectedLabel = hslPresets.find(
    (preset) =>
      currentAdjustments.hueShift === preset.hueShift &&
      currentAdjustments.saturationScale === preset.saturationScale &&
      currentAdjustments.lightnessScale === preset.lightnessScale,
  )?.label;

  return (
    <div className="@container">
      {/* The presets in a responsive grid (container queries, as TweakCN). A
          single-select group: one Tab stop, arrows move between presets.
          Pressing the selected preset again empties the group; that keeps
          the current adjustment instead of writing nothing. It is remounted
          when the grid opens or closes, so the Tab stop goes back to the
          first preset and never stays on one that collapsing hid. */}
      <ToggleGroup
        key={isExpanded ? "expanded" : "collapsed"}
        id={gridId}
        aria-label="HSL presets"
        spacing={2}
        value={selectedLabel ? [selectedLabel] : []}
        onValueChange={(values) => {
          const preset = hslPresets.find((item) => item.label === values[0]);
          if (preset) handlePresetClick(preset);
        }}
        className={cn(
          // rounded-none: the stock group's rounding would clip the corner
          // presets' shadows and rings with this overflow-hidden.
          "-m-1 mb-2 grid w-full grid-cols-5 gap-2 overflow-hidden rounded-none p-1 transition-all duration-300 ease-in-out @sm:grid-cols-7 @md:grid-cols-9 @lg:grid-cols-11 @xl:grid-cols-13",
          isExpanded ? "h-auto" : "h-10",
        )}
      >
        {hslPresets.map((preset, index) => (
          <HslPresetButton
            key={preset.label}
            className={isExpanded ? undefined : collapsedPresetClass(index)}
            preset={preset}
            basePrimary={baseColors.primary}
            baseSecondary={baseColors.secondary}
            isSelected={preset.label === selectedLabel}
          />
        ))}
      </ToggleGroup>

      {/* Show more/less */}
      {hslPresets.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls={gridId}
          className="text-muted-foreground mb-4 flex w-full items-center justify-center text-xs"
        >
          {isExpanded ? "Hide" : "Show more"} presets
          <ChevronDown
            className={cn(
              "ms-1 size-4 transition-transform duration-200",
              isExpanded && "rotate-180",
            )}
          />
        </Button>
      )}

      {/* Sliders */}
      <div className="space-y-1">
        <SliderWithInput
          label="Hue Shift"
          value={currentAdjustments.hueShift}
          onChange={(value) => handleAdjustmentChange("hueShift", value)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />

        <SliderWithInput
          label="Saturation Multiplier"
          value={currentAdjustments.saturationScale}
          onChange={(value) => handleAdjustmentChange("saturationScale", value)}
          min={0}
          max={2}
          step={0.01}
          unit="×"
        />

        <SliderWithInput
          label="Lightness Multiplier"
          value={currentAdjustments.lightnessScale}
          onChange={(value) => handleAdjustmentChange("lightnessScale", value)}
          min={0.2}
          max={2}
          step={0.01}
          unit="×"
        />
      </div>
    </div>
  );
}

interface HslPresetButtonProps {
  preset: (typeof hslPresets)[number];
  basePrimary: string;
  baseSecondary: string;
  isSelected: boolean;
  className?: string;
}

function HslPresetButton({
  preset,
  basePrimary,
  baseSecondary,
  isSelected,
  className,
}: HslPresetButtonProps) {
  const previewPrimary = adjustColor(basePrimary, preset);
  const previewSecondary = adjustColor(baseSecondary, preset);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <ToggleGroupItem
            value={preset.label}
            aria-label={preset.label}
            className={cn(
              // min-w-0: a preset narrows with its column, as before the
              // stock toggle's min-w-8.
              "relative h-8 w-full min-w-0 overflow-hidden rounded-md p-0 shadow-sm transition-all duration-200",
              "hover:scale-105 hover:shadow-md",
              isSelected
                ? "ring-primary ring-1 ring-offset-1"
                : "border-border border",
              className,
            )}
          />
        }
      >
        {/* Two color halves side by side - TweakCN style */}
        <div className="absolute inset-0 flex">
          <div
            className="h-full flex-1 rounded-s-md"
            style={{ backgroundColor: previewPrimary }}
          />
          <div
            className="h-full flex-1 rounded-e-md"
            style={{ backgroundColor: previewSecondary }}
          />
        </div>
        {isSelected && (
          <div className="bg-primary absolute end-0.5 bottom-0.5 size-2 rounded-full" />
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        <p className="text-xs font-medium">{preset.label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
