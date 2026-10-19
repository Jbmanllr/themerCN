"use client"

// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified for themercn.
//
// Preset picker (tweakcn components/editor/theme-preset-select.tsx): a
// searchable list with swatches, a theme count, a shuffle button and a "New"
// badge inside the popover, and prev/next arrows beside it. Search, arrows
// and shuffle all act on the filtered list (preset-list.ts); the search
// stays after the popover closes (as tweakcn) so the arrows keep cycling
// through what was searched, and clears once a theme is picked from the
// list. The trigger label carries `*` while the theme differs from its
// preset (useIsOnPreset).
//
// Differences: Base UI composition (`render`), and the popover sized from its
// trigger with `--anchor-width` (no ResizeObserver). It portals into the
// Themer's popup container, above the Themer UI (themer-scope.tsx).

import * as React from "react"
import { ChevronDown, ArrowLeft, ArrowRight, Shuffle } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Separator } from "@workspace/ui/components/separator"
import {
  themePresets,
  getPresetIds,
  getPresetLabel,
  resolvePresetStyles,
} from "../../config/presets"
import { useEditorStore } from "../../stores/editor-store"
import { useColorMode } from "../../hooks/use-color-mode"
import { useIsOnPreset } from "../../hooks/use-editor-selectors"
import type { ThemeMode } from "../../types"
import {
  cyclePresetId,
  filterPresetIds,
  formatPresetTriggerLabel,
  isPresetNew,
  pickRandomPresetId,
} from "./preset-list"
import { ActionButton } from "../ui/action-button"

interface PresetSelectProps {
  value: string
  onChange: (preset: string) => void
}

const PRESET_SWATCH_KEYS = ["primary", "accent", "secondary", "border"] as const

/**
 * Color preview boxes for theme preset
 */
function ColorBox({ color }: { color: string }) {
  return (
    <div
      data-testid="theme-color-swatch"
      className="size-3 rounded-sm border border-muted"
      style={{ backgroundColor: color }}
    />
  )
}

/**
 * Display tweakcn-style theme color swatches
 */
function ThemeColors({ colors }: { colors: readonly string[] }) {
  return (
    <div data-testid="theme-colors" className="flex gap-0.5">
      {colors.map((color, index) => (
        // react-doctor-disable-next-line react-doctor/no-array-index-as-key -- four fixed swatch slots in PRESET_SWATCH_KEYS order that never reorder or filter; two slots can share a colour, so the slot index is the identity
        <ColorBox key={`${color}-${index}`} color={color} />
      ))}
    </div>
  )
}

function getPresetSwatchColors(presetId: string, mode: ThemeMode): string[] {
  const styles = resolvePresetStyles(presetId)[mode]
  return PRESET_SWATCH_KEYS.map((key) => styles[key] ?? "transparent")
}

function CycleButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next"
  onClick: () => void
}) {
  const label = direction === "prev" ? "Previous theme" : "Next theme"
  return (
    <ActionButton
      label={label}
      data-testid={
        direction === "prev" ? "themer-preset-previous" : "themer-preset-next"
      }
      onClick={onClick}
    >
      {direction === "prev" ? <ArrowLeft /> : <ArrowRight />}
    </ActionButton>
  )
}

/**
 * Preset selector with search, random, and navigation
 * Styled like tweakcn: full-width button, arrow separators, color preview
 */
export function PresetSelect({ value, onChange }: PresetSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  // Host presets are registered before the first render (ThemerProvider) and
  // do not change while mounted.
  const presetIds = React.useMemo(() => getPresetIds(), [])
  // The colour mode itself, as the mode controls read it: the store's mode
  // follows it one commit later (ThemerProvider).
  const currentMode = useColorMode().mode
  const hasUnsavedChanges = !useIsOnPreset()
  const selectedSwatchColors = useEditorStore(
    useShallow((state) => {
      const styles = state.themeState.styles[currentMode]
      return PRESET_SWATCH_KEYS.map((key) => styles[key] ?? "transparent")
    })
  )
  const filteredPresetIds = React.useMemo(
    () => filterPresetIds(presetIds, searchValue, getPresetLabel),
    [presetIds, searchValue]
  )

  const handleCycle = (direction: "prev" | "next") => {
    const presetId = cyclePresetId(filteredPresetIds, value, direction)
    if (presetId) onChange(presetId)
  }

  const handleShuffle = () => {
    const presetId = pickRandomPresetId(filteredPresetIds, value)
    if (presetId) onChange(presetId)
  }

  const themeCount = `${filteredPresetIds.length} ${
    filteredPresetIds.length === 1 ? "theme" : "themes"
  }`

  return (
    <div
      data-testid="themer-preset-control"
      className="flex w-full min-w-0 items-center"
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              data-testid="themer-preset-trigger"
              variant="ghost"
              role="combobox"
              aria-label="Theme preset"
              className="group relative min-w-0 flex-1 justify-between"
            />
          }
        >
          <div className="flex w-full items-center gap-2 overflow-hidden">
            <ThemeColors colors={selectedSwatchColors} />
            <span className="truncate text-start text-sm font-medium capitalize">
              {formatPresetTriggerLabel(
                getPresetLabel(value),
                hasUnsavedChanges
              )}
            </span>
          </div>
          <ChevronDown />
        </PopoverTrigger>
        <PopoverContent
          className="max-h-(--available-height) w-(--anchor-width) max-w-[calc(100vw-1rem)] min-w-72 gap-0 overflow-hidden p-0"
          align="start"
          side="bottom"
        >
          <Command
            shouldFilter={false}
            className="max-h-(--available-height) w-full overflow-hidden"
          >
            <CommandInput
              placeholder="Search themes..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <div className="flex items-center justify-between px-3 py-1.5">
              <span
                className="text-sm text-muted-foreground"
                data-testid="themer-preset-count"
              >
                {themeCount}
              </span>
              <ActionButton
                label="Random theme"
                size="icon-xs"
                data-testid="themer-preset-random"
                disabled={filteredPresetIds.length === 0}
                onClick={handleShuffle}
              >
                <Shuffle />
              </ActionButton>
            </div>
            <Separator />
            <CommandList className="max-h-[min(400px,calc(var(--available-height)-6rem))]">
              {filteredPresetIds.length === 0 ? (
                <CommandEmpty>No theme found.</CommandEmpty>
              ) : (
                <CommandGroup heading="Built-in Themes">
                  {filteredPresetIds.map((presetId) => {
                    const preset = themePresets[presetId]
                    if (!preset) return null
                    return (
                      <CommandItem
                        key={presetId}
                        value={`${presetId} ${preset.label}`}
                        data-checked={value === presetId}
                        onSelect={() => {
                          onChange(presetId)
                          setSearchValue("")
                          setOpen(false)
                        }}
                        className="flex items-center gap-3 py-2.5"
                      >
                        <ThemeColors
                          colors={getPresetSwatchColors(presetId, currentMode)}
                        />
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate text-sm font-medium capitalize">
                            {preset.label}
                          </span>
                          {isPresetNew(preset.createdAt) ? (
                            <Badge
                              variant="secondary"
                              className="h-4 px-1.5 text-[0.625rem]"
                            >
                              New
                            </Badge>
                          ) : null}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="mx-1 h-6.5" />
      <CycleButton direction="prev" onClick={() => handleCycle("prev")} />
      <Separator orientation="vertical" className="mx-1 h-6.5" />
      <CycleButton direction="next" onClick={() => handleCycle("next")} />
    </div>
  )
}
