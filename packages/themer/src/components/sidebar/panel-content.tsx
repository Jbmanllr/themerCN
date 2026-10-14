"use client";

import { ColorsPanel } from "../panels/colors-panel";
import { TypographyPanel } from "../panels/typography-panel";
import { OtherPanel } from "../panels/other-panel";
import type { Panel } from "./panels-config";

interface PanelContentProps {
  panel: Panel;
}

/**
 * Render the content for the active panel
 */
export function PanelContent({ panel }: PanelContentProps) {
  switch (panel) {
    case "colors":
      return <ColorsPanel />;
    case "typography":
      return <TypographyPanel />;
    case "other":
      return <OtherPanel />;
    default:
      return null;
  }
}
