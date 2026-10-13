# API Reference

Everything below is re-exported from the package root, `@banter/themer`, except where a section names a file path: import that path. Subpath imports exist only per file (`@banter/themer/<dir>/<file>`, see `exports` in `package.json`); `@banter/themer/utils` and `@banter/themer/hooks` do not resolve. The root barrel exports `useThemer` from `hooks/use-themer.ts` but not `useToggleMode`, which sits in the same file.

## Components

### ThemerProvider

Root provider that initializes stores, keyboard shortcuts, and applies theme to DOM.

```tsx
import { ThemerProvider } from "@banter/themer";

<ThemerProvider config={config}>{children}</ThemerProvider>;
```

| Prop        | Type           | Default  | Description                                         |
| ----------- | -------------- | -------- | --------------------------------------------------- |
| `children`  | `ReactNode`    | required | App content                                         |
| `config`    | `ThemerConfig` | `{}`     | Configuration options, merged over the defaults     |
| `showTabAI` | `boolean`      | `false`  | Show the Generate (AI) panel; `config` can override |

#### ThemerConfig

| Property              | Type                                           | Default                      | Description                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | ---------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shortcut`            | `string`                                       | `'ctrl+shift+e'`             | Toggle keyboard shortcut (`ctrl` also matches Cmd on macOS)                                                                                                                                                                                                                                                                                                                                                   |
| `zIndex`              | `number`                                       | -                            | Overlay and trigger z-index (one value for both); unset = `Z_INDEX.sidebar` (10000) for the overlay, `Z_INDEX.trigger` (9990) for the trigger. `Z_INDEX.overlay` is not read                                                                                                                                                                                                                                  |
| `showTrigger`         | `boolean`                                      | `true`                       | Show floating trigger button                                                                                                                                                                                                                                                                                                                                                                                  |
| `enableAI`            | `boolean`                                      | `false`                      | Declared; read by nothing                                                                                                                                                                                                                                                                                                                                                                                     |
| `showTabAI`           | `boolean`                                      | `false`                      | Show the Generate (AI) panel                                                                                                                                                                                                                                                                                                                                                                                  |
| `aiProvider`          | `AIProviderConfig`                             | -                            | Declared for the mock AI panel                                                                                                                                                                                                                                                                                                                                                                                |
| `storage`             | `'auto' \| 'indexeddb' \| 'file' \| 'payload'` | `'auto'`                     | Storage backend (Banter: `'indexeddb'`)                                                                                                                                                                                                                                                                                                                                                                       |
| `payloadEndpoint`     | `string`                                       | -                            | Payload CMS API endpoint                                                                                                                                                                                                                                                                                                                                                                                      |
| `themesDirectory`     | `string`                                       | -                            | Directory for file storage                                                                                                                                                                                                                                                                                                                                                                                    |
| `fontCatalogEndpoint` | `string`                                       | `'/dev/themer/google-fonts'` | Font picker catalog endpoint                                                                                                                                                                                                                                                                                                                                                                                  |
| `presets`             | `readonly ThemePreset[]`                       | -                            | Host presets, registered after the built-in ones; a host id replaces a built-in id. The picker lists `default` first, then all presets alphabetically by label. Module-level constant (a new identity re-registers)                                                                                                                                                                                           |
| `defaultPreset`       | `string`                                       | `'default'`                  | Preset a fresh store starts on (no undo entry) and the target of "reset" when the stored preset id no longer exists. Unknown id = `'default'`                                                                                                                                                                                                                                                                 |
| `extraColors`         | `readonly ThemerExtraColorGroup[]`             | -                            | Host colour tokens beyond the 32 shadcn colours (`{ title, description?, colors: [{ key, label }] }`, keys without `--`, kebab-case; built-in keys, keys starting `shadow-` and repeats are dropped, `normalizeExtraColorGroups`), listed after the built-in groups and edited, applied, HSL-adjusted, imported and exported like them. An unset extra shows the host's computed value. Module-level constant |
| `previewTabs`         | `readonly ThemerPreviewTab[]`                  | -                            | Host preview tabs merged with the built-in ones. Module-level constant; use `React.lazy` components                                                                                                                                                                                                                                                                                                           |
| `previewWrapper`      | `ComponentType<{ children: ReactNode }>`       | -                            | Wraps every host preview tab (not the built-in ones) with the host's providers. Stable module-level component                                                                                                                                                                                                                                                                                                 |

```typescript
interface ThemePreset {
  id: string;
  label: string;
  description?: string;
  source?: string;
  createdAt?: string; // ISO date; within the "New" window shows the badge
  styles: { light?: Partial<ThemeStyleProps>; dark?: Partial<ThemeStyleProps> };
}

interface ThemerPreviewTab {
  id: string; // persisted as the selected tab; a built-in id replaces that tab
  label: string;
  component: ComponentType; // reads the live theme from <html> CSS variables
  scroll?: "y" | "xy" | "none"; // default "y"
  order?: number; // built-ins use 0, 10, 20...; default = after them
}
```

Preset resolution is one rule, `resolvePresetStyles(id)` (`@banter/themer`
config): defaults, then the preset's light values, then for dark the preset's
light and dark values on top. A preset with no `font-heading` takes its own
`font-serif` for headings. Read colours through it, never `preset.styles`.
`migratePresetId` maps persisted legacy ids of this package's own presets
(`violet-bloom`, `ocean-breeze`, `mocha-mousse`, `nature`, `cyberpunk`,
`sunset-horizon`, `graphite` -> `themer-<id>`). It maps no host preset ids.

---

### ThemerRoot

Renders the trigger and the overlay around the host page. It renders `children` as they are, with **no wrapper element**: a transformed ancestor becomes the containing block of every `position: fixed` descendant, which broke host headers and dialogs, and adding a wrapper after hydration remounted the host app. Never add one. `ThemerOverlayOnly` (same file, `@banter/themer/components/themer-root`, not in the root barrel) is `ThemerRoot` around nothing.

```tsx
import { ThemerRoot } from "@banter/themer";

