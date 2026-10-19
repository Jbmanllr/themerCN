import { Palette, Type, Sliders, type LucideIcon } from "lucide-react"

export type Panel = "colors" | "typography" | "other"

export interface PanelConfig {
  id: Panel
  label: string
  icon: LucideIcon
}

export const PANELS: readonly PanelConfig[] = [
  { id: "colors", label: "Colors", icon: Palette },
  { id: "typography", label: "Typography", icon: Type },
  { id: "other", label: "Other", icon: Sliders },
]
