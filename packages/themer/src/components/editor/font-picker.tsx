"use client"

// The Google Fonts picker and the four theme font slots (sans, heading,
// serif, mono). A popover with a debounced search, a category filter and the
// host's paged catalogue (useFontSearch). The endpoint is the picker's
// `fontCatalogEndpoint` prop, else ThemerConfig.fontCatalogEndpoint, else the
// bundled list searched in the browser (useFontSearch).
//
// Contract:
// - A pick loads the family first (acquireGoogleFont + waitForFont, up to 3 s)
//   and only then calls `onChange`, also when the wait timed out; the popover
//   stays open meanwhile. Only the latest pick may commit (`selectionRef`): a
//   superseded load gives its stylesheet hold back and leaves the state to the
//   newer pick.
// - After a commit the picker keeps its stylesheet hold for FONT_HANDOFF_MS so
//   the theme's own font slot (DynamicFontLoader) takes its reference before
//   ours drops; releasing first would remove and refetch the link.
//
// See: packages/themer/ARCHITECTURE.md (Font Catalog Flow, Font Picker
// Positioning and Scroll Ownership).

import * as React from "react"
import { AlertCircle, ChevronDown, FunnelX } from "lucide-react"
import { Alert, AlertAction, AlertTitle } from "@workspace/ui/components/alert"
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
import { Label } from "@workspace/ui/components/label"
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@workspace/ui/components/marker"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import { Spinner } from "@workspace/ui/components/spinner"
import { useFontSearch } from "../../hooks/use-font-search"
import { useEditorStore } from "../../stores/editor-store"
import { useOptionalThemerContext } from "../themer-provider"
import { useScrollBoundary } from "./scroll-boundary"
import type { FilterFontCategory, FontInfo } from "../../types/fonts"
import { getPopularFonts } from "../../utils/font-catalog-data"
import {
  acquireFontPreview,
  acquireGoogleFont,
  getDefaultWeights,
  waitForFont,
} from "../../utils/font-links"
import {
  buildFontFamily,
  describeFontValue,
  extractGoogleFontFamily,
  isLocalFontFamily,
  toFontCategory,
  type FontValueDescription,
  type ThemeFontRole,
} from "../../utils/font-names"

interface FontPickerProps {
  value: string
  onChange: (font: string) => void
  category: ThemeFontRole
  label: string
  disabled?: boolean
  fontCatalogEndpoint?: string
}

type FontItemProps = {
  font: FontInfo
  isSelected: boolean
  isLoading: boolean
  onSelect: (font: FontInfo) => void
  selectedRef: React.Ref<HTMLDivElement> | null
}

/**
 * How long the picker keeps its own hold on a chosen family after onChange:
 * the theme's font slot (DynamicFontLoader) takes its reference once the
 * change renders, and releasing ours first would drop and refetch the link.
 */
const FONT_HANDOFF_MS = 2000

/**
 * Load a row's preview (a `&text=` subset with the glyphs of its name) once
 * the row comes near the screen, and release it when the row unmounts, which
 * happens for every row when the picker closes. Rows never seen load nothing.
 */
function useFontPreview(
  ref: React.RefObject<HTMLElement | null>,
  family: string
) {
  React.useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    if (typeof IntersectionObserver === "undefined") {
      return acquireFontPreview(family)
    }

    let release: (() => void) | null = null
    const observer = new IntersectionObserver(
      (entries) => {
        if (release || !entries.some((entry) => entry.isIntersecting)) return
        release = acquireFontPreview(family)
        observer.disconnect()
      },
      { rootMargin: "100px" }
    )
    observer.observe(node)

    return () => {
      observer.disconnect()
      release?.()
    }
  }, [family, ref])
}

