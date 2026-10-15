"use client";

// The desktop Themer UI's top strip over the preview pane: sidebar trigger, a
// "Preview" label and the close button. ThemerUI unmounts it in
// fullscreen preview.

import { X } from "lucide-react";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { ActionButton } from "../ui/action-button";

interface ThemerHeaderProps {
  onClose: () => void;
}

/**
 * Header with sidebar trigger and close button
 * Fixed height h-12, matches sidebar header
 */
export function ThemerHeader({ onClose }: ThemerHeaderProps) {
  return (
    <div className="bg-background/95 flex h-12 shrink-0 items-center justify-between border-b px-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <span className="text-sm font-medium">Preview</span>
      </div>
      <ActionButton label="Close theme editor" onClick={onClose}>
        <X />
      </ActionButton>
    </div>
  );
}
