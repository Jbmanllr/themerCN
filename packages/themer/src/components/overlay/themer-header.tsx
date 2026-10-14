"use client";

// The desktop overlay's top strip over the preview pane: sidebar trigger, a
// "Preview" label and the close button. ThemerOverlay unmounts it in
// fullscreen preview.
//
// Not the legacy all-in-one header of the same name in
// components/themer-header.tsx (no props, imported by nothing); this one is
// what components/index.ts exports as `ThemerHeader`.

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