function FontItem({
  font,
  isSelected,
  isLoading,
  onSelect,
  selectedRef,
}: FontItemProps) {
  const fontFamily = buildFontFamily(font.family, font.category)
  const previewRef = React.useRef<HTMLSpanElement>(null)
  useFontPreview(previewRef, font.family)

  return (
    <CommandItem
      ref={selectedRef}
      value={font.family}
      data-checked={isSelected}
      disabled={isLoading}
      className="cursor-pointer justify-between gap-2 p-2"
      onSelect={() => {
        onSelect(font)
      }}
    >
      <div className="inline-flex min-w-0 flex-1 flex-col">
        <span
          ref={previewRef}
          className="inline-flex min-w-0 items-center gap-2 truncate"
          style={{ fontFamily }}
        >
          {font.family}
          {isLoading && <Spinner className="size-3" />}
        </span>
        <span className="flex items-center gap-1 text-xs font-normal opacity-70">
          <span>{font.category}</span>
          {font.variable && (
            <>
              <span aria-hidden="true">·</span>
              <span>Variable</span>
            </>
          )}
        </span>
      </div>
    </CommandItem>
  )
}

function useDebouncedValue(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value)

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timeout)
  }, [delay, value])

  return debouncedValue
}

function readRootVariable(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name)
}

// The root font variables are the Host's (and the Themer's own CSS
// variables): they change through <html>'s class (a Host theme or mode
// class) and inline style, so the label follows them as an external store.
function subscribeToRootStyle(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  })
  return () => observer.disconnect()
}

/**
 * describeFontValue with any `var()` resolved against <html>'s current
 * variables. The snapshot is serialised so a root style change that leaves
 * the description as it was (every theme edit writes one) does not re-render
 * the label.
 */
function useFontValueDescription(value: string): FontValueDescription {
  const getSnapshot = React.useCallback(
    () => JSON.stringify(describeFontValue(value, readRootVariable)),
    [value]
  )
  const getServerSnapshot = React.useCallback(
    () => JSON.stringify(describeFontValue(value)),
    [value]
  )
  const snapshot = React.useSyncExternalStore(
    subscribeToRootStyle,
    getSnapshot,
    getServerSnapshot
  )
  return React.useMemo(
    () => JSON.parse(snapshot) as FontValueDescription,
    [snapshot]
  )
}

/**
 * The trigger's label: names whatever the value sets. A family Google Fonts
 * does not serve (a local font, or a host font behind a `var()`, such as a
 * next/font family) is marked "Custom font"; a stack of only generic names
 * reads "System font".
 */
function FontValueLabel({
  value,
  endpoint,
}: Readonly<{ value: string; endpoint: string | undefined }>) {
  const description = useFontValueDescription(value)
  const family =
    description.kind === "family" || description.kind === "variable"
      ? description.family
      : null
  const checkCatalog =
    description.kind === "family" && !isLocalFontFamily(description.family)
  // One cached catalog lookup per family (react-query, 24 h stale time).
  const catalog = useFontSearch({
    endpoint,
    query: checkCatalog ? description.family : "",
    limit: 50,
    enabled: checkCatalog,
  })
  const inCatalog = catalog.data?.pages.some((page) =>
    page.fonts.some(
      (font) => font.family.toLowerCase() === family?.toLowerCase()
    )
  )

  const isCustom =
    description.kind === "variable" ||
    (description.kind === "family" &&
      (!checkCatalog || (catalog.isSuccess && !inCatalog)))

  let name: string
  switch (description.kind) {
    case "empty":
      return <span className="text-muted-foreground">Select font...</span>
    case "system":
      name = `System font (${description.generic})`
      break
    case "variable":
      name = description.family ?? description.variable
      break
    default:
      name = description.family
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate" style={{ fontFamily: value }}>
        {name}
      </span>
      {isCustom && (
        <Badge
          variant="secondary"
          className="shrink-0 font-sans"
          title={
            description.kind === "variable"
              ? `Set by the host through ${description.variable}; not loaded from Google Fonts`
              : "Not a Google font: the browser must already have it"
          }
        >
          Custom font
        </Badge>
      )}
    </span>
  )
}

