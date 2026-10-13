"use client";

// The editor's light/dark switch: the action bar draws it, and the preview's
// toolbar does too in fullscreen, where the action bar is covered. The reveal
// starts from the click point (useToggleMode).

import { Moon, Sun } from "lucide-react";
import { useToggleMode } from "../../hooks/use-themer";
import { selectCurrentMode } from "../../selectors";
import { useEditorStore } from "../../stores/editor-store";
import { ActionButton, type ActionButtonProps } from "./action-button";

export type ModeToggleProps = Omit<
  ActionButtonProps,
  "label" | "onClick" | "children"
>;

/** Light/dark switch, named by the mode it switches to. */
export function ModeToggle(props: ModeToggleProps) {
  const currentMode = useEditorStore(selectCurrentMode);
  const toggleMode = useToggleMode();
  const isDark = currentMode === "dark";

  return (
    <ActionButton
      {...props}
      label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={(event) => toggleMode({ x: event.clientX, y: event.clientY })}
    >
      {isDark ? <Sun /> : <Moon />}
    </ActionButton>
  );
}
