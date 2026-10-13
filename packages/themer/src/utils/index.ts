// The editor's utilities, re-exported by the package root (src/index.ts).
// Not exported here: font-loader's link registry (acquireGoogleFont,
// setThemeFonts, ...), describeFontValue and theme-script; import those from
// `@villa/themer/utils/<file>`. See packages/themer/docs/API.md ("Utilities").
export { isDeepEqual } from "./deep-equal";
export { debounce } from "./debounce";
export {
  colorFormatter,
  convertToHSL,
  convertToHex,
  convertToRGB,
  convertToOklch,
  parseColor,
  isValidColor,
  normalizeColorForCompare,
  colorsEqual,
  toColorInputValue,
  adjustColorByHsl,
  interpolateColors,
  generateColorScale,
} from "./color-converter";
export {
  getContrastRatio,
  formatContrastRatio,
  checkWCAGCompliance,
  checkThemeContrast,
  suggestContrastFix,
  standardColorPairs,
  type WCAGLevel,
  type ColorPair,
  type ContrastPair,
  type ContrastResult,
} from "./contrast-checker";
export {
  applyThemeToElement,
  removeThemeFromElement,
  applyThemeToDocument,
  removeThemeFromDocument,
  computeThemeProperties,
  THEMER_OVERRIDES_ATTRIBUTE,
  applyThemeToIframe,
  createThemeStyleElement,
} from "./apply-theme";
export {
  getShadowMap,
  SHADOW_SCALE_KEYS,
  type ShadowMap,
  type ShadowScaleKey,
  getShadowVariables,
  getShadowParams,
  createCustomShadow,
} from "./shadows";
export {
  generateThemeCode,
  generateTailwindConfigCode,
  generateLayoutCode,
} from "./theme-generator";
export { parseLength, clampToRange, type LengthUnit } from "./length";
export {
  runThemeTransition,
  transitionOriginPercent,
  type TransitionOrigin,
} from "./theme-transition";
export {
  SIDEBAR_SYNC_MAP,
  BASE_TO_SIDEBAR_MAP,
  isSyncedSidebarKey,
  applySidebarSync,
  isSidebarSynced,
} from "./sidebar-sync";
// COLOR_GROUPS (./types) is the plain key list; COLOR_LIST_GROUPS is the
// labelled colour-list layout built from the same keys.
export {
  COLOR_LIST_GROUPS,
  getColorListGroups,
  getColorSectionId,
  findColorGroup,
  filterColorGroups,
  colorMatchesSearch,
  type ColorGroup,
  type ColorGroupEntry,
} from "./color-groups";
export {
  HSL_ADJUSTABLE_KEYS,
  isIdentityHslAdjustment,
  adjustColor,
  adjustThemeStyles,
} from "./hsl-adjust";
export {
  parseThemeCss,
  type ParsedThemeCss,
  parseCSSVariables,
  mergeWithDefaults,
  stylesToCSS,
  validateCSSInput,
  extractColorVariables,
} from "./parse-css";
export {
  DEFAULT_FONT_CATALOG_ENDPOINT,
  FALLBACK_FONTS,
  FONT_CATEGORIES,
  GOOGLE_FONTS_API_URL,
  GOOGLE_FONTS_CSS_URL,
  POPULAR_FONTS,
  SYSTEM_FONTS,
  SYSTEM_FONTS_FALLBACKS,
  buildFontCssUrl,
  buildFontFamily,
  fetchGoogleFontsCatalog,
  filterAndPaginateFonts,
  loadGoogleFont,
  loadGoogleFonts,
  unloadGoogleFont,
  isFontLoaded,
  isGoogleFontLoaded,
  waitForFont,
  extractFontFamily,
  extractGoogleFontFamily,
  formatFontFamily,
  getDefaultWeights,
  getPopularFonts,
  getFontPreviewUrl,
  generateFontCSS,
  fontFallbacks,
  toFontCategory,
  transformGoogleFontsResponse,
  type FilterFontCategory,
  type FontCategory,
  type FontInfo,
  type GoogleFont,
  type PaginatedFontsResponse,
  type ThemeFontRole,
} from "./font-loader";
