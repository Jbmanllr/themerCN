"use client";

// The Tailwind palette popover beside each colour token: a searchable list
// and a swatch grid of the bundled Tailwind v4 palette
// (config/tailwind-palette.ts).
//
// A pick calls `onChange(entry.color)` with the palette's own value string
// (OKLCH, or #ffffff / #000000 / transparent for the special entries) and
// closes the popover. The caller (ColorPicker) commits it at once. The
// selected row is found by comparing normalised colours, so a stored value in
// any format (hex, rgb, oklch) matches its palette entry. The last view (list
// or palette) persists as the `colorSelectorTab` preference.
//
// One popover exists per colour token (~32 on the page), so the panel body
// mounts only while open and the palette's grid rows and normalised colours
// are built once per page, not per picker.

import * as React from "react";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@villa/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@villa/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@villa/ui/components/popover";
import { ScrollArea } from "@villa/ui/components/scroll-area";
import { Separator } from "@villa/ui/components/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@villa/ui/components/tabs";
import { cn } from "@villa/ui/lib/utils";
import {
  filterTailwindPaletteEntries,
  getTailwindPaletteEntries,
  tailwindPaletteFamilies,
  type TailwindPaletteEntry,
} from "../../config/tailwind-palette";
import { usePreferencesStore } from "../../stores/preferences-store";
import { normalizeColorForCompare } from "../../utils/color-converter";
import { useScrollBoundary } from "./scroll-boundary";

