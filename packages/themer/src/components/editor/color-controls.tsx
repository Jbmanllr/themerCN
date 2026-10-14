"use client";

// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified for themercn.
//
// The colour list: search, one ControlSection per group, one memoised
// ColorPicker per token, and the Sidebar Sync toggle (from tweakcn
// components/editor/colors-tab-content.tsx).
//
// Store access is narrow: the current mode's styles object (stable until a
// style changes) and individual preferences. Every write is a functional
// setThemeState, reading the sync preference at write time, so the change
// handler is stable and pickers' debounces survive re-renders.
//
// Sidebar Sync rules (utils/sidebar-sync.ts):
// - turning it on aligns both modes in one undo entry;
// - editing a base colour writes its sidebar twin in the same update;
// - useSidebarSyncAlignment (hooks/use-sidebar-sync-alignment.ts) re-aligns
//   in place (no undo entry) whenever the theme changes some other way:
//   preset, undo/redo, CSS import, HSL.
//
// Host extra colours (ThemerConfig.extraColors) follow the built-in groups.
// An extra the theme does not set shows the host's computed value (read from
// <html> one frame after the theme changed, so the provider has already
// removed a value the theme dropped); editing it writes it into the theme.
//
// See: packages/themer/ARCHITECTURE.md (Sidebar Sync).

import * as React from "react";
import { RefreshCw, Search, X } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { Toggle } from "@workspace/ui/components/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { ColorPicker } from "./color-picker";
import { ControlSection } from "./control-section";
import { useEditorStore } from "../../stores/editor-store";
import { usePreferencesStore } from "../../stores/preferences-store";
import { useColorFocusStore } from "../../stores/color-focus-store";
import {
  COLOR_LIST_GROUPS,
  filterColorGroups,
  getColorListGroups,
  getColorSectionId,
} from "../../utils/color-groups";
import { getExtraColorKeys } from "../../config/extra-colors";
import {
  BASE_TO_SIDEBAR_MAP,
  applySidebarSync,
  isSyncedSidebarKey,
} from "../../utils/sidebar-sync";
import type { ThemeColorKey, ThemeModeStyles } from "../../types";

const NO_HOST_VALUES: Readonly<Record<string, string>> = {};

function sameValues(
  a: Readonly<Record<string, string>>,
  b: Readonly<Record<string, string>>,
): boolean {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
  );
}

/**
 * The page's computed value of each extra colour the current theme leaves
 * unset. Read in a frame after `styles` changes: the provider applies (and
 * removes) variables in a parent effect, after this component's effects.
 */
function useHostExtraColorValues(
  extraKeys: readonly string[],
  styles: ThemeModeStyles,
): Readonly<Record<string, string>> {
  const [values, setValues] = React.useState(NO_HOST_VALUES);

  React.useEffect(() => {
    const unset = extraKeys.filter((key) => !styles[key]?.trim());
    if (unset.length === 0) return undefined;
    const frame = requestAnimationFrame(() => {
      const computed = getComputedStyle(document.documentElement);
      const next: Record<string, string> = {};
      for (const key of unset) {
        next[key] = computed.getPropertyValue(`--${key}`).trim();
      }
      setValues((previous) => (sameValues(previous, next) ? previous : next));
    });
    return () => cancelAnimationFrame(frame);
  }, [extraKeys, styles]);

  return values;
}

