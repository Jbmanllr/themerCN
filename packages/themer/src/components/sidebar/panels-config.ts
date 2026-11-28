import { Palette, Type, Sliders, type LucideIcon } from "lucide-react"
import type { ThemerUIStore } from "../../types"

/** A panel of the Themer UI: the ThemerUIStore's `activePanel`. */
export type Panel = ThemerUIStore["activePanel"]

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