interface ColorSelectorPopoverProps {
  currentColor: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

type ViewMode = "list" | "palette";

function isViewMode(value: unknown): value is ViewMode {
  return value === "list" || value === "palette";
}

type PaletteGroup = {
  family: TailwindPaletteEntry["family"];
  colorName: string;
  entries: readonly TailwindPaletteEntry[];
};

const COLOR_SELECTOR_BODY_HEIGHT =
  "min(calc(var(--spacing, 0.25rem) * 84), calc(var(--available-height) - 2.75rem))";
const COLOR_SELECTOR_WIDTH = "min(18.75rem, calc(100vw - 1rem))";
const SCROLL_AREA_VIEWPORT = '[data-slot="scroll-area-viewport"]';

export function ColorSelectorPopover({
  currentColor,
  onChange,
  disabled = false,
}: ColorSelectorPopoverProps) {
  const [open, setOpen] = React.useState(false);

  const handleColorSelect = React.useCallback(
    (color: string) => {
      onChange(color);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            disabled={disabled}
            className="shrink-0 rounded"
          />
        }
      >
        <TailwindIcon className="size-4" />
        <span className="sr-only">Open Tailwind colors</span>
      </PopoverTrigger>

      <PopoverContent
        className="max-h-(--available-height) gap-0 overflow-hidden p-0"
        align="start"
        side="bottom"
        style={{
          maxHeight: "var(--available-height)",
          width: COLOR_SELECTOR_WIDTH,
        }}
      >
        <ColorSelectorPanel
          currentColor={currentColor}
          onSelect={handleColorSelect}
        />
      </PopoverContent>
    </Popover>
  );
}

// The popup body. It mounts only while the popup is open, so a closed picker
// never builds the palette list or matches its colour against the palette,
// and the search starts empty on every open.
function ColorSelectorPanel({
  currentColor,
  onSelect,
}: {
  currentColor: string;
  onSelect: (color: string) => void;
}) {
  // The last view (list or palette) persists as a preference.
  const viewMode = usePreferencesStore((state) => state.colorSelectorTab);
  const setViewMode = usePreferencesStore((state) => state.setColorSelectorTab);
  const [searchValue, setSearchValue] = React.useState("");
  const listScrollAreaRef = React.useRef<HTMLDivElement>(null);
  const paletteScrollAreaRef = React.useRef<HTMLDivElement>(null);

  const paletteGridRows = getStaticPaletteGridRows();

  const filteredPaletteGroups = React.useMemo(
    () =>
      groupPaletteEntries(
        filterTailwindPaletteEntries(searchValue, getTailwindPaletteEntries()),
      ),
    [searchValue],
  );

  const selectedEntryName = React.useMemo(
    () => getSelectedPaletteEntryName(currentColor),
    [currentColor],
  );

  useScrollBoundary(listScrollAreaRef, {
    enabled: viewMode === "list",
    viewportSelector: SCROLL_AREA_VIEWPORT,
    rebindKey: filteredPaletteGroups.length,
  });
  useScrollBoundary(paletteScrollAreaRef, {
    enabled: viewMode === "palette",
    viewportSelector: SCROLL_AREA_VIEWPORT,
  });

  const isColorSelected = React.useCallback(
    (entry: TailwindPaletteEntry) => entry.name === selectedEntryName,
    [selectedEntryName],
  );

  return (
    <Tabs
      value={viewMode}
      onValueChange={(value) => {
        if (isViewMode(value)) setViewMode(value);
      }}
      className="max-h-(--available-height) min-h-0 gap-0"
      style={{ maxHeight: "var(--available-height)", width: "100%" }}
    >
      <div
        data-color-selector-header
        className="flex h-12 shrink-0 items-center justify-between gap-4 px-3"
      >
        <div className="flex items-center gap-1.5">
          <TailwindIcon className="size-4" />
          <span className="text-muted-foreground text-sm tabular-nums">
            Tailwind v4
          </span>
        </div>

        <TabsList className="h-8 gap-1 bg-transparent p-0">
          <TabsTrigger
            value="list"
            className="data-active:bg-input/25 dark:data-active:bg-input/25 size-8 p-0 data-active:shadow-none!"
          >
            <List className="size-4" />
            <span className="sr-only">List view</span>
          </TabsTrigger>
          <TabsTrigger
            value="palette"
            className="data-active:bg-input/25 dark:data-active:bg-input/25 size-8 p-0 data-active:shadow-none!"
          >
            <LayoutGrid className="size-4" />
            <span className="sr-only">Palette view</span>
          </TabsTrigger>
        </TabsList>
      </div>
      <Separator />

      <TabsContent value="list" className="my-0 min-h-0 w-full overflow-hidden">
        <Command
          shouldFilter={false}
          className="flex h-84 max-h-[calc(var(--available-height)-2.75rem)] flex-col rounded-none! p-0"
          style={{
            height: COLOR_SELECTOR_BODY_HEIGHT,
            maxHeight: COLOR_SELECTOR_BODY_HEIGHT,
          }}
        >
          <CommandInput
            className="h-10"
            placeholder="Search Tailwind colors..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <div ref={listScrollAreaRef} className="min-h-0 flex-1">
            <ScrollArea className="h-full overflow-hidden">
              <CommandList className="max-h-none overflow-visible p-1">
                {filteredPaletteGroups.length === 0 ? (
                  <CommandEmpty className="text-muted-foreground p-4 text-center">
                    No Tailwind color found.
                  </CommandEmpty>
                ) : (
                  filteredPaletteGroups.map((group) => (
                    <CommandGroup heading={group.colorName} key={group.family}>
                      {group.entries.map((entry) => {
                        const isSelected = isColorSelected(entry);

                        return (
                          <CommandItem
                            key={entry.name}
                            value={entry.name}
                            data-checked={isSelected}
                            onSelect={() => onSelect(entry.color)}
                            className="flex items-center gap-2"
                          >
                            <span
                              aria-hidden
                              title={entry.name}
                              {...getSwatchAppearance({
                                color: entry.color,
                                isSelected,
                                size: "md",
                              })}
                            />
                            <span>{entry.name}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))
                )}
              </CommandList>
            </ScrollArea>
          </div>
        </Command>
      </TabsContent>

      <TabsContent
        value="palette"
        className="my-0 min-h-0 w-full overflow-hidden"
      >
        <div ref={paletteScrollAreaRef}>
          <ScrollArea
            className="h-84 max-h-[calc(var(--available-height)-2.75rem)] w-full"
            style={{
              height: COLOR_SELECTOR_BODY_HEIGHT,
              maxHeight: COLOR_SELECTOR_BODY_HEIGHT,
            }}
          >
            <div className="flex flex-col gap-0.5 p-1">
              {paletteGridRows.map((entries) => (
                <div
                  key={entries.map((entry) => entry.name).join(":")}
                  className="flex gap-0.5"
                >
                  {entries.map((entry) => (
                    <ColorSwatch
                      key={entry.name}
                      name={entry.name}
                      color={entry.color}
                      isSelected={isColorSelected(entry)}
                      onClick={() => onSelect(entry.color)}
                      className="rounded-none"
                      size="md"
                    />
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function groupPaletteEntries(
  entries: readonly TailwindPaletteEntry[],
): PaletteGroup[] {
  return tailwindPaletteFamilies
    .map((family) => ({
      family,
      colorName: family.charAt(0).toUpperCase() + family.slice(1),
      entries: entries.filter((entry) => entry.family === family),
    }))
    .filter((group) => group.entries.length > 0);
}

function getPaletteGridRows(
  groups: readonly PaletteGroup[],
): readonly (readonly TailwindPaletteEntry[])[] {
  const specialEntries = groups
    .filter((group) => group.entries.every((entry) => entry.isDefault))
    .flatMap((group) => group.entries);
  const colorRows = groups
    .filter((group) => group.entries.some((entry) => !entry.isDefault))
    .map((group) => group.entries);

  return specialEntries.length > 0 ? [specialEntries, ...colorRows] : colorRows;
}

// The palette is static: its grid rows and its normalised colours are built
// once, on the first open of any picker.
let staticPaletteGridRows:
  readonly (readonly TailwindPaletteEntry[])[] | undefined;

function getStaticPaletteGridRows() {
  return (staticPaletteGridRows ??= getPaletteGridRows(
    groupPaletteEntries(getTailwindPaletteEntries()),
  ));
}

let normalizedPaletteColors: ReadonlyMap<string, string> | undefined;

function getSelectedPaletteEntryName(currentColor: string) {
  const entries = getTailwindPaletteEntries();
  const normalizedColors = (normalizedPaletteColors ??= new Map(
    entries.map((entry) => [entry.name, normalizeColorForCompare(entry.color)]),
  ));
  const normalizedCurrent = normalizeColorForCompare(currentColor);
  return (
    entries.find(
      (entry) => normalizedColors.get(entry.name) === normalizedCurrent,
    )?.name ?? null
  );
}

type SwatchSize = "sm" | "md" | "lg";

const SWATCH_SIZE_CLASSES: Record<SwatchSize, string> = {
  sm: "size-5",
  md: "size-6",
  lg: "size-8",
};

// The swatch look, shared by the list view's decorative swatch (the option
// itself is the control) and the palette grid's swatch button.
function getSwatchAppearance({
  color,
  isSelected,
  size = "sm",
  className,
}: {
  color: string;
  isSelected: boolean;
  size?: SwatchSize;
  className?: string;
}): { className: string; style: React.CSSProperties } {
  const isTransparent = color === "transparent";
  const needsContrastBorder =
    color === "#ffffff" || color === "#000000" || isTransparent;
  const style = isTransparent
    ? ({
        backgroundImage:
          "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
        backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
        backgroundSize: "8px 8px",
      } satisfies React.CSSProperties)
    : ({ backgroundColor: color } satisfies React.CSSProperties);

  return {
    className: cn(
      "relative cursor-pointer rounded-md border transition-transform hover:z-10 hover:scale-105",
      needsContrastBorder ? "border-border/60" : "border-transparent",
      SWATCH_SIZE_CLASSES[size],
      isSelected && "ring-foreground/70 ring-2",
      className,
    ),
    style,
  };
}

interface ColorSwatchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isSelected: boolean;
  color: string;
  name: string;
  size?: SwatchSize;
}

function ColorSwatch({
  color,
  name,
  className,
  isSelected,
  size = "sm",
  ...props
}: ColorSwatchProps) {
  return (
    <button
      type="button"
      aria-label={`Select color ${name}`}
      aria-pressed={isSelected}
      title={name}
      {...getSwatchAppearance({ color, isSelected, size, className })}
      {...props}
    />
  );
}

function TailwindIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  // Each icon instance needs its own clipPath id: one per picker, ~32 on
  // the page, and duplicate ids make url(#id) resolve to the first one.
  const clipId = `tailwind-icon-${React.useId().replace(/:/g, "")}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 54 33"
      aria-hidden
      className={cn("text-[#38bdf8]", className)}
      {...props}
    >
      <g clipPath={`url(#${clipId})`}>
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M27 0c-7.2 0-11.7 3.6-13.5 10.8 2.7-3.6 5.85-4.95 9.45-4.05 2.054.513 3.522 2.004 5.147 3.653C30.744 13.09 33.808 16.2 40.5 16.2c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C36.756 3.11 33.692 0 27 0zM13.5 16.2C6.3 16.2 1.8 19.8 0 27c2.7-3.6 5.85-4.95 9.45-4.05 2.054.514 3.522 2.004 5.147 3.653C17.244 29.29 20.308 32.4 27 32.4c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C23.256 19.31 20.192 16.2 13.5 16.2z"
          clipRule="evenodd"
        />
      </g>
      <defs>
        <clipPath id={clipId}>
          <path fill="#fff" d="M0 0h54v32.4H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
