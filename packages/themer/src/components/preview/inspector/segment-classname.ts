// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified by Banter.
// Source: lib/inspector/segment-classname.ts.
//
// Split a token class into the parts the inspector card renders and the
// colour key it focuses: `hover:bg-primary/90` → selector `hover`, prefix
// `bg`, value `primary`, opacity `90`. Changes from tweakcn: the prefix is
// one of the known colour utilities (so `ring-offset-background` gives
// `ring-offset` + `background`, not `ring` + `offset-background`), bracketed
// variants may contain `:`, and important markers are dropped.

import { COLOR_UTILITY_PREFIXES } from "./theme-class-regex";

export interface ClassNameSegments {
  selector: string | null;
  prefix: string | null;
  value: string | null;
  opacity: string | null;
}

const SELECTOR_REGEX = /^((?:(?:[^:\s[]|\[[^\]]*\])+:)*)/;

export function segmentClassName(className: string): ClassNameSegments {
  const selectorMatch = className.match(SELECTOR_REGEX);
  let selector = "";
  let remaining = className;

  if (selectorMatch?.[1]) {
    selector = selectorMatch[1].slice(0, -1); // Remove trailing colon
    remaining = className.slice(selectorMatch[1].length);
  }
  remaining = remaining.replace(/^!|!$/g, "");

  // Handle opacity modifier (e.g., "card/80", "card/[0.35]")
  const opacityMatch = remaining.match(/^([^/]+)\/(.+)$/);
  let baseClass = remaining;
  let opacity = "";
  if (opacityMatch) {
    baseClass = opacityMatch[1]!;
    opacity = opacityMatch[2]!;
  }

  // Split into prefix and value on a known colour utility; otherwise on the
  // first dash, as tweakcn does.
  const known = COLOR_UTILITY_PREFIXES.find((prefix) =>
    baseClass.startsWith(`${prefix}-`),
  );
  let prefix = "";
  let value = "";
  if (known) {
    prefix = known;
    value = baseClass.slice(known.length + 1);
  } else {
    const dashIndex = baseClass.indexOf("-");
    if (dashIndex === -1) {
      prefix = baseClass;
    } else {
      prefix = baseClass.slice(0, dashIndex);
      value = baseClass.slice(dashIndex + 1);
    }
  }

  return {
    selector: selector || null,
    prefix: prefix || null,
    value: value || null,
    opacity: opacity || null,
  };
}