<ThemerProvider>
  <ThemerRoot>{children}</ThemerRoot>
</ThemerProvider>;
```

| Prop       | Type        | Description |
| ---------- | ----------- | ----------- |
| `children` | `ReactNode` | App content |

---

### ThemerOverlay

Main editor UI. Automatically rendered by ThemerRoot.

```tsx
import { ThemerOverlay } from "@banter/themer";

// Usually rendered via portal by ThemerRoot
<ThemerOverlay />;
```

---

### ThemerTrigger

Floating 48px button that opens the editor, in the bottom-end corner (16px
from both edges; hidden below `sm`). Shows the shortcut on hover. Sized with
`size-12`: `h-12 w-12` left the Button's `size-8` in place, which won in a host
whose stylesheet lacks `w-12`.

```tsx
import { ThemerTrigger } from "@banter/themer";

<ThemerTrigger />;
```

---

### ThemeScript

Inline script for `<head>` that restores a saved edit before the page paints.
It reads `STORAGE_KEYS.editor` and `STORAGE_KEYS.preferences`
(`themer-editor-state`, `themer-preferences`) and does nothing when no theme is
saved or the theme override is off, so the host's CSS shows unedited. It picks
the light or dark set from the saved `currentMode`, never touches the `dark`
class (the host's `next-themes` owns it), and requests no Google font for a
`var(--…)` host font or an OS family (`LOCAL_FONT_FAMILY_NAMES`). It writes
every saved variable, but preloads Google fonts for the sans, serif and mono
slots only, not the heading slot (`DynamicFontLoader` loads that after
hydration), and it does not write the shadow override sheet or the tracking
variables. Banter's hosts run the same body from
[`ThemerHeadScript`](#themerheadscript) instead, a raw `<script>` that runs
while the HTML is parsed.

```tsx
// In app/layout.tsx (Next.js)
import { ThemeScript } from "@banter/themer";

<head>
  <ThemeScript />
</head>;
```

The script's text is `generateThemeScript()` in
`@banter/themer/utils/theme-script` (the root barrel does not export it).

---

### DynamicFontLoader

Holds the Google families named by the theme's `font-sans`, `font-heading`, `font-serif` and
`font-mono` (both modes) in the host document while the theme override is on, and releases them
when the theme stops naming them. It is separate from the font catalog search API: catalog lookup
happens through `useFontSearch`, while `DynamicFontLoader` only makes selected non-system families
available in the browser. Families behind a `var(...)` (a `next/font` variable) are never requested
from Google.

```tsx
import { DynamicFontLoader } from "@banter/themer";

// ThemerProvider renders it; mount it yourself only without the provider
<DynamicFontLoader />;
```

---

### ThemerDevShell

The editor as a Banter host mounts it in local development, beside the host
page: `ThemerProvider` (`storage: 'indexeddb'`, `showTrigger: true`) and
`ThemerOverlayOnly`, inside its own TanStack `QueryClient` so the font cache
never mixes with the host's product cache. It takes no children: the page
renders beside it ([createDevThemerGate](#createdevthemergate)), so the page
keeps the host's own providers and is never remounted when the editor
arrives.

```tsx
import { ThemerDevShell } from "@banter/themer/components/themer-dev-shell";

<ThemerDevShell fontCatalogEndpoint="/dev/themer/google-fonts" />;
```

| Prop                  | Type                                     | Description                                          |
| --------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `fontCatalogEndpoint` | `string`                                 | The host's gated font route (required)               |
| `defaultPreset`       | `string`                                 | `ThemerConfig.defaultPreset`                         |
| `presets`             | `readonly ThemePreset[]`                 | `ThemerConfig.presets`; module-level constant        |
| `extraColors`         | `readonly ThemerExtraColorGroup[]`       | `ThemerConfig.extraColors`; module-level constant    |
| `previewTabs`         | `readonly ThemerPreviewTab[]`            | `ThemerConfig.previewTabs`; module-level constant    |
| `previewWrapper`      | `ComponentType<{ children: ReactNode }>` | `ThemerConfig.previewWrapper`; module-level constant |
| `children`            | `ReactNode`                              | The host page the editor restyles and wraps          |

Does not compile the editor's Tailwind utilities: the host's shell imports
its `themer.css`, which `@reference`s the host's `globals.css` and imports
[`@banter/themer/host/themer.css`](#host-wiring) (see
[README](../README.md#host-integration-contract)).

---

## Hooks

### useThemer

Primary API hook for theme state and actions.

```tsx
import { useThemer } from "@banter/themer";