function SidebarSyncToggle() {
  const enabled = usePreferencesStore((state) => state.sidebarColorSync);
  const setEnabled = usePreferencesStore((state) => state.setSidebarColorSync);
  const setThemeState = useEditorStore((state) => state.setThemeState);

  const handlePressedChange = React.useCallback(
    (pressed: boolean) => {
      if (pressed) {
        // One undo entry for the alignment, before the preference flips so
        // the in-place re-alignment finds nothing left to do.
        setThemeState((prev) => ({
          ...prev,
          styles: applySidebarSync(prev.styles),
        }));
      }
      setEnabled(pressed);
    },
    [setEnabled, setThemeState],
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Toggle
            size="sm"
            variant="outline"
            pressed={enabled}
            onPressedChange={handlePressedChange}
            aria-label="Sync sidebar colors"
            className="gap-1 text-[11px] tracking-wider uppercase"
          />
        }
      >
        <RefreshCw aria-hidden className="size-3" />
        {enabled ? "Sync on" : "Sync"}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-56">
        Keep sidebar colors equal to their base colors (sidebar to background,
        sidebar primary to primary...) in light and dark.
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The Colors panel body (ColorsPanel): a search box and one ControlSection
 * per colour group, built-in groups first, then the host's extra groups.
 * A search match opens its section without changing the stored layout.
 */
export function ColorControls() {
  const currentStyles = useEditorStore(
    (state) => state.themeState.styles[state.themeState.currentMode],
  );
  const setThemeState = useEditorStore((state) => state.setThemeState);
  const sidebarSync = usePreferencesStore((state) => state.sidebarColorSync);
  const search = useColorFocusStore((state) => state.colorSearch);
  const setSearch = useColorFocusStore((state) => state.setColorSearch);

  const handleColorChange = React.useCallback(
    (value: string, name: string) => {
      const key = name as ThemeColorKey;
      const twin = usePreferencesStore.getState().sidebarColorSync
        ? BASE_TO_SIDEBAR_MAP[key]
        : undefined;
      setThemeState((prev) => ({
        ...prev,
        styles: {
          ...prev.styles,
          [prev.currentMode]: {
            ...prev.styles[prev.currentMode],
            [key]: value,
            ...(twin && { [twin]: value }),
          },
        },
      }));
    },
    [setThemeState],
  );

  const isSearching = search.trim() !== "";
  // Built-in plus host groups; the identity only changes with the host's
  // registration, so the memo stays valid across edits.
  const allGroups = getColorListGroups();
  const groups = React.useMemo(
    () => filterColorGroups(search, allGroups),
    [search, allGroups],
  );
  const hostValues = useHostExtraColorValues(
    getExtraColorKeys(),
    currentStyles,
  );

  return (
    <div className="space-y-1">
      <InputGroup className="mb-3">
        <InputGroupAddon>
          <Search aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search colors..."
          aria-label="Search colors"
        />
        {search ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X aria-hidden />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>

      {groups.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-xs">
          No colors found
        </p>
      ) : null}

      {groups.map((group) => (
        <ControlSection
          key={group.title}
          id={getColorSectionId(group)}
          title={group.title}
          description={group.description}
          forceOpen={isSearching}
          headerAction={
            group.title === "Sidebar" ? <SidebarSyncToggle /> : undefined
          }
        >
          {group.colors.map(({ key, label }) => (
            <ColorPicker
              key={key}
              name={key}
              label={label}
              color={currentStyles[key] || hostValues[key] || ""}
              onChange={handleColorChange}
              disabled={sidebarSync && isSyncedSidebarKey(key)}
            />
          ))}
        </ControlSection>
      ))}
    </div>
  );
}

/**
 * Read-only swatch grid of the built-in colours of the current mode (no host
 * extra colours). No panel mounts it and the components/index.ts barrel
 * leaves it out; it is reachable by file path
 * (`@villa/themer/components/editor/color-controls`).
 */
export function ColorGrid() {
  const currentStyles = useEditorStore(
    (state) => state.themeState.styles[state.themeState.currentMode],
  );
  const allColors = COLOR_LIST_GROUPS.flatMap((group) => group.colors);

  return (
    <div className="grid grid-cols-8 gap-1">
      {allColors.map(({ key, label }) => (
        <div
          key={key}
          role="img"
          aria-label={label}
          className="size-6 rounded-sm border"
          style={{ backgroundColor: currentStyles[key] }}
        />
      ))}
    </div>
  );
}