type FontResultsProps = {
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  popularFonts: FontInfo[]
  remainingFonts: FontInfo[]
  currentFontFamily: string
  loadingFont: string | null
  onSelect: (font: FontInfo) => void
  onRetry: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  scrollRef: React.Ref<HTMLDivElement>
  selectedFontRef: React.Ref<HTMLDivElement>
  loadMoreRef: React.Ref<HTMLDivElement>
}

/**
 * The picker's result area: the catalogue's loading, error and empty states,
 * or the Popular and All Fonts groups with the paging sentinel. The picker
 * owns the query, the scroll effects and the refs.
 */
function FontResults({
  isLoading,
  isError,
  isEmpty,
  popularFonts,
  remainingFonts,
  currentFontFamily,
  loadingFont,
  onSelect,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  scrollRef,
  selectedFontRef,
  loadMoreRef,
}: FontResultsProps) {
  const renderFont = (font: FontInfo) => (
    <FontItem
      key={font.family}
      font={font}
      isSelected={font.family === currentFontFamily}
      isLoading={loadingFont === font.family}
      onSelect={onSelect}
      selectedRef={font.family === currentFontFamily ? selectedFontRef : null}
    />
  )

  return (
    <div className="relative isolate min-h-0 flex-1">
      {isLoading ? (
        <div className="absolute inset-0 flex size-full items-center justify-center gap-2 text-center">
          <Spinner />
          <span className="text-sm text-muted-foreground">
            Loading fonts...
          </span>
        </div>
      ) : isError ? (
        <div className="absolute inset-0 flex items-center p-2">
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Unable to load fonts</AlertTitle>
            <AlertAction>
              <Button
                size="xs"
                variant="outline"
                onClick={onRetry}
                // Inside the Command root, whose keydown handler cancels
                // every Enter it sees; keep Enter for this button's own click.
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.stopPropagation()
                }}
              >
                Retry
              </Button>
            </AlertAction>
          </Alert>
        </div>
      ) : isEmpty ? (
        <CommandEmpty>No fonts found.</CommandEmpty>
      ) : (
        <CommandList
          className="h-full max-h-full overscroll-contain p-1"
          ref={scrollRef}
        >
          {popularFonts.length > 0 && (
            <CommandGroup heading="Popular">
              {popularFonts.map(renderFont)}
            </CommandGroup>
          )}

          <CommandGroup
            heading={popularFonts.length > 0 ? "All Fonts" : undefined}
          >
            {remainingFonts.map(renderFont)}
          </CommandGroup>

          {hasNextPage && <div ref={loadMoreRef} className="h-2 w-full" />}

          {isFetchingNextPage && (
            <Marker role="status" className="justify-center p-2">
              <MarkerIcon className="text-popover-foreground">
                <Spinner />
              </MarkerIcon>
              <MarkerContent>Loading more fonts...</MarkerContent>
            </Marker>
          )}
        </CommandList>
      )}
    </div>
  )
}

/**
 * One Google Fonts picker: search (debounced 300 ms), category filter, lazy
 * row previews and paging (15 fonts per page). `onChange` receives a full CSS
 * font-family stack (buildFontFamily) after the family has loaded or the 3 s
 * wait gave up. `category` only sets the filter's starting value (read at
 * mount; the user's later choice stays).
 */