const {
  themeState,
  currentStyles,
  currentMode,
  setStyleProperty,
  applyPreset,
  undo,
  redo,
  exportCSS,
} = useThemer();
```

#### Return Value

| Property               | Type                  | Description                                   |
| ---------------------- | --------------------- | --------------------------------------------- |
| `themeState`           | `ThemeEditorState`    | Complete theme state                          |
| `currentStyles`        | `ThemeStyleProps`     | Styles for current mode                       |
| `currentMode`          | `'light' \| 'dark'`   | Active color mode (synced with `next-themes`) |
| `preset`               | `string \| undefined` | Current preset name                           |
| `isOpen`               | `boolean`             | Editor visibility                             |
| `activePanel`          | `string`              | Active sidebar panel                          |
| `inspectorMode`        | `boolean`             | Inspector on                                  |
| `fullscreenPreview`    | `boolean`             | Preview fullscreen                            |
| `colorFormat`          | `ColorFormat`         | Display format preference                     |
| `tailwindVersion`      | `'3' \| '4'`          | Export target version                         |
| `showContrastWarnings` | `boolean`             | Contrast warnings shown                       |
| `themeOverrideEnabled` | `boolean`             | Live tab injects the edited theme             |
| `canUndo` / `canRedo`  | `boolean`             | History available                             |
| `hasUnsavedChanges`    | `boolean`             | State differs from its preset's defaults      |

#### Actions

| Method                                                                                       | Signature                       | Description                                                                                             |
| -------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `setStyleProperty`                                                                           | `(key, value, mode?) => void`   | Set single property                                                                                     |
| `setStyleProperties`                                                                         | `(props, mode?) => void`        | Set multiple properties                                                                                 |
| `updateCommonStyle`                                                                          | `(key, value) => void`          | Write a mode-shared style (fonts, radius, spacing, letter spacing, shadow parameters) to light and dark |
| `applyPreset`                                                                                | `(preset) => void`              | Apply named preset                                                                                      |
| `toggleMode`                                                                                 | `(origin?) => void`             | Switch light/dark with the circular reveal (see `useToggleMode`)                                        |
| `reset`                                                                                      | `() => void`                    | Reset to the current preset (history cleared)                                                           |
| `undo`                                                                                       | `() => void`                    | Undo last change                                                                                        |
| `redo`                                                                                       | `() => void`                    | Redo undone change                                                                                      |
| `open`                                                                                       | `() => void`                    | Open editor                                                                                             |
| `close`                                                                                      | `() => void`                    | Close editor                                                                                            |
| `toggle`                                                                                     | `() => void`                    | Toggle editor                                                                                           |
| `setActivePanel`, `toggleInspector`, `toggleFullscreen`                                      | overlay setters                 | Overlay state                                                                                           |
| `setColorFormat`, `setTailwindVersion`, `setShowContrastWarnings`, `setThemeOverrideEnabled` | preference setters              | Preferences                                                                                             |
| `exportCSS`                                                                                  | `(format?, version?) => string` | Generate CSS, host extra colours the theme sets included (see [Theme Export](#theme-export))            |
| `exportTailwindConfig`                                                                       | `(format?) => string`           | Generate a Tailwind 3 config (always v3)                                                                |
| `exportLayout`                                                                               | `() => string`                  | Next.js layout code for the selected font variables                                                     |

---

### useToggleMode

```tsx
// not in the root barrel: import it by path
import { useToggleMode } from "@banter/themer/hooks/use-themer";

const toggleMode = useToggleMode();
<button onClick={toggleMode}>Toggle</button>; // the click event is the origin
```

Returns `(origin?: { x, y } | { clientX, clientY }) => void`. Sets `next-themes` and the editor's
`currentMode` inside a View Transition: the new mode grows as a circle from the click point (the
viewport centre without an origin; a keyboard click at `0,0` counts as none). No View Transitions
API or `prefers-reduced-motion` = the change applies directly. The CSS lives in `host/themer.css`
and matches only while `html[data-themer-vt]` is set. Call from event handlers only (it uses
`flushSync`).

---

### useKeyboardShortcut

Register a keyboard shortcut.

```tsx
import { useKeyboardShortcut } from "@banter/themer";

useKeyboardShortcut({
  key: "t",
  modifiers: ["ctrl", "shift"],
  callback: () => console.log("triggered"),
  enabled: true,
  preventDefault: true,
});
```

| Option           | Type            | Default  | Description                            |
| ---------------- | --------------- | -------- | -------------------------------------- |
| `key`            | `string`        | required | Key to listen for                      |
| `modifiers`      | `KeyModifier[]` | `[]`     | `'ctrl' \| 'alt' \| 'shift' \| 'meta'` |
| `callback`       | `() => void`    | required | Handler function                       |
| `enabled`        | `boolean`       | `true`   | Enable/disable shortcut                |
| `preventDefault` | `boolean`       | `true`   | Prevent default behavior               |

The match ignores events from inputs, textareas and contenteditable elements, and rejects extra
modifiers (`ctrl+shift+z` is not `ctrl+z`). The listener is keyed on `shortcutSignature(key,
modifiers)`, so fresh arrays and inline callbacks do not re-add it. Also exported: `parseShortcut`,
`formatShortcut`, `themerShortcuts`. `themerShortcuts` lists `toggle`, `undo`, `redo`, `inspector`
(all registered) and `save`, `export` (no handler).

---

### useKeyboardShortcuts

Register multiple shortcuts.

```tsx
import { useKeyboardShortcuts } from "@banter/themer";

useKeyboardShortcuts([
  { key: "z", modifiers: ["ctrl"], callback: undo },
  { key: "z", modifiers: ["ctrl", "shift"], callback: redo },
]);
```

---

### useColorFocus

Register a colour control (one per token name) so `focusColor(name)` can open the Colors panel,
clear a search that hides it, scroll to it and highlight it for `HIGHLIGHT_ANIMATION_MS`. The
element registry is module-level, not store state.

```tsx
import { useColorFocus } from "@banter/themer";

const { ref, isHighlighted } = useColorFocus("primary");

<div ref={ref} className={isHighlighted ? "ring-2" : ""}>
  Primary Color
