"use client";

// WCAG contrast checker: rates the standard token pairs (utils/
// contrast-checker.ts checkThemeContrast) for one mode. The Light/Dark
// toggle here only changes which mode is rated; it never flips the page, so
// the focus buttons (which jump to the editor's controls for the page's
// mode) are disabled while another mode is viewed. Levels: AAA >= 7,
// AA >= 4.5, AA Large >= 3 (large text only; fails normal text), Fail.
//
// See: packages/themer/ARCHITECTURE.md (Contrast Checker).

import * as React from "react";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { useEditorStore } from "../../stores/editor-store";
import {
  checkThemeContrast,
  formatContrastRatio,
  type ContrastResult,
  type WCAGLevel,
} from "../../utils/contrast-checker";
import { focusColor } from "../../hooks/use-color-focus";
import type { ThemeMode } from "../../types";

type FilterMode = "all" | "passing" | "failing";

const FILTERS: ReadonlyArray<{ value: FilterMode; label: string }> = [
  { value: "all", label: "All" },
  { value: "passing", label: "Passing" },
  { value: "failing", label: "Failing" },
];

const MODES: ReadonlyArray<{ value: ThemeMode; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** First value of a single-select ToggleGroup change, if it is allowed. */
function pickSingle<T extends string>(
  values: unknown[],
  allowed: ReadonlyArray<{ value: T }>,
): T | undefined {
  const [next] = values;
  return allowed.find((option) => option.value === next)?.value;
}

/**
 * The contrast panel: pass/fail counts, a Light/Dark switch for the mode
 * rated (it starts on the editor's current mode), an All/Passing/Failing
 * filter and one row per rated pair.
 */
export function ContrastChecker() {
  const pageMode = useEditorStore((state) => state.themeState.currentMode);
  const [viewMode, setViewMode] = React.useState<ThemeMode>(pageMode);
  const styles = useEditorStore((state) => state.themeState.styles[viewMode]);
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");

  const results = React.useMemo(() => checkThemeContrast(styles), [styles]);
  const passingCount = results.filter((result) => result.passes).length;
  const failingCount = results.length - passingCount;
  const visibleResults =
    filterMode === "all"
      ? results
      : results.filter((result) =>
          filterMode === "passing" ? result.passes : !result.passes,
        );
  const canFocus = viewMode === pageMode;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 aria-hidden className="text-primary size-4" />
            {passingCount} passing
          </span>
          <span className="flex items-center gap-1.5">
            <XCircle aria-hidden className="text-destructive size-4" />
            {failingCount} failing
          </span>
        </div>
        <ToggleGroup
          aria-label="Theme mode to check"
          variant="outline"
          size="sm"
          spacing={0}
          value={[viewMode]}
          onValueChange={(values) => {
            const next = pickSingle(values, MODES);
            if (next) setViewMode(next);
          }}
        >
          {MODES.map((mode) => (
            <ToggleGroupItem key={mode.value} value={mode.value}>
              {mode.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <ToggleGroup
        aria-label="Filter results"
        size="sm"
        spacing={1}
        value={[filterMode]}
        onValueChange={(values) => {
          const next = pickSingle(values, FILTERS);
          if (next) setFilterMode(next);
        }}
      >
        {FILTERS.map((filter) => (
          <ToggleGroupItem key={filter.value} value={filter.value}>
            {filter.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {!canFocus ? (
        <p className="text-muted-foreground text-xs">
          Viewing the {viewMode} theme. Switch the editor to {viewMode} mode to
          jump to these colors.
        </p>
      ) : null}

      <ItemGroup className="gap-2 has-data-[size=sm]:gap-2">
        {visibleResults.map((result) => (
          <ContrastResultItem
            key={`${result.fg}/${result.bg}`}
            result={result}
            canFocus={canFocus}
          />
        ))}
      </ItemGroup>
    </div>
  );
}

interface ContrastResultItemProps {
  result: ContrastResult;
  canFocus: boolean;
}

function ContrastResultItem({ result, canFocus }: ContrastResultItemProps) {
  const { level, passes, ratio, foreground, background, label, group } = result;

  return (
    <Item
      variant="outline"
      size="sm"
      className={
        passes ? "bg-muted/30" : "border-destructive/30 bg-destructive/5"
      }
    >
      <ItemMedia>
        <div
          aria-hidden
          className="flex h-8 w-12 shrink-0 items-center justify-center rounded border text-xs font-medium"
          style={{ backgroundColor: background, color: foreground }}
        >
          Aa
        </div>
      </ItemMedia>

      <ItemContent className="min-w-0 gap-0">
        <ItemTitle>
          {/* One flex item, so a long label wraps with its group inline. */}
          <span>
            {label}
            {group ? (
              <span className="text-muted-foreground ms-1.5 text-xs font-normal">
                {group}
              </span>
            ) : null}
          </span>
        </ItemTitle>
        {/* A row of two focus buttons: overflow stays visible so the line
            clamp's hidden overflow never clips their focus rings. */}
        <ItemDescription className="flex flex-wrap items-center gap-x-1 overflow-visible text-xs">
          <Button
            variant="link"
            size="xs"
            className="text-muted-foreground px-0"
            disabled={!canFocus}
            onClick={() => focusColor(result.fg)}
          >
            {result.fg}
          </Button>
          <span aria-hidden>/</span>
          <Button
            variant="link"
            size="xs"
            className="text-muted-foreground px-0"
            disabled={!canFocus}
            onClick={() => focusColor(result.bg)}
          >
            {result.bg}
          </Button>
        </ItemDescription>
      </ItemContent>

      <ItemActions className="shrink-0">
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatContrastRatio(ratio)}
        </span>
        <ContrastBadge level={level} />
      </ItemActions>
    </Item>
  );
}

interface ContrastBadgeProps {
  level: WCAGLevel;
  className?: string;
}

const BADGES: Record<
  WCAGLevel,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    Icon: typeof CheckCircle2;
  }
> = {
  AAA: { variant: "default", Icon: CheckCircle2 },
  AA: { variant: "secondary", Icon: CheckCircle2 },
  "AA Large": { variant: "outline", Icon: AlertCircle },
  Fail: { variant: "destructive", Icon: XCircle },
};

/** One WCAG level as a badge; "AA Large" carries a warning icon, not a check. */
export function ContrastBadge({ level, className }: ContrastBadgeProps) {
  const { variant, Icon } = BADGES[level];
  return (
    <Badge variant={variant} className={className}>
      <Icon aria-hidden />
      {level}
    </Badge>
  );
}