export function FontPicker({
  value,
  onChange,
  category,
  label,
  disabled = false,
  fontCatalogEndpoint,
}: FontPickerProps) {
  const themerContext = useOptionalThemerContext()
  const defaultCategory = toFontCategory(category)
  const endpoint =
    fontCatalogEndpoint ?? themerContext?.config.fontCatalogEndpoint

  const [open, setOpen] = React.useState(false)
  const labelId = React.useId()
  const [inputValue, setInputValue] = React.useState("")
  const [selectedCategory, setSelectedCategory] =
    React.useState<FilterFontCategory>(defaultCategory)
  const [loadingFont, setLoadingFont] = React.useState<string | null>(null)
  // Only the latest pick may commit: an earlier, slower load must not
  // overwrite it or clear its spinner.
  const selectionRef = React.useRef(0)
  const searchQuery = useDebouncedValue(inputValue, 300)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const selectedFontRef = React.useRef<HTMLDivElement>(null)
  const hasScrolledToSelectedFont = React.useRef(false)

  const currentFontFamily = React.useMemo(
    () => extractGoogleFontFamily(value) ?? "",
    [value]
  )

  const fontQuery = useFontSearch({
    endpoint,
    query: searchQuery,
    category: selectedCategory,
    limit: 15,
    enabled: open,
  })

  React.useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: 0 })
  }, [selectedCategory, searchQuery, open])

  const allFonts = React.useMemo(() => {
    if (!fontQuery.data) return []
    return fontQuery.data.pages.flatMap((page) => page.fonts)
  }, [fontQuery.data])

  useScrollBoundary(scrollRef, { enabled: open, rebindKey: allFonts.length })

  React.useEffect(() => {
    if (open && fontQuery.data && !hasScrolledToSelectedFont.current) {
      requestAnimationFrame(() => {
        selectedFontRef.current?.scrollIntoView?.({
          block: "center",
          inline: "nearest",
        })
      })
      hasScrolledToSelectedFont.current = true
    } else if (!open) {
      hasScrolledToSelectedFont.current = false
    }
  }, [fontQuery.data, open])

  const popularFonts = React.useMemo(() => {
    if (searchQuery) return []
    return getPopularFonts(selectedCategory)
  }, [searchQuery, selectedCategory])

  const remainingFonts = React.useMemo(() => {
    if (popularFonts.length === 0) return allFonts
    const popularFamilies = new Set(popularFonts.map((font) => font.family))
    return allFonts.filter((font) => !popularFamilies.has(font.family))
  }, [allFonts, popularFonts])

  // Infinite scroll: one observer on the sentinel, rebuilt only when paging
  // state changes (the query object itself is new on every render) and
  // disconnected on cleanup. A page that leaves the sentinel in view fetches
  // the next one when allFonts grows.
  const loadMoreRef = React.useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = fontQuery
  React.useEffect(() => {
    const node = loadMoreRef.current
    if (!open || !node || !hasNextPage || isFetchingNextPage) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void fetchNextPage()
        }
      },
      {
        root: scrollRef.current,
        rootMargin: "100px",
        threshold: 0,
      }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [allFonts.length, fetchNextPage, hasNextPage, isFetchingNextPage, open])

  const handleFontSelect = React.useCallback(
    async (font: FontInfo) => {
      const ticket = ++selectionRef.current
      setLoadingFont(font.family)
      // The picker loads the family first, with the weights the catalogue
      // says it has, so the theme slot reuses this link instead of guessing.
      const weights = getDefaultWeights(font.variants)
      const release = acquireGoogleFont(font.family, { weights })

      try {
        await waitForFont(font.family, weights[0])
      } catch (error) {
        console.warn(`Failed to load font ${font.family}:`, error)
      }

      // A later pick superseded this one: drop our hold and leave the state
      // to it.
      if (ticket !== selectionRef.current) {
        release()
        return
      }

      setLoadingFont(null)
      onChange(buildFontFamily(font.family, font.category))
      setOpen(false)
      setTimeout(release, FONT_HANDOFF_MS)
    },
    [onChange]
  )

  return (
    <div className="flex flex-col gap-1.5">
      <Label id={labelId} className="text-xs font-medium">
        {label}
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-labelledby={labelId}
              disabled={disabled}
              className="h-9 w-full justify-between font-normal"
            />
          }
        >
          <FontValueLabel value={value} endpoint={endpoint} />
          <div className="flex items-center gap-1">
            {loadingFont === currentFontFamily && (
              <Spinner className="size-3" />
            )}
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </div>
        </PopoverTrigger>

        {/* Base UI's Positioner publishes --anchor-width, matching our select/dropdown wrappers. */}
        <PopoverContent
          className="w-(--anchor-width) p-0"
          align="start"
          side="bottom"
        >
          <Command shouldFilter={false} className="h-96 w-full overflow-hidden">
            <div className="flex flex-col">
              <div className="relative">
                <CommandInput
                  className="p-0 pe-10"
                  placeholder="Search Google fonts..."
                  value={inputValue}
                  onValueChange={setInputValue}
                />

                {inputValue && (
                  <Button
                    aria-label="Clear search"
                    variant="ghost"
                    size="icon-xs"
                    className="absolute end-2 top-2"
                    onClick={() => setInputValue("")}
                  >
                    <FunnelX className="opacity-70" />
                  </Button>
                )}
              </div>

              <div className="px-2 py-1">
                <Select
                  value={selectedCategory}
                  onValueChange={(nextCategory) =>
                    setSelectedCategory(nextCategory as FilterFontCategory)
                  }
                >
                  <SelectTrigger
                    size="sm"
                    className="w-full bg-input/25 px-2 text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} side="bottom">
                    <SelectGroup>
                      <SelectItem value="all">All Fonts</SelectItem>
                      <SelectItem value="sans-serif">
                        Sans Serif Fonts
                      </SelectItem>
                      <SelectItem value="serif">Serif Fonts</SelectItem>
                      <SelectItem value="monospace">Monospace Fonts</SelectItem>
                      <SelectItem value="display">Display Fonts</SelectItem>
                      <SelectItem value="handwriting">
                        Handwriting Fonts
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <FontResults
              isLoading={fontQuery.isLoading}
              isError={fontQuery.isError}
              isEmpty={allFonts.length === 0}
              popularFonts={popularFonts}
              remainingFonts={remainingFonts}
              currentFontFamily={currentFontFamily}
              loadingFont={loadingFont}
              onSelect={handleFontSelect}
              onRetry={() => void fontQuery.refetch()}
              hasNextPage={fontQuery.hasNextPage}
              isFetchingNextPage={fontQuery.isFetchingNextPage}
              scrollRef={scrollRef}
              selectedFontRef={selectedFontRef}
              loadMoreRef={loadMoreRef}
            />
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/** The theme font variables the editor exposes; each has one picker. */
type FontControlKey = "font-sans" | "font-heading" | "font-serif" | "font-mono"