</div>;
```

| Return          | Type                        | Description           |
| --------------- | --------------------------- | --------------------- |
| `ref`           | `RefObject<HTMLDivElement>` | Attach to element     |
| `isHighlighted` | `boolean`                   | Currently highlighted |

---

### useColorFocusTrigger

Trigger color focus from another component.

```tsx
import { useColorFocusTrigger } from "@banter/themer";

const { focusColor } = useColorFocusTrigger();

<button onClick={() => focusColor("primary")}>Focus Primary</button>;
```

`focusColor` is also exported as a plain function (`hooks/use-color-focus`). The colour list search
query lives in `useColorFocusStore` (`colorSearch`, `setColorSearch`) and is cleared when the editor
closes.

---

### useFontLoader

Hold a Google Font while the component is mounted, and say whether it arrived.

```tsx
import { useFontLoader } from "@banter/themer";

const { isLoaded, isLoading, error } = useFontLoader("Inter", {
  weights: [400, 500, 600, 700],
  autoLoad: true,
});
```

| Return       | Type             | Description                                                                                |
| ------------ | ---------------- | ------------------------------------------------------------------------------------------ |
| `isLoaded`   | `boolean`        | The family arrived; also `true` when `fontFamily` names no Google family (nothing to load) |
| `isLoading`  | `boolean`        | A load for the current family is in flight                                                 |
| `error`      | `string \| null` | `"Font load timeout"` once the family missed the 10 s limit, else `null`                   |
| `loadFont`   | `() => void`     | The first request when `autoLoad` is `false`, or the retry after a timeout                 |
| `fontFamily` | `string \| null` | The resolved Google family; `null` for a host `var(--…)`, an OS or a generic family        |

The family is held (`acquireGoogleFont`) while the hook is mounted with it and released on unmount
or when the family changes, so its stylesheet link goes with the last holder. There is no polling,
and a failed load is reported once and never retried on its own. A result for another family never
shows as this one's.

`useFontsLoader(families, options)` holds several the same way and returns
`{ isLoaded, isLoading, loadedFonts, loadFonts }` (`isLoaded` when every family arrived).

The editor itself uses the reference-counted registry in `utils/font-loader` (below), not these
hooks.

---

### useFontSearch

Paginated font catalog search for the font picker.

```tsx
import { useFontSearch } from "@banter/themer";

