"use client";

// One colour token control: native swatch input, text input and the
// Tailwind palette popover. Memoised and given a stable `onChange(value,
// name)` by the list (one handler for every token), so editing one token
// re-renders only its picker and the debounce is never recreated mid-typing.
//
// Native and typed edits commit after COLOR_INPUT_DEBOUNCE_MS; a palette pick
// commits at once and drops the edit still pending. Text that is not a valid
// colour stays in the field (marked invalid) and is not written to the theme.
// The native input and the swatch show the valid draft (falling back to the
// stored value) so they follow a pick before the debounce commits it; the
// native input only understands #rrggbb, so it gets a hex conversion. The
// stored format is kept unless the user picks from the native input.

import * as React from "react";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { useColorFocus } from "../../hooks/use-color-focus";
import { debounce } from "../../utils/debounce";
import { isValidColor, toColorInputValue } from "../../utils/color-converter";
import { COLOR_INPUT_DEBOUNCE_MS } from "../../config/constants";
import { ColorSelectorPopover } from "./color-selector-popover";

interface ColorPickerProps {
  /** Token the picker edits; also its focus-registry name. */
  name: string;
  label: string;
  color: string;
  /** Must be stable across renders (the debounce is built from it). */
  onChange: (color: string, name: string) => void;
  disabled?: boolean;
}

export const ColorPicker = React.memo(function ColorPicker({
  name,
  label,
  color,
  onChange,
  disabled = false,
}: ColorPickerProps) {
  // Draft text for immediate feedback, replaced by the stored colour on every
  // change of it (commit, undo, preset, reset). Tracked against the previous
  // render's colour (React's "adjust state when a prop changes" pattern):
  // keying the draft to the colour it started from would bring a stale draft
  // back when the colour returns to that value, e.g. edit then Reset.
  const [textValue, setTextValue] = React.useState(color);
  const [previousColor, setPreviousColor] = React.useState(color);
  if (color !== previousColor) {
    setPreviousColor(color);
    setTextValue(color);
  }
  const isInvalid = textValue.trim() !== "" && !isValidColor(textValue);
  const previewColor =
    !isInvalid && textValue.trim() !== "" ? textValue.trim() : color;
  const { ref, isHighlighted } = useColorFocus(name);
  const id = React.useId();
  const swatchId = `${id}-swatch`;
  const textId = `${id}-text`;

  const debouncedOnChange = React.useMemo(
    () =>
      debounce(
        (value: string) => onChange(value, name),
        COLOR_INPUT_DEBOUNCE_MS,
      ),
    [name, onChange],
  );

  // A picker that unmounts mid-debounce (tab switch, search, editor close)
  // still commits the last valid value rather than dropping it.
  React.useEffect(() => () => debouncedOnChange.flush(), [debouncedOnChange]);

  const handleNativeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTextValue(value);
    debouncedOnChange(value);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTextValue(value);
    if (isValidColor(value.trim())) debouncedOnChange(value.trim());
    else debouncedOnChange.cancel();
  };

  const handlePaletteSelect = React.useCallback(
    (value: string) => {
      debouncedOnChange.cancel();
      onChange(value, name);
    },
    [debouncedOnChange, name, onChange],
  );

  return (
    <div
      ref={ref}
      data-color-picker={name}
      className={cn(
        "mb-4 flex flex-col gap-2 transition-all duration-300",
        isHighlighted &&
          "bg-border/50 ring-primary -m-1.5 mb-1.5 rounded-sm p-1.5 ring-2",
      )}
    >
      <Label htmlFor={textId} className="text-xs font-medium">
        {label}
      </Label>

      <div className="relative flex items-center gap-1">
        <div
          data-color-swatch-preview=""
          className={cn(
            "relative flex size-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border",
            disabled && "cursor-not-allowed opacity-50",
          )}
          style={{ backgroundColor: previewColor }}
        >
          <input
            type="color"
            id={swatchId}
            aria-label={`${label} colour swatch`}
            value={toColorInputValue(previewColor)}
            onChange={handleNativeChange}
            disabled={disabled}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </div>

        <Input
          id={textId}
          type="text"
          value={textValue}
          onChange={handleTextChange}
          disabled={disabled}
          aria-invalid={isInvalid || undefined}
          spellCheck={false}
          autoComplete="off"
          className="h-8 flex-1 rounded text-sm"
          placeholder="Enter color (hex, rgb, oklch...)"
        />

        <ColorSelectorPopover
          currentColor={color}
          onChange={handlePaletteSelect}
          disabled={disabled}
        />
      </div>
    </div>
  );
});