const FONT_CONTROLS: Readonly<
  Record<FontControlKey, { category: "sans" | "serif" | "mono"; label: string }>
> = {
  "font-sans": { category: "sans", label: "Sans-serif" },
  // Headings usually take a display serif; presets without one resolve it
  // to their serif (resolvePresetStyles).
  "font-heading": { category: "serif", label: "Heading" },
  "font-serif": { category: "serif", label: "Serif" },
  "font-mono": { category: "mono", label: "Monospace" },
}

const FONT_SLOTS = Object.keys(FONT_CONTROLS) as FontControlKey[]

/**
 * One theme font slot, with its label and category from FONT_CONTROLS.
 * Fonts are shared by both modes, so the change goes through
 * updateCommonStyle; the slot reads only its own value.
 */
export function FontSlotPicker({ slot }: Readonly<{ slot: FontControlKey }>) {
  const value = useEditorStore(
    (state) => state.themeState.styles[state.themeState.currentMode][slot]
  )
  const updateCommonStyle = useEditorStore((state) => state.updateCommonStyle)
  const handleChange = React.useCallback(
    (font: string) => updateCommonStyle(slot, font),
    [slot, updateCommonStyle]
  )
  const { category, label } = FONT_CONTROLS[slot]

  return (
    <FontPicker
      value={value}
      onChange={handleChange}
      category={category}
      label={label}
    />
  )
}

/**
 * The theme's font slots. Fonts are shared by both modes, so every change
 * goes through updateCommonStyle; each slot reads only its own value.
 */
export function FontControls() {
  return (
    <div className="flex flex-col gap-4">
      {FONT_SLOTS.map((slot) => (
        <FontSlotPicker key={slot} slot={slot} />
      ))}
    </div>
  )
}
