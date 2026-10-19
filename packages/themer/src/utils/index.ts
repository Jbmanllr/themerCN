// RETIRED (#64): nothing imports this file. It was an unused barrel; callers
// import each file directly. Excluded from tsconfig.json
// and eslint.config.js until the owner removes it.
//
// The editor's utilities, as one internal barrel (the package root exports
// none of them). Not here: font-links' link registry (acquireGoogleFont,
// setThemeFonts, ...), describeFontValue and theme-script; import those from
// their own files.
export { isDeepEqual } from "./deep-equal"
export { debounce } from "./debounce"
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
} from "./color-converter"
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
} from "./contrast-checker"
export {
  applyThemeToElement,
  removeThemeFromElement,
  applyThemeToDocument,
  removeThemeFromDocument,
  computeThemeProperties,
  THEMER_OVERRIDES_ATTRIBUTE,
  applyThemeToIframe,
  createThemeStyleElement,
} from "./apply-theme"
export {
  getShadowMap,
  SHADOW_SCALE_KEYS,
  type ShadowMap,
  type ShadowScaleKey,
  getShadowVariables,
  getShadowParams,
  createCustomShadow,
} from "./shadows"
export {
  generateThemeCode,
  generateTailwindConfigCode,
  generateLayoutCode,
} from "./theme-generator"
export { parseLength, clampToRange, type LengthUnit } from "./length"
export {
  runThemeTransition,
  transitionOriginPercent,
  type TransitionOrigin,
} from "./theme-transition"
export {
  SIDEBAR_SYNC_MAP,
  BASE_TO_SIDEBAR_MAP,
  isSyncedSidebarKey,
  applySidebarSync,
  isSidebarSynced,
} from "./sidebar-sync"
// COLOR_LIST_GROUPS is the labelled colour-list layout of THEME_COLOR_KEYS
// (./types).
export {
  COLOR_LIST_GROUPS,
  getColorListGroups,
  getColorSectionId,
  findColorGroup,
  filterColorGroups,
  colorMatchesSearch,
  type ColorGroup,
  type ColorGroupEntry,
} from "./color-groups"
export {
  isIdentityHslAdjustment,
  adjustColor,
  adjustThemeStyles,
} from "./hsl-adjust"
export {
  parseThemeCss,
  type ParsedThemeCss,
  parseCSSVariables,
  mergeWithDefaults,
  stylesToCSS,
  validateCSSInput,
  extractColorVariables,
} from "./parse-css"
export {
  FALLBACK_FONTS,
  POPULAR_FONTS,
  filterAndPaginateFonts,
  getPopularFonts,
} from "./font-catalog-data"
export {
  GOOGLE_FONTS_CSS_URL,
  buildFontCssUrl,
  getDefaultWeights,
  getFontPreviewUrl,
  isFontLoaded,
  isGoogleFontLoaded,
  loadGoogleFont,
  loadGoogleFonts,
  unloadGoogleFont,
  waitForFont,
} from "./font-links"
export {
  FONT_CATEGORIES,
  SYSTEM_FONTS,
  SYSTEM_FONTS_FALLBACKS,
  buildFontFamily,
  extractFontFamily,
  extractGoogleFontFamily,
  fontFallbacks,
  formatFontFamily,
  generateFontCSS,
  toFontCategory,
  type ThemeFontRole,
} from "./font-names"
export {
  GOOGLE_FONTS_API_URL,
  fetchGoogleFontsCatalog,
  transformGoogleFontsResponse,
} from "../api/google-fonts"
export type {
  FilterFontCategory,
  FontCategory,
  FontInfo,
  GoogleFont,
  PaginatedFontsResponse,
} from "../types/fonts"
