"use client";

// Shadow parameters. Colour is per mode (a dark theme needs its own shadow
// colour); opacity, blur, spread and offsets are shared by both modes and go
// through updateCommonStyle, as in tweakcn. Every write is a functional
// store update. The preview uses the computed `shadow` value from
// getShadowMap, i.e. exactly what the theme exports for this mode.

import * as React from "react";
import { useShallow } from "zustand/react/shallow";
import { SliderWithInput } from "./slider-with-input";
import { ColorPicker } from "./color-picker";
import { useEditorStore } from "../../stores/editor-store";
import { CONTROL_RANGES } from "../../config/constants";
import type { CommonStyleKey } from "../../types";
import { getShadowMap, getShadowParams } from "../../utils/shadows";

type ShadowLengthKey = Extract<
  CommonStyleKey,
  "shadow-blur" | "shadow-spread" | "shadow-offset-x" | "shadow-offset-y"
>;

const SHADOW_LENGTH_CONTROLS: readonly {
  key: ShadowLengthKey;
  label: string;
  param: "blur" | "spread" | "offsetX" | "offsetY";
}[] = [
  { key: "shadow-blur", label: "Blur", param: "blur" },
  { key: "shadow-spread", label: "Spread", param: "spread" },
  { key: "shadow-offset-x", label: "Offset X", param: "offsetX" },
  { key: "shadow-offset-y", label: "Offset Y", param: "offsetY" },
];

/**
 * Shadow editor controls
 */
export function ShadowControl() {
  const shadowStyles = useEditorStore(
    useShallow((state) => {
      const styles = state.themeState.styles[state.themeState.currentMode];
      return {
        "shadow-color": styles["shadow-color"],
        "shadow-opacity": styles["shadow-opacity"],
        "shadow-blur": styles["shadow-blur"],
        "shadow-spread": styles["shadow-spread"],
        "shadow-offset-x": styles["shadow-offset-x"],
        "shadow-offset-y": styles["shadow-offset-y"],
      };
    }),
  );
  const previewShadow = useEditorStore(
    (state) => getShadowMap(state.themeState).shadow,
  );
  const setThemeState = useEditorStore((state) => state.setThemeState);
  const updateCommonStyle = useEditorStore((state) => state.updateCommonStyle);

  const handleColorChange = React.useCallback(
    (value: string) => {
      setThemeState((prev) => ({
        ...prev,
        styles: {
          ...prev.styles,
          [prev.currentMode]: {
            ...prev.styles[prev.currentMode],
            "shadow-color": value,
          },
        },
      }));
    },
    [setThemeState],
  );

  const params = getShadowParams(shadowStyles);
  const opacityRange = CONTROL_RANGES["shadow-opacity"];

  return (
    <div className="space-y-4">
      <ColorPicker
        name="shadow-color"
        label="Shadow Color"
        color={params.color}
        onChange={handleColorChange}
      />

      <SliderWithInput
        label="Opacity"
        value={params.opacity}
        onChange={(value) =>
          updateCommonStyle("shadow-opacity", value.toString())
        }
        min={opacityRange.min}
        max={opacityRange.max}
        step={opacityRange.step}
      />

      {SHADOW_LENGTH_CONTROLS.map(({ key, label, param }) => {
        const range = CONTROL_RANGES[key];
        return (
          <SliderWithInput
            key={key}
            label={label}
            value={params[param]}
            onChange={(value) => updateCommonStyle(key, `${value}px`)}
            min={range.min}
            max={range.max}
            step={range.step}
            unit={range.unit}
          />
        );
      })}

      {/* Preview */}
      <div className="pt-2">
        <div className="text-muted-foreground mb-2 text-xs">Preview</div>
        <div className="bg-card flex h-20 items-center justify-center rounded-lg border">
          <div
            className="bg-background h-12 w-24 rounded-md"
            style={{ boxShadow: previewShadow }}
          />
        </div>
      </div>
    </div>
  );
}
