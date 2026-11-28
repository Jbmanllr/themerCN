"use client"

// The editor's light/dark switch: the action bar draws it, and the preview's
// toolbar does too in fullscreen, where the action bar is covered. The reveal
// starts from the click point (useToggleMode).

import { Moon, Sun } from "lucide-react"
import { useToggleMode } from "../../hooks/use-toggle-mode"
import { useColorMode } from "../../hooks/use-color-mode"
import { ActionButton, type ActionButtonProps } from "./action-button"

export type ModeToggleProps = Omit<
  ActionButtonProps,
  "label" | "onClick" | "children"
>

/**
 * The light/dark switch as data, for each form it is drawn in (ModeToggle's
 * button, the actions menu's item): its label, which names the mode it
 * switches to, its icon, and the click that starts the reveal from the
 * pointer.
 */
export function useModeSwitch() {
  const isDark = useColorMode().mode === "dark"
  const toggleMode = useToggleMode()

  return {
    label: isDark ? "Switch to light mode" : "Switch to dark mode",
    Icon: isDark ? Sun : Moon,
    onClick: (event: { clientX: number; clientY: number }) =>
      toggleMode({ x: event.clientX, y: event.clientY }),
  }
}

/** Light/dark switch, named by the mode it switches to. */
export function ModeToggle(props: ModeToggleProps) {
  const { label, Icon, onClick } = useModeSwitch()

  return (
    <ActionButton {...props} label={label} onClick={onClick}>
      <Icon />
    </ActionButton>
  )
}
