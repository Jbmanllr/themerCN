import {
  Palette,
  Type,
  Sliders,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type Panel = "colors" | "typography" | "other" | "generate";

export interface PanelConfig {
  id: Panel;
  label: string;
  icon: LucideIcon;
}

export const BASE_PANELS: PanelConfig[] = [
  { id: "colors", label: "Colors", icon: Palette },
  { id: "typography", label: "Typography", icon: Type },
  { id: "other", label: "Other", icon: Sliders },
];

export const AI_PANEL: PanelConfig = {
  id: "generate",
  label: "AI Generate",
  icon: Sparkles,
};

export const PANELS: PanelConfig[] = [...BASE_PANELS, AI_PANEL];

export function getPanelConfigs(showTabAI = false): PanelConfig[] {
  return showTabAI ? PANELS : BASE_PANELS;
}

export function getVisiblePanel(panel: Panel, showTabAI = false): Panel {
  return getPanelConfigs(showTabAI).some((config) => config.id === panel)
    ? panel
    : "colors";
}
