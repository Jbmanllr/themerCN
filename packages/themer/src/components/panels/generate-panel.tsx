"use client";

import { AIChat } from "../ai/ai-chat";

/**
 * Generate panel - AI chat interface
 */
export function GeneratePanel() {
  return (
    <div className="h-full">
      <AIChat className="h-full" />
    </div>
  );
}