const fontQuery = useFontSearch({
  endpoint: "/dev/themer/google-fonts",
  query: searchQuery,
  category: "sans-serif",
  limit: 15,
  enabled: open,
});
```

The hook uses TanStack Query `useInfiniteQuery`. The query key includes the endpoint, search text,
category, and page size. The next page offset is derived from `lastPage.offset + lastPage.limit`
when `lastPage.hasMore` is true.

The endpoint is host-owned so secrets and environment policy stay outside the reusable package. In
Banter, each host serves `/dev/themer/google-fonts` with
[`fontCatalogRoute`](#fontcatalogroute): `404` unless its theme editor is on, then
[`fontCatalogResponse`](#fontcatalogresponse) with the server-only `GOOGLE_FONTS_API_KEY`.

Expected response:

```typescript
type PaginatedFontsResponse = {
  fonts: FontInfo[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};
```

Consumers that render the Themer font picker must provide a TanStack `QueryClientProvider` above
`ThemerProvider`. [`ThemerDevShell`](#themerdevshell) does this.

The included `FontPicker` uses this hook only while its popover is open. It renders a
`Popover + Command` combobox with `Command shouldFilter={false}`. The host endpoint, not cmdk's
local filter, owns search and pagination. The content width follows the trigger via Base UI's
`--anchor-width` positioning variable, opens on the bottom side, and contains wheel scrolling inside
the command list so the live application behind the Themer does not scroll when the font list
reaches its boundaries.

---

### useIsMobile

Detect mobile viewport.

```tsx
import { useIsMobile } from "@banter/themer";

const isMobile = useIsMobile(); // true below breakpoints.wide (1280px)
const isNarrow = useIsMobile(768); // custom breakpoint in px
```

Reads the media query with `useSyncExternalStore`, so the first render is
already right; the server snapshot is `false`. The default is `breakpoints.wide`
(1280px, from `@banter/ui-tokens/web`). The editor's desktop overlay renders the
stock `@banter/ui` Sidebar, which turns into a Sheet below shadcn's own 768px:
never pass a breakpoint under 768, or the overlay would draw around a Sidebar
that is in Sheet mode. This is not the apps' hook
(`@banter/brand-ui/hooks/use-mobile`).

Also exported from the root, without a section of their own: `useViewportSize()` (`{ width, height }`
of the window), `useContentShift()` (a constant `{ shouldShift: false, shiftAmount: "0px" }`: the
host page is never shifted, since the Live tab sits in the overlay) and the single-slice store hooks
of `hooks/use-editor-selectors.ts` (`useCanUndo`, `useCurrentStyles`, `useStyleProperty(key)` and
the rest), which re-render a component only when their slice changes.

---

## Building blocks

Pieces the editor shares between screens. Only `SectionContext`, `useSectionContext` and `debounce` are
in the root barrel; import the others by path, which the package's `exports` map allows for
`components/*`, `hooks/*` and `utils/*` (for example `@banter/themer/hooks/use-copy-feedback`).

| Module                                                                                      | Contract                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/action-button.tsx`: `ActionButton`                                           | A ghost icon `Button` named by `label` (its `aria-label`), inside a `Tooltip` that repeats the name and, given `shortcut` (`"ctrl+z"`), shows it as `Kbd`. Other props spread after its `variant="ghost" size="icon"` defaults, so `size`, `disabled` and `data-testid` pass through. Every plain icon action in the action bar and the preview toolbars; menu triggers and toggles keep their own control. |
| `components/ui/mode-toggle.tsx`: `ModeToggle`                                               | The light/dark switch, built on `ActionButton` and named by the mode it switches to; the reveal starts at the click point (`useToggleMode`). The action bar draws it, and the preview toolbar does in fullscreen, where the action bar is covered.                                                                                                                                                          |
| `components/editor/section-context.ts`: `SectionContext`, `useSectionContext`               | The open state of the enclosing `ControlSection`. A file of its own so `control-section.tsx` exports only components (Fast Refresh keeps state).                                                                                                                                                                                                                                                            |
| `components/ai/image-attachments.tsx`: `ImageAttachments({ images, altPrefix, onRemove? })` | The AI chat's thumbnail strip of data URLs on stock `Attachment` parts; `onRemove` adds a "Remove image N" action per image; renders nothing for an empty list.                                                                                                                                                                                                                                             |
| `hooks/use-copy-feedback.ts`: `useCopyFeedback(duration = 2000)`                            | `[copied, copy]`. `copy(text)` resolves `false` and leaves `copied` as it was when the Clipboard API is missing or refuses; a new copy restarts the timer; the timer is cleared on unmount.                                                                                                                                                                                                                 |
| `hooks/use-sidebar-sync-alignment.ts`: `useSidebarSyncAlignment()`                          | Keeps the sidebar colours on their base twins while Sidebar Sync is on, in place and with no undo entry. `ThemerProvider` mounts it once for its whole lifetime; do not mount a second copy. Not in `hooks/index.ts`.                                                                                                                                                                                       |
| `utils/theme-script.ts`: `generateThemeScript()`                                            | The text of `ThemeScript`'s inline script ([ThemeScript](#themescript)). Not in the root barrel.                                                                                                                                                                                                                                                                                                            |
| `utils/debounce.ts`: `debounce(fn, wait)`                                                   | Returns `fn` with `cancel()` (drops the waiting call) and `flush()` (runs it now; nothing after `cancel()`). The colour picker flushes on unmount, so a last edit made inside the delay is saved, not lost.                                                                                                                                                                                                 |

---

## Utilities

### Color Conversion

```tsx
import {
  colorFormatter,
  convertToHSL,
  convertToHex,
  convertToOklch,
  parseColor,
  isValidColor,
  adjustColorByHsl,
  interpolateColors,
  generateColorScale,
} from "@banter/themer";

// Format for CSS output
colorFormatter("#ff0000", "hsl", "4"); // 'hsl(0 100% 50%)'
colorFormatter("rgb(255 0 0 / 0.5)", "hex"); // '#ff000080' (alpha kept in every format)

// Parse to OKLch components
parseColor("#3498db"); // { l: 0.51, c: 0.18, h: 252 }

// Adjust color
adjustColorByHsl("#333", 30, 1.2, 1); // Shift hue +30°, increase saturation 20%

// Interpolate
interpolateColors("#ff0000", "#0000ff", 0.5); // Purple-ish

// Generate scale
generateColorScale("#3498db", 11); // { 50: '...', 100: '...', ..., 950: '...' }
```

---

### Theme Application

```tsx
import {
  applyThemeToElement,
  removeThemeFromElement,
  applyThemeToDocument,
  removeThemeFromDocument,
  applyThemeToIframe,
  computeThemeProperties,
  createThemeStyleElement,
  THEMER_OVERRIDES_ATTRIBUTE,
} from "@banter/themer";

// Pure: property -> value for one mode (no DOM)
computeThemeProperties(themeState, "dark");

// Apply to <html>; returns the property names written
applyThemeToElement(themeState, document.documentElement, {
  updateClass: false, // leave the dark class to next-themes
});

// Whole document (variables + override <style> + optional Google fonts)
applyThemeToDocument(iframe.contentDocument!, themeState, { loadFonts: true });
applyThemeToIframe(themeState, iframeElement); // same, no-op when cross-origin
removeThemeFromDocument(doc);
removeThemeFromElement(document.documentElement);
```

What is written (values are applied **verbatim**, not converted to hsl):

- `--<key>` for every colour and the common keys (`font-sans`, `font-heading`, `font-serif`,
  `font-mono`, `radius`, `spacing`, `letter-spacing`), as stored.
- `letter-spacing` on `<html>` and `--tracking-tighter|tight|normal|wide|wider|widest`
  derived from it (`calc(var(--letter-spacing) +/- offset)`, tweakcn's scale).
- `--shadow-2xs|xs|sm|shadow|md|lg|xl|2xl` from `getShadowMap` (only when the shadow inputs
  differ from the library defaults), plus one
  `<style data-themer-overrides>` per document that points each `.shadow-*` utility's
  `--tw-shadow` at its variable (`!important`), because Tailwind compiles those utilities with
  literal values. The sheet also covers `hover:`, `focus:`, `focus-visible:` and `active:` sizes, and
  copies every other variant shadow rule the page's stylesheets hold (`hover:shadow-md` inside an
  `@media`, `data-active:shadow-sm`; `collectVariantShadowRules`), keeping any `@media`, `@supports`
  or `@container` wrapper. The sheet is rewritten when the page's stylesheet count changes (a CSS
  chunk loaded late); a cross-origin stylesheet cannot be read and is skipped.

Every property written is recorded per element: a re-apply removes keys the new theme no longer
has, and `removeThemeFromElement` removes exactly what was set (plus the override sheet).
`createThemeStyleElement` returns a `<style>` with the same properties for documents the editor
cannot style inline.

---

### Font Utilities

```tsx
import {
  buildFontFamily,
  extractFontFamily,
  getDefaultWeights,
  loadGoogleFont,
  waitForFont,
} from "@banter/themer";

const stack = buildFontFamily("Poppins", "sans-serif");
// Poppins, ui-sans-serif, sans-serif, system-ui

const family = extractFontFamily(stack);
// Poppins
```

`font-sans`, `font-heading`, `font-serif`, and `font-mono` store full CSS `font-family` stacks;
`buildFontFamily` quotes names that are not CSS identifiers (`"Source Serif 4"`) and leaves
generic keywords and `var(...)` references alone. A value starting with a system family or a
`var(...)` (a host `next/font` variable) names no Google family, so nothing is requested.

Link loading is a per-document, reference-counted registry in `@banter/themer/utils/font-loader`
(`acquireGoogleFont(family, { weights?, doc? })` and `acquireFontPreview(family, { text?, doc? })`
return a release function; the link, marked `data-themer-font`, is removed when its last holder
releases it). `setThemeFonts(doc, families)` makes the theme's families the document's held set
(newly named acquired, dropped ones released); `clearThemeFonts(doc)` releases all.
`getThemeFontFamilies(light, dark)` lists them. Google answers 400 for a static family without a
requested weight, so a failed link retries once with the family's default weight.
`loadGoogleFont`/`unloadGoogleFont` remain as non-counted wrappers. Production applications keep
final font loading in the app layer through `next/font` or local font assets.

`waitForFont(family, weight = "400", timeout = 3000, doc?)` resolves `true` once the family's own
stylesheet has loaded (including the weight retry above) and the browser has the face, and `false` on
a timeout or error; both waits share the one `timeout`. It does not start a load: hold the family first.

---

### Contrast Checking

```tsx
import {
  getContrastRatio,
  checkWCAGCompliance,
  checkThemeContrast,
  suggestContrastFix,
} from "@banter/themer";

// Get ratio
getContrastRatio("#fff", "#000"); // 21

// Check compliance
checkWCAGCompliance("#fff", "#000", false);
// { ratio: 21, level: 'AAA', passes: true }

// Rate every standard pair for one mode's styles (text, primary/secondary/
// muted/accent/destructive/card/popover, and the three sidebar pairs in group "Sidebar")
const results = checkThemeContrast(themeStyles);

// Suggest fix
suggestContrastFix("#999", "#f0f0f0", 4.5); // Darker color meeting 4.5:1
```

Levels: AAA >= 7, AA >= 4.5, AA Large >= 3 (large text only; fails normal text), otherwise Fail; large text
passes AA at 3 and AAA at 4.5 (`WCAG_CONTRAST`). `standardColorPairs` is the pair list.

---

### CSS Import, Sidebar Sync, Shadows, Colour Groups

```tsx
import {
  parseThemeCss,
  applySidebarSync,
  SIDEBAR_SYNC_MAP,
  getShadowMap,
  COLOR_LIST_GROUPS,
  filterColorGroups,
  runThemeTransition,
} from "@banter/themer";

const { light, dark, ignored, warnings } = parseThemeCss(cssText);
```

- `parseThemeCss(css, { extraColorKeys? })`: pure scanner (no DOM). Skips comments and strings, balances braces, walks
  at-rules (`@layer`, `@media`, `@theme`), reads only exact root selectors (`:root`, `.dark`; `.theme-inverse` and
  others are skipped with a warning) and maps `--x` variables to editor keys, plus the host extra-colour keys it is
  given (`getExtraColorKeys()`; the import dialog passes them); `ignored` lists custom properties
  the editor has no control for, `warnings` unreadable values. Apply the result through the store's `importThemeStyles`
  (one undo entry, new checkpoint, HSL reset; `{ replace: true }` starts from the default preset).
- `applySidebarSync(styles)`: makes each sidebar colour equal its base twin in both modes
  (`SIDEBAR_SYNC_MAP`: `sidebar` -> `background`, `sidebar-foreground` -> `foreground`,
  `sidebar-primary(-foreground)` -> `primary(-foreground)`, `sidebar-accent(-foreground)` -> `accent(-foreground)`,
  `sidebar-border` -> `border`, `sidebar-ring` -> `ring`).
- `getShadowMap(themeState, mode?)`: the 8-step shadow scale from the shadow parameters (tweakcn's
  algorithm; missing parameters fall back to the defaults).
- `COLOR_LIST_GROUPS` / `filterColorGroups(query)`: the labelled colour list and its search.
- `adjustThemeStyles(base, adjustments, extraColorKeys?)`: applies the HSL adjustments to both modes; host extra
  colours are adjusted only when their keys are passed.

---

### Theme Export

```tsx
import {
  generateThemeCode,
  generateTailwindConfigCode,
  getExtraColorKeys,
} from "@banter/themer";

// CSS output (the v3 target maps oklch to hsl)
const css = generateThemeCode(themeState, "hsl", "4");

// Tailwind config
const config = generateTailwindConfigCode(themeState, "hsl");

// Both take a fourth argument, the host extra-colour keys to include; the
// editor's Code dialog passes getExtraColorKeys()
const withExtras = generateThemeCode(
  themeState,
  "hsl",
  "4",
  getExtraColorKeys(),
);
```

Host extra colours (`ThemerConfig.extraColors`) reach an export through that fourth argument. The
editor's Code dialog and `useThemer().exportCSS` / `exportTailwindConfig` pass `getExtraColorKeys()`, so
their output holds the 32 built-in colours, the extras the theme sets, and the font, radius, spacing,
letter-spacing and shadow values. A translucent colour keeps its alpha in every format (`#rrggbbaa`
for hex).

The radius lines (`--radius-xs` to `--radius-4xl`, and the v3 config's `borderRadius`) are
multiples of `--radius`, the scale `@banter/ui-tokens/web.css` uses, so an export rounds like the
editor's preview at any radius (`--radius-pill` is not emitted). `generateLayoutCode` imports a
`next/font/google` family only for a slot that names a Google family: an OS family such as Georgia or
Menlo, or a `var(...)` host font, gets no import and keeps its CSS stack.

---

## Stores

Exported from the root (`useEditorStore`, `usePreferencesStore`, `useOverlayStore`,
`useColorFocusStore`, `useAIStore`). Prefer `useThemer()` for consumers and narrow selectors
(`selectors/editor-selectors.ts`) in components.

- `useEditorStore` (persisted `themer-editor-state`, version `EDITOR_STATE_VERSION` = 2;
  persists `themeState`, `themeCheckpoint` and `presetBaseline`, never history). Actions: `setThemeState` (functional
  updater; 500 ms batching, 30 entries, mode-only changes not recorded), `applyThemePreset`,
  `resetToCurrentPreset`, `saveThemeCheckpoint`, `restoreThemeCheckpoint`, `undo`, `redo`,
  `canUndo`, `canRedo`, `setCurrentMode`, `updateCommonStyle(key, value)`,
  `importThemeStyles(styles, { replace? })`, `adoptDefaultPreset(id)` (no-op unless the store is
  fresh), `refreshUntouchedPreset()` (a theme still equal to its `presetBaseline` follows its preset's
  current source, no undo entry; `ThemerProvider` calls it once the host presets are registered).
- `usePreferencesStore` (persisted `themer-preferences`, version `PREFERENCES_VERSION` = 2):
  `colorFormat`, `tailwindVersion`, `packageManager`, `showContrastWarnings`, `previewTab`,
  `sidebarCollapsed`, `themeOverrideEnabled`, `sidebarColorSync`, `colorSelectorTab`,
  `sectionStates`.
- `useOverlayStore` (transient): `isOpen`, `activePanel`, `inspectorMode`, `fullscreenPreview`;
  closing turns inspector and fullscreen off.
- `useColorFocusStore` (transient): `highlightTarget`, `colorSearch`.

---

## Host wiring

What a host app needs to run the editor in local development, shared under
`@banter/themer/host/*` ([src/host/](../src/host/)). None of it imports Next.js;
only the build alias and the route file's location are the host framework's.
Each host's bindings are listed in the
[README](../README.md#host-integration-contract).

### isThemerOn

```ts
import { isThemerOn } from "@banter/themer/host/flag";

isThemerOn("BANTER_CMS_THEMER"); // reads process.env
isThemerOn("BANTER_CMS_THEMER", env); // explicit env
```

`true` only when `NODE_ENV === "development"` and `env[flag] === "1"`. Pure;
safe to call from `next.config.ts`.

### DevThemerGate (passthrough)

```ts
// next.config.ts
turbopack: {
  resolveAlias: {
    "@/components/dev-tools/themer/dev-themer-gate": isThemerEnabled()
      ? "./src/components/dev-tools/themer/dev-themer-gate.tsx"
      : "@banter/themer/host/passthrough",
  },
},
```

`@banter/themer/host/passthrough` exports a `DevThemerGate` that renders its
children and imports only React, so a build with the editor off never
compiles the editor.

### createDevThemerGate

```tsx
"use client";
import { createDevThemerGate } from "@banter/themer/host/gate";

export const DevThemerGate = createDevThemerGate(
  () => import("./dev-themer-shell"), // module exporting DevThemerShell
);
```

Returns the mount component. After hydration, in development and outside an
iframe (the editor's Live tab frames the page), it loads the shell once and
renders it after its children, as a sibling. The children keep their place,
so React keeps the page, its state and its elements when the editor arrives;
wrapping them in the shell remounted the whole page about a second after load
and dropped what the visitor had done in it. Never `lazy()` + `<Suspense>`:
server rendering streamed the page twice and left the visible copy inert.

### ThemerHeadScript

```tsx
// The host's mount module, which next.config.ts aliases to the passthrough
// (whose DevThemerHeadScript renders nothing) unless the editor is on.
export { ThemerHeadScript as DevThemerHeadScript } from "@banter/themer/host/head-script";

// The root layout:
<head>
  <DevThemerHeadScript />
</head>;
```

The body of [`generateThemeScript`](#themescript) as a raw inline `<script>`:
it runs while the HTML is parsed, so a saved edit is painted before React runs
instead of when the editor's chunk loads. A client component that renders
nothing outside development; once hydrated it renders as a data block
(`type="application/json"`), so a client render of the document (a not-found
page under `next dev`) neither warns nor runs it again.

### fontCatalogRoute

```ts
import { fontCatalogRoute } from "@banter/themer/host/font-catalog-route";

export const dynamic = "force-dynamic";
export const GET = fontCatalogRoute(() => isThemerEnabled());
```

`(isEnabled: () => boolean) => (request: Request) => Promise<Response>`. While
`isEnabled()` is false it answers `404 {"message":"Not found."}` without
loading the font helpers; otherwise
[`fontCatalogResponse`](#fontcatalogresponse) with the request URL and
`process.env.GOOGLE_FONTS_API_KEY`.

### Editor stylesheet

```css
/* host: src/components/dev-tools/themer/themer.css */
@reference "../../../app/globals.css";
@import "@banter/themer/host/themer.css";
```

Puts the editor's utilities in `@layer themer` (the host's `globals.css` must
declare `@layer theme, base, components, themer, utilities;` before
Tailwind), scans this package and all of `@banter/ui`, and lifts Base UI
popups above the editor overlay. Import it only from the host's shell so it
stays in the dev chunk.

### fontCatalogResponse

```ts
import { fontCatalogResponse } from "@banter/themer/api/font-catalog";

return fontCatalogResponse(url, process.env.GOOGLE_FONTS_API_KEY);
```

Returns the `PaginatedFontsResponse` JSON for `?q=&category=&limit=&offset=`
on a `URL`. Call it only after the host's gate passes (`fontCatalogRoute`
does); it does no gating and reads no environment.

- Without a key it serves Google's public, keyless catalog
  (`GOOGLE_FONTS_METADATA_URL`, ~1,950 families in popularity order), held in
  module memory for 24 h (too large for Next's fetch cache).
- When Google fails it answers with `FALLBACK_FONTS` (and logs a warning); it
  never fails the request. A failure is not cached.
- The key goes only to the Google Fonts API URL, never into the response.
- `limit` is clamped to 1–100 and `offset` to ≥ 0.

### describeFontValue

`describeFontValue(value, resolveVariable?)` (`utils/font-loader.ts`) tells
the font picker what a theme value names: `family` (a named first family),
`variable` (a host `var(--x)`, followed through `resolveVariable` to the family
it sets, e.g. next/font's `--font-dm-sans` → `DM Sans`), `system` (only
generic names) or `empty`. The picker labels `variable` values and families
missing from the catalog (or listed by `isLocalFontFamily`, such as Georgia
and Menlo, which are also never requested from Google) "Custom font", and
`system` values "System font (…)".

---

## Types

### ThemeEditorState

```typescript
interface ThemeEditorState {
  styles: ThemeStyles;
  currentMode: ThemeMode;
  preset?: string; // current preset id (current ids, see migratePresetId)
  hslAdjustments?: HSLAdjustments;
}

interface ThemeStyles {
  light: ThemeModeStyles; // ThemeStyleProps & host extra colours by key
  dark: ThemeModeStyles;
}
```

### ThemeStyleProps

Object containing all built-in CSS variable values. Host extra colours (`ThemerConfig.extraColors`) are not keys of it: `ThemeModeStyles = ThemeStyleProps & ExtraColorValues` adds them by name, each optional, because an extra a theme does not set stays absent.

```typescript
interface ThemeStyleProps {
  // Colors (32)
  background: string;
  foreground: string;
  primary: string;
  "primary-foreground": string;
  // ... etc

  // Typography
  "font-sans": string;
  "font-heading": string;
  "font-serif": string;
  "font-mono": string;

  // Spacing
  radius: string;
  spacing?: string; // optional: a preset or imported CSS may leave it out
  "letter-spacing": string;

  // Shadows
  "shadow-color": string;
  "shadow-opacity": string;
  "shadow-blur": string;
  "shadow-spread": string;
  "shadow-offset-x": string;
  "shadow-offset-y": string;
}
```

### StorageAdapter

```typescript
interface StorageAdapter {
  getThemes(): Promise<SavedTheme[]>;
  getTheme(id: string): Promise<SavedTheme | null>;
  saveTheme(
    theme: Omit<SavedTheme, "id" | "createdAt" | "updatedAt">,
  ): Promise<SavedTheme>;
  updateTheme(id: string, updates: Partial<SavedTheme>): Promise<SavedTheme>;
  deleteTheme(id: string): Promise<void>;
  isAvailable(): Promise<boolean>;
  getType(): StorageType;
}

type StorageType = "payload" | "indexeddb" | "file" | "memory";
```

### ColorFormat

```typescript
type ColorFormat = "hex" | "rgb" | "hsl" | "oklch";
```

### HSLAdjustments

```typescript
interface HSLAdjustments {
  hueShift: number; // -180 to 180
  saturationScale: number; // 0 to 2+
  lightnessScale: number; // 0 to 2+
}
```

---

## Constants

All in [config/constants.ts](../src/config/constants.ts), whose comments name
each constant's readers. A constant with no reader changes nothing when
edited: `HEADER_HEIGHT`, `SIDEBAR_WIDTH`, `GOOGLE_FONTS` and `SHADOW_PRESETS`
have none, and of `Z_INDEX` only `trigger` and `sidebar` are read
(`portalPopup` is repeated as a literal in `host/themer.css`).

```typescript
// History
MAX_HISTORY_COUNT = 30;
HISTORY_DEBOUNCE_MS = 500;

// UI
SIDEBAR_WIDTHS = { expanded: "20rem", collapsed: "3rem" }; // the overlay's SidebarProvider

// Animation
COLOR_INPUT_DEBOUNCE_MS = 150;
HIGHLIGHT_ANIMATION_MS = 1500;

// Z-Index
Z_INDEX = {
  trigger: 9990, // the floating trigger, unless ThemerConfig.zIndex is set
  overlay: 9999, // no reader
  sidebar: 10000, // the overlay, unless ThemerConfig.zIndex is set
  header: 10001, // no reader (header, popover, modal, inspector)
  popover: 10002,
  modal: 10003,
  inspector: 10004,
  portalPopup: 10060, // every Base UI popup layer while the editor is mounted
  //                     (mirrored as a literal in host/themer.css; keep equal)
};

// Shortcuts (strings; see README for which have handlers)
SHORTCUTS = { toggle, undo, redo, save, export, inspector };

// Slider bounds for numeric style controls
CONTROL_RANGES = { radius, spacing, "letter-spacing", "shadow-opacity", "shadow-blur", ... };

// WCAG Thresholds
WCAG_CONTRAST = {
  AA_LARGE: 3,
  AA_NORMAL: 4.5,
  AAA_LARGE: 4.5,
  AAA_NORMAL: 7,
};
```
