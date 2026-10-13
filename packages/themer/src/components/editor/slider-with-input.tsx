"use client";

// A labelled slider with a numeric input beside it. The input is the label's
// target and the slider thumb is labelled by it (useId), so screen readers
// announce the control's name on both. While the person types, only values
// inside [min, max] are committed, so typing "0." on the way to "0.5" or "-"
// on the way to "-2" never jumps the theme to a clamped bound; leaving the
// field clamps whatever is there and commits it.

import * as React from "react";
import { Slider } from "@villa/ui/components/slider";
import { Input } from "@villa/ui/components/input";
import { Label } from "@villa/ui/components/label";
import { cn } from "@villa/ui/lib/utils";
import { clampToRange } from "../../utils/length";

interface SliderWithInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Slider control with numeric input field
 */
export function SliderWithInput({
  value,
  onChange,
  label,
  min,
  max,
  step,
  unit = "",
  disabled = false,
  className,
}: SliderWithInputProps) {
  const inputId = React.useId();
  const labelId = React.useId();
  const [draft, setDraft] = React.useState({
    propValue: value,
    inputValue: value.toString(),
  });
  // A new value from outside (undo, preset, other mode) replaces the draft.
  const inputValue =
    draft.propValue === value ? draft.inputValue : value.toString();

  const setInputValue = React.useCallback(
    (input: string, committed: number = value) =>
      setDraft({ propValue: committed, inputValue: input }),
    [value],
  );

  // The slider shows a clamped position; the stored value may lie outside
  // the range (e.g. the `full` radius preset).
  const sliderValue = clampToRange(value, min, max);

  const handleSliderChange = (newValue: number | readonly number[]) => {
    // Base UI Slider can return either number or number[]
    const val = Array.isArray(newValue) ? newValue[0] : newValue;
    if (val !== undefined) {
      setInputValue(val.toString(), val);
      onChange(val);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      setInputValue(raw, parsed);
      onChange(parsed);
    } else {
      setInputValue(raw);
    }
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed)) {
      setInputValue(value.toString());
    } else {
      const clamped = clampToRange(parsed, min, max);
      setInputValue(clamped.toString(), clamped);
      onChange(clamped);
    }
  };

  return (
    <div className={cn("mb-4", className)}>
      <div className="mb-2 flex items-center justify-between">
        <Label id={labelId} htmlFor={inputId} className="text-sm font-medium">
          {label}
        </Label>
        <div className="flex items-center gap-1">
          <Input
            id={inputId}
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="h-7 w-16 text-end text-xs"
          />
          {unit && (
            <span className="text-muted-foreground text-xs">{unit}</span>
          )}
        </div>
      </div>
      <Slider
        value={[sliderValue]}
        onValueChange={handleSliderChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-labelledby={labelId}
        className="w-full py-1"
      />
    </div>
  );
}
